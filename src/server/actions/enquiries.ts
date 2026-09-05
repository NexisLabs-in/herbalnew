"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer, requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Customer } from "@/lib/models/Customer";
import { nextOrderNumber } from "@/lib/models/Counter";
import { Order } from "@/lib/models/Order";
import { PriceEnquiry } from "@/lib/models/PriceEnquiry";
import { Product } from "@/lib/models/Product";
import { quoteEmail } from "@/lib/emails/quotes";
import { sendMail } from "@/lib/mail";
import { getSettings, toPricingSettings } from "@/lib/settings";
import { priceCart, priceLine } from "@/lib/pricing";
import { checkoutLineItems, checkoutReturnUrls, getStripe, stripeLocale, StripeNotConfiguredError } from "@/lib/stripe";
import { addressSchema } from "@/lib/validation/checkout";
import { aedAmount, fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";
import type { Locale } from "@/lib/i18n";

/** The request-price loop (requirement C1).
 *
 *  A customer asks, an admin answers with a price and an expiry, and the
 *  customer pays through the same Stripe checkout as any other order. The quote
 *  link is the only credential on that page, so it is generated with crypto
 *  randomness and single-use.
 */

const quoteSchema = z.object({
  enquiryId: z.string().regex(/^[0-9a-f]{24}$/i),
  unitPrice: aedAmount,
  /** Days from now. A quote without an expiry becomes a price the shop is
   *  bound to forever, through cost changes and stock changes alike. */
  validForDays: z.coerce.number().int().min(1).max(90).default(14),
  note: z.string().trim().max(1000).default(""),
});

export async function sendQuote(payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("enquiries:write");

  const parsed = quoteSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the quote.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const settings = await getSettings();

  const enquiry = await PriceEnquiry.findById(parsed.data.enquiryId);
  if (!enquiry) return { error: "That enquiry no longer exists." };
  if (enquiry.status === "accepted") return { error: "This quote has already been paid." };

  const product = await Product.findById(enquiry.productId).lean();
  if (!product) return { error: "That product no longer exists." };

  // A fresh token invalidates any earlier link for the same enquiry, so a
  // re-quote at a new price cannot be paid at the old one.
  enquiry.quoteToken = randomBytes(32).toString("base64url");
  enquiry.quotedUnitPriceFils = parsed.data.unitPrice;
  enquiry.quotedAt = new Date();
  enquiry.quoteExpiresAt = new Date(Date.now() + parsed.data.validForDays * 24 * 60 * 60 * 1000);
  enquiry.quotedByAdminId = admin.adminId;
  enquiry.adminNote = parsed.data.note;
  enquiry.status = "quoted";
  await enquiry.save();

  await recordAudit(admin, {
    action: "update",
    entity: "PriceEnquiry",
    entityId: String(enquiry._id),
    entityLabel: `${product.name.en} — ${enquiry.email}`,
    diff: { quotedUnitPriceFils: parsed.data.unitPrice },
  });

  try {
    const mail = quoteEmail({
      enquiry: enquiry.toObject(),
      productName: product.name,
      storeName: settings.store.name,
    });
    await sendMail({ to: enquiry.email, ...mail });
  } catch (error) {
    console.error(`[enquiries] quote email failed for ${enquiry._id}`, error);
    return { ok: true, notice: "Quote saved, but the email did not send. Check the mail settings." };
  }

  revalidatePath("/admin/enquiries");
  return { ok: true, notice: `Quote sent to ${enquiry.email}.` };
}

export async function closeEnquiry(enquiryId: string, note = ""): Promise<ActionState> {
  const admin = await requireAdmin("enquiries:write");
  await connectDb();

  const enquiry = await PriceEnquiry.findById(enquiryId);
  if (!enquiry) return { error: "That enquiry no longer exists." };

  enquiry.status = "closed";
  enquiry.adminNote = note.trim().slice(0, 1000) || enquiry.adminNote;
  // The link stops working the moment the enquiry is closed.
  enquiry.quoteToken = null;
  await enquiry.save();

  await recordAudit(admin, {
    action: "update",
    entity: "PriceEnquiry",
    entityId: enquiryId,
    entityLabel: enquiry.email,
    diff: { status: "closed" },
  });

  revalidatePath("/admin/enquiries");
  return { ok: true, notice: "Enquiry closed." };
}

// --- Customer accepting a quote ----------------------------------------------

export type QuoteCheckoutState = ActionState & { redirect?: string };

/** Turns an accepted quote into a paid order.
 *
 *  The quoted price is the price — it does not go through sale or permanent
 *  discount resolution, because it was already negotiated. Shipping and tax
 *  still apply, computed by the same engine as any other order so the totals
 *  are consistent across the shop.
 */
export async function payQuote(
  _prev: QuoteCheckoutState,
  formData: FormData,
): Promise<QuoteCheckoutState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "That link is not valid." };

  const customer = await getCustomer();
  if (!customer) return { error: "sign_in" };

  const parsedAddress = addressSchema.safeParse({
    label: formData.get("label") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    emirate: formData.get("emirate") ?? "",
    isDefault: false,
  });
  if (!parsedAddress.success) {
    return { error: "Check the delivery address.", fieldErrors: fieldErrorsFrom(parsedAddress.error) };
  }

  await connectDb();
  const settings = await getSettings();

  const enquiry = await PriceEnquiry.findOne({ quoteToken: token });
  if (!enquiry || enquiry.quotedUnitPriceFils === null) return { error: "That link is not valid." };
  if (enquiry.status === "accepted") return { error: "This quote has already been paid." };
  if (enquiry.quoteExpiresAt && enquiry.quoteExpiresAt.getTime() < Date.now()) {
    return { error: "This quote has expired. Ask us for a new one." };
  }

  const product = await Product.findById(enquiry.productId).lean();
  if (!product || product.status !== "published") {
    return { error: "That product is no longer available." };
  }

  // Priced through the same engine as the cart, with the quote standing in for
  // the product's own price, so shipping and tax behave identically.
  const unit = {
    listFils: enquiry.quotedUnitPriceFils,
    discountFils: 0,
    finalFils: enquiry.quotedUnitPriceFils,
    source: "quote" as const,
    percentOff: 0,
  };
  const totals = priceCart({
    lines: [priceLine(String(product._id), enquiry.qty, unit)],
    settings: toPricingSettings(settings),
  });

  const record = await Customer.findById(customer._id);
  if (!record) return { error: "sign_in" };
  if (record.addresses.length === 0) {
    record.addresses.push({ ...parsedAddress.data, isDefault: true, country: "AE" });
    if (!record.name) record.name = parsedAddress.data.fullName;
    await record.save();
  }

  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    customerId: record._id,
    email: record.email,
    locale: enquiry.locale as Locale,
    items: [
      {
        productId: product._id,
        slug: product.slug,
        name: product.name,
        sku: product.sku,
        image: product.images[0]?.url ?? "",
        unitPriceFils: unit.listFils,
        discountFils: 0,
        discountSource: "quote",
        qty: enquiry.qty,
        lineTotalFils: totals.discountedSubtotalFils,
      },
    ],
    subtotalFils: totals.subtotalFils,
    productDiscountFils: 0,
    couponDiscountFils: 0,
    shippingFils: totals.shippingFils,
    taxRate: totals.taxRate,
    taxFils: totals.taxFils,
    grandTotalFils: totals.grandTotalFils,
    shippingAddress: { ...parsedAddress.data, country: "AE" },
    paymentStatus: "pending",
    fulfillmentStatus: "new",
    enquiryId: enquiry._id,
  });

  try {
    const stripe = getStripe();
    const urls = checkoutReturnUrls(order.orderNumber, enquiry.locale);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: record.email,
      client_reference_id: String(order._id),
      line_items: checkoutLineItems(order),
      success_url: urls.success,
      cancel_url: urls.cancel,
      metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
      locale: stripeLocale(enquiry.locale),
    });

    order.stripe.checkoutSessionId = session.id;
    await order.save();

    // The token is spent now rather than on payment: a second tab must not be
    // able to start a second order from the same quote.
    enquiry.status = "accepted";
    enquiry.orderId = order._id;
    enquiry.quoteToken = null;
    await enquiry.save();

    if (!session.url) return { error: "Stripe did not return a payment page." };
    return { ok: true, redirect: session.url };
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return { error: "Payments are not switched on yet. Please contact us to complete this order." };
    }
    console.error("[enquiries] quote checkout failed", error);
    return { error: "We could not start the payment. Please try again." };
  }
}
