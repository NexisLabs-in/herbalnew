import Link from "next/link";
import { SHOP } from "@/content/shop";
import { Icon, type IconName } from "@/components/Icon";
import type { CategoryTreeNode, CategoryView, ShopSort } from "@/lib/catalogue";
import { t, tl, type Locale } from "@/lib/i18n";

const SHELF_ICONS: Record<string, IconName> = {
  "beauty-personal-care": "drop",
  "wellness-lifestyle": "leaf",
  "body-systems": "shield",
  "reproductive-hormonal": "heart",
};
const shelfIcon = (slug: string): IconName => SHELF_ICONS[slug] ?? "leaf";

/** The catalogue toolbar: search, shelf, form and sort.
 *
 *  Rewritten from a client-side filter to plain links and a GET form. Filtering
 *  in the browser only works while the whole catalogue fits on one page, and it
 *  leaves every filtered view sharing one URL — so a customer cannot send
 *  somebody "the oils", and a search engine sees one page instead of several.
 *  Server-side means every view has an address and the page works without JS.
 */

export type ShopParams = {
  category?: string;
  form?: string;
  q?: string;
  sort?: string;
  page?: string;
};

/** Builds a URL that keeps the current view and changes one thing.
 *  Paging always resets: page 3 of "oils" is rarely page 3 of "everything". */
