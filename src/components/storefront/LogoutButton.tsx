"use client";

import { useTransition } from "react";
import { logoutCustomer } from "@/server/actions/auth-customer";
import { t, type L, type Locale } from "@/lib/i18n";

const LABEL: L = { en: "Sign out", ar: "تسجيل الخروج" };
const BUSY: L = { en: "Signing out…", ar: "جارٍ تسجيل الخروج…" };

/** A button rather than a link: signing out changes state, and a link would be
 *  followed by link prefetchers and "open in new tab". */
export function LogoutButton({ locale }: { locale: Locale }) {
  const [pending, start] = useTransition();

  return (
    <button
      className="btn btn--ghost btn--sm"
      type="button"
      disabled={pending}
      onClick={() => start(() => void logoutCustomer(locale))}
    >
      {pending ? t(BUSY, locale) : t(LABEL, locale)}
    </button>
  );
}
