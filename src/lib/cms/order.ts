import type { L } from "@/lib/i18n";

/** The pages an admin can edit, in the order they appear on the site.
 *
 *  Home is the logo, then the navbar, then Policies — the one footer page that
 *  is not already in the nav. Herb Cabinet is the catalogue, not a CMS page,
 *  and account links are not content. Plain data so a client component can
 *  import it.
 */
export const CMS_PAGES: { slug: string; title: L }[] = [
  { slug: "home", title: { en: "Home", ar: "الرئيسية" } },
  { slug: "method", title: { en: "Our Method", ar: "منهجنا" } },
  { slug: "faq", title: { en: "FAQ", ar: "الأسئلة الشائعة" } },
  { slug: "contact", title: { en: "Contact", ar: "تواصل معنا" } },
  { slug: "legal", title: { en: "Policies", ar: "السياسات" } },
];

export const LEGAL_PAGE_SLUG = "legal";

/** The four records the CMS used to keep for one storefront page. */
export const RETIRED_POLICY_SLUGS = ["terms", "privacy", "legal-notice", "returns"] as const;

export function isRetiredPolicySlug(slug: string): boolean {
  return (RETIRED_POLICY_SLUGS as readonly string[]).includes(slug);
}
