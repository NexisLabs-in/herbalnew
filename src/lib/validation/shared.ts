import { z } from "zod";
import { parseAedInput } from "../money";

/** Shared field schemas for admin forms.
 *
 *  Admin forms submit one JSON payload rather than loose FormData fields:
 *  products carry nested arrays (preparation steps, cautions, images) that
 *  flatten badly into `name[0][en]` keys, and every value arriving as a string
 *  means coercing types by hand at the boundary. One parse, one schema, one
 *  place where a bad value is caught.
 */

/** English required, Arabic optional (plan §3). A blank Arabic side falls back
 *  to English on the storefront rather than rendering an empty page. */
export const bilingual = (options: { required?: boolean; max?: number } = {}) => {
  const max = options.max ?? 2000;
  const en = options.required
    ? z.string().trim().min(1, "English is required.").max(max)
    : z.string().trim().max(max).default("");
  return z.object({ en, ar: z.string().trim().max(max).default("") });
};

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Too short.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

export const skuField = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Too short.")
  .max(24)
  .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use capitals, numbers and hyphens only.");

export const objectIdField = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{24}$/i, "Choose an option.");

/** A price typed by a human ("12.50") converted to integer fils.
 *  Rejects anything that is not a plain non-negative amount. */
export const aedAmount = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const fils = parseAedInput(value);
    if (fils === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 49.00" });
      return z.NEVER;
    }
    return fils;
  });

/** An optional amount: blank means "not set", which is different from zero. */
export const optionalAedAmount = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const fils = parseAedInput(value);
    if (fils === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 49.00, or leave it empty." });
      return z.NEVER;
    }
    return fils;
  });

export const optionalInt = (max = 1_000_000) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      if (!/^\d+$/.test(value)) {
        ctx.addIssue({ code: "custom", message: "Whole numbers only." });
        return z.NEVER;
      }
      const parsed = Number(value);
      if (parsed > max) {
        ctx.addIssue({ code: "custom", message: `Must be ${max} or less.` });
        return z.NEVER;
      }
      return parsed;
    });

/** The shape every admin action returns to its form. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  /** Field-level messages keyed by dotted path, e.g. "name.en". */
  fieldErrors?: Record<string, string>;
  notice?: string;
};

/** Turns a Zod failure into field messages the form can place next to inputs. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    // First message per field wins — a stack of messages under one input is
    // noise, and the first is the one that stopped the parse.
    if (!(path in result)) result[path] = issue.message;
  }
  return result;
}
