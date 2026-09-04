import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "No access" };

/** Where the guards send an admin who is signed in but lacks the permission for
 *  a page. Deliberately not a 404: pretending the page does not exist would
 *  leave a staff member guessing whether they took a wrong turn or were denied. */
export default async function AdminDeniedPage() {
  const admin = await requireAdminPage();

  return (
    <main className="admin-auth">
      <div className="admin-auth__card">
        <h1 className="admin-auth__title">No access</h1>
        <p className="admin-auth__sub">
          Your role ({admin.roleName}) does not include that section. Ask an owner to adjust
          your permissions if you need it.
        </p>
        <Link className="btn btn--brand btn--block" href="/admin">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
