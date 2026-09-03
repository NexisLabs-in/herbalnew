import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORY, BRAND, NAV, TRADITIONS, TRADITIONS_HEADING, TRADITIONS_NOTE } from "@/content/brand";
import { HERO, METHOD_HEADING, METHOD_PAGE, METHOD_SUB } from "@/content/pages";
import { PageHead } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { MethodSteps } from "@/components/MethodSteps";
import { Reveal } from "@/components/Reveal";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[1].label, locale), description: t(METHOD_PAGE.intro, locale) };
}

export default async function MethodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <PageHead
        kicker={t(METHOD_PAGE.kicker, locale)}
        title={t(BRAND.slogan, locale)}
        sub={t(BRAND.supporting, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[1].label, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div
            className="grid"
            style={{
              gridTemplateColumns: "minmax(0,.8fr) minmax(0,1.2fr)",
              gap: "clamp(2rem,5vw,4rem)",
              alignItems: "start",
            }}
          >
            <Reveal className="panel">
              <p className="eyebrow eyebrow--plain">{t(TRADITIONS_HEADING, locale)}</p>
              <ul style={{ marginTop: "1rem" }}>
                {TRADITIONS.map((tradition, i) => (
                  <li className="tick" key={i}>
                    <span className="tick__i"><Icon name="leaf" size={17} /></span>
                    <span>{t(tradition, locale)}</span>
                  </li>
                ))}
              </ul>
              <hr className="rule rule--gold" style={{ marginBlock: "1.4rem" }} />
              <p className="body small">{t(TRADITIONS_NOTE, locale)}</p>
            </Reveal>

            <Reveal delay={80}>
              <p className="lead">{t(METHOD_PAGE.intro, locale)}</p>
              {METHOD_PAGE.paras.map((para, i) => (
                <p className="body" style={{ marginTop: "1.1rem" }} key={i}>
                  {t(para, locale)}
                </p>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section bg-ivory" style={{ borderBlock: "1px solid var(--color-line)" }}>
        <div className="shell shell--wide">
          <Reveal className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">{t(BRAND.tagline, locale)}</p>
              <h2 className="display d2">{t(METHOD_HEADING, locale)}</h2>
              <p className="body">{t(METHOD_SUB, locale)}</p>
            </div>
          </Reveal>
          <MethodSteps locale={locale} />
        </div>
      </section>

      <section className="section">
        <div className="shell shell--wide">
          <Reveal className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">{t(METHOD_PAGE.valueTitle, locale)}</p>
              <h2 className="display d3">{t(METHOD_PAGE.valueSub, locale)}</h2>
            </div>
          </Reveal>

          <ul className="grid g3">
            {METHOD_PAGE.values.map((value, i) => (
              <Reveal as="li" className="promise" key={i} delay={i * 60}>
                <span className="numeral">{String(i + 1).padStart(2, "0")}</span>
                <p className="promise__t" style={{ fontSize: "1.05rem", lineHeight: 1.5 }}>
                  {t(value, locale)}
                </p>
              </Reveal>
            ))}
          </ul>

          <Reveal
            className="panel panel--dark"
            style={{
              marginTop: "clamp(2.5rem,5vw,3.5rem)", display: "flex", gap: "2rem",
              flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <p className="eyebrow eyebrow--plain">{t(BRAND.tagline, locale)}</p>
              <p style={{ marginTop: ".9rem", maxWidth: "62ch" }}>{t(ADVISORY, locale)}</p>
            </div>
            <Link className="btn btn--gold" href={localePath(locale, "/shop")}>
              {t(HERO.cta1, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
