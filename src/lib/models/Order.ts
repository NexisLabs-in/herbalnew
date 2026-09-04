import { Schema, type InferSchemaType, type Types } from "mongoose";
import { defineModel, filsField, tlSchema } from "./base";
import { addressSchema } from "./Customer";

/** The fulfilment stages the admin moves an order through (requirement C3).
 *  A plain dropdown — no courier API. The order of this array is the order of
 *  the dropdown and of the customer's timeline. */
export const FULFILLMENT_STATUSES = [
  "new",
  "packed",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

/** Stages at which a customer may still ask to cancel (plan 8.5). Past dispatch
 *  the parcel is with a courier and cancelling is a return instead. */
export const CANCELLABLE_STATUSES: FulfillmentStatus[] = ["new", "packed"];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** A line as it was at the moment of purchase.
 *
 *  Everything here is a **snapshot** — name, image, price, discount. Editing or
 *  deleting a product later must never rewrite what someone already bought, and
 *  an invoice reprinted next year has to match the one sent today.
 */
const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: tlSchema({ required: true }), required: true },
    sku: { type: String, default: "" },
    image: { type: String, default: "" },
    unitPriceFils: filsField({ required: true }),
    /** Per-unit discount actually applied, and where it came from — so an admin
     *  looking at an old order can see why it was cheaper. */
    discountFils: filsField({ default: 0 }),
    discountSource: {
      type: String,
      enum: ["none", "permanent", "sale", "quote"],
      default: "none",
    },
    qty: { type: Number, required: true, min: 1 },
    lineTotalFils: filsField({ required: true }),
  },
  { _id: false },
);

const statusEventSchema = new Schema(
  {
    status: { type: String, enum: FULFILLMENT_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    byAdminId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    /** Copied from the customer at purchase time so an email change later does
     *  not rewrite where the confirmation was sent. */
    email: { type: String, required: true, lowercase: true },
    locale: { type: String, enum: ["en", "ar"], default: "en" },

    items: { type: [orderItemSchema], required: true },

    // --- Totals, all integer fils -------------------------------------------
    subtotalFils: filsField({ required: true }),
    productDiscountFils: filsField({ default: 0 }),
    couponCode: { type: String, default: null },
    couponDiscountFils: filsField({ default: 0 }),
    shippingFils: filsField({ default: 0 }),
    taxRate: { type: Number, default: 0 },
    taxFils: filsField({ default: 0 }),
    grandTotalFils: filsField({ required: true }),
    currency: { type: String, default: "AED" },

    shippingAddress: { type: addressSchema, required: true },

    // --- Payment -------------------------------------------------------------
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },
    stripe: {
      checkoutSessionId: { type: String, default: null },
      paymentIntentId: { type: String, default: null },
      chargeId: { type: String, default: null },
    },
    paidAt: { type: Date, default: null },
    /** Refunds are issued by hand in the Stripe dashboard (plan 8.4); this is
     *  the admin's own record of what was done and why. */
    refundNote: { type: String, default: "" },

    // --- Fulfilment (C3) -----------------------------------------------------
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      default: "new",
      index: true,
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    tracking: {
      courier: { type: String, default: "" },
      number: { type: String, default: "" },
      note: { type: String, default: "" },
    },

    // --- Customer-requested cancellation (plan 8.5) --------------------------
    cancellationRequest: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "declined"],
        default: "none",
      },
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: "" },
      handledBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
      handledAt: { type: Date, default: null },
      adminNote: { type: String, default: "" },
    },

    invoiceNumber: { type: String, default: null },
    /** Set when the order came from an accepted price quote (C1). */
    enquiryId: { type: Schema.Types.ObjectId, ref: "PriceEnquiry", default: null },
    /** Stock is decremented exactly once, by the webhook. Guards against Stripe
     *  redelivering an event and selling the same unit twice. */
    stockAppliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ "stripe.checkoutSessionId": 1 });
// The admin queue: pending cancellation requests first.
orderSchema.index({ "cancellationRequest.status": 1, createdAt: -1 });

export type OrderItemDoc = InferSchemaType<typeof orderItemSchema>;
export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: Types.ObjectId };
export const Order = defineModel("Order", orderSchema);
