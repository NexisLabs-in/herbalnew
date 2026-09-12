"use client";

import { useEffect, useRef, useState } from "react";
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
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
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

function resolveActiveParent(
  tree: CategoryTreeNode[],
  activeCategory: string,
): CategoryTreeNode | null {
  if (!activeCategory) return null;

  const childParent = tree.find((parent) =>
    parent.children.some((child) => child.slug === activeCategory),
  );
  if (childParent) return childParent;

  return tree.find((parent) => parent.slug === activeCategory) ?? null;
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
  const [openSlug, setOpenSlug] = useState<string | null>(
    activeParent?.children.length ? activeParent.slug : null,
  );

  useEffect(() => {
    setOpenSlug(activeParent?.children.length ? activeParent.slug : null);
  }, [activeParent?.slug, activeParent?.children.length]);

  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSlug) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rowRef.current?.contains(target)) return;
      setOpenSlug(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openSlug]);

  const sorts: { value: ShopSort; label: string; shortLabel?: string }[] = [
    { value: "featured", label: t(SHOP.sortFeatured, locale) },
    { value: "newest", label: t(SHOP.sortNewest, locale) },
    {
      value: "price-asc",
      label: t(SHOP.sortPriceAsc, locale),
      shortLabel: t(SHOP.sortPriceAscShort, locale),
    },
    {
      value: "price-desc",
      label: t(SHOP.sortPriceDesc, locale),
      shortLabel: t(SHOP.sortPriceDescShort, locale),
    },
  ];

  return (
    <div className="shop-bar">
      <div className="shop-category-section">
        <div className="shop-category-section__intro">
          <h2 className="shop-category-section__title">{t(SHOP.categoryHeading, locale)}</h2>
          <p className="shop-category-section__sub">{t(SHOP.categorySub, locale)}</p>
        </div>

        <div className="shop-cat-row" ref={rowRef}>
          {tree.map((parent) => {
            const isOpen = openSlug === parent.slug;
            const isParentCurrent = activeCategory === parent.slug;
            const isBranchActive = activeParent?.slug === parent.slug;
            const isSelected = isOpen || isBranchActive;
            const hasChildren = parent.children.length > 0;
            const art = PARENT_ART[parent.slug] ?? { icon: "leaf" as IconName, tint: "wellness" };
            const panelId = `shop-cat-${parent.slug}`;
            const clearHref = shopHref(base, params, { category: undefined, page: undefined });
            const clearNext = nextParams(params, { category: undefined, page: undefined });
            const parentHref = shopHref(base, params, { category: parent.slug, page: undefined });
            const parentNext = nextParams(params, { category: parent.slug, page: undefined });
            const closingClears = (isOpen && isParentCurrent) || (isParentCurrent && !hasChildren);

            return (
              <div
                key={parent.id}
                className={`shop-cat${isOpen ? " is-open" : ""}${isSelected ? " is-selected" : ""}`}
              >
                <FilterLink
                  className="shop-cat__btn"
                  href={closingClears ? clearHref : parentHref}
                  next={closingClears ? clearNext : parentNext}
                  onNavigate={(href, next) => {
                    if (isOpen) {
                      setOpenSlug(null);
                      if (isParentCurrent) onNavigate(clearHref, clearNext);
                      return;
                    }
                    if (isParentCurrent && !hasChildren) {
                      onNavigate(clearHref, clearNext);
                      return;
                    }
                    setOpenSlug(hasChildren ? parent.slug : null);
                    if (!isBranchActive) onNavigate(href, next);
                  }}
                  aria-current={isParentCurrent ? "true" : undefined}
                  {...(hasChildren
                    ? { "aria-expanded": isOpen, "aria-controls": panelId }
                    : {})}
                >
                  <span
                    className={`shop-cat__icon shop-cat__icon--${art.tint}`}
                    aria-hidden="true"
                  >
                    <Icon name={art.icon} size={16} strokeWidth={1.5} />
                  </span>
                  <span className="shop-cat__name">{tl(parent.name, locale)}</span>
                  {hasChildren ? (
                    <span className="shop-cat__chev" aria-hidden="true">
                      <Icon name="chevron" size={14} strokeWidth={1.8} />
                    </span>
                  ) : null}
                </FilterLink>

                {hasChildren ? (
                  <div className="shop-cat__menu" id={panelId}>
                    <div role="group" aria-label={tl(parent.name, locale)}>
                      {parent.children.map((child) => {
                        const isChildCurrent = activeCategory === child.slug;

                        return (
                          <FilterLink
                            key={child.id}
                            className={`shop-sub${isChildCurrent ? " is-active" : ""}`}
                            href={shopHref(base, params, { category: child.slug, page: undefined })}
                            next={nextParams(params, { category: child.slug, page: undefined })}
                            onNavigate={onNavigate}
                            aria-current={isChildCurrent ? "true" : undefined}
                          >
                            <span className="shop-sub__dot" aria-hidden="true" />
                            <span className="shop-sub__label">{tl(child.name, locale)}</span>
                            <span className="shop-sub__count">{counts[child.slug] ?? 0}</span>
                          </FilterLink>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
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
              {option.shortLabel ? (
                <>
                  <span className="sort-label sort-label--full">{option.label}</span>
                  <span className="sort-label sort-label--short">{option.shortLabel}</span>
                </>
              ) : (
                option.label
              )}
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
