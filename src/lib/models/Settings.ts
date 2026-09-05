import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, filsField, tlSchema } from "./base";
import { toFils } from "../money";

/** Store configuration — a single document.
 *
 *  Everything an admin can change without a deploy lives here: shipping (C11),
 *  tax, the low-stock threshold (C12), the review moderation switch (C2).
 *  Read it through `getSettings()` in `@/lib/settings`, which creates the
 *  document on first call so a fresh install is never missing it.
 *
 *  Each group is its own subschema, `required` with a default. Declared inline
 *  as plain objects, Mongoose infers every group as possibly undefined and
 *  every read site downstream needs a null check for a field that always
 *  exists — this shape keeps the inferred type honest.
 */

const storeSchema = new Schema(
  {
    name: { type: String, default: "Herbedia" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    address: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    socials: {
      type: new Schema(
        {
          instagram: { type: String, default: "" },
          facebook: { type: String, default: "" },
          whatsapp: { type: String, default: "" },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({}),
    },
  },
  { _id: false },
);

/** Shipping (C11): one charge for every order, same for all products. */
const shippingSchema = new Schema(
  {
    flatRateFils: filsField({ default: toFils(25) }),
    /** Null means "always charge". Otherwise shipping is free once the
     *  post-discount total reaches this. */
    freeAboveFils: { type: Number, default: null, min: 0 },
    note: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
  },
  { _id: false },
);

const taxSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    /** Percent, added at checkout as its own line — not baked into prices. */
    ratePercent: { type: Number, default: 5, min: 0, max: 100 },
    label: { type: tlSchema(), default: () => ({ en: "VAT", ar: "ضريبة القيمة المضافة" }) },
  },
  { _id: false },
);

/** Inventory (C12): one number drives all three low-stock surfaces — the admin
 *  badge, the admin email, and the public "Only X left" warning. */
const inventorySchema = new Schema(
  {
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { _id: false },
);

/** Reviews (C2): off publishes immediately, on requires admin approval. */
const reviewSettingsSchema = new Schema(
  {
    moderationEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    /** Distinct from the order prefix on purpose. Both defaulted to "HB" and
     *  the two sequences run in step early on, so an order and its invoice came
     *  out with the identical identifier — unreadable for anyone reconciling
     *  them. Orders are HB-2026-0001, invoices INV-2026-0001. */
    prefix: { type: String, default: "INV" },
    nextNumber: { type: Number, default: 1 },
    legalLines: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    trn: { type: String, default: "" },
  },
  { _id: false },
);

const notificationSchema = new Schema(
  {
    /** Who receives new-order, low-stock, enquiry and contact alerts. */
    adminAlertEmails: { type: [String], default: [] },
    /** Local hour (store timezone) for the daily low-stock digest. */
    digestHourLocal: { type: Number, default: 8, min: 0, max: 23 },
  },
  { _id: false },
);

const cartSettingsSchema = new Schema(
  {
    /** How long a cart sits untouched before the abandoned-cart email. */
    abandonedAfterHours: { type: Number, default: 24, min: 1 },
    abandonedEmailEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const seoSchema = new Schema(
  {
    defaultTitle: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    defaultDescription: { type: tlSchema(), default: () => ({ en: "", ar: "" }) },
    ogImage: { type: String, default: "" },
  },
  { _id: false },
);

const group = <T>(schema: T) => ({ type: schema, required: true, default: () => ({}) });

const settingsSchema = new Schema(
  {
    /** Guards the singleton: a unique index on a constant means a second
     *  document cannot be inserted even by a race. */
    singleton: { type: String, default: "settings", unique: true, immutable: true },

    store: group(storeSchema),
    shipping: group(shippingSchema),
    tax: group(taxSchema),
    inventory: group(inventorySchema),
    reviews: group(reviewSettingsSchema),
    invoice: group(invoiceSchema),
    notifications: group(notificationSchema),
    cart: group(cartSettingsSchema),
    seo: group(seoSchema),
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;
export const Settings = defineModel("Settings", settingsSchema);
