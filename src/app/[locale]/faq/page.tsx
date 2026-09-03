import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND, NAV } from "@/content/brand";
import { CONTACT, FAQ, FAQ_DESCRIPTION, HERO } from "@/content/pages";
import { Accordion } from "@/components/Accordion";
import { Advisory, PageHead } from "@/components/Blocks";
import { Reveal } from "@/components/Reveal";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[2].label, locale), description: FAQ_DESCRIPTION };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <PageHead
        kicker={t(BRAND.tagline, locale)}
        title={t(NAV[2].label, locale)}
        // The live Arabic page carries no subtitle; only English has this line.
        sub={locale === "en" ? FAQ_DESCRIPTION : undefined}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[2].label, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell" style={{ maxWidth: "960px" }}>
          <Advisory locale={locale} />

          <div style={{ marginTop: "clamp(2rem,4vw,3rem)" }}>
            <Accordion
              items={FAQ.map((item) => ({
                key: item.id,
                title: t(item.q, locale),
                body: <p className="acc__a">{t(item.a, locale)}</p>,
              }))}
            />
          </div>

          <Reveal
            className="panel panel--dark"
            style={{
              marginTop: "clamp(2.5rem,5vw,3.5rem)", display: "flex", gap: "2rem",
              flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <p className="eyebrow eyebrow--plain">{t(CONTACT.labels.contact, locale)}</p>
              <p className="display d4" style={{ marginTop: ".7rem" }}>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </p>
            </div>
            <Link className="btn btn--brand" href={localePath(locale, "/method")}>
              {t(HERO.cta2, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
