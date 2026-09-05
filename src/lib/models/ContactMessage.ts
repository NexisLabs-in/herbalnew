import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel } from "./base";

/** Contact form submissions (plan 8.9).
 *
 *  Stored as records rather than only emailed, so nothing is lost in a shared
 *  mailbox and a second admin can see what has already been handled.
 */
const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    locale: { type: String, enum: ["en", "ar"], default: "en" },
    status: { type: String, enum: ["new", "read", "archived"], default: "new", index: true },
    handledBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    /** Kept for abuse tracing and rate limiting. */
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema> & {
  _id: Types.ObjectId;
};
export const ContactMessage = defineModel("ContactMessage", contactMessageSchema);
