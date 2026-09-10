import Link from "next/link";
import Image from "next/image";
import { BRAND, DISCLAIMER, DISCLAIMER_TITLE, LEGAL_NAV, NAV } from "@/content/brand";
import { CONTACT } from "@/content/pages";
import { ensurePageCopy } from "@/lib/cms/copy";
import { getPage } from "@/lib/cms/pages";
import { localePath, t, type L, type Locale } from "@/lib/i18n";

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

const ACCOUNT_LINKS: { label: L; href: string }[] = [
  { label: { en: "Your account", ar: "حسابك" }, href: "/account" },
  { label: { en: "Your orders", ar: "طلباتك" }, href: "/account/orders" },
  { label: { en: "Saved items", ar: "العناصر المحفوظة" }, href: "/account/wishlist" },
];

export async function Footer({ locale }: { locale: Locale }) {
  await ensurePageCopy("contact");
  const page = await getPage("contact");
  const copy = page?.sections.find((section) => section.type === "contactCopy")?.data ?? {};
  const mobile = typeof copy.mobile === "string" && copy.mobile ? copy.mobile : CONTACT.mobile;
  const links = [...NAV.map((n) => ({ label: n.label, href: n.href })), LEGAL_NAV];

  return (
    <>
      <Disclaimer locale={locale} />
      <footer className="footer">
        <div className="shell shell--wide">
          <Image
            className="footer__logo"
            // Same mark as before, in the variant drawn for a light ground —
            // logo-light.png is the white knock-out for dark backgrounds and
            // would be invisible on paper. The header switches the same way.
            src="/brand/logo.png"
            alt={BRAND.name}
            width={850}
            height={194}
          />

          <div className="footer__grid">
            <div>
              <p className="footer__h">{t(BRAND.slogan, locale)}</p>
              <p
                className="footer__meta"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-violet-800)" }}
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
                {mobile ? (
                  <p>
                    <strong>{t(CONTACT.labels.mobile, locale)}</strong>
                    <a href={`tel:${mobile.replace(/\s/g, "")}`} dir="ltr">
                      {mobile}
                    </a>
                  </p>
                ) : null}
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

            {/* Named in full, because "account" as an icon is a guess and
                these two are what people come back for. */}
            <div>
              <p className="footer__h">{t(ACCOUNT_LINKS[0].label, locale)}</p>
              {ACCOUNT_LINKS.map((l) => (
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
