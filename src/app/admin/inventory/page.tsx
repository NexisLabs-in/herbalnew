import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StockAdjuster } from "@/components/admin/StockAdjuster";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Product, StockNotification } from "@/lib/models";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

/** Stock levels, with the low and out-of-stock items first.
 *
 *  The ordering is the point: an inventory screen sorted alphabetically buries
 *  the thing that needs attention. One global threshold drives this list, the
 *  admin email and the public "Only X left" notice (C12).
 */
export default async function AdminInventoryPage() {
  const admin = await requireAdminPage("inventory:read");

  await connectDb();
  const settings = await getSettings();
  const threshold = settings.inventory.lowStockThreshold;

  const products = await Product.find({ status: { $ne: "archived" }, trackInventory: true })
    .sort({ stock: 1, "name.en": 1 })
    .lean();

  const untracked = await Product.countDocuments({
    status: { $ne: "archived" },
    trackInventory: false,
  });

  // How many people are waiting to hear that something is back (plan 8.7).
  const waiting = await StockNotification.aggregate<{ _id: string; count: number }>([
    { $match: { notifiedAt: null } },
    { $group: { _id: "$productId", count: { $sum: 1 } } },
  ]);
  const waitingFor = new Map(waiting.map((row) => [String(row._id), row.count]));

  const out = products.filter((product) => product.stock === 0);
  const low = products.filter((product) => product.stock > 0 && product.stock <= threshold);
  const writable = can(admin.permissions, "inventory:write");

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Inventory</h1>
          <p className="admin-head__sub">
            {out.length} out of stock · {low.length} low · threshold {threshold} ·{" "}
            <Link className="link-plain" href="/admin/settings">
              change threshold
            </Link>
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="admin-empty">
          No products track stock.
          {untracked > 0 ? ` ${untracked} product${untracked === 1 ? " has" : "s have"} stock tracking turned off.` : ""}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Waiting</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const id = String(product._id);
                const isOut = product.stock === 0;
                const isLow = !isOut && product.stock <= threshold;
                const queue = waitingFor.get(id) ?? 0;

                return (
                  <tr key={id}>
                    <td>
                      <Link className="admin-table__title" href={`/admin/products/${id}`}>
                        {product.name.en}
                      </Link>
                      <span className="admin-table__meta">
                        {product.sku} · {product.status}
                      </span>
                    </td>
                    <td className="admin-table__mono">{product.stock}</td>
                    <td>
                      {queue > 0 ? (
                        <span className="admin-chip">{queue} to notify</span>
                      ) : (
                        <span className="admin-table__meta">—</span>
                      )}
                    </td>
                    <td>
                      {isOut ? (
                        <span className="admin-chip admin-chip--danger">Out of stock</span>
                      ) : isLow ? (
                        <span className="admin-chip admin-chip--warn">Low</span>
                      ) : (
                        <span className="admin-chip admin-chip--published">In stock</span>
                      )}
                    </td>
                    <td className="admin-table__actions">
                      {writable ? <StockAdjuster productId={id} stock={product.stock} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {untracked > 0 ? (
        <p className="admin-note" style={{ marginTop: "1.25rem" }}>
          {untracked} product{untracked === 1 ? "" : "s"} {untracked === 1 ? "has" : "have"} stock
          tracking turned off and {untracked === 1 ? "is" : "are"} always buyable.
        </p>
      ) : null}
    </AdminShell>
  );
}
