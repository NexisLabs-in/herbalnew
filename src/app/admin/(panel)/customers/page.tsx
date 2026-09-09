import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { Customer, Order } from "@/lib/models";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const admin = await requireAdminPage("customers:read");
  const { q, page: requested } = await searchParams;

  await connectDb();
  const filter = q
    ? {
        $or: [
          { email: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const total = await Customer.countDocuments(filter);
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);
  const customers = await Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean();

  // Spend and order count in one grouped query rather than one per customer.
  const spend = await Order.aggregate<{ _id: string; orders: number; total: number }>([
    { $match: { paymentStatus: "paid", customerId: { $in: customers.map((c) => c._id) } } },
    { $group: { _id: "$customerId", orders: { $sum: 1 }, total: { $sum: "$grandTotalFils" } } },
  ]);
  const spendFor = new Map(spend.map((row) => [String(row._id), row]));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Customers</h1>
          <p className="admin-head__sub">{total} customer{total === 1 ? "" : "s"}</p>
        </div>
      </div>

      <form className="admin-filters" action="/admin/customers">
        <input
          className="field__input field__input--sm"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Email, name or phone"
          style={{ maxWidth: "280px" }}
        />
        <button className="btn btn--ghost btn--sm" type="submit">
          Search
        </button>
      </form>

      {customers.length === 0 ? (
        <div className="admin-empty">No customers match.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Orders</th>
                <th>Spent</th>
                <th>Addresses</th>
                <th>Joined</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const stats = spendFor.get(String(customer._id));
                return (
                  <tr key={String(customer._id)}>
                    <td>
                      <span className="admin-table__title">{customer.name || "—"}</span>
                      <span className="admin-table__meta">
                        {customer.email}
                        {customer.phone ? ` · ${customer.phone}` : ""}
                      </span>
                    </td>
                    <td>{stats?.orders ?? 0}</td>
                    <td className="admin-table__mono">
                      {stats ? formatFils(stats.total, "en") : "—"}
                    </td>
                    <td>{customer.addresses.length}</td>
                    <td className="admin-table__meta">
                      {new Date(customer.createdAt).toLocaleDateString("en-AE")}
                    </td>
                    <td>
                      <span
                        className={`admin-chip ${customer.status === "active" ? "admin-chip--published" : "admin-chip--danger"}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPager path="/admin/customers" page={page} pages={pages} params={{ q }} />
    </>
  );
}
