"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCustomer } from "@/lib/auth/guards";
import { orderQtyLimits } from "@/lib/cart";
import { SHOP } from "@/content/shop";
import { connectDb } from "@/lib/db";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { PriceEnquiry } from "@/lib/models/PriceEnquiry";
import { Product } from "@/lib/models/Product";
import { ContactMessage } from "@/lib/models/ContactMessage";
import { StockNotification } from "@/lib/models/StockNotification";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { escapeHtml } from "@/lib/emails/layout";

/** Customer-facing catalogue actions: ask for a price, and ask to be told when
 *  something is back in stock. Both are open to signed-out visitors — requiring
 *  an account to *ask a question* loses the question. */

const email = z.string().trim().toLowerCase().pipe(z.email());
const localeField = z.string().transform((value) => (isLocale(value) ? value : "en"));

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

/** Tells the admin something arrived. Never allowed to fail the customer's
 *  action — their enquiry is recorded whether or not our mail provider is up. */
async function alertAdmins(subject: string, lines: string[]) {
  const settings = await getSettings();
  const to = settings.notifications.adminAlertEmails;
  if (to.length === 0) return;
  await sendMail({
    to,
    subject,
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
  });
}

// --- Request a price (C1) ----------------------------------------------------

export type EnquiryState = { ok?: boolean; error?: string };

const enquirySchema = z.object({
  productId: z.string().regex(/^[0-9a-f]{24}$/i),
  name: z.string().trim().min(1).max(120),
  email,
  phone: z.string().trim().max(40).default(""),
  qty: z.coerce.number().int().min(1).max(999).default(1),
  message: z.string().trim().max(2000).default(""),
  locale: localeField,
});

export async function submitPriceEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  await connectDb();

  // The product has to exist, be published and actually be request-price —
  // otherwise this is a route to quoting a fixed-price product off-book.
  const product = await Product.findOne({
    _id: parsed.data.productId,
    status: "published",
    pricingMode: "request",
  }).lean();
  if (!product) return { error: "That product is not available for enquiry." };

  const locale = parsed.data.locale as Locale;
  const limits = orderQtyLimits(product);
  if (limits.impossible || parsed.data.qty < limits.min) {
    return { error: t(SHOP.minOrder, locale).replace("{qty}", String(limits.min)) };
  }
  if (parsed.data.qty > limits.max) {
    return { error: t(SHOP.maxOrder, locale).replace("{qty}", String(limits.max)) };
  }

  // A signed-in enquirer is linked to their account so the quote can be
  // followed up in their order history later.
  const customer = await getCustomer();

  const recent = await PriceEnquiry.countDocuments({
    email: parsed.data.email,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recent >= 10) return { error: "Too many enquiries just now. Please try again later." };

  const enquiry = await PriceEnquiry.create({
    productId: product._id,
    qty: parsed.data.qty,
    customerId: customer?._id ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
    locale: parsed.data.locale as Locale,
    ip: await clientIp(),
  });

  await alertAdmins(`Price enquiry — ${product.name.en}`, [
    `${parsed.data.name} <${parsed.data.email}> asked for a price.`,
    `Product: ${product.name.en} (${product.sku})`,
    `Quantity: ${parsed.data.qty}`,
    parsed.data.phone ? `Phone: ${parsed.data.phone}` : "",
    parsed.data.message ? `Message: ${parsed.data.message}` : "",
    `Reference: ${enquiry._id}`,
  ].filter(Boolean));

  return { ok: true };
}

// --- Notify me when back in stock (plan 8.7) ---------------------------------

export type NotifyState = { ok?: boolean; already?: boolean; error?: string };

const notifySchema = z.object({
  productId: z.string().regex(/^[0-9a-f]{24}$/i),
  email,
  locale: localeField,
});

export async function requestBackInStock(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const parsed = notifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "bad_email" };

  await connectDb();

  const product = await Product.findOne({ _id: parsed.data.productId, status: "published" }).lean();
  if (!product) return { error: "gone" };

  // Only worth recording while it is actually unavailable.
  if (!product.trackInventory || product.stock > 0) return { ok: true };

  const customer = await getCustomer();

  try {
    await StockNotification.create({
      productId: product._id,
      email: parsed.data.email,
      customerId: customer?._id ?? null,
      locale: parsed.data.locale as Locale,
    });
  } catch (error) {
    // The partial unique index means a second request from the same address
    // while one is still pending is a duplicate, not a failure.
    if ((error as { code?: number }).code === 11000) return { ok: true, already: true };
    throw error;
  }

  return { ok: true };
}

// --- Contact form (plan 8.9) -------------------------------------------------

export type ContactState = { ok?: boolean; error?: string };

const contactSchema = z.object({
  name: z.string().trim().min(2, "short_name").max(120),
  email,
  phone: z.string().trim().max(40).default(""),
  subject: z.string().trim().max(160).default(""),
  message: z.string().trim().min(10, "short_message").max(5000),
  locale: localeField,
  /** Honeypot: a field a person never sees and a bot always fills. */
  website: z.string().max(0).optional(),
});

export async function submitContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // The honeypot failing means a bot filled a hidden field. It is told the
    // message was sent, because telling it otherwise teaches it to try again.
    if (issue?.path[0] === "website") return { ok: true };
    return { error: issue?.message ?? "check" };
  }

  await connectDb();

  const ip = await clientIp();
  const recent = await ContactMessage.countDocuments({
    email: parsed.data.email,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
  });
  if (recent >= 5) return { error: "rate" };

  await ContactMessage.create({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    subject: parsed.data.subject,
    message: parsed.data.message,
    locale: parsed.data.locale as Locale,
    ip,
  });

  await alertAdmins(`Contact form — ${parsed.data.name}`, [
    `${parsed.data.name} <${parsed.data.email}> wrote in.`,
    parsed.data.phone ? `Phone: ${parsed.data.phone}` : "",
    parsed.data.subject ? `Subject: ${parsed.data.subject}` : "",
    parsed.data.message,
  ].filter(Boolean));

  return { ok: true };
}
