import "server-only";
import { redirect } from "next/navigation";
import { connectDb } from "../db";
import { AdminRole } from "../models/AdminRole";
import { AdminUser } from "../models/AdminUser";
import { Customer, type CustomerDoc } from "../models/Customer";
import { can, type Permission } from "../permissions";
import { getAdminSession, getCustomerSession, clearAdminSession, clearCustomerSession } from "./session";

/** Access control, enforced on the server.
 *
 *  Every admin page and every mutating action calls one of these. Hiding a nav
 *  item is presentation; this is the actual gate. Permissions are read from the
 *  database on each call rather than carried in the session token, so revoking
 *  access takes effect on the next request instead of when a token expires.
 */

export type AdminContext = {
  adminId: string;
  email: string;
  name: string;
  roleName: string;
  permissions: string[];
  mustChangePassword: boolean;
};

export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** The signed-in admin, or null. Also returns null when the account has been
 *  deactivated or deleted since the token was issued — the session is cleared
 *  so the next request does not repeat the lookup. */
export async function getAdmin(): Promise<AdminContext | null> {
  const session = await getAdminSession();
  if (!session) return null;

  await connectDb();
  const admin = await AdminUser.findById(session.adminId).lean();
  if (!admin || !admin.active) {
    await clearAdminSession();
    return null;
  }

  const role = await AdminRole.findById(admin.roleId).lean();

  return {
    adminId: String(admin._id),
    email: admin.email,
    name: admin.name,
    roleName: role?.name ?? "—",
    permissions: role?.permissions ?? [],
    mustChangePassword: admin.mustChangePassword,
  };
}

/** For pages: redirects to the login screen when signed out, and to the
 *  password screen when a seeded or reset account has not chosen one yet. */
export async function requireAdminPage(permission?: Permission): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.mustChangePassword) redirect("/admin/set-password");
  if (permission && !can(admin.permissions, permission)) redirect("/admin/denied");
  return admin;
}

/** For server actions: throws rather than redirects, so the caller can return a
 *  form error instead of navigating. */
export async function requireAdmin(permission: Permission): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new ForbiddenError(permission);
  if (!can(admin.permissions, permission)) throw new ForbiddenError(permission);
  return admin;
}

// --- Customers ---------------------------------------------------------------

export async function getCustomer(): Promise<CustomerDoc | null> {
  const session = await getCustomerSession();
  if (!session) return null;

  await connectDb();
  const customer = await Customer.findById(session.customerId).lean<CustomerDoc>();
  if (!customer || customer.status === "blocked") {
    await clearCustomerSession();
    return null;
  }
  return customer;
}

/** For customer pages. `next` is where to return after logging in — checkout
 *  sends the shopper back to their cart rather than dumping them on the home
 *  page having lost their place. */
export async function requireCustomer(locale: string, next?: string): Promise<CustomerDoc> {
  const customer = await getCustomer();
  if (!customer) {
    const query = next ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/${locale}/login${query}`);
  }
  return customer;
}
