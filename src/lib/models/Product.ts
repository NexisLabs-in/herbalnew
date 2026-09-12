import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, filsField, tlSchema } from "./base";
import { IMAGE_KINDS, PRICING_MODES, PRODUCT_FORMS, PRODUCT_STATUSES } from "./enums";

export { IMAGE_KINDS, PRICING_MODES, PRODUCT_FORMS, PRODUCT_STATUSES } from "./enums";
export type { ImageKind, PricingMode, ProductForm, ProductStatus } from "./enums";

const imageSchema = new Schema(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    isPrimary: { type: Boolean, default: false },
    kind: { type: String, enum: IMAGE_KINDS, default: "photo" },
  },
  { _id: false },
);

/** One preparation step. `measure` is a quantity like "2 g" — left as a plain
 *  string because it is printed verbatim and never calculated with. */
const directionStepSchema = new Schema(
  {
    detail: { type: tlSchema({ required: true }), required: true },
    measure: { type: String, default: "" },
  },
  { _id: false },
);

const directionsSchema = new Schema(
  {
    steps: { type: [directionStepSchema], default: [] },
    frequency: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    maximum: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
  },
  { _id: false },
);

const safetySchema = new Schema(
  {
    targetGroup: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    cautions: { type: [tlSchema()], default: [] },
    seekAdvice: { type: [tlSchema()], default: [] },
  },
  { _id: false },
);

/** A standing discount the admin sets on the product itself (requirement C7).
 *  Null means no discount — and when it is null no discount UI renders anywhere,
 *  which is why this is a nullable subdocument rather than a `0` default. */
const permanentDiscountSchema = new Schema(
  {
    type: { type: String, enum: ["percent", "amount"], required: true },
    /** Percent: 1–100. Amount: fils off the unit price. */
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: tlSchema({ required: true }), required: true },
    summary: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    form: { type: String, enum: PRODUCT_FORMS, required: true },
    formLabel: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },

    // --- Pricing (C1, C7) ----------------------------------------------------
    pricingMode: { type: String, enum: PRICING_MODES, required: true, default: "fixed" },
    /** Required when `pricingMode` is "fixed"; null for request-price products,
     *  which get their price from an admin quote instead. Enforced below. */
    priceFils: { ...filsField(), default: null },
    permanentDiscount: { type: permanentDiscountSchema, default: null },

    // --- Inventory (C12) -----------------------------------------------------
    trackInventory: { type: Boolean, default: true },
    stock: { type: Number, default: 0, min: 0 },
    /** Fewest units a customer may buy in one order. The basket cannot sit below
     *  this except by removing the line. */
    minOrderQty: { type: Number, default: 1, min: 1 },
    /** Most units in one order. Null means no cap at all — the site imposes no
     *  fixed purchase ceiling, so stock alone bounds the quantity. */
    maxOrderQty: { type: Number, default: null, min: 1 },
    /** Set when the "stock is low" email goes out, cleared on restock, so the
     *  alert fires once per dip rather than on every order. There is no
     *  per-product threshold — one global number lives in Settings. */
    lowStockAlertedAt: { type: Date, default: null },

    // --- Herbal content ------------------------------------------------------
    composition: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    chemistryEffects: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    /** Null while the client has not confirmed a preparation method. Inventing
     *  a dosage would be inventing medical instruction, so the page renders an
     *  "awaiting confirmation" state instead. */
    directions: { type: directionsSchema, default: null },
    netQuantity: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    batch: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    shelfLifeMonths: { type: Number, default: null },
    storage: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    safety: { type: safetySchema, default: () => ({}) },

    // --- Media & merchandising ----------------------------------------------
    images: { type: [imageSchema], default: [] },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },

    // --- Publishing ----------------------------------------------------------
    status: { type: String, enum: PRODUCT_STATUSES, default: "draft" },
    seo: {
      title: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
      description: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    },

    // --- Denormalised review aggregates -------------------------------------
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** A fixed-price product without a price would render a blank buy box and could
 *  be added to a cart for nothing. Caught here so no code path can create one. */
productSchema.pre("validate", { document: true, query: false }, function enforcePricingMode() {
  if (this.pricingMode === "fixed" && (this.priceFils === null || this.priceFils === undefined)) {
    this.invalidate("priceFils", "A fixed-price product needs a price.");
  }
  if (this.pricingMode === "request") {
    // A stale price must not leak into an enquiry product. `set` rather than
    // assignment because the inferred field type is non-nullable.
    this.set("priceFils", null);
  }
});

productSchema.index({ status: 1, categoryId: 1 });
productSchema.index({ featured: 1, featuredOrder: 1 });
productSchema.index({ status: 1, stock: 1 });
// Catalogue search across both languages. default_language "none" disables
// stemming: the English stemmer would mangle Arabic, and Arabic has no stemmer
// in MongoDB's text index at all.
productSchema.index(
  { "name.en": "text", "name.ar": "text", "summary.en": "text", "summary.ar": "text" },
  { default_language: "none", weights: { "name.en": 10, "name.ar": 10, "summary.en": 2, "summary.ar": 2 } },
);

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: Types.ObjectId };
export const Product = defineModel("Product", productSchema);
