import "server-only";
import Stripe from "stripe";
import { env, live } from "./env";

/** Stripe client.
 *
 *  Checkout refuses rather than pretends when no key is configured: a fake
 *  "payment" that marks an order paid would be far worse than an honest error,
 *  and the plan defers real credentials to launch (section 3).
 */

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!live.stripe) {
    throw new StripeNotConfiguredError();
  }
  // Pinned to the version this SDK was built against, so a dashboard-side
  // version bump cannot change response shapes under a running deployment.
  stripe ??= new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" });
  return stripe;
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured — set STRIPE_SECRET_KEY to take payments.");
    this.name = "StripeNotConfiguredError";
  }
}

export const isStripeConfigured = () => live.stripe;

/** Stripe speaks the minor unit, which for AED is fils — the same integer the
 *  database stores, so amounts cross the boundary unchanged. */
export const STRIPE_CURRENCY = "aed";

/** Builds the Checkout line items for an order.
 *
 *  Discounts are folded into the unit price rather than sent as Stripe coupons.
 *  Stripe's own discount objects would have to be kept in step with ours, and
 *  when the two disagree it is Stripe's number that gets charged. One price,
 *  computed once by our engine, is the only version that can be wrong in a way
 *  we can see.
 *
 *  Shipping and tax are separate lines rather than Stripe Shipping Rates and
 *  Tax objects, for the same reason: the order document is the record, and it
 *  must add up to exactly what the card was charged.
 */
export function checkoutLineItems(order: {
  items: { name: { en: string }; sku?: string; qty: number; unitPriceFils: number; discountFils: number }[];
  shippingFils: number;
  taxFils: number;
  taxRate: number;
}) {
  const lines = order.items.map((item) => ({
    quantity: item.qty,
    price_data: {
      currency: STRIPE_CURRENCY,
      unit_amount: item.unitPriceFils - item.discountFils,
      product_data: {
        name: item.name.en,
        ...(item.sku ? { description: item.sku } : {}),
      },
    },
  }));

  if (order.shippingFils > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: order.shippingFils,
        product_data: { name: "Shipping" },
      },
    });
  }

  if (order.taxFils > 0) {
    lines.push({
      quantity: 1,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: order.taxFils,
        product_data: { name: `VAT ${order.taxRate}%` },
      },
    });
  }

  return lines;
}

/** The language for Stripe's hosted payment page.
 *
 *  **Stripe Checkout does not support Arabic** — its locale list has no `ar`,
 *  and passing one is rejected outright, which would leave Arabic customers
 *  unable to pay at all. So an Arabic shopper gets `auto`: Stripe picks the
 *  best match for their browser and lands on English, which is the closest
 *  thing to a right answer available. Worth knowing as a product fact — the
 *  storefront is bilingual, the payment step is not.
 */
export function stripeLocale(locale: string): "en" | "auto" {
  return locale === "ar" ? "auto" : "en";
}

/** Returns the customer to the locale they were shopping in — an Arabic
 *  customer bouncing back into an English confirmation reads as broken. */
export function checkoutReturnUrls(orderNumber: string, locale: string) {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    // {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect.
    success: `${base}/${locale}/order/confirmation?order=${orderNumber}&session={CHECKOUT_SESSION_ID}`,
    cancel: `${base}/${locale}/checkout?cancelled=${orderNumber}`,
  };
}
