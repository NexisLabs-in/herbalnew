import type { ReactNode } from "react";
import Link from "next/link";
import { AdminNavLink } from "./AdminNavLink";
import { AdminSignOutButton } from "./AdminSignOutButton";
import { adminNavigation, firstAdminPath } from "@/lib/admin/nav";
import { can } from "@/lib/permissions";
import { getAdminBadges, type AdminBadges } from "@/lib/admin/badges";
import type { AdminContext } from "@/lib/auth/guards";

/** The admin chrome: sidebar navigation, identity, sign-out.
 *
 *  Nav entries declare the permission they need and are filtered out for
 *  admins who lack it — but that is only tidiness. The real gate is
 *  `requireAdminPage` / `requireAdmin` on the server; a hidden link is not
 *  access control, and typing the URL still hits the guard.
 */

export async function AdminShell({
  admin,
  children,
}: {
  admin: AdminContext;
  children: ReactNode;
}) {
  // Read here rather than passed in by each page. Pages used to supply only
  // the counts they happened to compute, so a badge appeared or vanished
  // depending on which screen you were standing on.
  const badges: AdminBadges = await getAdminBadges(admin.permissions);
  const home = firstAdminPath(admin.permissions);

  const groups = adminNavigation()
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => can(admin.permissions, item.permission))
        .map((item) => ({
          ...item,
          badge: badgeFor(item.href, badges),
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="admin-side__brand" href={home}>
          Herbedia
        </Link>

        <nav aria-label="Admin">
          {groups.map((group) => (
            <div className="admin-side__group" key={group.label}>
              <p className="admin-side__label">{group.label}</p>
              <div className="admin-nav">
                {group.items.map((item) => (
                  <AdminNavLink key={item.href} href={item.href} badge={item.badge}>
                    {item.label}
                  </AdminNavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-side__foot">
          <p className="admin-side__who">{admin.name}</p>
          <p className="admin-side__role">{admin.roleName}</p>
          <div style={{ marginTop: ".75rem", paddingInline: ".6rem" }}>
            <AdminSignOutButton />
          </div>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}

function badgeFor(href: string, badges: AdminBadges): number | undefined {
  switch (href) {
    case "/admin/orders":
      return badges.newOrders;
    case "/admin/enquiries":
      return badges.newEnquiries;
    case "/admin/inventory":
      return badges.lowStock;
    case "/admin/reviews":
      return badges.pendingReviews;
    case "/admin/messages":
      return badges.newMessages;
    default:
      return undefined;
  }
}
