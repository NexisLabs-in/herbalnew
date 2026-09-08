import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { LEGAL, LEGAL_INTRO, LEGAL_TITLE } from "@/content/legal";
import { Accordion } from "@/components/Accordion";
import { PageHead } from "@/components/Blocks";
import { Section, type RenderedSection } from "@/components/cms/Sections";
import { consolidateLegalPage } from "@/lib/cms/catalogue";
import { getPage, sectionContext } from "@/lib/cms/pages";
import { LEGAL_PAGE_SLUG } from "@/lib/cms/order";
import { isLocale, localePath, t, tl, type Locale } from "@/lib/i18n";

/** Editing the page in the admin panel revalidates the storefront, so this is
 *  only a backstop. */
export const revalidate = 300;

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  await consolidateLegalPage();
  const page = await getPage(LEGAL_PAGE_SLUG);
  const title = page ? tl(page.title, locale) : t(LEGAL_TITLE, locale);
  const description = page ? tl(page.seo.description, locale) : "";
  return {
    title: title || t(LEGAL_TITLE, locale),
    description: description || t(LEGAL_INTRO, locale),
  };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await consolidateLegalPage();
  const page = await getPage(LEGAL_PAGE_SLUG);
  const sections = page?.sections ?? [];
  const edited = Boolean(page?.managed);

  const heading = edited && page ? tl(page.title, locale) : t(LEGAL_TITLE, locale);
  const intro = edited && page ? tl(page.seo.description, locale) : t(LEGAL_INTRO, locale);

  const rich = edited
    ? sections.filter((section) => section.type === "richText")
    : [];
  const rest = edited
    ? sections.filter((section) => section.type !== "richText")
    : [];
  const context = rest.length > 0 ? await sectionContext(locale) : null;

  const items = edited
    ? rich.map((section, index) => {
        const data = section.data as { heading?: { en: string; ar?: string }; body?: { en: string; ar?: string } };
        const clauses = data.body ? paragraphs(tl(data.body, locale)) : [];
        return {
          key: String(index),
          title: data.heading ? tl(data.heading, locale) : heading,
          body: (
            <div style={{ paddingBottom: "1.8rem" }}>
              <ol>
                {clauses.map((clause, i) => (
                  <li className="dose" key={i}>
                    <span className="dose__n">{String(i + 1).padStart(2, "0")}</span>
                    <p className="dose__d">{clause}</p>
                  </li>
                ))}
              </ol>
            </div>
          ),
        };
      })
    : LEGAL.map((doc) => ({
        key: doc.id,
        title: t(doc.title, locale),
        body: (
          <div style={{ paddingBottom: "1.8rem" }}>
            <ol>
              {doc.clauses.map((clause, i) => (
                <li className="dose" key={i}>
                  <span className="dose__n">{String(i + 1).padStart(2, "0")}</span>
                  <p className="dose__d">{t(clause, locale)}</p>
                </li>
              ))}
            </ol>
          </div>
        ),
      }));

  return (
    <>
      <PageHead
        kicker={BRAND.name}
        title={heading || t(LEGAL_TITLE, locale)}
        sub={intro || t(LEGAL_INTRO, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: heading || t(LEGAL_TITLE, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell" style={{ maxWidth: "960px" }}>
          <Accordion items={items} />
          {rest.map((section: RenderedSection, i) =>
            context ? <Section key={i} section={section} context={context} /> : null,
          )}
        </div>
      </section>
    </>
  );
}
