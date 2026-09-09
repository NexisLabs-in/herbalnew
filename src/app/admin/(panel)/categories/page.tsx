import type { Metadata } from "next";
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

  // Subcategories per parent, so the table can show the tree and the delete
  // guard can be reflected in the UI rather than only in the action.
  const childCounts = new Map<string, number>();
  for (const category of categories) {
    if (category.parentId) {
      const key = String(category.parentId);
      childCounts.set(key, (childCounts.get(key) ?? 0) + 1);
    }
  }

  // One grouped count rather than a query per category.
  const counts = await Product.aggregate<{ _id: string; count: number }>([
    { $match: { status: { $ne: "archived" } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);
  const countFor = new Map(counts.map((row) => [String(row._id), row.count]));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Categories</h1>
          <p className="admin-head__sub">
            Two levels: a top-level grouping, and the subcategories products are
            actually assigned to.
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
          parentId: category.parentId ? String(category.parentId) : null,
          order: category.order,
          published: category.published,
          productCount: countFor.get(String(category._id)) ?? 0,
          childCount: childCounts.get(String(category._id)) ?? 0,
        }))}
      />
    </>
  );
}
