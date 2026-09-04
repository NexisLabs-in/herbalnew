import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./base";

export const OTP_PURPOSES = ["customer_login", "admin_reset"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/** One-time codes for customer login (C5) and admin password reset.
 *
 *  The code is stored **hashed**. A leaked database read should not hand
 *  somebody a working login code for every pending session, and the code is
 *  short enough (6 digits) that storing it in the clear would be an open door.
 */
const otpTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

// Mongo deletes expired codes on its own; nothing has to sweep them. The TTL
// monitor runs about once a minute, so treat expiry in code as authoritative
// and this purely as cleanup.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Finding the newest live code for an address, and rate-limiting requests.
otpTokenSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export type OtpTokenDoc = InferSchemaType<typeof otpTokenSchema>;
export const OtpToken = defineModel("OtpToken", otpTokenSchema);
