import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { FeaturedManager, type FeaturedProduct } from "@/components/admin/FeaturedManager";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category, Product } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Featured products" };
export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const admin = await requireAdminPage("featured:read");

  await connectDb();
  // Only published products: featuring a draft would put a dead link on the
  // homepage.
  const [products, categories] = await Promise.all([
    Product.find({ status: "published" }).select("name sku categoryId featured featuredOrder").lean(),
    Category.find().select("name").lean(),
  ]);

  const categoryName = new Map(categories.map((c) => [String(c._id), c.name.en]));

  const rows: FeaturedProduct[] = products.map((product) => ({
    id: String(product._id),
    name: product.name.en,
    sku: product.sku,
    category: categoryName.get(String(product.categoryId)) ?? "—",
    featured: product.featured,
    order: product.featuredOrder,
  }));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Featured products</h1>
          <p className="admin-head__sub">
            {rows.filter((row) => row.featured).length} on the homepage
          </p>
        </div>
      </div>

      <FeaturedManager products={rows} canWrite={can(admin.permissions, "featured:write")} />
    </AdminShell>
  );
}
