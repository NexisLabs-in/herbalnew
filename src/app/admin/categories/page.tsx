import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category, Product } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const admin = await requireAdminPage("categories:read");

  await connectDb();
  const categories = await Category.find().sort({ order: 1, "name.en": 1 }).lean();

  // One grouped count rather than a query per category.
  const counts = await Product.aggregate<{ _id: string; count: number }>([
    { $match: { status: { $ne: "archived" } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);
  const countFor = new Map(counts.map((row) => [String(row._id), row.count]));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Categories</h1>
          <p className="admin-head__sub">
            The indication categories customers filter the Herb Cabinet by.
          </p>
        </div>
      </div>

      <CategoryManager
        canWrite={can(admin.permissions, "categories:write")}
        categories={categories.map((category) => ({
          id: String(category._id),
          slug: category.slug,
          name: { en: category.name.en, ar: category.name.ar ?? "" },
          note: { en: category.note?.en ?? "", ar: category.note?.ar ?? "" },
          description: { en: category.description?.en ?? "", ar: category.description?.ar ?? "" },
          order: category.order,
          published: category.published,
          productCount: countFor.get(String(category._id)) ?? 0,
        }))}
      />
    </AdminShell>
  );
}
