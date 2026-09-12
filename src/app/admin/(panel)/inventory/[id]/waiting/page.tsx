import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPager } from "@/components/admin/AdminPager";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Product, StockNotification } from "@/lib/models";
import type { StockNotificationDoc } from "@/lib/models/StockNotification";

export const metadata: Metadata = { title: "Back-in-stock requests" };
export const dynamic = "force-dynamic";

const objectId = /^[0-9a-f]{24}$/i;

const dateTime = (value: Date) =>
  new Date(value).toLocaleString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Who is waiting for a product to come back (plan 8.7).
 *
 *  Read-only on purpose: the hourly `backInStockNotices` task owns the sending,
 *  so an admin cannot email half a queue by hand and leave the records
 *  disagreeing with what was actually sent. Reached from the Waiting column on
 *  the inventory list, next to the stock number that decides it.
 */
export default async function StockRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdminPage("inventory:read");

  const { id } = await params;
  if (!objectId.test(id)) notFound();

  const { status, page: requested } = await searchParams;
  const notified = status === "notified";

  await connectDb();
  const product = await Product.findById(id).select("name sku slug stock trackInventory").lean();
  if (!product) notFound();

  const filter = { productId: id, notifiedAt: notified ? { $ne: null } : null };

  const [total, pendingCount] = await Promise.all([
    StockNotification.countDocuments(filter),
    StockNotification.countDocuments({ productId: id, notifiedAt: null }),
  ]);
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);

  const requests = await StockNotification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(perPage)
    .lean<(StockNotificationDoc & { _id: unknown; createdAt: Date; updatedAt: Date })[]>();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Back-in-stock requests</h1>
          <p className="admin-head__sub">
            <Link className="link-plain" href={`/admin/products/${id}`}>
              {product.name.en}
            </Link>{" "}
            · {product.sku} · stock {product.stock} ·{" "}
            {pendingCount === 0
              ? "nobody waiting"
              : `${pendingCount} waiting${product.stock > 0 ? " — the hourly sweep will email them" : ""}`}
          </p>
        </div>
        <Link className="btn btn--ghost btn--sm" href="/admin/inventory">
          Back to inventory
        </Link>
      </div>

      <form className="admin-filters" action={`/admin/inventory/${id}/waiting`}>
        <select
          className="field__input field__input--sm"
          name="status"
          defaultValue={status ?? ""}
          style={{ maxWidth: "180px" }}
        >
          <option value="">Waiting</option>
          <option value="notified">Already notified</option>
        </select>
        <button className="btn btn--ghost btn--sm" type="submit">
          Filter
        </button>
      </form>

      {requests.length === 0 ? (
        <div className="admin-empty">
          {notified ? "Nobody has been notified yet." : "Nobody is waiting for this one."}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Asked</th>
                <th>Language</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={String(request._id)}>
                  <td>
                    <span className="admin-table__title">{request.email}</span>
                    {request.customerId ? (
                      <span className="admin-table__meta">Has an account</span>
                    ) : (
                      <span className="admin-table__meta">Guest</span>
                    )}
                  </td>
                  <td className="admin-table__meta">{dateTime(request.createdAt)}</td>
                  <td className="admin-table__mono">{request.locale === "ar" ? "AR" : "EN"}</td>
                  <td>
                    {request.notifiedAt ? (
                      <span className="admin-chip admin-chip--published">
                        Notified {dateTime(request.notifiedAt)}
                      </span>
                    ) : (
                      <span className="admin-chip admin-chip--warn">Waiting</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPager
        path={`/admin/inventory/${id}/waiting`}
        page={page}
        pages={pages}
        params={{ status }}
      />
    </>
  );
}
