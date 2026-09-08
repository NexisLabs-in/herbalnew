import Link from "next/link";

/** Previous / next for an admin list. Filter query params ride along so
 *  paging a filtered view does not drop the filter. */
export function AdminPager({
  path,
  page,
  pages,
  params,
}: {
  path: string;
  page: number;
  pages: number;
  params?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (n: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (n > 1) search.set("page", String(n));
    const query = search.toString();
    return query ? `${path}?${query}` : path;
  };

  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? (
        <Link className="btn btn--ghost btn--sm" href={href(page - 1)}>
          Previous
        </Link>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          Previous
        </span>
      )}
      <span className="pager__count">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link className="btn btn--ghost btn--sm" href={href(page + 1)}>
          Next
        </Link>
      ) : (
        <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