export function shopHref(base: string, params: ShopParams, change: Partial<ShopParams>): string {
  const next = { ...params, ...change };
  if (!("page" in change)) delete next.page;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && value !== "all" && !(key === "page" && value === "1")) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function ShopFilters({
  base,
  params,
  tree,
  locale,
  total,
}: {
  base: string;
  params: ShopParams;
  tree: CategoryTreeNode[];
  locale: Locale;
  total: number;
}) {
  const activeCategory = params.category ?? "all";

  /** Which parent's shelves to reveal. Selecting a subcategory keeps its parent
   *  open, so a customer can move sideways between shelves without going back
   *  up a level first. */
  const openParent: CategoryTreeNode | undefined = tree.find(
    (parent) =>
      parent.slug === activeCategory ||
      parent.children.some((child: CategoryView) => child.slug === activeCategory),
  );
  const activeForm = params.form ?? "all";
  const activeSort = (params.sort ?? "featured") as ShopSort;

  const sorts: { value: ShopSort; label: string }[] = [
    { value: "featured", label: t(SHOP.sortFeatured, locale) },
    { value: "newest", label: t(SHOP.sortNewest, locale) },
    { value: "price-asc", label: t(SHOP.sortPriceAsc, locale) },
    { value: "price-desc", label: t(SHOP.sortPriceDesc, locale) },
    { value: "name", label: t(SHOP.sortName, locale) },
  ];

  const activeFilterCount =
    (activeCategory !== "all" ? 1 : 0) +
    (activeForm !== "all" ? 1 : 0) +
    (activeSort !== "featured" ? 1 : 0);

  const resultsLabel =
    total === 1 ? t(SHOP.resultsOne, locale) : `${total} ${t(SHOP.resultsMany, locale)}`;

  return (
    <div className="shop-bar">
      {/* Categories are the primary way in — always visible, not tucked behind
          the mobile filters toggle with search/form/sort. */}
      <div className="category-panel">
        <div className="category-panel__intro">
          <p className="eyebrow eyebrow--plain">{t(SHOP.filterByShelf, locale)}</p>
          <h2 className="category-panel__title">{t(SHOP.categoryHeading, locale)}</h2>
          <p className="category-panel__sub">{t(SHOP.categorySub, locale)}</p>
        </div>

        <div className="category-panel__tiles">
          <Link
            scroll={false}
            className={`category-tile${activeCategory === "all" ? " is-active" : ""}`}
            href={shopHref(base, params, { category: undefined })}
            aria-current={activeCategory === "all" ? "true" : undefined}
          >
            <span className="category-tile__icon">
              <Icon name="leaf" size={16} />
            </span>
            <span className="category-tile__label">{t(SHOP.filterAll, locale)}</span>
          </Link>
          {tree.map((parent) => (
            <Link
              scroll={false}
              key={parent.id}
              className={`category-tile${
                openParent?.id === parent.id ? " is-open" : ""
              }${activeCategory === parent.slug ? " is-active" : ""}`}
              href={shopHref(base, params, { category: parent.slug })}
              aria-current={activeCategory === parent.slug ? "true" : undefined}
            >
              <span className="category-tile__icon">
                <Icon name={shelfIcon(parent.slug)} size={16} />
              </span>
              <span className="category-tile__label">{tl(parent.name, locale)}</span>
            </Link>
          ))}
        </div>

        {openParent && openParent.children.length ? (
          <div className="category-panel__subs">
            <Link
              scroll={false}
              className={`filter filter--sub${activeCategory === openParent.slug ? " is-active" : ""}`}
              href={shopHref(base, params, { category: openParent.slug })}
              aria-current={activeCategory === openParent.slug ? "true" : undefined}
            >
              {t(SHOP.filterAll, locale)}
            </Link>
            {openParent.children.map((child: CategoryView) => (
              <Link
                scroll={false}
                key={child.id}
                className={`filter filter--sub${activeCategory === child.slug ? " is-active" : ""}`}
                href={shopHref(base, params, { category: child.slug })}
                aria-current={activeCategory === child.slug ? "true" : undefined}
              >
                {tl(child.name, locale)}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* A GET form, so a search is a real URL that can be shared and revisited.
          The other filters ride along as hidden fields rather than being lost
          the moment somebody searches within a shelf. */}
      <form className="shop-bar__search" action={base} method="get" role="search">
        {activeCategory !== "all" ? <input type="hidden" name="category" value={activeCategory} /> : null}
        {activeForm !== "all" ? <input type="hidden" name="form" value={activeForm} /> : null}
        {activeSort !== "featured" ? <input type="hidden" name="sort" value={activeSort} /> : null}

        <label className="visually-hidden" htmlFor="shop-q">
          {t(SHOP.search, locale)}
        </label>
        <input
          className="field__input"
          id="shop-q"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder={t(SHOP.searchPlaceholder, locale)}
        />
        <button className="btn btn--ghost btn--sm" type="submit">
          {t(SHOP.search, locale)}
        </button>
        {params.q ? (
          <Link className="link-plain" scroll={false} href={shopHref(base, params, { q: undefined })}>
            {t(SHOP.clear, locale)}
          </Link>
        ) : null}
      </form>

      {/* Checkbox toggle: collapsed by default on phones, always visible on
          desktop via CSS. No JS, so filtered URLs still work without it. */}
      <input
        type="checkbox"
        id="shop-filters-toggle"
        className="shop-bar__toggle"
        aria-controls="shop-filters-panel"
      />
      <div className="shop-bar__mobile-tools">
        <label className="shop-bar__toggle-label" htmlFor="shop-filters-toggle">
          <span className="shop-bar__toggle-text">{t(SHOP.filtersToggle, locale)}</span>
          {activeFilterCount > 0 ? (
            <span className="shop-bar__toggle-count" aria-hidden="true">
              {activeFilterCount}
            </span>
          ) : null}
          <span className="shop-bar__toggle-chevron" aria-hidden="true" />
        </label>
        <span className="shop-bar__count">{resultsLabel}</span>
      </div>

      <div className="shop-bar__rows" id="shop-filters-panel">
        <div className="shop-bar__row">
          <span className="shop-bar__label">{t(SHOP.filterByForm, locale)}</span>
          <div className="filters">
            {[
              { value: "all", label: t(SHOP.filterAll, locale) },
              { value: "oil", label: locale === "ar" ? "زيت" : "Oil" },
              { value: "powder", label: locale === "ar" ? "مسحوق" : "Powder" },
            ].map((option) => (
              <Link
                scroll={false}
                key={option.value}
                className={`filter${activeForm === option.value ? " is-active" : ""}`}
                href={shopHref(base, params, {
                  form: option.value === "all" ? undefined : option.value,
                })}
                aria-current={activeForm === option.value ? "true" : undefined}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="shop-bar__row shop-bar__row--end">
          <span className="shop-bar__label shop-bar__label--sort">{t(SHOP.sortBy, locale)}</span>
          <span className="shop-bar__count shop-bar__count--desktop">{resultsLabel}</span>
          <div className="filters">
            {sorts.map((option) => (
              <Link
                scroll={false}
                key={option.value}
                className={`filter filter--sort${activeSort === option.value ? " is-active" : ""}`}
                href={shopHref(base, params, {
                  sort: option.value === "featured" ? undefined : option.value,
                })}
                aria-current={activeSort === option.value ? "true" : undefined}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShopPagination({
  base,
  params,
  page,
  pages,
  locale,
}: {
  base: string;
  params: ShopParams;
  page: number;
  pages: number;
  locale: Locale;
}) {
  if (pages <= 1) return null;

  return (
    <nav className="pager" aria-label={t(SHOP.page, locale)}>
      {page > 1 ? (
        <Link className="btn btn--ghost btn--sm" href={shopHref(base, params, { page: String(page - 1) })}>
          {t(SHOP.previous, locale)}
        </Link>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          {t(SHOP.previous, locale)}
        </span>
      )}

      <span className="pager__count">
        {t(SHOP.page, locale)} {page} {t(SHOP.of, locale)} {pages}
      </span>

      {page < pages ? (
        <Link className="btn btn--ghost btn--sm" href={shopHref(base, params, { page: String(page + 1) })}>
          {t(SHOP.next, locale)}
        </Link>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          {t(SHOP.next, locale)}
        </span>
      )}
    </nav>
  );
}
