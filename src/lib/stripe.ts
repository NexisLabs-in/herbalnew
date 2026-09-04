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
