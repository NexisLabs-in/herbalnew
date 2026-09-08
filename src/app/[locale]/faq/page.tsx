import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND, NAV } from "@/content/brand";
import { FAQ, FAQ_DESCRIPTION } from "@/content/pages";
import { Accordion } from "@/components/Accordion";
import { Icon } from "@/components/Icon";
import { Section, type RenderedSection } from "@/components/cms/Sections";
import { ensureFaqClosing } from "@/lib/cms/copy";
import { cmsSeo, getPageBody, type PageBody } from "@/lib/cms/pages";
import { isLocale, localePath, t, tl, type Locale, type TL } from "@/lib/i18n";

/** Editing the page in the admin panel revalidates the storefront, so this is
 *  only a backstop. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(NAV[2].label, locale),
    description: FAQ_DESCRIPTION,
    ...(await cmsSeo("faq", locale)),
  };
}

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await ensureFaqClosing();
  const body = await getPageBody("faq", locale);
  const intro = body.managed ? tl(body.page?.seo.description, locale) : locale === "en" ? FAQ_DESCRIPTION : "";

  const title = body.managed ? tl(body.page!.title, locale) : t(NAV[2].label, locale);

  return (
    <div className="faq-page">
      <header className="faq-hero">
        <div className="faq-hero__art" aria-hidden="true">
          <img src="/img/banner_faq.png" alt="" />
        </div>
        <div className="shell shell--wide faq-hero__copy">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href={localePath(locale)}>{BRAND.name}</a>
            <span aria-hidden="true">/</span>
            <span>{t(NAV[2].label, locale)}</span>
          </nav>
          <h1 className="display d2">{title}</h1>
          {intro ? <p className="faq-hero__sub">{intro}</p> : null}
        </div>
      </header>

      <div className="faq-page__body">
        <div className="shell shell--wide">
          {body.managed ? <FaqSections body={body} locale={locale} /> : <BuiltInQuestions locale={locale} />}
        </div>
      </div>
    </div>
  );
}

function FaqSections({ body, locale }: { body: PageBody; locale: Locale }) {
  return (
    <>
      {body.sections.map((section, index) => {
        if (section.type === "accordion") {
          return <QuestionList key={index} section={section} locale={locale} />;
        }
        if (section.type === "ctaBanner") {
          return <FaqClose key={index} section={section} locale={locale} />;
        }
        return body.context ? <Section key={index} section={section} context={body.context} /> : null;
      })}
    </>
  );
}

function QuestionList({
  section,
  locale,
}: {
  section: RenderedSection;
  locale: Locale;
}) {
  const items = Array.isArray(section.data.items) ? section.data.items : [];
  if (items.length === 0) return null;
  return (
    <div className="faq-questions">
      <Accordion
        sign={false}
        startOpen={-1}
        items={items.map((item, index) => {
          const entry = item as { q?: unknown; a?: unknown };
          return {
            key: String(index),
            title: tl(asTL(entry.q), locale),
            body: <p className="acc__a">{tl(asTL(entry.a), locale)}</p>,
          };
        })}
      />
    </div>
  );
}

function FaqClose({ section, locale }: { section: RenderedSection; locale: Locale }) {
  const heading = tl(asTL(section.data.heading), locale);
  const text = tl(asTL(section.data.body), locale);
  const link = (section.data.cta ?? {}) as { label?: unknown; href?: string };
  const label = tl(asTL(link.label), locale);
  const href = storeHref(link.href ?? "", locale);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  if (!heading && !text && !href) return null;

  return (
    <div className="faq-close">
      <span className="faq-close__mark" aria-hidden="true">
        <Icon name="mail" size={18} />
      </span>
      <div className="faq-close__copy">
        {heading ? <p className="faq-close__h">{heading}</p> : null}
        {text ? (
          email ? (
            <a className="faq-close__text" href={`mailto:${text}`}>{text}</a>
          ) : (
            <p className="faq-close__text">{text}</p>
          )
        ) : null}
      </div>
      {href && label ? (
        <Link className="btn btn--brand" href={href}>
          {label} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}
    </div>
  );
}

function BuiltInQuestions({ locale }: { locale: Locale }) {
  return (
    <Accordion
      sign={false}
      startOpen={-1}
      items={FAQ.map((item) => ({
        key: item.id,
        title: t(item.q, locale),
        body: <p className="acc__a">{t(item.a, locale)}</p>,
      }))}
    />
  );
}

function storeHref(href: string, locale: Locale): string {
  const value = href.trim();
  if (!value || /^(https?:|mailto:|tel:)/i.test(value)) return value;
  const stripped = value.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  return localePath(locale, stripped);
}
