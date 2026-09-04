/** Admin permission catalogue.
 *
 *  The client asked for a full role editor, so roles are data rather than a
 *  fixed enum of "admin / staff". This file is the vocabulary those roles are
 *  written in: every admin screen declares the permission it needs, the role
 *  editor renders this list as checkboxes, and the server checks it on every
 *  mutation — hiding a nav item is presentation, not access control.
 */

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", note: "Sales overview and alerts" },
  { key: "products", label: "Products", note: "Catalogue, pricing, images" },
  { key: "categories", label: "Categories", note: "Indication categories" },
  { key: "inventory", label: "Inventory", note: "Stock levels and adjustments" },
  { key: "orders", label: "Orders", note: "Order processing, status, tracking" },
  { key: "enquiries", label: "Price enquiries", note: "Quotes for request-price products" },
  { key: "customers", label: "Customers", note: "Customer records and history" },
  { key: "reviews", label: "Reviews", note: "Moderation queue" },
  { key: "coupons", label: "Coupons", note: "Discount codes" },
  { key: "sales", label: "Sales", note: "Time-limited product discounts" },
  { key: "featured", label: "Featured products", note: "Homepage selection" },
  { key: "messages", label: "Messages", note: "Contact form inbox" },
  { key: "content", label: "Content", note: "Homepage sections, pages, FAQ, policies" },
  { key: "reports", label: "Reports", note: "Sales and inventory reporting" },
  { key: "settings", label: "Settings", note: "Shipping, tax, notifications, store details" },
  { key: "admins", label: "Admin users", note: "Admin accounts and roles" },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];
export type PermissionAction = "read" | "write";
export type Permission = `${PermissionModule}:${PermissionAction}`;

export const ALL_PERMISSIONS = "*" as const;

export const PERMISSIONS: Permission[] = PERMISSION_MODULES.flatMap(
  (m) => [`${m.key}:read`, `${m.key}:write`] as Permission[],
);

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as string[]).includes(value);
}

/** The single authority on "may this admin do this?".
 *
 *  Two implicit rules, so roles stay short and cannot be misconfigured into
 *  something nonsensical:
 *    - `*` (the Owner role) grants everything.
 *    - `x:write` implies `x:read` — nobody can edit a screen they cannot open.
 */
export function can(granted: readonly string[], required: Permission): boolean {
  if (granted.includes(ALL_PERMISSIONS)) return true;
  if (granted.includes(required)) return true;
  if (required.endsWith(":read")) {
    return granted.includes(required.replace(/:read$/, ":write"));
  }
  return false;
}

export function canAny(granted: readonly string[], required: Permission[]): boolean {
  return required.some((permission) => can(granted, permission));
}

/** Seeded on first run and not deletable — without it a fresh install has
 *  nobody who can create roles. */
export const OWNER_ROLE = {
  name: "Owner",
  description: "Full access to every module, including settings and admin users.",
  permissions: [ALL_PERMISSIONS],
  isSystem: true,
};
