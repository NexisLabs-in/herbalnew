/** How many rows an admin list loads at once. Dense enough to scan, small
 *  enough that a long history is not fetched in one query. */
export const ADMIN_PAGE_SIZE = 10;

export function pageNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function pageWindow(requested: number, total: number, perPage = ADMIN_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, requested), total === 0 ? 1 : pages);
  return { page, pages, skip: (page - 1) * perPage, perPage };
}
