import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, tlSchema } from "./base";

/** The section types the CMS can place on a page.
 *
 *  This is a **fixed registry**, not free-form blocks: each type maps 1:1 onto a
 *  component that already exists in `src/components`. Admins reorder sections
 *  and edit copy; they cannot invent layouts, so the design system stays intact
 *  and no page can be arranged into something broken.
 *
 *  There is deliberately no harvest-calendar section (requirement C9).
 */
export const SECTION_TYPES = [
  "hero",
  "trustStrip",
  "traditionsRibbon",
  "featuredProducts",
  "categoryGrid",
  "methodTeaser",
  "richText",
  "accordion",
  "imageText",
  "advisory",
  "ctaBanner",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

const sectionSchema = new Schema(
  {
    type: { type: String, enum: SECTION_TYPES, required: true },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    /** Shape depends on `type` and is validated by the Zod schema for that
     *  section, not by Mongoose — the registry is the authority. */
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true },
);

const contentPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: tlSchema({ required: true }), required: true },
    seo: {
      title: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
      description: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    },
    published: { type: Boolean, default: true },
    sections: { type: [sectionSchema], default: [] },
    /** Core pages cannot be deleted — the routes exist in code and would 404. */
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ContentSectionDoc = InferSchemaType<typeof sectionSchema>;
export type ContentPageDoc = InferSchemaType<typeof contentPageSchema>;
export const ContentPage = defineModel("ContentPage", contentPageSchema);
