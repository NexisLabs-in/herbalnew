"use server";

import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth/guards";
import { createPendingOrder, prepareCheckout } from "@/lib/checkout";
import { connectDb } from "@/lib/db";
import { Customer, type AddressDoc } from "@/lib/models/Customer";
import {
  checkoutLineItems,
  checkoutReturnUrls,
  getStripe,
  stripeLocale,
  StripeNotConfiguredError,
} from "@/lib/stripe";
import { addressSchema, checkoutSchema } from "@/lib/validation/checkout";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";
import type { Locale } from "@/lib/i18n";

/** Placing an order.
 *
 *  The browser sends a delivery address and nothing else that matters. Prices,
 *  quantities, discounts, shipping and tax are all recomputed here from the
 *  stored cart, so a tampered request buys at the real price or not at all.
 */

export type CheckoutState = ActionState & { refusal?: string };

export async function saveAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  const parsed = addressSchema.safeParse({
    label: formData.get("label") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    emirate: formData.get("emirate") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return { error: "Check the address.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "Please sign in again." };

  // The first address a customer saves is their default, whether or not they
  // ticked the box — otherwise checkout has nothing preselected.
  const makeDefault = parsed.data.isDefault || record.addresses.length === 0;
  if (makeDefault) {
    for (const address of record.addresses) address.isDefault = false;
  }

  record.addresses.push({ ...parsed.data, isDefault: makeDefault, country: "AE" });
  // Name is collected at first checkout rather than at sign-up (C5), so this is
  // usually where a customer first gets one.
  if (!record.name) record.name = parsed.data.fullName;
  await record.save();

  return { ok: true, notice: "Address saved." };
}

export async function deleteAddress(addressId: string): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) return { error: "Please sign in again." };

  const removed = record.addresses.find((address: AddressDoc) => String(address._id) === addressId);
  record.set(
    "addresses",
    record.addresses.filter((address: AddressDoc) => String(address._id) !== addressId),
  );

  // Never leave a customer with addresses but no default.
  if (removed?.isDefault && record.addresses.length > 0) {
    record.addresses[0].isDefault = true;
  }

  await record.save();
  return { ok: true };
}

/** Creates the order and hands the customer to Stripe.
 *
 *  Returns a URL rather than redirecting inside the action: a redirect to an
 *  external host from a server action is awkward for the client to follow, and
 *  the caller may want to show a failure instead.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const customer = await getCustomer();
  if (!customer) redirect("/en/login?next=/en/checkout");

  const parsed = checkoutSchema.safeParse({
    addressId: formData.get("addressId") || undefined,
    address: formData.get("addressId")
      ? undefined
      : {
          label: formData.get("label") ?? "",
          fullName: formData.get("fullName") ?? "",
          phone: formData.get("phone") ?? "",
          line1: formData.get("line1") ?? "",
          line2: formData.get("line2") ?? "",
          city: formData.get("city") ?? "",
          emirate: formData.get("emirate") ?? "",
          isDefault: formData.get("isDefault") === "on",
        },
    locale: (formData.get("locale") as Locale) ?? "en",
  });

  if (!parsed.success) {
    return { error: "Check the delivery address.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = parsed.data.locale;

  // Re-priced from the database immediately before payment: a basket can go
  // stale between looking at it and paying.
  const prepared = await prepareCheckout();
  if (!prepared.ok) {
    const refusal = prepared.refusal;
    if (refusal.reason === "empty") return { refusal: "empty" };
    if (refusal.reason === "coupon_invalid") return { refusal: "coupon_invalid" };
    return { refusal: "unavailable", error: refusal.productNames.join(", ") };
  }

  await connectDb();
  const record = await Customer.findById(customer._id);
  if (!record) redirect(`/${locale}/login`);

  // A new address is saved to the account on the way through, so the next order
  // does not ask again.
  let address = parsed.data.address;
  if (parsed.data.addressId) {
    const saved = record.addresses.find((entry: AddressDoc) => String(entry._id) === parsed.data.addressId);
    if (!saved) return { error: "That address is no longer on your account." };
    address = {
      label: saved.label,
      fullName: saved.fullName,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2,
      city: saved.city,
      emirate: saved.emirate,
      isDefault: saved.isDefault,
    };
  } else if (address) {
    const makeDefault = address.isDefault || record.addresses.length === 0;
    if (makeDefault) for (const entry of record.addresses) entry.isDefault = false;
    record.addresses.push({ ...address, isDefault: makeDefault, country: "AE" });
    if (!record.name) record.name = address.fullName;
    await record.save();
  }

  if (!address) return { error: "Choose or enter a delivery address." };

  const order = await createPendingOrder({
    cart: prepared.cart,
    customer: record.toObject(),
    address,
    locale,
  });

  try {
    const stripe = getStripe();
    const urls = checkoutReturnUrls(order.orderNumber, locale);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe's own receipt goes to the address that pays; ours goes to the
      // account. Prefilling keeps them the same in the common case.
      customer_email: record.email,
      client_reference_id: String(order._id),
      line_items: checkoutLineItems(order),
      success_url: urls.success,
      cancel_url: urls.cancel,
      // Read back by the webhook, which is the only thing that marks an order
      // paid — the browser redirect never does.
      metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
      // Stripe has no Arabic; see `stripeLocale`.
      locale: stripeLocale(locale),
    });

    order.stripe.checkoutSessionId = session.id;
    await order.save();

    if (!session.url) return { error: "Stripe did not return a payment page. Please try again." };
    return { ok: true, notice: session.url };
  } catch (error) {
    // The order stays as a pending record rather than being deleted: it is
    // evidence that somebody tried, and the admin can see the attempt.
    if (error instanceof StripeNotConfiguredError) {
      return {
        error:
          "Payments are not switched on yet. Please contact us to complete this order.",
      };
    }
    console.error("[checkout] Stripe session failed", error);
    return { error: "We could not start the payment. Please try again." };
  }
}
