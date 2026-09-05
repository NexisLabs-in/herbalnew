import "server-only";
import { connectDb } from "../db";
import { buildCategoryTree, getCategories, getFeaturedProducts } from "../catalogue";
import { ContentPage, type ContentPageDoc } from "../models/ContentPage";
import type { SectionType } from "../models/enums";
import type { RenderedSection, SectionContext } from "@/components/cms/Sections";
import type { Locale, TL } from "../i18n";

/** Reading CMS pages for the storefront. */

export type CmsPage = {
  slug: string;
  title: TL;
  seo: { title: TL; description: TL };
  sections: RenderedSection[];
};

const tl = (value: { en?: string; ar?: string } | null | undefined): TL => ({
  en: value?.en ?? "",
  ar: value?.ar ?? "",
});

export async function getPage(slug: string): Promise<CmsPage | null> {
  await connectDb();
  const page = await ContentPage.findOne({ slug, published: true }).lean<ContentPageDoc | null>();
  if (!page) return null;

  return {
    slug: page.slug,
    title: tl(page.title),
    seo: { title: tl(page.seo?.title), description: tl(page.seo?.description) },
    sections: (page.sections ?? [])
      .filter((section) => section.visible)
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
  return Boolean(page && page.sections.length > 0);
}
