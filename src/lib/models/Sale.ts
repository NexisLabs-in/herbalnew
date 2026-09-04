import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** A time-limited sale (requirement C6): pick products, set a discount
 *  percentage per product, set a start and an end date.
 *
 *  A sale is never written onto the products themselves. The pricing engine
 *  resolves it live from the date window, so a sale starts and ends on its own
 *  and nothing has to run at midnight to make prices correct.
 */
const saleEntrySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
  },
  { _id: false },
);

const saleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    /** The admin's on/off switch. A sale is live only when this is true *and*
     *  now falls inside the window — so a sale can be paused without losing its
     *  dates. */
    active: { type: Boolean, default: true },
    entries: { type: [saleEntrySchema], default: [] },
  },
  { timestamps: true },
);

saleSchema.pre("validate", { document: true, query: false }, function enforceWindow() {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate("endAt", "The sale must end after it starts.");
  }
  if (this.entries.length === 0) {
    this.invalidate("entries", "Add at least one product to the sale.");
  }
});

// The engine's hot path: live sales covering a given product.
saleSchema.index({ active: 1, startAt: 1, endAt: 1 });
saleSchema.index({ "entries.productId": 1 });

export type SaleDoc = InferSchemaType<typeof saleSchema> & { _id: Types.ObjectId };
export const Sale = defineModel("Sale", saleSchema);
