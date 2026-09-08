import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { AdminShell } from "@/components/admin/AdminShell";
import { CouponManager, type CouponRow } from "@/components/admin/CouponManager";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { toAed } from "@/lib/money";
import { Category, Coupon, Product, type CouponDoc } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

const aed = (fils: number | null | undefined) =>
  fils === null || fils === undefined ? "" : toAed(fils).toFixed(2);

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdminPage("coupons:read");
  const { page: requested } = await searchParams;

  await connectDb();
  const now = new Date();
  const total = await Coupon.countDocuments();
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);
  const live = await Coupon.countDocuments({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  });

  const [coupons, products, categories] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(perPage).lean<CouponDoc[]>(),
    Product.find({ status: "published", pricingMode: "fixed" }).select("name sku categoryId").lean(),
    Category.find().select("name").lean(),
  ]);

  const categoryName = new Map(categories.map((c) => [String(c._id), c.name.en]));
  const nowMs = now.getTime();

  const rows: CouponRow[] = coupons.map((coupon) => ({
    id: String(coupon._id),
    code: coupon.code,
    description: coupon.description ?? "",
    discountType: coupon.discountType,
    value: coupon.discountType === "percent" ? String(coupon.value) : aed(coupon.value),
    allProducts: coupon.allProducts,
    productIds: coupon.productIds.map((id: unknown) => String(id)),
    expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString() : null,
    minOrder: aed(coupon.minOrderFils),
    usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
    usageLimitPerCustomer: coupon.usageLimitPerCustomer ? String(coupon.usageLimitPerCustomer) : "",
    usedCount: coupon.usedCount,
    active: coupon.active,
    expired: Boolean(coupon.expiresAt && new Date(coupon.expiresAt).getTime() < nowMs),
  }));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Coupons</h1>
          <p className="admin-head__sub">
            {live} usable now · a code is refused if the basket holds anything it does not cover
          </p>
        </div>
      </div>

      <CouponManager
        coupons={rows}
        canWrite={can(admin.permissions, "coupons:write")}
        products={products.map((product) => ({
          id: String(product._id),
          name: product.name.en,
          sku: product.sku,
          category: categoryName.get(String(product.categoryId)) ?? "—",
        }))}
      />
      <AdminPager path="/admin/coupons" page={page} pages={pages} />
    </AdminShell>
  );
}
