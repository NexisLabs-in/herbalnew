import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, tlSchema } from "./base";
import { SECTION_TYPES } from "./enums";

export { SECTION_TYPES } from "./enums";
export type { SectionType } from "./enums";

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
