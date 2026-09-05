import type { ReactNode } from "react";
import Link from "next/link";
import { AdminNavLink } from "./AdminNavLink";
import { AdminSignOutButton } from "./AdminSignOutButton";
import { can, type Permission } from "@/lib/permissions";
import { getAdminBadges, type AdminBadges } from "@/lib/admin/badges";
import type { AdminContext } from "@/lib/auth/guards";

/** The admin chrome: sidebar navigation, identity, sign-out.
 *
 *  Nav entries declare the permission they need and are filtered out for
 *  admins who lack it — but that is only tidiness. The real gate is
 *  `requireAdminPage` / `requireAdmin` on the server; a hidden link is not
 *  access control, and typing the URL still hits the guard.
 */

type NavItem = { href: string; label: string; permission: Permission; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

function navigation(badges: AdminBadges): NavGroup[] {
  return [
    {
      label: "Operations",
      items: [
        { href: "/admin", label: "Dashboard", permission: "dashboard:read" },
        { href: "/admin/orders", label: "Orders", permission: "orders:read", badge: badges.newOrders },
        { href: "/admin/enquiries", label: "Price enquiries", permission: "enquiries:read", badge: badges.newEnquiries },
        { href: "/admin/customers", label: "Customers", permission: "customers:read" },
      ],
    },
    {
      label: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products", permission: "products:read" },
        { href: "/admin/categories", label: "Categories", permission: "categories:read" },
        { href: "/admin/inventory", label: "Inventory", permission: "inventory:read", badge: badges.lowStock },
      ],
    },
    {
      label: "Marketing",
      items: [
        { href: "/admin/sales", label: "Sales", permission: "sales:read" },
        { href: "/admin/coupons", label: "Coupons", permission: "coupons:read" },
        { href: "/admin/featured", label: "Featured", permission: "featured:read" },
        { href: "/admin/reviews", label: "Reviews", permission: "reviews:read", badge: badges.pendingReviews },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/admin/content", label: "Pages", permission: "content:read" },
        { href: "/admin/messages", label: "Messages", permission: "messages:read", badge: badges.newMessages },
      ],
    },
    {
      label: "Business",
      items: [
        { href: "/admin/reports", label: "Reports", permission: "reports:read" },
        { href: "/admin/settings", label: "Settings", permission: "settings:read" },
        { href: "/admin/admins", label: "Admin users", permission: "admins:read" },
      ],
    },
  ];
}

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

  const groups = navigation(badges)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(admin.permissions, item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="admin-side__brand" href="/admin">
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
