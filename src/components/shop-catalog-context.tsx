"use client";

import { createContext, useContext } from "react";
import type { ShopParams } from "@/lib/shop-url";

/** Anchor the listing scrolls back to on a page change. Lives here so the
 *  toolbar that owns the id and the shell that scrolls to it agree. */
export const LISTING_ANCHOR_ID = "shop-listing";

export type NavigateOptions = {
  /** Page links jump back to the top of the listing; filter clicks must not,
   *  or choosing a shelf would yank the shelf you just clicked out of view. */
  scrollToListing?: boolean;
};

export type ShopCatalogContextValue = {
  base: string;
  params: ShopParams;
  onNavigate: (href: string, next: ShopParams, options?: NavigateOptions) => void;
};

export const ShopCatalogContext = createContext<ShopCatalogContextValue | null>(null);

export function useShopCatalog() {
  const value = useContext(ShopCatalogContext);
  if (!value) throw new Error("useShopCatalog must be used inside ShopCatalog");
  return value;
}
