"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A nav link that knows when it is the current page.
 *
 *  `/admin` matches only itself; every other entry also matches its subpages,
 *  so "Orders" stays highlighted while an admin is inside one order.
 */
export function AdminNavLink({
  href,
  badge,
  children,
}: {
  href: string;
  badge?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link className="admin-nav__link" href={href} aria-current={current ? "page" : undefined}>
      <span>{children}</span>
      {badge ? (
        <span className={`admin-nav__badge${href.includes("inventory") ? " admin-nav__badge--warn" : ""}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
