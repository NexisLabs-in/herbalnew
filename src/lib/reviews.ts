import "server-only";
import { connectDb } from "./db";
import { Order } from "./models/Order";
import { Product } from "./models/Product";
import { Review, type ReviewDoc } from "./models/Review";
import { Types } from "mongoose";

/** Reading reviews, and deciding who may write one.
 *
 *  Requirement C2, and the client's choice of verified buyers only: a review
 *  can only be written by somebody with a **delivered** order containing that
 *  product, once per purchase. Buying it twice earns a second review; opening
 *  an account does not earn a first.
 */

export type ReviewView = {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  publishedAt: string | null;
};

export type ReviewSummary = {
  average: number;
  count: number;
  /** Reviews per star, 5 down to 1 — the shape a rating bar needs. */
  distribution: number[];
};

/** Which of a customer's delivered orders contain this product and have not
 *  been reviewed yet. Empty means they cannot review it. */
export async function reviewableOrdersFor(
  customerId: Types.ObjectId | string,
  productId: string,
): Promise<string[]> {
  await connectDb();

  const delivered = await Order.find({
    customerId,
    fulfillmentStatus: "delivered",
    paymentStatus: "paid",
    "items.productId": productId,
  })
    .select("_id")
    .lean();

  if (delivered.length === 0) return [];

  const reviewed = await Review.find({
    customerId,
    productId,
    orderId: { $in: delivered.map((order) => order._id) },
  })
    .select("orderId")
    .lean();

  const done = new Set(reviewed.map((review) => String(review.orderId)));
  return delivered.map((order) => String(order._id)).filter((id) => !done.has(id));
}

export async function getProductReviews(productId: string, limit = 20): Promise<ReviewView[]> {
  await connectDb();

  // Only approved reviews are ever public. A pending one is invisible even to
  // the customer who wrote it — showing it back would suggest it is live.
  const reviews = await Review.find({ productId, status: "approved" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean<ReviewDoc[]>();

  return reviews.map((review) => ({
    id: String(review._id),
    rating: review.rating,
    title: review.title ?? "",
    body: review.body,
    authorName: review.authorName || "Verified buyer",
    publishedAt: review.publishedAt ? new Date(review.publishedAt).toISOString() : null,
  }));
}

export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  await connectDb();

  const rows = await Review.aggregate<{ _id: number; count: number }>([
    // An aggregation does not cast strings to ObjectId the way a query does.
    { $match: { productId: new Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const distribution = [5, 4, 3, 2, 1].map(
    (star) => rows.find((row) => row._id === star)?.count ?? 0,
  );
  const count = distribution.reduce((total, value) => total + value, 0);
  const weighted = distribution.reduce((total, value, index) => total + value * (5 - index), 0);

  return {
    average: count === 0 ? 0 : Math.round((weighted / count) * 10) / 10,
    count,
    distribution,
  };
}

/** Recomputes the denormalised rating on the product.
 *
 *  Called after any status change, because a review being approved, rejected or
 *  deleted all move the average. Recomputed from scratch rather than adjusted
 *  incrementally: an incremental counter drifts the first time anything fails
 *  halfway, and there are never enough reviews for the full read to matter.
 */
export async function refreshProductRating(productId: string): Promise<void> {
  await connectDb();
  const summary = await getReviewSummary(productId);
  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: summary.average, reviewCount: summary.count } },
  );
}
