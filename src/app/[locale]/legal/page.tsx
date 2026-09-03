import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { LEGAL, LEGAL_INTRO, LEGAL_TITLE, PENDING_TITLE } from "@/content/legal";
import { Accordion } from "@/components/Accordion";
import { PageHead } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(LEGAL_TITLE, locale), description: t(LEGAL_INTRO, locale) };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <PageHead
        kicker={BRAND.name}
        title={t(LEGAL_TITLE, locale)}
        sub={t(LEGAL_INTRO, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(LEGAL_TITLE, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell" style={{ maxWidth: "960px" }}>
          <Accordion
            items={LEGAL.map((section) => ({
              key: section.id,
              title: t(section.title, locale),
              body: (
                <div style={{ paddingBottom: "1.8rem" }}>
                  <ol>
                    {section.clauses.map((clause, i) => (
                      <li className="dose" key={i}>
                        <span className="dose__n">{String(i + 1).padStart(2, "0")}</span>
                        <p className="dose__d">{t(clause, locale)}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="panel panel--advisory" style={{ marginTop: "1.4rem" }}>
                    <p className="eyebrow eyebrow--plain">{t(PENDING_TITLE, locale)}</p>
                    <ul style={{ marginTop: ".7rem" }}>
                      {section.pending.map((item, i) => (
                        <li className="tick" key={i}>
                          <span className="tick__i"><Icon name="check" size={17} /></span>
                          <span>{t(item, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ),
            }))}
          />
        </div>
      </section>
    </>
  );
}
