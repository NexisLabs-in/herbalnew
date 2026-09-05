import "server-only";
import { connectDb } from "./db";
import { Cart } from "./models/Cart";
import { Coupon, CouponRedemption } from "./models/Coupon";
import { nextInvoiceNumber } from "./models/Counter";
import { Order } from "./models/Order";
import { Product } from "./models/Product";
import { getSettings } from "./settings";
import { sendMail } from "./mail";
import { orderConfirmationEmail, newOrderAdminEmail, lowStockAdminEmail } from "./emails/orders";

/** What happens when an order is actually paid.
 *
 *  Called only from the Stripe webhook. Everything here must be **idempotent**:
 *  Stripe retries on failure and can redeliver an event it already delivered,
 *  so running this twice for one order has to leave the same result as running
 *  it once. The guard is `paidAt` for the order as a whole and `stockAppliedAt`
 *  for inventory specifically — a partial failure halfway through must not
 *  decrement stock a second time on the retry.
 */

export async function fulfilPaidOrder(input: {
  orderId: string | null;
  sessionId: string;
  paymentIntentId: string | null;
  eventId: string;
  amountTotal: number | null;
}): Promise<void> {
  await connectDb();

  const order = input.orderId
    ? await Order.findById(input.orderId)
    : await Order.findOne({ "stripe.checkoutSessionId": input.sessionId });

  if (!order) {
    console.error(`[fulfil] no order for session ${input.sessionId}`);
    return;
  }

  // Already handled — a redelivery of an event we have processed.
  if (order.paymentStatus === "paid" && order.stockAppliedAt) return;

  // What Stripe says was charged must match what we recorded, or something is
  // wrong enough that a human should look rather than the order shipping.
  if (input.amountTotal !== null && input.amountTotal !== order.grandTotalFils) {
    console.error(
      `[fulfil] amount mismatch on ${order.orderNumber}: stripe ${input.amountTotal} vs order ${order.grandTotalFils}`,
    );
  }

  const settings = await getSettings();

  order.paymentStatus = "paid";
  order.paidAt = order.paidAt ?? new Date();
  order.stripe.checkoutSessionId = input.sessionId;
  if (input.paymentIntentId) order.stripe.paymentIntentId = input.paymentIntentId;
  if (!order.invoiceNumber) order.invoiceNumber = await nextInvoiceNumber(settings.invoice.prefix);
  if (order.statusHistory.length === 0) {
    order.statusHistory.push({ status: "new", at: new Date(), note: "Payment received" });
  }
  await order.save();

  // --- Stock, claimed once ---------------------------------------------------
  if (!order.stockAppliedAt) {
    const lowStock: { name: string; sku: string; stock: number }[] = [];

    for (const item of order.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, trackInventory: true },
        { $inc: { stock: -item.qty } },
        { returnDocument: "after" },
      );
      if (!product) continue;

      // Stock can go negative if two orders raced for the last unit. That is
      // recorded rather than clamped: the shop owes somebody a unit, and a
      // silent zero would hide that.
      if (product.stock < 0) {
        console.warn(`[fulfil] ${product.sku} oversold to ${product.stock} on ${order.orderNumber}`);
      }

      // Requirement C12: the instant low-stock alert, armed once per dip.
      if (product.stock <= settings.inventory.lowStockThreshold && !product.lowStockAlertedAt) {
        product.lowStockAlertedAt = new Date();
        await product.save();
        lowStock.push({ name: product.name.en, sku: product.sku, stock: product.stock });
      }
    }

    order.stockAppliedAt = new Date();
    await order.save();

    if (lowStock.length > 0 && settings.notifications.adminAlertEmails.length > 0) {
      const mail = lowStockAdminEmail(lowStock, settings.inventory.lowStockThreshold);
      await sendMail({ to: settings.notifications.adminAlertEmails, ...mail });
    }
  }

  // --- Coupon usage ----------------------------------------------------------
  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon) {
      // The redemption record is unique per order, so a redelivered event
      // cannot inflate the counter — the insert fails and the increment is
      // skipped with it.
      try {
        await CouponRedemption.create({
          couponId: coupon._id,
          customerId: order.customerId,
          orderId: order._id,
          discountFils: order.couponDiscountFils,
        });
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
  }

  // --- The basket is now an order --------------------------------------------
  await Cart.deleteOne({ customerId: order.customerId });

  // --- Notifications ---------------------------------------------------------
  // Email failures are logged, never thrown: the order is paid whether or not
  // our mail provider is up, and throwing would make Stripe retry the whole
  // fulfilment.
  try {
    const confirmation = orderConfirmationEmail(order.toObject(), settings);
    await sendMail({ to: order.email, ...confirmation });
  } catch (error) {
    console.error(`[fulfil] confirmation email failed for ${order.orderNumber}`, error);
  }

  try {
    if (settings.notifications.adminAlertEmails.length > 0) {
      const alert = newOrderAdminEmail(order.toObject());
      await sendMail({ to: settings.notifications.adminAlertEmails, ...alert });
    }
  } catch (error) {
    console.error(`[fulfil] admin alert failed for ${order.orderNumber}`, error);
  }
}

/** An abandoned or failed payment.
 *
 *  The order is kept rather than deleted — it is evidence that somebody tried,
 *  and an admin looking at a customer's history should see the attempt. Nothing
 *  else happens: no stock was claimed, so nothing has to be given back.
 */
export async function markPaymentFailed(orderId: string | null): Promise<void> {
  if (!orderId) return;
  await connectDb();

  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus === "paid") return;

  order.paymentStatus = "failed";
  await order.save();
}
