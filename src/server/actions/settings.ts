"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Settings } from "@/lib/models/Settings";
import { invalidateSettings } from "@/lib/settings";
import {
  aedAmount,
  bilingual,
  fieldErrorsFrom,
  optionalAedAmount,
  type ActionState,
} from "@/lib/validation/shared";

/** Store settings.
 *
 *  Everything an admin can change without a deploy: shipping (C11), tax, the
 *  low-stock threshold (C12), review moderation (C2), invoice details and who
 *  gets alerted.
 */

const settingsSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1).max(120),
    contactEmail: z.string().trim().max(160).default(""),
    contactPhone: z.string().trim().max(60).default(""),
    address: bilingual({ max: 400 }),
  }),
  shipping: z.object({
    flatRate: aedAmount,
    /** Blank means "always charge" — different from zero, which would be free
     *  shipping on everything. */
    freeAbove: optionalAedAmount,
  }),
  tax: z.object({
    enabled: z.boolean().default(false),
    ratePercent: z.coerce.number().min(0).max(100).default(5),
    label: bilingual({ max: 60 }),
  }),
  inventory: z.object({
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(5),
  }),
  reviews: z.object({ moderationEnabled: z.boolean().default(true) }),
  invoice: z.object({
    prefix: z.string().trim().max(8).default("INV"),
    trn: z.string().trim().max(40).default(""),
    legalLines: bilingual({ max: 2000 }),
  }),
  notifications: z.object({
    /** One address per line in the form; split before it gets here. */
    adminAlertEmails: z.array(z.string().trim().toLowerCase().pipe(z.email())).max(10),
    digestHourLocal: z.coerce.number().int().min(0).max(23).default(8),
  }),
  cart: z.object({
    abandonedEmailEnabled: z.boolean().default(true),
    abandonedAfterHours: z.coerce.number().int().min(1).max(720).default(24),
  }),
});

export async function saveSettings(payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("settings:write");

  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the settings.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const input = parsed.data;
  await connectDb();

  await Settings.updateOne(
    { singleton: "settings" },
    {
      $set: {
        store: input.store,
        "shipping.flatRateFils": input.shipping.flatRate,
        "shipping.freeAboveFils": input.shipping.freeAbove,
        tax: input.tax,
        inventory: input.inventory,
        reviews: input.reviews,
        "invoice.prefix": input.invoice.prefix,
        "invoice.trn": input.invoice.trn,
        "invoice.legalLines": input.invoice.legalLines,
        notifications: input.notifications,
        cart: input.cart,
      },
    },
    { upsert: true },
  );

  // The settings cache is short-lived, but an admin who just changed the
  // shipping charge should see it immediately rather than within a minute.
  invalidateSettings();

  await recordAudit(admin, {
    action: "update",
    entity: "Settings",
    entityLabel: "Store settings",
    diff: {
      shipping: input.shipping,
      tax: input.tax.enabled ? input.tax.ratePercent : "off",
      lowStockThreshold: input.inventory.lowStockThreshold,
      reviewModeration: input.reviews.moderationEnabled,
    },
  });

  // Shipping, tax and the stock threshold all change what customers see.
  revalidatePath("/[locale]", "layout");
  revalidatePath("/admin/settings");

  return { ok: true, notice: "Settings saved." };
}
