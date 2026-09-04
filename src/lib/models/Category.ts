import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, tlSchema } from "./base";

/** An indication category — the "shelves" of the Herb Cabinet.
 *
 *  Categories are a filter on /shop, not pages of their own (plan section 3),
 *  so there are no SEO fields here: nothing is indexed at a category URL.
 */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: tlSchema({ required: true }), required: true },
    note: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    description: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Drives the filter list: published first, in the admin's chosen order.
categorySchema.index({ published: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = defineModel("Category", categorySchema);
