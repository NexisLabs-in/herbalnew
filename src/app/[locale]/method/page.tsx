import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORY, BRAND, NAV } from "@/content/brand";
import { ensurePageCopy } from "@/lib/cms/copy";
import { getPage } from "@/lib/cms/pages";
import { PageHead } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { MethodSteps } from "@/components/MethodSteps";
import { Reveal } from "@/components/Reveal";
import { isLocale, localePath, tl, type Locale, type TL } from "@/lib/i18n";

export const revalidate = 300;

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

const asList = (value: unknown): TL[] => (Array.isArray(value) ? value.map(asTL) : []);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  await ensurePageCopy("method");
  const page = await getPage("method");
  const copy = page?.sections.find((section) => section.type === "methodCopy")?.data ?? {};
  return {
    title: tl(page?.seo.title, locale) || tl(asTL(copy.heading), locale) || tl(page?.title, locale),
    description: tl(page?.seo.description, locale) || tl(asTL(copy.standfirst), locale),
  };
}

export default async function MethodPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await ensurePageCopy("method");
  const page = await getPage("method");
  const copy = page?.sections.find((section) => section.type === "methodCopy")?.data ?? {};
  const steps = Array.isArray(copy.steps)
    ? copy.steps.map((step) => {
        const record = step as { title?: unknown; detail?: unknown };
        return { title: asTL(record.title), detail: asTL(record.detail) };
      })
    : [];

  return (
    <>
      <PageHead
        kicker={tl(asTL(copy.kicker), locale)}
        title={tl(asTL(copy.heading), locale)}
        sub={tl(asTL(copy.standfirst), locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: tNav(locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="grid grid--split">
            <Reveal className="panel">
              <p className="eyebrow eyebrow--plain">{tl(asTL(copy.traditionsHeading), locale)}</p>
              <ul style={{ marginTop: "1rem" }}>
                {asList(copy.traditions).map((tradition, i) => (
                  <li className="tick" key={i}>
                    <span className="tick__i"><Icon name="leaf" size={17} /></span>
                    <span>{tl(tradition, locale)}</span>
                  </li>
                ))}
              </ul>
              <hr className="rule rule--brand" style={{ marginBlock: "1.4rem" }} />
              <p className="body small">{tl(asTL(copy.traditionsNote), locale)}</p>
            </Reveal>

            <Reveal delay={80}>
              <p className="lead">{tl(asTL(copy.intro), locale)}</p>
              {asList(copy.paragraphs).map((para, i) => (
                <p className="body" style={{ marginTop: "1.1rem" }} key={i}>
                  {tl(para, locale)}
                </p>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section bg-paper" style={{ borderBlock: "1px solid var(--color-line)" }}>
        <div className="shell shell--wide">
          <Reveal className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">{tl(BRAND.tagline, locale)}</p>
              <h2 className="display d2">{tl(asTL(copy.stepsHeading), locale)}</h2>
              <p className="body">{tl(asTL(copy.stepsSub), locale)}</p>
            </div>
          </Reveal>
          <MethodSteps locale={locale} steps={steps} />
        </div>
      </section>

      <section className="section">
        <div className="shell shell--wide">
          <Reveal className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">{tl(asTL(copy.valuesHeading), locale)}</p>
              <h2 className="display d3">{tl(asTL(copy.valuesSub), locale)}</h2>
            </div>
          </Reveal>

          <ul className="values">
            {asList(copy.values).map((value, i) => (
              <Reveal as="li" className="values__item" key={i} delay={i * 40}>
                <span className="values__n">{String(i + 1).padStart(2, "0")}</span>
                <p className="values__t">{tl(value, locale)}</p>
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
              <p className="eyebrow eyebrow--plain">{tl(BRAND.tagline, locale)}</p>
              <p style={{ marginTop: ".9rem", maxWidth: "62ch" }}>{tl(ADVISORY, locale)}</p>
            </div>
            <Link className="btn btn--brand" href={localePath(locale, "/shop")}>
              {tl(asTL(copy.cta), locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function tNav(locale: Locale) {
  return tl(NAV[1].label, locale);
}
