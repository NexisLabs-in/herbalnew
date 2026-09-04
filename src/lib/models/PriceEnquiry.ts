import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, filsField } from "./base";

export const ENQUIRY_STATUSES = ["new", "quoted", "accepted", "expired", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** The request-price flow (requirement C1).
 *
 *  A `pricingMode: "request"` product shows this form instead of a price. The
 *  admin answers with a unit price and an expiry; the customer gets a link to
 *  /quote/[token] and pays through the normal Stripe checkout.
 */
const priceEnquirySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
    /** Set when the enquirer was logged in. Enquiries are open to anyone —
     *  requiring an account to *ask a price* would lose the enquiry. */
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    locale: { type: String, enum: ["en", "ar"], default: "en" },

    status: { type: String, enum: ENQUIRY_STATUSES, default: "new", index: true },

    // --- The quote -----------------------------------------------------------
    quotedUnitPriceFils: { ...filsField(), default: null },
    quotedAt: { type: Date, default: null },
    quoteExpiresAt: { type: Date, default: null },
    /** Single-use, unguessable. It is the only credential on the quote link, so
     *  it is generated with crypto randomness and cleared once redeemed. */
    quoteToken: { type: String, default: null, index: true, sparse: true },
    quotedByAdminId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    adminNote: { type: String, default: "" },

    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true },
);

priceEnquirySchema.index({ createdAt: -1 });
// The hourly expiry job.
priceEnquirySchema.index({ status: 1, quoteExpiresAt: 1 });

export type PriceEnquiryDoc = InferSchemaType<typeof priceEnquirySchema> & { _id: Types.ObjectId };
export const PriceEnquiry = defineModel("PriceEnquiry", priceEnquirySchema);
