import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getCategories, getPublishedSlugs } from "@/lib/catalogue";
import { locales } from "@/lib/i18n";

/** The sitemap.
 *
 *  Both locales for every page, with `alternates` so a search engine knows the
 *  two are the same page in different languages rather than duplicates
 *  competing with each other.
 *
 *  Only public pages. The basket, checkout, account, invoices and quote links
 *  are all per-visitor or private and are excluded here as well as by robots.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();

  const staticPaths = ["", "/shop", "/method", "/faq", "/contact", "/legal"];

  const [slugs, categories] = await Promise.all([
    getPublishedSlugs().catch(() => [] as string[]),
    getCategories().catch(() => []),
  ]);

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number][] =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((other) => [other, `${base}/${other}${path}`]),
        ),
      },
    }));

  return [
    ...staticPaths.flatMap((path) => entry(path, path === "" ? 1 : 0.7)),
    ...slugs.flatMap((slug) => entry(`/shop/${slug}`, 0.8)),
    // Category views are real URLs on the shop, so they are worth listing.
    ...categories.flatMap((category) => entry(`/shop?category=${category.slug}`, 0.5)),
  ];
}
