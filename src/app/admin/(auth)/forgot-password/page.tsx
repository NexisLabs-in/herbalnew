import type { Metadata } from "next";
import Link from "next/link";
import { AdminResetForm } from "@/components/admin/AdminResetForm";

export const metadata: Metadata = { title: "Reset password" };

export default function AdminForgotPasswordPage() {
  return (
    <main className="admin-auth">
      <div className="admin-auth__card">
        <h1 className="admin-auth__title">Reset password</h1>
        <p className="admin-auth__sub">
          Admin accounts use a password. To recover one, prove control of the mailbox.
        </p>

        <AdminResetForm />

        <p className="admin-auth__foot">
          <Link href="/admin/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
