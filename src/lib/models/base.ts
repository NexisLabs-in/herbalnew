import mongoose, { Schema, type Model } from "mongoose";

/** Registers a model once.
 *
 *  Next.js re-evaluates modules on every hot reload, and Mongoose throws
 *  `OverwriteModelError` the second time a name is registered. Every model in
 *  this directory goes through here.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}

/** A stored bilingual string: English required, Arabic optional (plan section 3).
 *  Read it with `tl()` from `@/lib/i18n`, which falls back to English. */
export type StoredTL = { en: string; ar?: string };

export function tlSchema(options: { required?: boolean } = {}) {
  return new Schema<StoredTL>(
    {
      en: { type: String, required: options.required ?? false, trim: true, default: "" },
      ar: { type: String, trim: true, default: "" },
    },
    { _id: false },
  );
}

/** Money. Always integer fils — see `@/lib/money`. */
export const filsField = (options: { required?: boolean; default?: number } = {}) => ({
  type: Number,
  required: options.required ?? false,
  default: options.default,
  min: 0,
  validate: {
    // Mongoose runs custom validators on null too, and null is a legitimate
    // value here — a request-price product has no price at all (C1).
    validator: (value: unknown) => value == null || Number.isInteger(value),
    message: "Money must be whole fils — no fractions of a fils exist.",
  },
});

/** Turns a name into a URL slug. Arabic is dropped rather than transliterated:
 *  a slug is a URL, and the Arabic name is available for display. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
