import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSetPasswordForm } from "@/components/admin/AdminSetPasswordForm";
import { getAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Choose a password" };

/** Where a seeded or admin-reset account lands on first sign-in.
 *
 *  `requireAdminPage` sends every other admin route here while
 *  `mustChangePassword` is set, so a shared starting password cannot stay in
 *  use. This page uses the plain `getAdmin` to avoid redirecting to itself. */
export default async function AdminSetPasswordPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <main className="admin-auth">
      <div className="admin-auth__card">
        <h1 className="admin-auth__title">
          {admin.mustChangePassword ? "Choose a password" : "Change your password"}
        </h1>
        <p className="admin-auth__sub">
          {admin.mustChangePassword
            ? "This account is still on the password it was created with. Pick your own before continuing."
            : `Signed in as ${admin.email}.`}
        </p>

        <AdminSetPasswordForm />
      </div>
    </main>
  );
}
