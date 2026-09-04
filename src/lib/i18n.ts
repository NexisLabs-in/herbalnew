export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

/** A string that exists in both site languages. Mirrors the shape used by the
 *  existing app's content objects, so records port across unchanged. */
export type L = { en: string; ar: string };

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ar" : "en";
}

/** Builds a locale-prefixed href: localePath("ar", "/shop") -> "/ar/shop" */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** Swaps the locale segment of a pathname, keeping the rest of the route. */
export function swapLocaleInPath(pathname: string, next: Locale): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && isLocale(parts[0])) {
    parts[0] = next;
    return `/${parts.join("/")}`;
  }
  return localePath(next, pathname);
}

export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", ar: "ع" };

/** Reads one side of a bilingual string. */
export const t = (value: L, locale: Locale): string => value[locale];

/** A bilingual value as stored in MongoDB: English is required, Arabic is
 *  optional (plan section 3). Distinct from `L`, where both sides always exist
 *  because the hardcoded content was translated up front. */
export type TL = { en: string; ar?: string | null };

/** Reads a stored bilingual value, falling back to English when the Arabic side
 *  was left blank. Rendering an empty string on /ar would look like a bug to a
 *  customer; showing the English is honest and keeps the page intact. */
export function tl(value: TL | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (locale === "ar") return value.ar?.trim() || value.en;
  return value.en;
}

/** True when the Arabic side is missing — drives the "needs translation" hints
 *  in the admin forms. */
export function needsArabic(value: TL | null | undefined): boolean {
  return !value?.ar?.trim();
}

/** Formats a price in AED, or returns null while pricing is unconfirmed.
 *  Arabic uses Latin digits for the amount, matching the live site.
 *  Takes whole AED — for stored money use `formatFils`, which is the unit
 *  everything in the database speaks. */
export function formatAed(value: number | null, locale: Locale): string | null {
  if (value === null) return null;
  const amount = new Intl.NumberFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return locale === "ar" ? `${amount} د.إ` : `AED ${amount}`;
}

/** Formats stored money (integer fils) for display. */
export function formatFils(fils: number | null | undefined, locale: Locale): string | null {
  if (fils === null || fils === undefined) return null;
  return formatAed(fils / 100, locale);
}
