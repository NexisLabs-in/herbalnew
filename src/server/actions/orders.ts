"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer, requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { CANCELLABLE_STATUSES, FULFILLMENT_STATUSES } from "@/lib/models/enums";
import { orderStatusEmail } from "@/lib/emails/orders";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { cancellationSchema } from "@/lib/validation/checkout";
import { type ActionState } from "@/lib/validation/shared";

/** Order processing.
 *
 *  Fulfilment is a manual dropdown, exactly as the client asked (C3) — no
 *  courier API. Every change is timestamped, attributed to the admin who made
 *  it, and emailed to the customer, so the order page and the customer's inbox
 *  tell the same story.
 *
 *  **No money moves from here.** Refunds are issued by hand in the Stripe
 *  dashboard (plan §3); this records what was decided and by whom.
 */

const statusSchema = z.object({
  orderId: z.string().regex(/^[0-9a-f]{24}$/i),
  status: z.enum(FULFILLMENT_STATUSES),
  note: z.string().trim().max(500).default(""),
  courier: z.string().trim().max(120).default(""),
  trackingNumber: z.string().trim().max(120).default(""),
  notify: z.boolean().default(true),
});

export async function updateOrderStatus(payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("orders:write");

  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  await connectDb();
  const settings = await getSettings();

  const order = await Order.findById(parsed.data.orderId);
  if (!order) return { error: "That order no longer exists." };

  // An unpaid order has nothing to pack. Letting it move through fulfilment
  // would put stock on a van for an order nobody paid for.
  if (order.paymentStatus !== "paid" && parsed.data.status !== "cancelled") {
    return { error: "This order is not paid, so it cannot be fulfilled. Cancel it instead." };
  }

  const previous = order.fulfillmentStatus;
  const changed = previous !== parsed.data.status;

  order.fulfillmentStatus = parsed.data.status;
  if (parsed.data.courier) order.tracking.courier = parsed.data.courier;
  if (parsed.data.trackingNumber) order.tracking.number = parsed.data.trackingNumber;
  if (parsed.data.note) order.tracking.note = parsed.data.note;

  if (changed) {
    order.statusHistory.push({
      status: parsed.data.status,
      at: new Date(),
      byAdminId: admin.adminId,
      note: parsed.data.note,
    });
  }

  await order.save();

  await recordAudit(admin, {
    action: "status",
    entity: "Order",
    entityId: String(order._id),
    entityLabel: order.orderNumber,
    diff: { fulfillmentStatus: { from: previous, to: parsed.data.status } },
  });

  if (changed && parsed.data.notify) {
    try {
      const mail = orderStatusEmail(order.toObject(), parsed.data.status, settings);
      await sendMail({ to: order.email, ...mail });
    } catch (error) {
      // Never fail the status change because the email did not send.
      console.error(`[orders] status email failed for ${order.orderNumber}`, error);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order._id}`);
  revalidatePath("/[locale]/account/orders", "page");

  return { ok: true, notice: changed ? `Marked ${parsed.data.status.replace(/_/g, " ")}.` : "Saved." };
}

/** Records what was refunded in Stripe. The app never calls Stripe's refund
 *  API — the client chose to refund by hand in the dashboard (plan §3) — so
 *  this is the shop's own note of what happened. */
export async function recordRefundNote(orderId: string, note: string): Promise<ActionState> {
  const admin = await requireAdmin("orders:write");
  await connectDb();

  const order = await Order.findById(orderId);
  if (!order) return { error: "That order no longer exists." };

  order.refundNote = note.trim().slice(0, 1000);
  // Only the admin can say this happened; Stripe's refund webhook is not wired
  // up, because refunds are issued outside the app.
  if (note.trim()) order.paymentStatus = "refunded";
  await order.save();

  await recordAudit(admin, {
    action: "refund",
    entity: "Order",
    entityId: orderId,
    entityLabel: order.orderNumber,
    diff: { refundNote: note },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, notice: "Refund noted." };
}

// --- Customer-side cancellation (plan 8.5) -----------------------------------

/** A request, not a cancellation.
 *
 *  The customer asks; an admin decides and refunds in Stripe. Nothing is
 *  cancelled and no money moves automatically — which is what the client chose,
 *  and what keeps a dispatched parcel from being "cancelled" after it has left.
 */
export async function requestCancellation(payload: unknown): Promise<ActionState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in again." };

  const parsed = cancellationSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Tell us briefly why." };

  await connectDb();
  const order = await Order.findOne({
    orderNumber: parsed.data.orderNumber,
    customerId: customer._id,
  });
  if (!order) return { error: "That order could not be found." };

  if (!CANCELLABLE_STATUSES.includes(order.fulfillmentStatus)) {
    return {
      error: "This order has already been dispatched. Contact us and we will help with a return.",
    };
  }
  if (order.cancellationRequest.status === "requested") {
    return { ok: true, notice: "We already have your request and will be in touch." };
  }

  order.cancellationRequest.status = "requested";
  order.cancellationRequest.requestedAt = new Date();
  order.cancellationRequest.reason = parsed.data.reason;
  await order.save();

  const settings = await getSettings();
  if (settings.notifications.adminAlertEmails.length > 0) {
    await sendMail({
      to: settings.notifications.adminAlertEmails,
      subject: `Cancellation requested — ${order.orderNumber}`,
      html: `<p>${order.email} asked to cancel ${order.orderNumber}.</p><p>Reason: ${parsed.data.reason}</p>`,
    });
  }

  revalidatePath("/admin/orders");
  return { ok: true, notice: "We have your request and will be in touch shortly." };
}

export async function resolveCancellation(
  orderId: string,
  decision: "approved" | "declined",
  note: string,
): Promise<ActionState> {
  const admin = await requireAdmin("orders:write");
  await connectDb();

  const order = await Order.findById(orderId);
  if (!order) return { error: "That order no longer exists." };

  order.cancellationRequest.status = decision;
  order.cancellationRequest.handledBy = admin.adminId;
  order.cancellationRequest.handledAt = new Date();
  order.cancellationRequest.adminNote = note.trim().slice(0, 500);

  // Approving marks the order cancelled. The refund itself is still issued by
  // hand in Stripe — this does not move money.
  if (decision === "approved" && order.fulfillmentStatus !== "cancelled") {
    order.fulfillmentStatus = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      at: new Date(),
      byAdminId: admin.adminId,
      note: "Cancellation approved",
    });
  }

  await order.save();

  await recordAudit(admin, {
    action: decision === "approved" ? "approve" : "reject",
    entity: "Order",
    entityId: orderId,
    entityLabel: order.orderNumber,
    diff: { cancellation: decision, note },
  });

  try {
    await sendMail({
      to: order.email,
      subject:
        decision === "approved"
          ? `Order ${order.orderNumber} cancelled`
          : `About your cancellation request for ${order.orderNumber}`,
      html:
        decision === "approved"
          ? `<p>Your order ${order.orderNumber} has been cancelled. Any refund will appear on your original payment method.</p>${note ? `<p>${note}</p>` : ""}`
          : `<p>We were not able to cancel order ${order.orderNumber}.</p>${note ? `<p>${note}</p>` : ""}`,
    });
  } catch (error) {
    console.error(`[orders] cancellation email failed for ${order.orderNumber}`, error);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, notice: decision === "approved" ? "Cancelled." : "Request declined." };
}
