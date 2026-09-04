import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { Category, Product, type ProductDoc, type ProductStatus } from "@/lib/models";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; created?: string }>;
}) {
  const admin = await requireAdminPage("products:read");
  const { status, q, created } = await searchParams;

  await connectDb();
  const settings = await getSettings();
  const threshold = settings.inventory.lowStockThreshold;

  const filter: Record<string, unknown> = {};
  // Archived products are hidden unless asked for — they are the long tail and
  // would otherwise crowd out what is actually on sale.
  if (status && status !== "all") filter.status = status;
  else if (!status) filter.status = { $ne: "archived" };
  if (q) filter.$or = [
    { "name.en": { $regex: q, $options: "i" } },
    { "name.ar": { $regex: q, $options: "i" } },
    { sku: { $regex: q, $options: "i" } },
  ];

  const [products, categories] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).limit(200).lean<ProductDoc[]>(),
    Category.find().lean(),
  ]);

  const categoryName = new Map(categories.map((c) => [String(c._id), c.name.en]));
  const writable = can(admin.permissions, "products:write");

  const counts = {
    all: await Product.countDocuments({}),
    published: await Product.countDocuments({ status: "published" }),
    draft: await Product.countDocuments({ status: "draft" }),
    archived: await Product.countDocuments({ status: "archived" }),
  };

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Products</h1>
          <p className="admin-head__sub">
            {counts.published} published · {counts.draft} draft · {counts.archived} archived
          </p>
        </div>
        {writable ? (
          <Link className="btn btn--brand btn--sm" href="/admin/products/new">
            Add product
          </Link>
        ) : null}
      </div>

      {created ? <p className="admin-note" style={{ marginBottom: "1.25rem" }}>Product created.</p> : null}

      <form className="admin-filters" action="/admin/products">
        <input
          className="field__input field__input--sm"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or SKU"
          style={{ maxWidth: "260px" }}
        />
        <select className="field__input field__input--sm" name="status" defaultValue={status ?? ""} style={{ maxWidth: "180px" }}>
          <option value="">Live &amp; draft</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
          <option value="all">Everything</option>
        </select>
        <button className="btn btn--ghost btn--sm" type="submit">
          Filter
        </button>
      </form>

      {products.length === 0 ? (
        <div className="admin-empty">
          <p>No products match.</p>
          {writable ? (
            <p style={{ marginTop: ".75rem" }}>
              <Link className="link-plain" href="/admin/products/new">
                Add the first one
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const id = String(product._id);
                const low = product.trackInventory && product.stock <= threshold;
                return (
                  <tr key={id}>
                    <td>
                      <Link className="admin-table__title" href={`/admin/products/${id}`}>
                        {product.name.en}
                      </Link>
                      <span className="admin-table__meta">
                        {product.sku}
                        {!product.name.ar ? " · no Arabic" : ""}
                        {product.featured ? " · featured" : ""}
                      </span>
                    </td>
                    <td>{categoryName.get(String(product.categoryId)) ?? "—"}</td>
                    <td>
                      {product.pricingMode === "request" ? (
                        <span className="admin-chip">On request</span>
                      ) : (
                        <>
                          {formatFils(product.priceFils, "en")}
                          {product.permanentDiscount ? (
                            <span className="admin-table__meta">
                              {product.permanentDiscount.type === "percent"
                                ? `${product.permanentDiscount.value}% off`
                                : `${formatFils(product.permanentDiscount.value, "en")} off`}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td>
                      {product.trackInventory ? (
                        <span className={low ? "admin-chip admin-chip--warn" : undefined}>
                          {product.stock}
                          {product.stock === 0 ? " · out" : low ? " · low" : ""}
                        </span>
                      ) : (
                        <span className="admin-table__meta">Not tracked</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-chip admin-chip--${product.status}`}>
                        {STATUS_LABEL[product.status]}
                      </span>
                    </td>
                    <td className="admin-table__actions">
                      {writable ? <ProductRowActions productId={id} status={product.status} /> : null}
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
