import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** Staff accounts. Unlike customers these use a password, because an admin
 *  session is worth more than a shopper's and OTP-only login puts full store
 *  access behind whoever can read one inbox. Forgotten passwords are recovered
 *  by emailed OTP (plan section 3).
 */
const adminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    /** bcrypt. Excluded from queries by default so it cannot be leaked by a
     *  careless `.find()` that gets serialised into a page. */
    passwordHash: { type: String, required: true, select: false },
    roleId: { type: Schema.Types.ObjectId, ref: "AdminRole", required: true, index: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    /** Set on seeded and admin-reset accounts; the panel forces a change before
     *  anything else can be done. */
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AdminUserDoc = InferSchemaType<typeof adminUserSchema> & { _id: Types.ObjectId };
export const AdminUser = defineModel("AdminUser", adminUserSchema);
