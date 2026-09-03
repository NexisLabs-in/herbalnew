import Link from "next/link";
import { BRAND, DISCLAIMER, DISCLAIMER_TITLE, LEGAL_NAV, NAV } from "@/content/brand";
import { CONTACT } from "@/content/pages";
import { localePath, t, type Locale } from "@/lib/i18n";

export function Disclaimer({ locale }: { locale: Locale }) {
  return (
    <section className="disclaimer">
      <div className="shell shell--wide">
        <p className="disclaimer__t">{t(DISCLAIMER_TITLE, locale)}</p>
        <p>{t(DISCLAIMER, locale)}</p>
      </div>
    </section>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const links = [...NAV.map((n) => ({ label: n.label, href: n.href })), LEGAL_NAV];

  return (
    <>
      <Disclaimer locale={locale} />
      <footer className="footer">
        <div className="shell shell--wide">
          <p className="footer__word">{BRAND.name}</p>

          <div className="footer__grid">
            <div>
              <p className="footer__h">{t(BRAND.slogan, locale)}</p>
              <p
                className="footer__meta"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-gold-300)" }}
              >
                {t(BRAND.tagline, locale)}
              </p>
              <p className="footer__meta" style={{ marginTop: "1rem", maxWidth: "34ch" }}>
                {t(BRAND.supporting, locale)}
              </p>
            </div>

            <div>
              <p className="footer__h">{t(CONTACT.labels.contact, locale)}</p>
              <div className="footer__meta" style={{ display: "grid", gap: "1.1rem" }}>
                <p>
                  <strong>{t(CONTACT.labels.email, locale)}</strong>
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </p>
                <p>
                  <strong>{t(CONTACT.labels.address, locale)}</strong>
                  {t(CONTACT.address, locale)}
                </p>
                <p>
                  <strong>{t(CONTACT.labels.licence, locale)}</strong>
                  {CONTACT.licence}
                </p>
              </div>
            </div>

            <div>
              <p className="footer__h">{BRAND.name}</p>
              {links.map((l) => (
                <Link key={l.href} className="footer__li" href={localePath(locale, l.href)}>
                  <span>{t(l.label, locale)}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="footer__bar">
            <span>
              © {new Date().getFullYear()} {t(CONTACT.company, locale)}
            </span>
            <span>{CONTACT.site}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
