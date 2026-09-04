import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const admin = await requireAdminPage("products:write");

  await connectDb();
  const [categories, settings] = await Promise.all([
    Category.find().sort({ order: 1 }).lean(),
    getSettings(),
  ]);

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <p className="admin-crumb">
            <Link href="/admin/products">Products</Link> / New
          </p>
          <h1 className="admin-head__title">Add a product</h1>
          <p className="admin-head__sub">
            It starts as a draft. Nothing is visible on the storefront until you publish it.
          </p>
        </div>
      </div>

      {categories.filter((category) => category.parentId !== null).length === 0 ? (
        <div className="admin-empty">
          <p>Create a subcategory first — every product belongs to one.</p>
          <p style={{ marginTop: ".75rem" }}>
            <Link className="link-plain" href="/admin/categories">
              Go to categories
            </Link>
          </p>
        </div>
      ) : (
        <ProductForm
          productId={null}
          lowStockThreshold={settings.inventory.lowStockThreshold}
        categories={categories
          .filter((category) => category.parentId === null)
          .map((parent) => ({
            parent: parent.name.en,
            children: categories
              .filter((child) => String(child.parentId ?? "") === String(parent._id))
              .map((child) => ({ id: String(child._id), name: child.name.en })),
          }))
          .filter((group) => group.children.length > 0)}
        />
      )}
    </AdminShell>
  );
}
