import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND, NAV } from "@/content/brand";
import { CONTACT } from "@/content/pages";
import { Advisory } from "@/components/Blocks";
import { ContactForm } from "@/components/storefront/ContactForm";
import { ensurePageCopy } from "@/lib/cms/copy";
import { getPage } from "@/lib/cms/pages";
import { isLocale, localePath, t, tl, type Locale, type TL } from "@/lib/i18n";
export const revalidate = 300;

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

const asChannel = (value: unknown) => {
  const record = (value ?? {}) as { en?: string; ar?: string; label?: unknown; href?: string };
  return {
    label: record.label && typeof record.label === "object" ? asTL(record.label) : asTL(record),
    href: typeof record.href === "string" ? record.href.trim() : "",
  };
};

const linkHref = (href: string) => {
  if (!href) return "";
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return `https://${href}`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  await ensurePageCopy("contact");
  const page = await getPage("contact");
  const copy = page?.sections.find((section) => section.type === "contactCopy")?.data ?? {};
  return {
    title: tl(page?.seo.title, locale) || tl(page?.title, locale) || t(NAV[3].label, locale),
    description: tl(page?.seo.description, locale) || tl(asTL(copy.about), locale),
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await ensurePageCopy("contact");
  const page = await getPage("contact");
  const copy = page?.sections.find((section) => section.type === "contactCopy")?.data ?? {};
  const email = typeof copy.email === "string" ? copy.email : "";
  const website = typeof copy.website === "string" ? copy.website : "";
  const mobile = typeof copy.mobile === "string" && copy.mobile ? copy.mobile : CONTACT.mobile;

  const hours = tl(asTL(copy.hours), locale);
  const address = tl(asTL(copy.address), locale);
  const country = tl(asTL(copy.country), locale);
  const pendingTitle = tl(asTL(copy.pendingTitle), locale);
  const pendingNote = tl(asTL(copy.pendingNote), locale);
  const siteHref = website
    ? /^https?:/i.test(website) ? website : `https://${website.replace(/^\/+/, "")}`
    : "";

  const channels = Array.isArray(copy.pending) ? copy.pending.map(asChannel) : [];
  const title = tl(page?.title, locale);
  const about = tl(asTL(copy.about), locale);
  const company = tl(asTL(copy.company), locale);

  return (
    <div className="contact">
      <div className="shell shell--wide">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href={localePath(locale)}>{BRAND.name}</a>
          <span aria-hidden="true">/</span>
          <span>{title}</span>
        </nav>

        <div className="contact__layout">
          <div className="contact__aside">
            {company ? <p className="eyebrow">{company}</p> : null}
            <h1 className="display d2">{title}</h1>
            {about ? <p className="contact__about">{about}</p> : null}

            <div className="contact__details">
              {email ? (
                <div className="contact__item">
                  <p className="contact__label">{t(CONTACT.labels.email, locale)}</p>
                  <p className="contact__email">
                    <a href={`mailto:${email}`}>{email}</a>
                  </p>
                </div>
              ) : null}
              {hours ? (
                <div className="contact__item">
                  <p className="contact__label">{t(CONTACT.labels.hours, locale)}</p>
                  <p className="contact__value">{hours}</p>
                </div>
              ) : null}
              {address || country ? (
                <div className="contact__item">
                  <p className="contact__label">{t(CONTACT.labels.address, locale)}</p>
                  <p className="contact__value">
                    {address}
                    {address && country ? <br /> : null}
                    {country}
                  </p>
                </div>
              ) : null}
              {mobile ? (
                <div className="contact__item">
                  <p className="contact__label">{t(CONTACT.labels.mobile, locale)}</p>
                  <p className="contact__value">
                    <a href={`tel:${mobile.replace(/\s/g, "")}`} dir="ltr">
                      {mobile}
                    </a>
                  </p>
                </div>
              ) : null}
              {website ? (
                <div className="contact__item">
                  <p className="contact__label">{t(CONTACT.labels.website, locale)}</p>
                  <p className="contact__value">
                    <a href={siteHref} target="_blank" rel="noreferrer">{website}</a>
                  </p>
                </div>
              ) : null}
            </div>

            {channels.length > 0 ? (
              <div className="contact__soon">
                <div>
                  {pendingTitle ? <p className="contact__label">{pendingTitle}</p> : null}
                  {pendingNote ? <p className="contact__soon-note">{pendingNote}</p> : null}
                </div>
                <ul>
                  {channels.map((channel, i) => {
                    const name = tl(channel.label, locale);
                    const href = linkHref(channel.href);
                    const external = /^https?:/i.test(href);
                    return (
                      <li key={i}>
                        {href ? (
                          <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{name}</a>
                        ) : (
                          name
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="contact__form">
            <ContactForm locale={locale} />
          </div>
        </div>

        <div className="contact__note">
          <Advisory locale={locale} />
        </div>
      </div>
    </div>
  );
}
