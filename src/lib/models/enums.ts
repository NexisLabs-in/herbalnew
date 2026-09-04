/** Catalogue and order vocabularies — plain data, no dependencies.
 *
 *  These live apart from the schemas because client components need them too:
 *  a form has to render the same list of statuses the database enforces.
 *  Importing them from a model file pulls Mongoose (and through it `fs`,
 *  `child_process` and the rest of the MongoDB driver) into the browser bundle,
 *  which does not resolve and should not be shipped. The schemas import from
 *  here; so does the admin UI.
 */

export const PRODUCT_FORMS = ["oil", "powder"] as const;
export const PRICING_MODES = ["fixed", "request"] as const;
export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const IMAGE_KINDS = ["photo", "pack", "carton", "plate"] as const;

export type ProductForm = (typeof PRODUCT_FORMS)[number];
export type PricingMode = (typeof PRICING_MODES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ImageKind = (typeof IMAGE_KINDS)[number];

/** The fulfilment stages an admin moves an order through (requirement C3).
 *  Array order is dropdown order and timeline order. */
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
 *  the parcel is with a courier and cancelling becomes a return. */
export const CANCELLABLE_STATUSES: FulfillmentStatus[] = ["new", "packed"];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ENQUIRY_STATUSES = ["new", "quoted", "accepted", "expired", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Shipping is UAE-only (plan §3), so this is a closed list rather than a
 *  free-text region field. */
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

/** The section types the CMS can place on a page — a fixed registry mapped 1:1
 *  onto existing components, so admins reorder and edit copy but cannot invent
 *  layouts. There is deliberately no harvest-calendar section (C9). */
export const SECTION_TYPES = [
  "hero",
  "trustStrip",
  "traditionsRibbon",
  "featuredProducts",
  "categoryGrid",
  "methodTeaser",
  "richText",
  "accordion",
  "imageText",
  "advisory",
  "ctaBanner",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];
