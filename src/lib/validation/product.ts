import { z } from "zod";
import { IMAGE_KINDS, PRICING_MODES, PRODUCT_FORMS, PRODUCT_STATUSES } from "../models/enums";
import { aedAmount, bilingual, objectIdField, optionalAedAmount, optionalInt, skuField, slugField } from "./shared";

/** The product payload an admin form submits. */

const imageSchema = z.object({
  key: z.string().min(1),
  url: z.string().min(1),
  alt: bilingual(),
  isPrimary: z.boolean().default(false),
  kind: z.enum(IMAGE_KINDS).default("photo"),
});

const stepSchema = z.object({
  detail: bilingual({ required: true }),
  measure: z.string().trim().max(80).default(""),
});

/** A standing discount on the product itself (C7).
 *
 *  `null` is meaningful and is not the same as zero: when it is null the
 *  storefront renders no discount UI at all, which is exactly what the client
 *  asked for — an empty field must not produce a "0% off" badge.
 */
const permanentDiscountSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("percent"),
      value: z.coerce.number().min(1, "Between 1 and 100.").max(100, "Between 1 and 100."),
    }),
    z.object({ type: z.literal("amount"), value: aedAmount }),
  ])
  .nullable();

export const productSchema = z
  .object({
    slug: slugField,
    sku: skuField,
    name: bilingual({ required: true, max: 160 }),
    summary: bilingual({ max: 600 }),
    categoryId: objectIdField,
    form: z.enum(PRODUCT_FORMS),
    formLabel: bilingual({ max: 60 }),

    pricingMode: z.enum(PRICING_MODES),
    /** Blank for request-price products; required for fixed (checked below). */
    price: optionalAedAmount,
    permanentDiscount: permanentDiscountSchema.default(null),

    trackInventory: z.boolean().default(true),
    stock: z.coerce.number().int().min(0).max(1_000_000).default(0),

    composition: bilingual({ max: 4000 }),
    chemistryEffects: bilingual({ max: 4000 }),
    netQuantity: bilingual({ max: 120 }),
    batch: bilingual({ max: 120 }),
    shelfLifeMonths: optionalInt(600),
    storage: bilingual({ max: 600 }),

    /** Null while the preparation method is unconfirmed — the storefront then
     *  shows its "awaiting confirmation" state rather than an invented dosage. */
    directions: z
      .object({
        steps: z.array(stepSchema).max(20),
        frequency: bilingual({ max: 300 }),
        maximum: bilingual({ max: 300 }),
      })
      .nullable()
      .default(null),

    safety: z.object({
      targetGroup: bilingual({ max: 200 }),
      cautions: z.array(bilingual({ required: true, max: 500 })).max(30),
      seekAdvice: z.array(bilingual({ required: true, max: 300 })).max(30),
    }),

    images: z.array(imageSchema).max(12),

    featured: z.boolean().default(false),
    featuredOrder: z.coerce.number().int().min(0).max(999).default(0),
    status: z.enum(PRODUCT_STATUSES),
    seo: z.object({ title: bilingual({ max: 160 }), description: bilingual({ max: 320 }) }),
  })
  .superRefine((value, ctx) => {
    // A fixed-price product with no price would render an empty buy box and
    // could be added to a cart for nothing.
    if (value.pricingMode === "fixed" && value.price === null) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "A fixed-price product needs a price." });
    }
    // An amount-off discount larger than the price would make the item free.
    if (
      value.pricingMode === "fixed" &&
      value.price !== null &&
      value.permanentDiscount?.type === "amount" &&
      value.permanentDiscount.value >= value.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["permanentDiscount", "value"],
        message: "The discount is not less than the price.",
      });
    }
    // Publishing is the point at which a customer can see it, so that is where
    // the standards apply rather than at draft.
    if (value.status === "published") {
      if (value.images.length === 0) {
        ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one image before publishing." });
      }
      if (!value.summary.en) {
        ctx.addIssue({ code: "custom", path: ["summary", "en"], message: "A summary is needed before publishing." });
      }
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  slug: slugField,
  name: bilingual({ required: true, max: 120 }),
  note: bilingual({ max: 300 }),
  description: bilingual({ max: 2000 }),
  image: z.string().default(""),
  order: z.coerce.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** A stock correction. `delta` rather than an absolute value: two admins
 *  counting the same shelf at the same time should add up, not overwrite each
 *  other. `reason` is required — an unexplained stock change is the thing
 *  nobody can reconstruct three months later. */
export const stockAdjustmentSchema = z.object({
  productId: objectIdField,
  delta: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  reason: z.string().trim().min(2, "Say why — a count, a delivery, a breakage.").max(200),
});
