import "server-only";
import { connectDb } from "../db";
import { buildCategoryTree, getCategories, getFeaturedProducts } from "../catalogue";
import { ContentPage, type ContentPageDoc } from "../models/ContentPage";
import type { SectionType } from "../models/enums";
import type { RenderedSection, SectionContext } from "@/components/cms/Sections";
import { tl as readTL, type Locale, type TL } from "../i18n";

/** Reading CMS pages for the storefront. */

export type CmsPage = {
  slug: string;
  title: TL;
  seo: { title: TL; description: TL };
  /** Visible sections only. A hidden section is omitted here on purpose. */
  sections: RenderedSection[];
  /** True when the page has sections stored, even if every one is hidden.
   *  Callers use this so "hide" does not fall back to the built-in page. */
  managed: boolean;
};

const tl = (value: { en?: string; ar?: string } | null | undefined): TL => ({
  en: value?.en ?? "",
  ar: value?.ar ?? "",
});

export async function getPage(slug: string): Promise<CmsPage | null> {
  await connectDb();
  const page = await ContentPage.findOne({ slug, published: true }).lean<ContentPageDoc | null>();
  if (!page) return null;

  const stored = page.sections ?? [];

  return {
    slug: page.slug,
    title: tl(page.title),
    seo: { title: tl(page.seo?.title), description: tl(page.seo?.description) },
    managed: stored.length > 0,
    sections: stored
      .filter((section) => section.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        type: section.type as SectionType,
        data: (section.data ?? {}) as Record<string, unknown>,
      })),
  };
}

/** Everything a section might need, fetched once per page rather than per
 *  section — several sections want the featured products or the categories, and
 *  each fetching its own would multiply the queries by the page length. */
export async function sectionContext(locale: Locale): Promise<SectionContext> {
  const [featured, categories] = await Promise.all([getFeaturedProducts(12), getCategories()]);
  return { locale, featured, categories: buildCategoryTree(categories) };
}

/** True when a page has been given content in the CMS.
 *
 *  Pages fall back to their hand-built version until somebody edits them, so
 *  moving a page into the CMS is a decision rather than something that happens
 *  the moment the feature ships and leaves a blank page behind.
 */
export async function pageHasContent(slug: string): Promise<boolean> {
  const page = await getPage(slug);
  return Boolean(page?.managed);
}

export type PageBody = {
  page: CmsPage | null;
  /** Visible sections. Empty when the page is unmanaged, or when every stored
   *  section has been hidden. */
  sections: RenderedSection[];
  /** Stored sections exist, including hidden ones. */
  managed: boolean;
  context: SectionContext | null;
};

/** Everything a storefront page needs to decide between its CMS body and its
 *  hand-built one. Every content page asks the same question, so it is asked in
 *  one place rather than four. */
export async function getPageBody(slug: string, locale: Locale): Promise<PageBody> {
  const page = await getPage(slug);
  const sections = page?.sections ?? [];
  return {
    page,
    sections,
    managed: Boolean(page?.managed),
    context: sections.length > 0 ? await sectionContext(locale) : null,
  };
}

/** SEO overrides an admin has typed for a page.
 *
 *  Returned as a partial so a route can spread it over its built-in metadata:
 *  a field left blank in the admin panel must not blank the page's real title.
 */
export async function cmsSeo(
  slug: string,
  locale: Locale,
): Promise<{ title?: string; description?: string }> {
  const page = await getPage(slug);
  if (!page) return {};
  const title = readTL(page.seo.title, locale) || readTL(page.title, locale);
  const description = readTL(page.seo.description, locale);
  return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
}
