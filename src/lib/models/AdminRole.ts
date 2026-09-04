import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** A named set of permissions, editable in the admin panel.
 *
 *  Permission strings come from `@/lib/permissions`. They are not validated
 *  against that list at the schema level on purpose: renaming a module in code
 *  would otherwise make every existing role unsaveable. `can()` simply stops
 *  matching a permission that no longer exists, which fails closed.
 */
const adminRoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    /** The seeded Owner role. Cannot be deleted or have its permissions
     *  narrowed — otherwise an install can end up with nobody able to grant
     *  access back. */
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AdminRoleDoc = InferSchemaType<typeof adminRoleSchema> & { _id: Types.ObjectId };
export const AdminRole = defineModel("AdminRole", adminRoleSchema);
