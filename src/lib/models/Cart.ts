import { Schema, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** A cart in progress.
 *
 *  Carts are stored server-side rather than in localStorage so the same basket
 *  follows a customer between phone and laptop, and so the abandoned-cart job
 *  has something to read. Anonymous browsing gets a `cartId` cookie; on login
 *  that cart merges into the customer's and the anonymous row is deleted.
 *
 *  **No prices are stored here.** Only product ids and quantities — every total
 *  is recomputed by the pricing engine on read, so a cart left open across a
 *  sale ending cannot buy at yesterday's price.
 */
const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    /** Cookie value for anonymous carts; kept after login so a second device
     *  merging in can be traced. */
    cartId: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    items: { type: [cartItemSchema], default: [] },
    /** Held as typed, re-validated at checkout — a coupon can expire or a new
     *  item can make it invalid while the cart sits open (C8). */
    couponCode: { type: String, default: null, uppercase: true, trim: true },
    abandonedEmailSentAt: { type: Date, default: null },
    /** Rolling 30-day expiry, refreshed on every change. Abandoned carts should
     *  not accumulate forever on a small VPS. */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// The abandoned-cart job: carts with items, untouched for N hours, not yet mailed.
cartSchema.index({ abandonedEmailSentAt: 1, updatedAt: 1 });

export type CartDoc = InferSchemaType<typeof cartSchema> & { _id: Types.ObjectId };

/** A live document, as returned by a query — has `save()`, `set()` and the rest.
 *  `CartDoc` is the plain shape; anything that mutates a cart wants this. */
export type CartDocument = HydratedDocument<CartDoc>;
export const Cart = defineModel("Cart", cartSchema);

export const CART_TTL_DAYS = 30;
export const cartExpiry = () => new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
