import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { ContactMessage, Customer, Order, PriceEnquiry, Product, Review, type OrderDoc } from "@/lib/models";
import { can } from "@/lib/permissions";
import { buildReport, rangeFromDays } from "@/lib/reports";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** The dashboard.
 *
 *  Two questions, in this order: **what needs me today**, and **how is the shop
 *  doing**. Attention comes first because it is the reason somebody opens this
 *  page in the morning, and every item on it is a link to the screen that
 *  clears it — a count that cannot be acted on is just decoration.
 *
 *  Figures count paid orders only. Attempts are not revenue.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdminPage("dashboard:read");

  await connectDb();
  const settings = await getSettings();
  const threshold = settings.inventory.lowStockThreshold;

  const [report, counts, recentOrders] = await Promise.all([
    buildReport(rangeFromDays(30)),
    Promise.all([
      Order.countDocuments({ fulfillmentStatus: "new", paymentStatus: "paid" }),
      Review.countDocuments({ status: "pending" }),
      PriceEnquiry.countDocuments({ status: "new" }),
      ContactMessage.countDocuments({ status: "new" }),
      Order.countDocuments({ "cancellationRequest.status": "requested" }),
      Product.countDocuments({ trackInventory: true, status: "published", stock: { $lte: threshold } }),
      Product.countDocuments({ status: "published" }),
      Customer.countDocuments({}),
    ]),
    Order.find({ paymentStatus: "paid" }).sort({ paidAt: -1 }).limit(6).lean<OrderDoc[]>(),
  ]);

  const [
    newOrders,
    pendingReviews,
    newEnquiries,
    newMessages,
    cancellations,
    lowStock,
    publishedProducts,
    customers,
  ] = counts;

  /** Only what actually needs doing, each linking to where it gets done. */
  const attention = [
    { label: "orders to pack", count: newOrders, href: "/admin/orders?status=new", permission: "orders:read" as const },
    { label: "cancellation requests", count: cancellations, href: "/admin/orders", permission: "orders:read" as const },
    { label: "price enquiries", count: newEnquiries, href: "/admin/enquiries", permission: "enquiries:read" as const },
    { label: "reviews to approve", count: pendingReviews, href: "/admin/reviews", permission: "reviews:read" as const },
    { label: "unread messages", count: newMessages, href: "/admin/messages", permission: "messages:read" as const },
    { label: "products low on stock", count: lowStock, href: "/admin/inventory", permission: "inventory:read" as const },
  ].filter((item) => item.count > 0 && can(admin.permissions, item.permission));

  const stats = [
    { label: "Revenue · 30 days", value: formatFils(report.revenueFils, "en") ?? "—" },
    { label: "Paid orders · 30 days", value: String(report.orders) },
    { label: "Average order", value: report.orders ? (formatFils(report.averageOrderFils, "en") ?? "—") : "—" },
    { label: "Items sold · 30 days", value: String(report.itemsSold) },
    { label: "Customers", value: String(customers), note: `${report.newCustomers} new this month` },
    { label: "Published products", value: String(publishedProducts) },
  ];

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Dashboard</h1>
          <p className="admin-head__sub">
            Signed in as {admin.email} · {admin.roleName}
          </p>
        </div>
        {can(admin.permissions, "reports:read") ? (
          <Link className="btn btn--ghost btn--sm" href="/admin/reports">
            Full reports
          </Link>
        ) : null}
      </div>

      {attention.length > 0 ? (
        <div className="admin-card admin-attention">
          <p className="admin-stat__label">Needs you</p>
          <ul>
            {attention.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>
                  <strong>{item.count}</strong> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="admin-note">Nothing is waiting on you.</p>
      )}

      <div className="admin-grid" style={{ marginTop: "1.25rem" }}>
        {stats.map((stat) => (
          <div className="admin-card" key={stat.label}>
            <p className="admin-stat__label">{stat.label}</p>
            <p className="admin-stat__value">{stat.value}</p>
            {stat.note ? <p className="admin-stat__note">{stat.note}</p> : null}
          </div>
        ))}
      </div>

      {can(admin.permissions, "orders:read") ? (
        <div className="admin-card" style={{ marginTop: "1.25rem" }}>
          <div className="admin-review__head">
            <h2 className="admin-fieldset__legend">Recent orders</h2>
            <Link className="link-plain" href="/admin/orders">
              All orders
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="admin-stat__note" style={{ marginTop: ".75rem" }}>
              No paid orders yet. They will appear here as they come in.
            </p>
          ) : (
            <div className="admin-table-wrap" style={{ border: "none", marginTop: ".75rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Stage</th>
                    <th className="admin-table__actions">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={String(order._id)}>
                      <td>
                        <Link className="admin-table__title" href={`/admin/orders/${order._id}`}>
                          {order.orderNumber}
                        </Link>
                        <span className="admin-table__meta">
                          {order.paidAt ? new Date(order.paidAt).toLocaleDateString("en-AE") : ""}
                        </span>
                      </td>
                      <td>
                        {order.shippingAddress.fullName}
                        <span className="admin-table__meta">{order.email}</span>
                      </td>
                      <td>
                        <span className="admin-chip">
                          {order.fulfillmentStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="admin-table__actions admin-table__mono">
                        {formatFils(order.grandTotalFils, "en")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {report.topProducts.length > 0 ? (
        <div className="admin-card" style={{ marginTop: "1.25rem" }}>
          <h2 className="admin-fieldset__legend">Best sellers · 30 days</h2>
          <dl className="cart-totals" style={{ marginTop: ".75rem" }}>
            {report.topProducts.slice(0, 5).map((product) => (
              <div key={product.sku}>
                <dt>{product.name}</dt>
                <dd>
                  {product.qty} · {formatFils(product.revenueFils, "en")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </AdminShell>
  );
}
