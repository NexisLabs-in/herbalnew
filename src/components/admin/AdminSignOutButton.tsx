"use client";

import { useTransition } from "react";
import { adminSignOut } from "@/server/actions/auth-admin";

export function AdminSignOutButton() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="link-plain"
      style={{ color: "rgba(240,237,251,.7)" }}
      disabled={pending}
      onClick={() => start(() => void adminSignOut())}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
