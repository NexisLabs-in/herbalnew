"use client";

import { Suspense, useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShopFilters, paramsFromSearch, paramsEqual, type ShopParams } from "@/components/ShopFilters";
import { ShopCatalogContext } from "@/components/shop-catalog-context";
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
  children,
}: {
  base: string;
  tree: CategoryTreeNode[];
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParams = paramsFromSearch(searchParams);
  const [optimistic, setOptimistic] = useState<ShopParams | null>(null);
  const [pending, startTransition] = useTransition();

  const displayParams = optimistic ?? urlParams;

  const onNavigate = useCallback(
    (href: string, next: ShopParams) => {
      if (paramsEqual(next, urlParams)) return;
      setOptimistic(next);
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

  return (
    <ShopCatalogContext.Provider value={{ base, params: displayParams, onNavigate }}>
      <ShopFilters base={base} tree={tree} locale={locale} params={displayParams} onNavigate={onNavigate} />

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
