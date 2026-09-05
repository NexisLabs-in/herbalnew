import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { Order, type OrderDoc } from "@/lib/models";
import { FULFILLMENT_STATUSES, type FulfillmentStatus } from "@/lib/models/enums";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<FulfillmentStatus, string> = {
  new: "New",
  packed: "Packed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Chips carry meaning here: what needs doing is violet, what is finished is
 *  quiet, what went wrong is red. An admin scans this column, not the text. */
const STATUS_CHIP: Record<FulfillmentStatus, string> = {
  new: "admin-chip--warn",
  packed: "admin-chip--warn",
  dispatched: "",
  out_for_delivery: "",
  delivered: "admin-chip--published",
  cancelled: "admin-chip--danger",
  returned: "admin-chip--danger",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; payment?: string }>;
}) {
  const admin = await requireAdminPage("orders:read");
  const { status, q, payment } = await searchParams;

  await connectDb();

  const filter: Record<string, unknown> = {};
  if (status && FULFILLMENT_STATUSES.includes(status as FulfillmentStatus)) {
    filter.fulfillmentStatus = status;
  }
  if (payment) filter.paymentStatus = payment;
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { "shippingAddress.fullName": { $regex: q, $options: "i" } },
    ];
  }

  const [orders, counts, pendingCancellations] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).limit(200).lean<OrderDoc[]>(),
    Order.aggregate<{ _id: string; count: number }>([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ "cancellationRequest.status": "requested" }),
  ]);

  const countFor = new Map(counts.map((row) => [row._id, row.count]));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Orders</h1>
          <p className="admin-head__sub">
            {countFor.get("new") ?? 0} awaiting packing · {countFor.get("dispatched") ?? 0} in transit ·{" "}
            {countFor.get("delivered") ?? 0} delivered
          </p>
        </div>
      </div>

      {pendingCancellations > 0 ? (
        <p className="admin-note" style={{ marginBottom: "1.25rem" }}>
          {pendingCancellations} cancellation request{pendingCancellations === 1 ? "" : "s"} waiting
          for a decision.
        </p>
      ) : null}

      <form className="admin-filters" action="/admin/orders">
        <input
          className="field__input field__input--sm"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Order number, name or email"
          style={{ maxWidth: "280px" }}
        />
        <select className="field__input field__input--sm" name="status" defaultValue={status ?? ""} style={{ maxWidth: "180px" }}>
          <option value="">Any stage</option>
          {FULFILLMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <select className="field__input field__input--sm" name="payment" defaultValue={payment ?? ""} style={{ maxWidth: "160px" }}>
          <option value="">Any payment</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button className="btn btn--ghost btn--sm" type="submit">
          Filter
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="admin-empty">No orders match.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Stage</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const id = String(order._id);
                return (
                  <tr key={id}>
                    <td>
                      <Link className="admin-table__title" href={`/admin/orders/${id}`}>
                        {order.orderNumber}
                      </Link>
                      <span className="admin-table__meta">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"}
                        {order.cancellationRequest?.status === "requested"
                          ? " · cancellation requested"
                          : ""}
                      </span>
                    </td>
                    <td>
                      {order.shippingAddress.fullName}
                      <span className="admin-table__meta">{order.email}</span>
                    </td>
                    <td className="admin-table__mono">{formatFils(order.grandTotalFils, "en")}</td>
                    <td>
                      <span
                        className={`admin-chip ${
                          order.paymentStatus === "paid"
                            ? "admin-chip--published"
                            : order.paymentStatus === "pending"
                              ? "admin-chip--warn"
                              : "admin-chip--danger"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-chip ${STATUS_CHIP[order.fulfillmentStatus]}`}>
                        {STATUS_LABEL[order.fulfillmentStatus]}
                      </span>
                    </td>
                    <td className="admin-table__meta">
                      {new Date(order.createdAt).toLocaleDateString("en-AE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
