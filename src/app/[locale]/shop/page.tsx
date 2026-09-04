import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND, NAV, UI } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { Advisory, PageHead } from "@/components/Blocks";
import { ProductCard } from "@/components/ProductCard";
import { ShopFilters, ShopPagination, shopHref, type ShopParams } from "@/components/ShopFilters";
import { getShopProducts, type ShopSort } from "@/lib/catalogue";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";
import type { ProductForm } from "@/lib/models/enums";

/** The Herb Cabinet, read from the database.
 *
 *  Revalidated rather than rendered per request: the catalogue changes when an
 *  admin saves, and every product write calls `revalidatePath` for this route,
 *  so the window is only how long a page can be stale if a revalidation is
 *  missed — not how often a shopper sees old prices.
 */
export const revalidate = 300;

const SORTS: ShopSort[] = ["featured", "newest", "price-asc", "price-desc", "name"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[0].label, locale), description: t(BRAND.supporting, locale) };
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

  const query = await searchParams;
  const base = localePath(locale, "/shop");

  // Query values come from the URL, so every one is validated before it reaches
  // a database query rather than being trusted as typed.
  const sort = SORTS.includes(query.sort as ShopSort) ? (query.sort as ShopSort) : "featured";
  const form = query.form === "oil" || query.form === "powder" ? (query.form as ProductForm) : "all";
  const page = Number.parseInt(query.page ?? "1", 10);

  const result = await getShopProducts({
    category: query.category,
    form,
    q: query.q?.trim() || undefined,
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  const filtered = Boolean(query.q || query.category || query.form);

  return (
    <>
      <PageHead
        kicker={t(BRAND.tagline, locale)}
        title={t(NAV[0].label, locale)}
        sub={t(BRAND.supporting, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[0].label, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <dl style={{ display: "flex", gap: "2.25rem" }}>
            <div>
              <dt className="data-label">{t(UI.formulas, locale)}</dt>
              <dd className="display d4" style={{ margin: ".3rem 0 0" }}>
                {result.total}
              </dd>
            </div>
            <div>
              <dt className="data-label">{t(UI.shelves, locale)}</dt>
              <dd className="display d4" style={{ margin: ".3rem 0 0" }}>
                {result.categories.length}
              </dd>
            </div>
          </dl>

          <div style={{ marginTop: "2rem" }}>
            <Advisory locale={locale} />
          </div>

          <div style={{ marginTop: "2.5rem" }}>
            <ShopFilters
              base={base}
              params={query}
              categories={result.categories}
              locale={locale}
              total={result.total}
            />
          </div>

          {result.products.length === 0 ? (
            <div className="empty-state">
              <p className="display d4">
                {filtered ? t(SHOP.noResults, locale) : t(SHOP.emptyCabinet, locale)}
              </p>
              {filtered ? (
                <>
                  <p className="body" style={{ marginTop: ".75rem" }}>
                    {t(SHOP.noResultsHint, locale)}
                  </p>
                  <Link
                    className="btn btn--ghost"
                    style={{ marginTop: "1.5rem" }}
                    href={shopHref(base, {}, {})}
                  >
                    {t(SHOP.showAll, locale)}
                  </Link>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div className="product-grid" style={{ marginTop: "clamp(2rem,4vw,3rem)" }}>
                {result.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    delay={index * 90}
                  />
                ))}
              </div>

              <ShopPagination
                base={base}
                params={query}
                page={result.page}
                pages={result.pages}
                locale={locale}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
