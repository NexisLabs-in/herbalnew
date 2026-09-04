import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./base";

/** "Notify me when back in stock" (plan 8.7).
 *
 *  An out-of-stock product keeps its page and its listing; this is what the
 *  buy box offers instead of a disabled button. When admin restocks, everyone
 *  waiting is emailed once and stamped `notifiedAt`.
 */
const stockNotificationSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    locale: { type: String, enum: ["en", "ar"], default: "en" },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One pending request per address per product. The partial filter lets the same
// address sign up again after being notified, for the next time it sells out.
stockNotificationSchema.index(
  { productId: 1, email: 1 },
  { unique: true, partialFilterExpression: { notifiedAt: null } },
);

export type StockNotificationDoc = InferSchemaType<typeof stockNotificationSchema>;
export const StockNotification = defineModel("StockNotification", stockNotificationSchema);
