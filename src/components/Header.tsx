"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND, NAV, UI } from "@/content/brand";
import { LOCALE_SHORT, localePath, otherLocale, swapLocaleInPath, t, type Locale } from "@/lib/i18n";
import { Icon } from "./Icon";
import { CartCount } from "./storefront/CartCount";
import { HERO_VARIANT } from "@/lib/theme";

export function Header({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  // The header only inverts when it is actually sitting on a dark hero.
  const dark = pathname === localePath(locale) && HERO_VARIANT === "dark";
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  const next = otherLocale(locale);

  return (
    <header
      className={[
        "header",
        dark ? "header--dark" : "",
        stuck ? "is-stuck" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="shell shell--wide header__inner">
        <Link className="brand" href={localePath(locale)} aria-label={`${BRAND.name} — home`}>
          <Image
            className="brand__logo"
            /* the mono light lockup only reads on the dark hero header */
            src={dark && !stuck ? "/brand/logo-light.png" : "/brand/logo.png"}
            alt={BRAND.name}
            width={850}
            height={194}
            priority
          />
          <span className="brand__tag">{t(BRAND.tagline, locale)}</span>
        </Link>

        <nav className={`nav${open ? " is-open" : ""}`} aria-label="Primary">
          {NAV.map((item) => {
            const href = localePath(locale, item.href);
            const current = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.key}
                className="nav__link"
                href={href}
                aria-current={current ? "page" : undefined}
              >
                {t(item.label, locale)}
              </Link>
            );
          })}

          {/* Repeated here because on a phone the icon row is small and easy
              to miss, and orders are the reason most people come back. */}
          <Link
            className="nav__link nav__link--account"
            href={localePath(locale, "/account")}
            aria-current={pathname.startsWith(localePath(locale, "/account")) ? "page" : undefined}
          >
            {t(UI.account, locale)}
          </Link>
        </nav>

        <div className="header__actions">
          <Link
            className="icon-btn icon-btn--lang"
            href={swapLocaleInPath(pathname, next)}
            hrefLang={next}
            aria-label={t(UI.switchLanguageAria, locale)}
            title={t(UI.switchLanguage, locale)}
          >
            {LOCALE_SHORT[next]}
          </Link>
          {/* Always points at the account. Signed out, the middleware sends
              them to sign in and back again — so this needs no session read,
              and the cached layout stays cached. */}
          <Link
            className="icon-btn"
            href={localePath(locale, "/account")}
            aria-label={t(UI.account, locale)}
            title={t(UI.account, locale)}
          >
            <Icon name="user" size={19} />
          </Link>
          <Link
            className="icon-btn icon-btn--basket"
            href={localePath(locale, "/cart")}
            aria-label={t(UI.basket, locale)}
          >
            <Icon name="bag" size={19} />
            <CartCount />
          </Link>
          <button
            className="icon-btn burger"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t(open ? UI.closeMenu : UI.menu, locale)}
          >
            <Icon name="menu" size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
