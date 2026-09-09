import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { firstAdminPath } from "@/lib/admin/nav";
import { requireAdminPage } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "No access" };

/** Where the guards send an admin who is signed in but lacks the permission for
 *  a page. Deliberately not a 404: pretending the page does not exist would
 *  leave a staff member guessing whether they took a wrong turn or were denied.
 *  The sidebar stays — their allowed sections are how they leave this screen. */
export default async function AdminDeniedPage() {
  const admin = await requireAdminPage();
  const home = firstAdminPath(admin.permissions);

  return (
    <AdminShell admin={admin}>
      <div className="admin-empty" style={{ maxWidth: "32rem", marginInline: "auto", textAlign: "center" }}>
        <h1 className="admin-head__title">No access</h1>
        <p className="admin-head__sub" style={{ marginTop: ".75rem" }}>
          Your role ({admin.roleName}) does not include that section. Use the sidebar for the
          areas you can open, or ask an owner to adjust your permissions.
        </p>
        {home !== "/admin/denied" ? (
          <Link className="btn btn--brand" style={{ marginTop: "1.5rem" }} href={home}>
            Go to your home
          </Link>
        ) : null}
      </div>
    </AdminShell>
  );
}
