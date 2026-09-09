import { can, type Permission } from "@/lib/permissions";

/** Sidebar order. The first entry an admin can open is their home after
 *  sign-in — so a role without the dashboard is not dumped on a dead end. */

export type AdminNavItem = {
  href: string;
  label: string;
  permission: Permission;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export function adminNavigation(): AdminNavGroup[] {
  return [
    {
      label: "Operations",
      items: [
        { href: "/admin", label: "Dashboard", permission: "dashboard:read" },
        { href: "/admin/orders", label: "Orders", permission: "orders:read" },
        { href: "/admin/enquiries", label: "Price enquiries", permission: "enquiries:read" },
        { href: "/admin/customers", label: "Customers", permission: "customers:read" },
      ],
    },
    {
      label: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products", permission: "products:read" },
        { href: "/admin/categories", label: "Categories", permission: "categories:read" },
        { href: "/admin/inventory", label: "Inventory", permission: "inventory:read" },
      ],
    },
    {
      label: "Marketing",
      items: [
        { href: "/admin/sales", label: "Sales", permission: "sales:read" },
        { href: "/admin/coupons", label: "Coupons", permission: "coupons:read" },
        { href: "/admin/featured", label: "Featured", permission: "featured:read" },
        { href: "/admin/reviews", label: "Reviews", permission: "reviews:read" },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/admin/content", label: "Pages", permission: "content:read" },
        { href: "/admin/messages", label: "Messages", permission: "messages:read" },
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

/** The first sidebar destination this role can open. Falls back to the denied
 *  page only when the role has nothing at all — that is a misconfigured role. */
export function firstAdminPath(permissions: readonly string[]): string {
  for (const group of adminNavigation()) {
    for (const item of group.items) {
      if (can(permissions, item.permission)) return item.href;
    }
  }
  return "/admin/denied";
}
