/** Shop filter query params and URL builders — shared by server and client. */

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

export function paramsFromSearch(search: URLSearchParams): ShopParams {
  return {
    category: search.get("category") ?? undefined,
    form: search.get("form") ?? undefined,
    q: search.get("q") ?? undefined,
    sort: search.get("sort") ?? undefined,
    page: search.get("page") ?? undefined,
  };
}

export function paramsEqual(a: ShopParams, b: ShopParams): boolean {
  return (
    (a.category ?? "") === (b.category ?? "") &&
    (a.form ?? "") === (b.form ?? "") &&
    (a.q ?? "") === (b.q ?? "") &&
    (a.sort ?? "") === (b.sort ?? "") &&
    (a.page ?? "") === (b.page ?? "")
  );
}

export function nextParams(params: ShopParams, change: Partial<ShopParams>): ShopParams {
  const next = { ...params, ...change };
  if (!("page" in change)) delete next.page;
  return next;
}
