import { CMS_PAGES, LEGAL_PAGE_SLUG } from "@/lib/cms/order";

/** Where a CMS page actually appears on the storefront.
 *
 *  Kept out of any screen so the Pages list and the editor's "View page"
 *  button cannot drift apart. Safe to import from a client component — it is
 *  plain data.
 */
export function cmsPagePath(slug: string, locale = "en"): string {
  if (slug === "home") return `/${locale}`;
  if (slug === LEGAL_PAGE_SLUG) return `/${locale}/legal`;
  return `/${locale}/${slug}`;
}

export function cmsPageOrder(slug: string): number {
  const index = CMS_PAGES.findIndex((page) => page.slug === slug);
  return index === -1 ? CMS_PAGES.length : index;
}
