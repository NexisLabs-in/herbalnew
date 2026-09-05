"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCustomer, requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { Review } from "@/lib/models/Review";
import { refreshProductRating, reviewableOrdersFor } from "@/lib/reviews";
import { getSettings } from "@/lib/settings";
import { type ActionState } from "@/lib/validation/shared";

/** Writing and moderating reviews (requirement C2).
 *
 *  Whether a new review is published immediately or held for approval is
 *  decided **at submit time** from `settings.reviews.moderationEnabled`.
 *  Flipping that switch later does not retroactively change reviews that
 *  already exist — turning moderation on should not silently unpublish
 *  everything that was already live, and turning it off should not approve a
 *  queue nobody has read.
 */

const reviewSchema = z.object({
  productId: z.string().regex(/^[0-9a-f]{24}$/i),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(10, "Tell us a little more.").max(4000),
});

export type ReviewState = ActionState & { moderated?: boolean };

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Please sign in to leave a review." };

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the review." };
  }

  await connectDb();

  // Verified buyers only: a delivered, paid order containing this product, not
  // already reviewed. The check is the authorisation — there is no other gate.
  const orderIds = await reviewableOrdersFor(customer._id, parsed.data.productId);
  if (orderIds.length === 0) {
    return { error: "Only customers who have received this product can review it." };
  }

  const settings = await getSettings();
  const moderated = settings.reviews.moderationEnabled;

  try {
    await Review.create({
      productId: parsed.data.productId,
      customerId: customer._id,
      orderId: orderIds[0],
      authorName: customer.name || "",
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: moderated ? "pending" : "approved",
      publishedAt: moderated ? null : new Date(),
    });
  } catch (error) {
    // The unique index on product+customer+order is what enforces one review
    // per purchase; a race lands here rather than creating a second.
    if ((error as { code?: number }).code === 11000) {
      return { error: "You have already reviewed this purchase." };
    }
    throw error;
  }

  if (!moderated) await refreshProductRating(parsed.data.productId);

  const product = await Product.findById(parsed.data.productId).select("slug").lean();
  if (product) revalidatePath(`/[locale]/shop/${product.slug}`, "page");
  revalidatePath("/admin/reviews");

  return { ok: true, moderated };
}

export async function moderateReview(
  reviewId: string,
  decision: "approved" | "rejected",
  note = "",
): Promise<ActionState> {
  const admin = await requireAdmin("reviews:write");
  await connectDb();

  const review = await Review.findById(reviewId);
  if (!review) return { error: "That review no longer exists." };

  review.status = decision;
  review.moderatedBy = admin.adminId;
  review.adminNote = note.trim().slice(0, 500);
  review.publishedAt = decision === "approved" ? (review.publishedAt ?? new Date()) : null;
  await review.save();

  await refreshProductRating(String(review.productId));

  await recordAudit(admin, {
    action: decision === "approved" ? "approve" : "reject",
    entity: "Review",
    entityId: reviewId,
    entityLabel: review.title || review.body.slice(0, 60),
  });

  const product = await Product.findById(review.productId).select("slug").lean();
  if (product) revalidatePath(`/[locale]/shop/${product.slug}`, "page");
  revalidatePath("/admin/reviews");

  return { ok: true, notice: decision === "approved" ? "Published." : "Rejected." };
}

export async function deleteReview(reviewId: string): Promise<ActionState> {
  const admin = await requireAdmin("reviews:write");
  await connectDb();

  const review = await Review.findByIdAndDelete(reviewId);
  if (!review) return { error: "That review no longer exists." };

  await refreshProductRating(String(review.productId));

  await recordAudit(admin, {
    action: "delete",
    entity: "Review",
    entityId: reviewId,
    entityLabel: review.title || review.body.slice(0, 60),
  });

  revalidatePath("/admin/reviews");
  return { ok: true, notice: "Review deleted." };
}

/** The moderation switch itself (C2).
 *
 *  Changing it affects only what happens next. Existing reviews keep the status
 *  they were given, which is why the confirmation says so. */
export async function setReviewModeration(enabled: boolean): Promise<ActionState> {
  const admin = await requireAdmin("settings:write");
  await connectDb();

  const { Settings } = await import("@/lib/models/Settings");
  await Settings.updateOne({ singleton: "settings" }, { $set: { "reviews.moderationEnabled": enabled } });

  const { invalidateSettings } = await import("@/lib/settings");
  invalidateSettings();

  await recordAudit(admin, {
    action: "update",
    entity: "Settings",
    entityLabel: "Review moderation",
    diff: { moderationEnabled: enabled },
  });

  revalidatePath("/admin/reviews");
  return {
    ok: true,
    notice: enabled
      ? "New reviews will wait for your approval. Reviews already published stay published."
      : "New reviews will publish immediately. Anything already waiting still needs approving.",
  };
}

/** Orders whose products the customer can still review — drives the prompt on
 *  the order page. */
export async function pendingReviewPrompts(productId: string): Promise<boolean> {
  const customer = await getCustomer();
  if (!customer) return false;
  const orders = await reviewableOrdersFor(customer._id, productId);
  return orders.length > 0;
}
