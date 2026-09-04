import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** The seven emirates. Shipping is UAE-only (plan section 3), so this is a
 *  closed list rather than a free-text region field. */
export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export type Emirate = (typeof EMIRATES)[number];

/** No postcode: the UAE does not use them, and an empty required field is a
 *  checkout drop-off for nothing. */
export const addressSchema = new Schema(
  {
    label: { type: String, default: "" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    emirate: { type: String, enum: EMIRATES, required: true },
    country: { type: String, default: "AE" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const customerSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Everything below email is optional by design: login is email + OTP only,
     *  and details are collected at first checkout or in account settings (C5). */
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    addresses: { type: [addressSchema], default: [] },
    defaultAddressId: { type: Schema.Types.ObjectId, default: null },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },
  },
  { timestamps: true },
);

customerSchema.index({ createdAt: -1 });

export type AddressDoc = InferSchemaType<typeof addressSchema> & { _id: Types.ObjectId };
export type CustomerDoc = InferSchemaType<typeof customerSchema> & { _id: Types.ObjectId };
export const Customer = defineModel("Customer", customerSchema);
