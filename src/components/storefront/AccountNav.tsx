"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT } from "@/content/account";
import { LogoutButton } from "./LogoutButton";
import { localePath, t, type Locale } from "@/lib/i18n";

/** Sidebar for the customer portal.
 *
 *  A client component only because it needs the current path to mark the
 *  active link — everything it renders is otherwise static.
 */
export function AccountNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  const items = [
    { href: "/account", label: t(ACCOUNT.dashboard, locale) },
    { href: "/account/orders", label: t(ACCOUNT.orders, locale) },
    { href: "/account/addresses", label: t(ACCOUNT.addresses, locale) },
    { href: "/account/wishlist", label: t(ACCOUNT.wishlist, locale) },
    { href: "/account/profile", label: t(ACCOUNT.profile, locale) },
  ];

  return (
    <nav className="account-nav" aria-label={t(ACCOUNT.account, locale)}>
      {items.map((item) => {
        const href = localePath(locale, item.href);
        // "/account" matches only itself; the rest also match their subpages, so
        // Orders stays marked while reading one order.
        const current =
          item.href === "/account" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            className="account-nav__link"
            key={item.href}
            href={href}
            aria-current={current ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="account-nav__foot">
        <LogoutButton locale={locale} />
      </div>
    </nav>
  );
}
