"use client";

import { createContext, useContext } from "react";
import type { ShopParams } from "@/components/ShopFilters";

export type ShopCatalogContextValue = {
  base: string;
  params: ShopParams;
  onNavigate: (href: string, next: ShopParams) => void;
};

export const ShopCatalogContext = createContext<ShopCatalogContextValue | null>(null);

export function useShopCatalog() {
  const value = useContext(ShopCatalogContext);
  if (!value) throw new Error("useShopCatalog must be used inside ShopCatalog");
  return value;
}
