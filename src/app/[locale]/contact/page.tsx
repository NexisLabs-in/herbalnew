import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, NAV } from "@/content/brand";
import { CONTACT } from "@/content/pages";
import { Advisory, PageHead } from "@/components/Blocks";
import { Icon, type IconName } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[3].label, locale), description: t(CONTACT.about, locale) };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const rows: { icon: IconName; label: string; value: ReactNode }[] = [
    {
      icon: "mail",
      label: t(CONTACT.labels.email, locale),
      value: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>,
    },
    { icon: "clock", label: t(CONTACT.labels.hours, locale), value: t(CONTACT.hours, locale) },
    { icon: "pin", label: t(CONTACT.labels.address, locale), value: t(CONTACT.address, locale) },
    { icon: "id", label: t(CONTACT.labels.licence, locale), value: CONTACT.licence },
    { icon: "globe", label: t(CONTACT.labels.website, locale), value: CONTACT.site },
    { icon: "pin", label: t(CONTACT.labels.country, locale), value: t(CONTACT.country, locale) },
  ];

  return (
    <>
      <PageHead
        kicker={t(CONTACT.company, locale)}
        title={t(NAV[3].label, locale)}
        sub={t(CONTACT.about, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[3].label, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="grid g3">
            {rows.map((row, i) => (
              <Reveal className="card card--lift card__pad" key={`${row.label}-${i}`} delay={i * 50}>
                <span style={{ color: "var(--color-violet-600)", display: "block" }}>
                  <Icon name={row.icon} size={24} />
                </span>
                <p className="data-label" style={{ marginTop: "1rem" }}>{row.label}</p>
                <p style={{ marginTop: ".5rem", color: "var(--color-ink)", lineHeight: 1.6 }}>
                  {row.value}
                </p>
              </Reveal>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              marginTop: "clamp(2.5rem,5vw,3.5rem)",
            }}
          >
            <Reveal className="panel">
              <p className="eyebrow eyebrow--plain">{t(CONTACT.pendingTitle, locale)}</p>
              <ul style={{ marginTop: "1rem" }}>
                {CONTACT.pending.map((channel, i) => (
                  <li className="footer__li" style={{ borderColor: "var(--color-line)" }} key={i}>
                    <span>{t(channel, locale)}</span>
                    <span className="data-label">{t(CONTACT.pendingNote, locale)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <div>
              <Advisory locale={locale} />
              <div style={{ marginTop: "1.25rem" }}>
                <a className="btn btn--brand" href={`mailto:${CONTACT.email}`}>
                  {t(CONTACT.labels.email, locale)} — {t(CONTACT.company, locale)}{" "}
                  <span className="btn__arrow" aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
