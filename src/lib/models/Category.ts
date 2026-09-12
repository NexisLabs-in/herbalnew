import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, tlSchema } from "./base";

/** An indication category, in two levels.
 *
 *  The client's taxonomy (docs/Products categories.docx) is a parent with
 *  subcategories beneath it — Beauty & Personal Care → Hair Care & Growth.
 *  A parent with children is a grouping — "everything under Beauty" is the
 *  union of its children. A parent with no children holds products itself
 *  (Reproductive & Hormone Health). Do not invent a dummy subcategory to
 *  force every product onto a child.
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
     *  subcategory. Products sit on a child, or on a parent that has none. */
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

/** True when this category is a child of a grouping, not a top-level shelf. */
export const isSubcategory = (category: { parentId: unknown }) => category.parentId !== null;
