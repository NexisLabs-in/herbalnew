import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, filsField } from "./base";

/** A discount code (requirement C8).
 *
 *  The client's rule is deliberate and unusual, so it is worth restating where
 *  the data lives: a coupon carries a hand-picked product list, discounts the
 *  **whole cart**, and is **rejected outright** if the cart contains anything
 *  outside that list. It is never applied to part of a basket. `allProducts` is
 *  the "select all" shortcut, stored as a flag rather than a snapshot of every
 *  id so that products added later are covered automatically.
 */
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percent", "amount"], required: true },
    /** Percent: 1–100. Amount: fils off the cart total. */
    value: { type: Number, required: true, min: 0 },

    allProducts: { type: Boolean, default: false },
    productIds: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },

    expiresAt: { type: Date, default: null },
    minOrderFils: { ...filsField(), default: null },
    /** Total redemptions allowed across all customers; null is unlimited. */
    usageLimit: { type: Number, default: null },
    usageLimitPerCustomer: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** A coupon that covers nothing can never be applied — catch it at creation
 *  rather than letting an admin wonder why their code is always rejected. */
couponSchema.pre("validate", { document: true, query: false }, function enforceScope() {
  if (!this.allProducts && this.productIds.length === 0) {
    this.invalidate("productIds", "Select at least one product, or choose all products.");
  }
  if (this.discountType === "percent" && this.value > 100) {
    this.invalidate("value", "A percentage discount cannot exceed 100%.");
  }
});

couponSchema.index({ active: 1, expiresAt: 1 });

export type CouponDoc = InferSchemaType<typeof couponSchema> & { _id: Types.ObjectId };
export const Coupon = defineModel("Coupon", couponSchema);

/** Per-customer redemption records — `usageLimitPerCustomer` cannot be enforced
 *  from a single counter on the coupon. */
const couponRedemptionSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    discountFils: filsField({ required: true }),
  },
  { timestamps: true },
);

couponRedemptionSchema.index({ couponId: 1, customerId: 1 });
couponRedemptionSchema.index({ orderId: 1 }, { unique: true });

export type CouponRedemptionDoc = InferSchemaType<typeof couponRedemptionSchema>;
export const CouponRedemption = defineModel("CouponRedemption", couponRedemptionSchema);
