import "server-only";
import { connectDb } from "./db";
import { env } from "./env";
import { Customer } from "./models/Customer";
import { Order } from "./models/Order";
import { Product } from "./models/Product";
import { getSettings } from "./settings";

/** Reporting.
 *
 *  Every figure counts **paid** orders only. Pending and failed orders are
 *  attempts, not revenue, and including them would flatter every number on the
 *  page — the one thing a report must never do.
 */

export type DateRange = { from: Date; to: Date };

export function rangeFromDays(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export type SalesPoint = { date: string; revenueFils: number; orders: number };

export type ReportSummary = {
  revenueFils: number;
  orders: number;
  averageOrderFils: number;
  itemsSold: number;
  newCustomers: number;
  series: SalesPoint[];
  topProducts: { name: string; sku: string; qty: number; revenueFils: number }[];
  byStatus: { status: string; count: number }[];
  lowStock: { name: string; sku: string; stock: number }[];
};

export async function buildReport(range: DateRange): Promise<ReportSummary> {
  await connectDb();
  const settings = await getSettings();

  const paidInRange = {
    paymentStatus: "paid",
    paidAt: { $gte: range.from, $lte: range.to },
  } as const;

  const [totals, series, topProducts, byStatus, newCustomers, lowStock] = await Promise.all([
    Order.aggregate<{ revenue: number; orders: number; items: number }>([
      { $match: paidInRange },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotalFils" },
          orders: { $sum: 1 },
          items: { $sum: { $sum: "$items.qty" } },
        },
      },
    ]),

    Order.aggregate<{ _id: string; revenue: number; orders: number }>([
      { $match: paidInRange },
      {
        $group: {
          // Grouped by calendar day in the store's timezone, so a chart's days
          // line up with the shop's days rather than with UTC.
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: env.TimeZone } },
          revenue: { $sum: "$grandTotalFils" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate<{ _id: string; name: string; sku: string; qty: number; revenue: number }>([
      { $match: paidInRange },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name.en" },
          sku: { $first: "$items.sku" },
          qty: { $sum: "$items.qty" },
          revenue: { $sum: "$items.lineTotalFils" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),

    Order.aggregate<{ _id: string; count: number }>([
      { $match: paidInRange },
      { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
    ]),

    Customer.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } }),

    Product.find({
      status: "published",
      trackInventory: true,
      stock: { $lte: settings.inventory.lowStockThreshold },
    })
      .sort({ stock: 1 })
      .limit(20)
      .select("name sku stock")
      .lean(),
  ]);

  const summary = totals[0] ?? { revenue: 0, orders: 0, items: 0 };

  // Days with no orders are filled in with zeroes: a line chart that skips them
  // implies trade on days the shop sold nothing.
  const byDate = new Map(series.map((point) => [point._id, point]));
  const filled: SalesPoint[] = [];
  const cursor = new Date(range.from);
  while (cursor <= range.to) {
    const key = cursor.toISOString().slice(0, 10);
    const point = byDate.get(key);
    filled.push({ date: key, revenueFils: point?.revenue ?? 0, orders: point?.orders ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    revenueFils: summary.revenue,
    orders: summary.orders,
    averageOrderFils: summary.orders === 0 ? 0 : Math.round(summary.revenue / summary.orders),
    itemsSold: summary.items,
    newCustomers,
    series: filled,
    topProducts: topProducts.map((row) => ({
      name: row.name,
      sku: row.sku,
      qty: row.qty,
      revenueFils: row.revenue,
    })),
    byStatus: byStatus.map((row) => ({ status: row._id, count: row.count })),
    lowStock: lowStock.map((product) => ({
      name: product.name.en,
      sku: product.sku,
      stock: product.stock,
    })),
  };
}

/** CSV, quoted properly.
 *
 *  A field containing a comma, a quote or a newline breaks a naive join, and
 *  order data contains all three — addresses have commas and notes have
 *  newlines. Excel also treats a leading `=`, `+`, `-` or `@` as a formula, so
 *  those are prefixed to stop a spreadsheet executing a product name.
 */
export function toCsv(rows: (string | number)[][]): string {
  const escape = (value: string | number): string => {
    const text = String(value ?? "");
    const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${guarded.replace(/"/g, '""')}"`;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
