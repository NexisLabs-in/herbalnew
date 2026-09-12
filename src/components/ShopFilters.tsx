"use client";

import { SHOP } from "@/content/shop";
import {
  LISTING_ANCHOR_ID,
  useShopCatalog,
  type NavigateOptions,
} from "@/components/shop-catalog-context";
import { Icon, type IconName } from "@/components/Icon";
import type { CategoryTreeNode, ShopSort } from "@/lib/catalogue";
import { t, tl, type Locale } from "@/lib/i18n";
import {
  nextParams,
  shopHref,
  type ShopParams,
} from "@/lib/shop-url";

export type { ShopParams } from "@/lib/shop-url";
export { shopHref } from "@/lib/shop-url";

/** Per-shelf icon and tint. Each shelf reads as its own thing at a glance,
 *  which a single violet for all four did not. */
const PARENT_ART: Record<string, { icon: IconName; tint: string }> = {
  "beauty-personal-care": { icon: "lotus", tint: "beauty" },
  "wellness-lifestyle": { icon: "leaf", tint: "wellness" },
  "body-systems": { icon: "user", tint: "body" },
  "reproductive-hormonal": { icon: "heart", tint: "repro" },
};

type FilterLinkProps = {
  href: string;
  next: ShopParams;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "true";
  navOptions?: NavigateOptions;
  onNavigate: (href: string, next: ShopParams, options?: NavigateOptions) => void;
};

function FilterLink({
  href,
  next,
  className,
  children,
  navOptions,
  onNavigate,
  ...rest
}: FilterLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href, next, navOptions);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

function resolveActiveParent(tree: CategoryTreeNode[], activeCategory: string): CategoryTreeNode {
  if (!activeCategory) return tree[0];

  const childParent = tree.find((parent) =>
    parent.children.some((child) => child.slug === activeCategory),
  );
  if (childParent) return childParent;

  return tree.find((parent) => parent.slug === activeCategory) ?? tree[0];
}

function subcategoryLabel(count: number, locale: Locale): string {
  if (count === 1) return t(SHOP.subcategoriesOne, locale);
  return `${count} ${t(SHOP.subcategoriesMany, locale)}`;
}

export function ShopFilters({
  base,
  tree,
  locale,
  params,
  counts,
  countSlot,
  onNavigate,
}: {
  base: string;
  tree: CategoryTreeNode[];
  locale: Locale;
  params: ShopParams;
  counts: Record<string, number>;
  countSlot: React.ReactNode;
  onNavigate: (href: string, next: ShopParams) => void;
}) {
  const activeCategory = params.category ?? "";
  const activeSort = (params.sort ?? "featured") as ShopSort;
  const activeParent = resolveActiveParent(tree, activeCategory);

  const sorts: { value: ShopSort; label: string }[] = [
    { value: "featured", label: t(SHOP.sortFeatured, locale) },
    { value: "newest", label: t(SHOP.sortNewest, locale) },
    { value: "price-asc", label: t(SHOP.sortPriceAsc, locale) },
    { value: "price-desc", label: t(SHOP.sortPriceDesc, locale) },
  ];

  return (
    <div className="shop-bar">
      <div className="shop-category-section">
        <div className="shop-category-section__head">
          <div className="shop-category-section__intro">
            <p className="shop-category-section__eyebrow">{t(SHOP.categoryHeading, locale)}</p>
            <h2 className="shop-category-section__title">{t(SHOP.categorySub, locale)}</h2>
          </div>
        </div>

        <div className="shop-shelf-grid">
          {tree.map((parent) => {
            const isActive = parent.slug === activeParent.slug;
            const art = PARENT_ART[parent.slug] ?? { icon: "leaf" as IconName, tint: "wellness" };

            return (
              <FilterLink
                key={parent.id}
                className={`shop-shelf-card${isActive ? " is-active" : ""}`}
                href={shopHref(base, params, { category: parent.slug, page: undefined })}
                next={nextParams(params, { category: parent.slug, page: undefined })}
                onNavigate={onNavigate}
                aria-current={isActive ? "true" : undefined}
              >
                <span
                  className={`shop-shelf-card__icon shop-shelf-card__icon--${art.tint}`}
                  aria-hidden="true"
                >
                  <Icon name={art.icon} size={20} strokeWidth={1.4} />
                </span>
                <span className="shop-shelf-card__text">
                  <span className="shop-shelf-card__title">{tl(parent.name, locale)}</span>
                  <span className="shop-shelf-card__meta">
                    {subcategoryLabel(parent.children.length, locale)}
                  </span>
                </span>
                <span className="shop-shelf-card__chev" aria-hidden="true">
                  <Icon name="chevron" size={16} strokeWidth={1.6} />
                </span>
              </FilterLink>
            );
          })}
        </div>

        {activeParent.children.length ? (
          <div className="shop-sub-pills" role="group" aria-label={tl(activeParent.name, locale)}>
            {activeParent.children.map((child) => {
              const isActive = activeCategory === child.slug;

              return (
                <FilterLink
                  key={child.id}
                  className={`shop-sub-pill${isActive ? " is-active" : ""}`}
                  href={shopHref(base, params, { category: child.slug, page: undefined })}
                  next={nextParams(params, { category: child.slug, page: undefined })}
                  onNavigate={onNavigate}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="shop-sub-pill__label">{tl(child.name, locale)}</span>
                  <span className="shop-sub-pill__count">{counts[child.slug] ?? 0}</span>
                </FilterLink>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="shop-listing-toolbar" id={LISTING_ANCHOR_ID}>
        <div className="shop-listing-toolbar__count-slot">{countSlot}</div>

        <div className="shop-listing-toolbar__sort filters filters--sort">
          {sorts.map((option) => (
            <FilterLink
              key={option.value}
              className={`filter filter--sort${activeSort === option.value ? " is-active" : ""}`}
              href={shopHref(base, params, {
                sort: option.value === "featured" ? undefined : option.value,
              })}
              next={nextParams(params, {
                sort: option.value === "featured" ? undefined : option.value,
              })}
              onNavigate={onNavigate}
              aria-current={activeSort === option.value ? "true" : undefined}
            >
              {option.label}
            </FilterLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShopPagination({
  params,
  page,
  pages,
  locale,
}: {
  params: ShopParams;
  page: number;
  pages: number;
  locale: Locale;
}) {
  const { base, onNavigate } = useShopCatalog();

  if (pages <= 1) return null;

  return (
    <nav className="pager" aria-label={t(SHOP.page, locale)}>
      {page > 1 ? (
        <FilterLink
          className="btn btn--ghost btn--sm"
          href={shopHref(base, params, { page: String(page - 1) })}
          next={nextParams(params, { page: String(page - 1) })}
          navOptions={{ scrollToListing: true }}
          onNavigate={onNavigate}
        >
          {t(SHOP.previous, locale)}
        </FilterLink>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          {t(SHOP.previous, locale)}
        </span>
      )}

      <span className="pager__count">
        {t(SHOP.page, locale)} {page} {t(SHOP.of, locale)} {pages}
      </span>

      {page < pages ? (
        <FilterLink
          className="btn btn--ghost btn--sm"
          href={shopHref(base, params, { page: String(page + 1) })}
          next={nextParams(params, { page: String(page + 1) })}
          navOptions={{ scrollToListing: true }}
          onNavigate={onNavigate}
        >
          {t(SHOP.next, locale)}
        </FilterLink>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          {t(SHOP.next, locale)}
        </span>
      )}
    </nav>
  );
}
