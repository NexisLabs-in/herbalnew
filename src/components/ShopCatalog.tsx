"use client";

import { Suspense, useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShopFilters } from "@/components/ShopFilters";
import { paramsEqual, paramsFromSearch, type ShopParams } from "@/lib/shop-url";
import {
  LISTING_ANCHOR_ID,
  ShopCatalogContext,
  type NavigateOptions,
} from "@/components/shop-catalog-context";
import { ShopProductGridSkeleton } from "@/components/ShopProductGridSkeleton";
import type { CategoryTreeNode } from "@/lib/catalogue";
import type { Locale } from "@/lib/i18n";

/** Client shell for the Herb Cabinet.
 *
 *  Next.js does not update `useSearchParams` or Suspense fallbacks until a
 *  soft navigation finishes, so filter clicks use optimistic params for instant
 *  tile selection and `useTransition` to swap the product grid for a skeleton
 *  while the server re-fetches. */
export function ShopCatalog({
  base,
  tree,
  locale,
  counts,
  countSlot,
  children,
}: {
  base: string;
  tree: CategoryTreeNode[];
  locale: Locale;
  counts: Record<string, number>;
  countSlot: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const urlParams = paramsFromSearch(useSearchParams());
  const [optimistic, setOptimistic] = useState<ShopParams | null>(null);
  const [pending, startTransition] = useTransition();

  const displayParams = optimistic ?? urlParams;

  const onNavigate = useCallback(
    (href: string, next: ShopParams, options?: NavigateOptions) => {
      if (paramsEqual(next, urlParams)) return;
      setOptimistic(next);

      // Next.js restores scroll only on a full navigation, and these are
      // query-param pushes with scroll suppressed, so page links scroll here.
      if (options?.scrollToListing) {
        const anchor = document.getElementById(LISTING_ANCHOR_ID);
        anchor?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      }

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [router, urlParams],
  );

  useEffect(() => {
    if (optimistic && !pending && paramsEqual(optimistic, urlParams)) {
      setOptimistic(null);
    }
  }, [optimistic, pending, urlParams]);

  const countDisplay = pending ? (
    <div className="skel" style={{ width: "5.5rem", height: ".875rem" }} aria-hidden />
  ) : (
    countSlot
  );

  return (
    <ShopCatalogContext.Provider value={{ base, params: displayParams, onNavigate }}>
      <ShopFilters
        base={base}
        tree={tree}
        locale={locale}
        params={displayParams}
        counts={counts}
        countSlot={countDisplay}
        onNavigate={onNavigate}
      />

      <div className="shop-products-area">
        {pending ? (
          <ShopProductGridSkeleton />
        ) : (
          <Suspense fallback={<ShopProductGridSkeleton />}>{children}</Suspense>
        )}
      </div>
    </ShopCatalogContext.Provider>
  );
}
