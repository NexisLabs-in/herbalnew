import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderFulfilment } from "@/components/admin/OrderFulfilment";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { AdminUser, Order, type OrderDoc } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  packed: "Packed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders:read");
  const { id } = await params;

  await connectDb();
  const order = await Order.findById(id).lean<OrderDoc | null>().catch(() => null);
  if (!order) notFound();

  // Who made each change, resolved in one query rather than per row.
  const adminIds = order.statusHistory
    .map((event) => event.byAdminId)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const admins = adminIds.length
    ? await AdminUser.find({ _id: { $in: adminIds } }).select("name email").lean()
    : [];
  const adminName = new Map(admins.map((entry) => [String(entry._id), entry.name || entry.email]));

  const address = order.shippingAddress;
  const writable = can(admin.permissions, "orders:write");

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <p className="admin-crumb">
            <Link href="/admin/orders">Orders</Link> / {order.orderNumber}
          </p>
          <h1 className="admin-head__title">{order.orderNumber}</h1>
          <p className="admin-head__sub">
            {new Date(order.createdAt).toLocaleString("en-AE")} ·{" "}
            <span className={`admin-chip ${order.paymentStatus === "paid" ? "admin-chip--published" : "admin-chip--warn"}`}>
              {order.paymentStatus}
            </span>{" "}
            <span className="admin-chip">{STATUS_LABEL[order.fulfillmentStatus]}</span>
          </p>
        </div>
        <Link className="btn btn--ghost btn--sm" href={`/en/invoice/${order.orderNumber}`} target="_blank">
          Invoice
        </Link>
      </div>

      <div className="admin-order">
        <div className="admin-order__main">
          <div className="admin-card">
            <h2 className="admin-fieldset__legend">Items</h2>
            <div className="admin-table-wrap" style={{ border: "none", marginTop: "1rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="admin-table__actions">Qty</th>
                    <th className="admin-table__actions">Unit</th>
                    <th className="admin-table__actions">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <span className="admin-table__title">{item.name.en}</span>
                        <span className="admin-table__meta">
                          {item.sku}
                          {item.discountFils > 0 ? ` · ${item.discountSource} discount applied` : ""}
                        </span>
                      </td>
                      <td className="admin-table__actions">{item.qty}</td>
                      <td className="admin-table__actions admin-table__mono">
                        {formatFils(item.unitPriceFils - item.discountFils, "en")}
                      </td>
                      <td className="admin-table__actions admin-table__mono">
                        {formatFils(item.lineTotalFils, "en")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="cart-totals" style={{ marginTop: "1.25rem" }}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatFils(order.subtotalFils, "en")}</dd>
              </div>
              {order.productDiscountFils > 0 ? (
                <div className="cart-totals__save">
                  <dt>Product discounts</dt>
                  <dd>−{formatFils(order.productDiscountFils, "en")}</dd>
                </div>
              ) : null}
              {order.couponDiscountFils > 0 ? (
                <div className="cart-totals__save">
                  <dt>Coupon {order.couponCode}</dt>
                  <dd>−{formatFils(order.couponDiscountFils, "en")}</dd>
                </div>
              ) : null}
              <div>
                <dt>Shipping</dt>
                <dd>{order.shippingFils === 0 ? "Free" : formatFils(order.shippingFils, "en")}</dd>
              </div>
              {order.taxFils > 0 ? (
                <div>
                  <dt>VAT {order.taxRate}%</dt>
                  <dd>{formatFils(order.taxFils, "en")}</dd>
                </div>
              ) : null}
              <div className="cart-totals__grand">
                <dt>Total</dt>
                <dd>{formatFils(order.grandTotalFils, "en")}</dd>
              </div>
            </dl>
          </div>

          {writable ? (
            <OrderFulfilment
              orderId={String(order._id)}
              status={order.fulfillmentStatus}
              courier={order.tracking?.courier ?? ""}
              trackingNumber={order.tracking?.number ?? ""}
              note={order.tracking?.note ?? ""}
              paid={order.paymentStatus === "paid"}
              refundNote={order.refundNote ?? ""}
              cancellation={
                order.cancellationRequest?.status && order.cancellationRequest.status !== "none"
                  ? {
                      status: order.cancellationRequest.status,
                      reason: order.cancellationRequest.reason ?? "",
                      adminNote: order.cancellationRequest.adminNote ?? "",
                    }
                  : null
              }
            />
          ) : null}
        </div>

        <aside className="admin-order__side">
          <div className="admin-card">
            <h2 className="admin-fieldset__legend">Customer</h2>
            <p style={{ marginTop: ".75rem" }}>
              {address.fullName}
              <br />
              <a href={`mailto:${order.email}`}>{order.email}</a>
              <br />
              <a href={`tel:${address.phone}`}>{address.phone}</a>
            </p>
            <p className="admin-stat__label" style={{ marginTop: "1rem" }}>
              Delivery address
            </p>
            <p style={{ marginTop: ".4rem" }}>
              {address.line1}
              {address.line2 ? <>, {address.line2}</> : null}
              <br />
              {address.city}, {address.emirate}
              <br />
              {address.country}
            </p>
          </div>

          <div className="admin-card">
            <h2 className="admin-fieldset__legend">History</h2>
            {order.statusHistory.length === 0 ? (
              <p className="admin-stat__note" style={{ marginTop: ".75rem" }}>
                Nothing recorded yet.
              </p>
            ) : (
              <ol className="admin-timeline">
                {order.statusHistory.map((event, index) => (
                  <li key={index}>
                    <strong>{STATUS_LABEL[event.status] ?? event.status}</strong>
                    <span className="admin-table__meta">
                      {new Date(event.at).toLocaleString("en-AE")}
                      {event.byAdminId ? ` · ${adminName.get(String(event.byAdminId)) ?? "admin"}` : ""}
                    </span>
                    {event.note ? <p className="admin-stat__note">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {order.stripe?.paymentIntentId ? (
            <div className="admin-card">
              <h2 className="admin-fieldset__legend">Payment</h2>
              <p className="admin-table__meta" style={{ marginTop: ".6rem", wordBreak: "break-all" }}>
                {order.stripe.paymentIntentId}
              </p>
              <p className="admin-stat__note" style={{ marginTop: ".5rem" }}>
                Refunds are issued in the Stripe dashboard.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </AdminShell>
  );
}
