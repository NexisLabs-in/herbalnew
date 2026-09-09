import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guards";

/** Shared chrome for signed-in admin work.
 *
 *  Lives in a route-group layout so the sidebar stays mounted across tab
 *  changes; only the main column suspends into `loading.tsx`. Auth screens
 *  (login, forgot/set password) sit outside this group on purpose.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
