import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/AdminSignInForm";
import { getAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  // Already signed in — no reason to show a login form.
  if (await getAdmin()) redirect("/admin");

  return (
    <main className="admin-auth">
      <div className="admin-auth__card">
        <Image
          className="admin-auth__mark"
          src="/brand/logo.png"
          alt="Herbedia"
          width={132}
          height={34}
          priority
        />
        <h1 className="admin-auth__title">Sign in</h1>
        <p className="admin-auth__sub">Herbedia store administration.</p>

        <AdminSignInForm />

        <p className="admin-auth__foot">
          <Link href="/admin/forgot-password">Forgotten your password?</Link>
        </p>
      </div>
    </main>
  );
}
