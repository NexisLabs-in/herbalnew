import { connectDb } from "./db";
import { Settings, type SettingsDoc } from "./models/Settings";
import type { PricingSettings } from "./pricing";

/** Reads the store settings singleton, creating it on first call.
 *
 *  Settings are read on nearly every request — the pricing engine needs the
 *  shipping rate and tax rate, the product page needs the low-stock threshold —
 *  so they are cached in the module for a short window. Sixty seconds is long
 *  enough to spare the database on a busy page and short enough that an admin
 *  changing the shipping charge sees it take effect while they are still
 *  looking at the site. Admin writes call `invalidateSettings()` for an
 *  immediate refresh.
 */

const TTL_MS = 60_000;

type Cache = { value: SettingsDoc | null; readAt: number };
const globalForSettings = globalThis as unknown as { _settings?: Cache };
const cache: Cache = (globalForSettings._settings ??= { value: null, readAt: 0 });

export async function getSettings(): Promise<SettingsDoc> {
  if (cache.value && Date.now() - cache.readAt < TTL_MS) return cache.value;

  await connectDb();
  // upsert so a fresh install cannot 500 on a missing document; the unique
  // index on `singleton` makes a concurrent upsert safe.
  const doc = await Settings.findOneAndUpdate(
    { singleton: "settings" },
    { $setOnInsert: { singleton: "settings" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<SettingsDoc>();

  // `upsert` + `new` always returns a document; the null is only in the types.
  if (!doc) throw new Error("Settings could not be created");

  cache.value = doc;
  cache.readAt = Date.now();
  return doc;
}

export function invalidateSettings(): void {
  cache.value = null;
  cache.readAt = 0;
}

/** Adapts stored settings to what the pricing engine takes.
 *
 *  Mongoose infers optional fields on nested defaults, and the engine wants a
 *  definite `number | null`. Converting once here keeps every call site — cart,
 *  checkout, the Stripe session — from repeating the same null coalescing and
 *  possibly disagreeing about the default. */
export function toPricingSettings(settings: SettingsDoc): PricingSettings {
  return {
    shipping: {
      flatRateFils: settings.shipping.flatRateFils ?? 0,
      freeAboveFils: settings.shipping.freeAboveFils ?? null,
    },
    tax: {
      enabled: settings.tax.enabled ?? false,
      ratePercent: settings.tax.ratePercent ?? 0,
    },
  };
}

/** Shipping for a given post-discount total (requirement C11). */
export function shippingFor(settings: SettingsDoc, discountedTotalFils: number): number {
  const { flatRateFils, freeAboveFils } = settings.shipping;
  if (freeAboveFils != null && discountedTotalFils >= freeAboveFils) return 0;
  return flatRateFils ?? 0;
}
