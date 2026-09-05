import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env, live } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { fulfilPaidOrder, markPaymentFailed } from "@/lib/fulfilment";

/** Stripe's webhook. The single source of truth for "this order is paid".
 *
 *  The browser redirect after Checkout proves nothing — a customer can close
 *  the tab before it fires, or open the success URL by hand. Only a
 *  signature-verified event from Stripe marks money as received, which is why
 *  every side effect of payment (stock, coupon usage, invoice number, emails)
 *  hangs off this route and not off the confirmation page.
 *
 *  Handlers must be **idempotent**. Stripe retries on any non-2xx and can
 *  deliver the same event more than once even on success; the fulfilment code
 *  is guarded so a redelivery cannot sell the same unit twice or send a second
 *  confirmation email.
 */

// The signature is computed over the exact bytes Stripe sent, so the body must
// not be parsed or re-serialised before verification.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!live.webhook) {
    console.error("[stripe] webhook called with no STRIPE_WEBHOOK_SECRET configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    // An unverifiable event is either a misconfiguration or someone probing.
    // Either way it is not Stripe, and it must never reach the fulfilment code.
    const reason = error instanceof Error ? error.message : "unknown";
    console.error(`[stripe] signature verification failed: ${reason}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // `payment_status` can still be unpaid for asynchronous methods; those
        // arrive later as async_payment_succeeded.
        if (session.payment_status === "paid") {
          await fulfilPaidOrder({
            orderId: session.metadata?.orderId ?? session.client_reference_id ?? null,
            sessionId: session.id,
            paymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            eventId: event.id,
            amountTotal: session.amount_total ?? null,
          });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        await fulfilPaidOrder({
          orderId: session.metadata?.orderId ?? session.client_reference_id ?? null,
          sessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          eventId: event.id,
          amountTotal: session.amount_total ?? null,
        });
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object;
        await markPaymentFailed(session.metadata?.orderId ?? session.client_reference_id ?? null);
        break;
      }

      default:
        // Everything else is acknowledged and ignored. Returning non-2xx would
        // make Stripe retry events we simply do not act on.
        break;
    }
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want if our own database
    // was briefly unavailable — the order would otherwise stay unpaid forever.
    console.error(`[stripe] handling ${event.type} failed`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
