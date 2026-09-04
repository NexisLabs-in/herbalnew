import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./base";

/** Who changed what.
 *
 *  With a full role editor and several staff accounts, "the price was wrong on
 *  Tuesday" needs an answer. Written on every admin mutation; never edited or
 *  deleted from the UI.
 */
const auditLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true, index: true },
    adminEmail: { type: String, default: "" },
    /** Verb: "create", "update", "delete", "status", "approve", "refund"… */
    action: { type: String, required: true },
    /** Collection name: "Product", "Order", "Coupon"… */
    entity: { type: String, required: true },
    entityId: { type: String, default: "" },
    entityLabel: { type: String, default: "" },
    /** Changed fields only — before/after. Never store password hashes here. */
    diff: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = defineModel("AuditLog", auditLogSchema);
