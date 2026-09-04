import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, tlSchema } from "./base";

/** An indication category, in two levels.
 *
 *  The client's taxonomy (docs/Products categories.docx) is a parent with
 *  subcategories beneath it — Beauty & Personal Care → Hair Care & Growth.
 *  **Products always sit on a subcategory**, never on a parent: a parent is a
 *  grouping, and "everything under Beauty" is simply the union of its
 *  children. That keeps every category query unambiguous, which the mixed
 *  alternative does not.
 *
 *  Exactly two levels. A deeper tree would need recursive queries everywhere
 *  and the catalogue is nowhere near large enough to earn them, so depth is
 *  enforced rather than left to admin discipline.
 *
 *  Categories are a filter on /shop, not pages of their own (plan §3), so there
 *  are no SEO fields here.
 */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: tlSchema({ required: true }), required: true },
    /** A short line beside the name. */
    note: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    /** The client's own description of what belongs on this shelf. */
    description: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    /** Null for a top-level category. Set to a top-level category's id for a
     *  subcategory — which is the only level products may be assigned to. */
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Drives the filter: top level first, each in the admin's chosen order.
categorySchema.index({ parentId: 1, order: 1 });
categorySchema.index({ published: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };
export const Category = defineModel("Category", categorySchema);

/** True when this category may hold products — i.e. it is a subcategory. */
export const isSubcategory = (category: { parentId: unknown }) => category.parentId !== null;
