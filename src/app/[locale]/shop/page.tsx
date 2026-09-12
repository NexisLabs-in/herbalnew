import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Advisory } from "@/components/Blocks";
import { NAV } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { ShopHero } from "@/components/ShopHero";
import { ShopCatalog } from "@/components/ShopCatalog";
import type { ShopParams } from "@/components/ShopFilters";
import { ShopProducts } from "@/components/ShopProducts";
import { buildCategoryTree, getCategories } from "@/lib/catalogue";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

/** The Herb Cabinet, read from the database.
 *
 *  Revalidated rather than rendered per request: the catalogue changes when an
 *  admin saves, and every product write calls `revalidatePath` for this route,
 *  so the window is only how long a page can be stale if a revalidation is
 *  missed — not how often a shopper sees old prices.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[0].label, locale), description: t(SHOP.heroSub, locale) };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopParams>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const categories = await getCategories();
  const base = localePath(locale, "/shop");

  return (
    <>
      <ShopHero locale={locale} />

      <section className="section--tight shop-page">
        <div className="shell shell--wide">
          <ShopCatalog base={base} tree={buildCategoryTree(categories)} locale={locale}>
            <ShopProducts locale={locale} searchParams={searchParams} />
          </ShopCatalog>

          <div className="shop-page__advisory">
            <Advisory locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}
