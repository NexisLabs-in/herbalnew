import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** A product review (requirement C2).
 *
 *  Only a customer with a **delivered** order containing the product may write
 *  one, and only once per purchase — `orderId` is what makes that enforceable
 *  and is why it is part of the unique index rather than just a reference.
 *
 *  Whether a new review lands as `pending` or `approved` is decided at submit
 *  time from `settings.reviews.moderationEnabled`. Flipping that toggle later
 *  does not retroactively change reviews that already exist.
 */
const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    /** Display name copied at submit time, so a later profile edit does not
     *  silently re-author a published review. */
    authorName: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "", trim: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending", index: true },
    adminNote: { type: String, default: "" },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, customerId: 1, orderId: 1 }, { unique: true });
// The public list on a product page, and the admin moderation queue.
reviewSchema.index({ productId: 1, status: 1, publishedAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema> & { _id: Types.ObjectId };
export const Review = defineModel("Review", reviewSchema);
