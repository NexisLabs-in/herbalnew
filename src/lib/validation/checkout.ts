import { z } from "zod";
import { EMIRATES } from "../models/enums";

/** Checkout input.
 *
 *  Shipping is UAE-only (plan §3), so the country is fixed and the emirate is a
 *  closed list rather than free text. There is no postcode field: the UAE does
 *  not use them, and a required field nobody can fill is a checkout drop-off
 *  for nothing.
 */
export const addressSchema = z.object({
  label: z.string().trim().max(40).default(""),
  fullName: z.string().trim().min(2, "Enter the recipient's name.").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number we can reach you on.")
    .max(30)
    .regex(/^[0-9+()\s-]+$/, "Digits, spaces and + only."),
  line1: z.string().trim().min(3, "Enter the street address.").max(200),
  line2: z.string().trim().max(200).default(""),
  city: z.string().trim().min(2, "Enter the area or city.").max(120),
  emirate: z.enum(EMIRATES, { message: "Choose an emirate." }),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

/** Either an existing saved address, or a new one to save and use. */
export const checkoutSchema = z.object({
  addressId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  address: addressSchema.optional(),
  locale: z.enum(["en", "ar"]).default("en"),
}).refine((value) => value.addressId || value.address, {
  message: "Choose or enter a delivery address.",
  path: ["address"],
});

export const cancellationSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  reason: z.string().trim().min(3, "Tell us briefly why.").max(500),
});
