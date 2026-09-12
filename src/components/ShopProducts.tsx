import Link from "next/link";
import { SHOP } from "@/content/shop";
import { ProductCard } from "@/components/ProductCard";
import { ShopPagination } from "@/components/ShopFilters";
import { shopHref, type ShopParams } from "@/lib/shop-url";
import { getShopProducts, type ShopSort } from "@/lib/catalogue";
import { localePath, t, type Locale } from "@/lib/i18n";
import type { ProductForm } from "@/lib/models/enums";

const SORTS: ShopSort[] = ["featured", "newest", "price-asc", "price-desc", "name"];

/** Async product grid — lives inside Suspense so category/sort changes show a
 *  skeleton on the grid only while filters stay interactive. */
export async function ShopProducts({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<ShopParams>;
}) {
  const query = await searchParams;
  const base = localePath(locale, "/shop");

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
  const resultsLabel =
    result.total === 1 ? t(SHOP.productsOne, locale) : `${result.total} ${t(SHOP.productsMany, locale)}`;

  return (
    <>
      <p className="shop-results__count">{resultsLabel}</p>

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
          <div className="product-grid shop-page__grid">
            {result.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                delay={index * 90}
                wishlist
                variant="cabinet"
              />
            ))}
          </div>

          <ShopPagination
            params={query}
            page={result.page}
            pages={result.pages}
            locale={locale}
          />
        </>
      )}
    </>
  );
}
