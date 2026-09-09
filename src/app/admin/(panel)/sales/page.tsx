import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { SaleManager, type SaleRow } from "@/components/admin/SaleManager";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category, Product, Sale, type SaleDoc } from "@/lib/models";
import { can } from "@/lib/permissions";
import { isSaleLive } from "@/lib/pricing";

export const metadata: Metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdminPage("sales:read");
  const { page: requested } = await searchParams;

  await connectDb();
  const now = new Date();
  const total = await Sale.countDocuments();
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);
  const liveCount = await Sale.countDocuments({
    active: true,
    startAt: { $lte: now },
    endAt: { $gte: now },
  });

  const [sales, products, categories] = await Promise.all([
    Sale.find().sort({ startAt: -1 }).skip(skip).limit(perPage).lean<SaleDoc[]>(),
    // Only fixed-price products can be discounted: a request-price product has
    // no price for a percentage to apply to.
    Product.find({ status: "published", pricingMode: "fixed" }).select("name sku categoryId").lean(),
    Category.find().select("name").lean(),
  ]);

  const categoryName = new Map(categories.map((c) => [String(c._id), c.name.en]));

  const rows: SaleRow[] = sales.map((sale) => ({
    id: String(sale._id),
    name: sale.name,
    startAt: new Date(sale.startAt).toISOString(),
    endAt: new Date(sale.endAt).toISOString(),
    active: sale.active,
    live: isSaleLive(sale),
    entries: sale.entries.map((entry: { productId: unknown; discountPercent: number }) => ({
      productId: String(entry.productId),
      discountPercent: entry.discountPercent,
    })),
  }));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Sales</h1>
          <p className="admin-head__sub">
            {liveCount} running now · a sale starts and ends on its own once the dates are set
          </p>
        </div>
      </div>

      <SaleManager
        sales={rows}
        canWrite={can(admin.permissions, "sales:write")}
        products={products.map((product) => ({
          id: String(product._id),
          name: product.name.en,
          sku: product.sku,
          category: categoryName.get(String(product.categoryId)) ?? "—",
        }))}
      />
      <AdminPager path="/admin/sales" page={page} pages={pages} />
    </>
  );
}
