import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category, Customer, Order, Product, Review } from "@/lib/models";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Dashboard" };

/** The dashboard.
 *
 *  Phase 2 delivers the shell and the counts that already have data behind
 *  them; the sales and revenue panels arrive with orders in Phase 6. Showing a
 *  real zero is better than a fake chart — an empty store looks empty.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdminPage("dashboard:read");

  await connectDb();
  const settings = await getSettings();
  const threshold = settings.inventory.lowStockThreshold;

  const [products, published, categories, customers, orders, newOrders, pendingReviews, lowStock] =
    await Promise.all([
      Product.countDocuments({ status: { $ne: "archived" } }),
      Product.countDocuments({ status: "published" }),
      Category.countDocuments({}),
      Customer.countDocuments({}),
      Order.countDocuments({ paymentStatus: "paid" }),
      Order.countDocuments({ fulfillmentStatus: "new", paymentStatus: "paid" }),
      Review.countDocuments({ status: "pending" }),
      Product.countDocuments({
        trackInventory: true,
        status: "published",
        stock: { $lte: threshold },
      }),
    ]);

  const stats = [
    { label: "Products", value: products, note: `${published} published` },
    { label: "Categories", value: categories },
    { label: "Customers", value: customers },
    { label: "Paid orders", value: orders, note: newOrders ? `${newOrders} awaiting packing` : undefined },
    {
      label: "Low stock",
      value: lowStock,
      note: `at or below ${threshold}`,
    },
    { label: "Reviews to moderate", value: pendingReviews },
  ];

  return (
    <AdminShell
      admin={admin}
      badges={{ newOrders, pendingReviews, lowStock }}
    >
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Dashboard</h1>
          <p className="admin-head__sub">
            Signed in as {admin.email} · {admin.roleName}
          </p>
        </div>
      </div>

      <div className="admin-grid">
        {stats.map((stat) => (
          <div className="admin-card" key={stat.label}>
            <p className="admin-stat__label">{stat.label}</p>
            <p className="admin-stat__value">{stat.value}</p>
            {stat.note ? <p className="admin-stat__note">{stat.note}</p> : null}
          </div>
        ))}
      </div>

      <p className="admin-note" style={{ marginTop: "1.5rem" }}>
        Sales and revenue summaries arrive with order processing. The catalogue, order and
        content modules are being built in the order set out in docs/IMPLEMENTATION_PLAN.md.
      </p>
    </AdminShell>
  );
}
