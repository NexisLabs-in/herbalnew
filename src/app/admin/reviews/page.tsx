import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReviewQueue, type AdminReview } from "@/components/admin/ReviewQueue";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Customer, Product, Review, type ReviewDoc } from "@/lib/models";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const admin = await requireAdminPage("reviews:read");
  const { status, page: requested } = await searchParams;

  await connectDb();
  const settings = await getSettings();

  // Pending first: this is a queue, and what needs a decision comes before what
  // has already had one.
  const filter = status ? { status } : {};
  const [total, pendingCount] = await Promise.all([
    Review.countDocuments(filter),
    Review.countDocuments({ status: "pending" }),
  ]);
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);

  const reviews = await Review.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .skip(skip)
    .limit(perPage)
    .lean<ReviewDoc[]>();

  const [products, customers] = await Promise.all([
    Product.find({ _id: { $in: reviews.map((review) => review.productId) } })
      .select("name")
      .lean(),
    Customer.find({ _id: { $in: reviews.map((review) => review.customerId) } })
      .select("email name")
      .lean(),
  ]);

  const productName = new Map(products.map((p) => [String(p._id), p.name.en]));
  const customer = new Map(customers.map((c) => [String(c._id), c]));

  const rows: AdminReview[] = reviews.map((review) => ({
    id: String(review._id),
    productId: String(review.productId),
    productName: productName.get(String(review.productId)) ?? "—",
    author: review.authorName || customer.get(String(review.customerId))?.name || "",
    email: customer.get(String(review.customerId))?.email ?? "",
    rating: review.rating,
    title: review.title ?? "",
    body: review.body,
    status: review.status,
    createdAt: new Date(review.createdAt).toISOString(),
  }));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Reviews</h1>
          <p className="admin-head__sub">
            {pendingCount} waiting · only customers with a delivered order can review
          </p>
        </div>
      </div>

      <ReviewQueue
        reviews={rows}
        moderationEnabled={settings.reviews.moderationEnabled}
        canModerate={can(admin.permissions, "reviews:write")}
        canChangeSetting={can(admin.permissions, "settings:write")}
      />
      <AdminPager path="/admin/reviews" page={page} pages={pages} params={{ status }} />
    </AdminShell>
  );
}
