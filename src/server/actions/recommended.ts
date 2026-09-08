"use server";

import { getRecommendedProducts, type RecommendedPage } from "@/lib/catalogue";

/** The next page of the product-page recommended list. The first page is
 *  rendered with the product itself; this only serves what the visitor has
 *  scrolled to. */
export async function loadRecommendedPage(
  categoryId: string,
  excludeId: string,
  page: number,
): Promise<RecommendedPage> {
  if (!categoryId || !excludeId) {
    return { products: [], total: 0, page: 1, pages: 1 };
  }

  return getRecommendedProducts({ id: excludeId, categoryId }, page);
}
