import "server-only";
import { connectDb } from "../db";
import { Cart } from "../models/Cart";
import { Customer } from "../models/Customer";
import { PriceEnquiry } from "../models/PriceEnquiry";
import { Product } from "../models/Product";
import { Sale } from "../models/Sale";
import { StockNotification } from "../models/StockNotification";
import { getSettings } from "../settings";
import { sendMail } from "../mail";
import { lowStockAdminEmail } from "../emails/orders";
import { abandonedCartEmail, backInStockEmail } from "../emails/reminders";

/** The scheduled work.
 *
 *  Each task is an ordinary async function that reports what it did, so it can
 *  be run by the cron, by a test, or by hand from the admin panel. Nothing here
 *  assumes it is being called on a schedule.
 *
 *  Every task is safe to run twice: the flags that mark work as done are
 *  written as part of doing it, so a double-fire sends nothing twice.
 */

export type TaskResult = { task: string; done: number; note?: string };

/** Requirement C12: the once-daily digest of everything low or out of stock.
 *  Separate from the instant alert, which fires the moment an order crosses the
 *  threshold — the digest is the sweep that catches what the instant one has
 *  already reported and nobody has acted on. */
export async function lowStockDigest(): Promise<TaskResult> {
  await connectDb();
  const settings = await getSettings();
  const to = settings.notifications.adminAlertEmails;

  if (to.length === 0) return { task: "lowStockDigest", done: 0, note: "no admin alert addresses" };

  const low = await Product.find({
    status: "published",
    trackInventory: true,
    stock: { $lte: settings.inventory.lowStockThreshold },
  })
    .sort({ stock: 1 })
    .lean();

  if (low.length === 0) return { task: "lowStockDigest", done: 0, note: "nothing low" };

  const mail = lowStockAdminEmail(
    low.map((product) => ({ name: product.name.en, sku: product.sku, stock: product.stock })),
    settings.inventory.lowStockThreshold,
  );
  await sendMail({ to, ...mail });

  return { task: "lowStockDigest", done: low.length };
}

/** A reminder for a basket left behind.
 *
 *  Only to customers who are signed in — an anonymous cart has no address to
 *  write to, and asking for one to send a reminder would be the wrong trade.
 *  Sent once per cart: `abandonedEmailSentAt` is set as part of sending, so a
 *  basket that sits for a week is not nagged daily.
 */
export async function abandonedCartReminders(): Promise<TaskResult> {
  await connectDb();
  const settings = await getSettings();

  if (!settings.cart.abandonedEmailEnabled) {
    return { task: "abandonedCart", done: 0, note: "disabled" };
  }

  const cutoff = new Date(Date.now() - settings.cart.abandonedAfterHours * 60 * 60 * 1000);

  const carts = await Cart.find({
    customerId: { $ne: null },
    abandonedEmailSentAt: null,
    updatedAt: { $lte: cutoff },
    "items.0": { $exists: true },
  }).limit(100);

  let sent = 0;

  for (const cart of carts) {
    const customer = await Customer.findById(cart.customerId).lean();
    if (!customer) continue;

    const products = await Product.find({
      _id: { $in: cart.items.map((item: { productId: unknown }) => item.productId) },
      status: "published",
    })
      .select("name slug")
      .lean();

    // Everything in the basket has since been unpublished — there is nothing
    // left to come back to.
    if (products.length === 0) continue;

    // Stamped before sending, so a failure mid-send cannot cause a second
    // attempt on the next run.
    cart.abandonedEmailSentAt = new Date();
    await cart.save();

    const mail = abandonedCartEmail({
      locale: "en",
      storeName: settings.store.name,
      items: products.map((product) => product.name),
    });
    await sendMail({ to: customer.email, ...mail });
    sent += 1;
  }

  return { task: "abandonedCart", done: sent };
}

/** Quotes stop being valid on their own; this only records that they have, so
 *  the admin list is honest about what is still outstanding (C1). */
export async function expireQuotes(): Promise<TaskResult> {
  await connectDb();
  const result = await PriceEnquiry.updateMany(
    { status: "quoted", quoteExpiresAt: { $lt: new Date() } },
    { $set: { status: "expired", quoteToken: null } },
  );
  return { task: "expireQuotes", done: result.modifiedCount };
}

/** The pricing engine already ignores a sale outside its window, so this is
 *  bookkeeping rather than enforcement — it keeps the admin list showing
 *  "ended" instead of a stale "scheduled" (C6). */
export async function retireFinishedSales(): Promise<TaskResult> {
  await connectDb();
  const result = await Sale.updateMany(
    { active: true, endAt: { $lt: new Date() } },
    { $set: { active: false } },
  );
  return { task: "retireSales", done: result.modifiedCount };
}

/** Tells everybody waiting that something is back (plan 8.7).
 *
 *  Driven from the notification records rather than from a stock event, so a
 *  restock by any route — the inventory screen, a product edit, a returned
 *  order — reaches the same people.
 */
export async function backInStockNotices(): Promise<TaskResult> {
  await connectDb();
  const settings = await getSettings();

  const pending = await StockNotification.find({ notifiedAt: null }).limit(200);
  if (pending.length === 0) return { task: "backInStock", done: 0 };

  const products = await Product.find({
    _id: { $in: pending.map((entry) => entry.productId) },
    status: "published",
    stock: { $gt: 0 },
  })
    .select("name slug")
    .lean();

  const back = new Map(products.map((product) => [String(product._id), product]));
  let sent = 0;

  for (const entry of pending) {
    const product = back.get(String(entry.productId));
    if (!product) continue;

    entry.notifiedAt = new Date();
    await entry.save();

    const mail = backInStockEmail({
      locale: entry.locale === "ar" ? "ar" : "en",
      storeName: settings.store.name,
      name: product.name,
      slug: product.slug,
    });
    await sendMail({ to: entry.email, ...mail });
    sent += 1;
  }

  return { task: "backInStock", done: sent };
}

/** Everything the hourly sweep does. */
export async function hourlyTasks(): Promise<TaskResult[]> {
  return [
    await expireQuotes(),
    await retireFinishedSales(),
    await backInStockNotices(),
    await abandonedCartReminders(),
  ];
}
