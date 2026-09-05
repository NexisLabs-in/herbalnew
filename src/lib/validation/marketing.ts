import { z } from "zod";
import { objectIdField, optionalAedAmount, optionalInt } from "./shared";

/** Sales (C6) and coupons (C8). */

export const saleSchema = z
  .object({
    name: z.string().trim().min(2, "Give the sale a name.").max(120),
    startAt: z.string().min(1, "Choose a start date."),
    endAt: z.string().min(1, "Choose an end date."),
    active: z.boolean().default(true),
    entries: z
      .array(
        z.object({
          productId: objectIdField,
          discountPercent: z.coerce
            .number()
            .int()
            .min(1, "Between 1 and 100.")
            .max(100, "Between 1 and 100."),
        }),
      )
      .min(1, "Add at least one product."),
  })
  .superRefine((value, ctx) => {
    const start = new Date(value.startAt).getTime();
    const end = new Date(value.endAt).getTime();
    if (Number.isNaN(start)) ctx.addIssue({ code: "custom", path: ["startAt"], message: "Not a date." });
    if (Number.isNaN(end)) ctx.addIssue({ code: "custom", path: ["endAt"], message: "Not a date." });
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "The sale must end after it starts." });
    }
    // Two entries for one product would make the discount depend on which was
    // read first.
    const seen = new Set<string>();
    value.entries.forEach((entry, index) => {
      if (seen.has(entry.productId)) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "productId"],
          message: "This product is already in the sale.",
        });
      }
      seen.add(entry.productId);
    });
  });

export type SaleInput = z.infer<typeof saleSchema>;

/** A coupon (C8).
 *
 *  `allProducts` is the "select all" shortcut and is stored as a flag rather
 *  than a snapshot of every id, so products added later are covered too.
 */
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "At least 3 characters.")
      .max(24)
      .regex(/^[A-Z0-9-]+$/, "Capitals, numbers and hyphens only."),
    description: z.string().trim().max(200).default(""),
    discountType: z.enum(["percent", "amount"]),
    percentValue: z.coerce.number().int().min(1).max(100).optional(),
    amountValue: optionalAedAmount,
    allProducts: z.boolean().default(false),
    productIds: z.array(objectIdField).default([]),
    expiresAt: z.string().default(""),
    minOrder: optionalAedAmount,
    usageLimit: optionalInt(1_000_000),
    usageLimitPerCustomer: optionalInt(1000),
    active: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "percent" && !value.percentValue) {
      ctx.addIssue({ code: "custom", path: ["percentValue"], message: "Enter a percentage." });
    }
    if (value.discountType === "amount" && value.amountValue === null) {
      ctx.addIssue({ code: "custom", path: ["amountValue"], message: "Enter an amount." });
    }
    // A coupon that covers nothing can never be applied; catching it here saves
    // an admin wondering why their code is always rejected.
    if (!value.allProducts && value.productIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["productIds"],
        message: "Choose the products this code applies to, or select all.",
      });
    }
  });

export type CouponInput = z.infer<typeof couponSchema>;

export const featuredSchema = z.object({
  entries: z.array(z.object({ productId: objectIdField, order: z.coerce.number().int().min(0).max(999) })),
});
