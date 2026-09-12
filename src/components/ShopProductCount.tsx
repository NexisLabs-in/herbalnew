import { SHOP } from "@/content/shop";
import type { ShopParams } from "@/lib/shop-url";
import { getShopProducts, type ShopSort } from "@/lib/catalogue";
import { t, type Locale } from "@/lib/i18n";
import type { ProductForm } from "@/lib/models/enums";

const SORTS: ShopSort[] = ["featured", "newest", "price-asc", "price-desc", "name"];

/** Lightweight count for the listing toolbar — shares the same filter as the grid. */
export async function ShopProductCount({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<ShopParams>;
}) {
  const query = await searchParams;
  const sort = SORTS.includes(query.sort as ShopSort) ? (query.sort as ShopSort) : "featured";
  const form = query.form === "oil" || query.form === "powder" ? (query.form as ProductForm) : "all";
  const page = Number.parseInt(query.page ?? "1", 10);

  const { total } = await getShopProducts({
    category: query.category,
    form,
    q: query.q?.trim() || undefined,
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  const label =
    total === 1 ? t(SHOP.productsOne, locale) : `${total} ${t(SHOP.productsMany, locale)}`;

  return <p className="shop-listing-toolbar__count">{label}</p>;
}
