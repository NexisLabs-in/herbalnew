import Link from "next/link";
import Image from "next/image";
import { UI } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { Accordion } from "@/components/Accordion";
import { Advisory } from "@/components/Blocks";
import { Icon, type IconName } from "@/components/Icon";
import { MethodSteps } from "@/components/MethodSteps";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { TraditionsRibbon } from "@/components/TraditionsRibbon";
import type { ProductCardView, CategoryTreeNode } from "@/lib/catalogue";
import type { SectionType } from "@/lib/models/enums";
import { localePath, t, tl, type Locale, type TL } from "@/lib/i18n";

/** Renders one CMS section.
 *
 *  Each type maps onto a component that already existed before the CMS did, so
 *  an edited page looks exactly like the hand-built one it replaced. The data
 *  is validated by the registry before it gets here; this only decides layout.
 */

export type RenderedSection = { type: SectionType; data: Record<string, unknown> };

export type SectionContext = {
  locale: Locale;
  featured: ProductCardView[];
  categories: CategoryTreeNode[];
};

const asTL = (value: unknown): TL => {
  const record = (value ?? {}) as { en?: string; ar?: string };
  return { en: record.en ?? "", ar: record.ar ?? "" };
};

const asTLArray = (value: unknown): TL[] => (Array.isArray(value) ? value.map(asTL) : []);

const asLink = (value: unknown) => {
  const record = (value ?? {}) as { label?: unknown; href?: string };
  return { label: asTL(record.label), href: record.href ?? "" };
};

/** A stored path may be `/method` or already carry a locale. Either should
 *  follow the page the visitor is on. */
function cmsHref(href: string, locale: Locale): string {
  const value = href.trim();
  if (!value || /^(https?:|mailto:|tel:)/i.test(value)) return value;
  const stripped = value.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  return localePath(locale, stripped);
}

/** Paragraphs from plain text. Blank lines separate them, which is what a
 *  person typing into a textarea already expects. */
const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

const PROMISE_ICONS: IconName[] = ["research", "balance", "shield", "doc"];

export function Section({ section, context }: { section: RenderedSection; context: SectionContext }) {
  const { locale } = context;
  const data = section.data;

  switch (section.type) {
    case "hero": {
      const heading = tl(asTL(data.heading), locale);
      const primary = asLink(data.primary);
      const secondary = asLink(data.secondary);

      return (
        <section className="hero hero--light">
          <div className="hero__glow" aria-hidden="true" />
          <div className="shell shell--wide hero__grid">
            <div>
              {tl(asTL(data.eyebrow), locale) ? (
                <p className="eyebrow">{tl(asTL(data.eyebrow), locale)}</p>
              ) : null}
              {heading ? <h1 className="display d1">{heading}</h1> : null}
              {tl(asTL(data.sub), locale) ? (
                <p className="hero__sub">{tl(asTL(data.sub), locale)}</p>
              ) : null}
              {tl(asTL(data.body), locale) ? (
                <p className="lead hero__body">{tl(asTL(data.body), locale)}</p>
              ) : null}

              {primary.href || secondary.href ? (
                <div className="hero__cta">
                  {primary.href ? (
                    <Link className="btn btn--brand" href={primary.href}>
                      {tl(primary.label, locale)}{" "}
                      <span className="btn__arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                  ) : null}
                  {secondary.href ? (
                    <Link className="btn btn--on-dark" href={secondary.href}>
                      {tl(secondary.label, locale)}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="hero__stage">
              <span className="hero__ring" aria-hidden="true" />
              <span className="hero__plinth" aria-hidden="true" />
              {/* The hero image is the first featured product, so the front page
                  follows the catalogue instead of needing its own upload. */}
              {context.featured[0]?.image ? (
                <Image
                  className="hero__packshot"
                  src={context.featured[0].image.url}
                  alt={tl(context.featured[0].name, locale)}
                  width={400}
                  height={660}
                  priority
                  unoptimized={!context.featured[0].image.url.startsWith("/img/")}
                />
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    case "trustStrip": {
      const items = asTLArray(data.items);
      if (items.length === 0) return null;
      return (
        <section className="trust">
          <div className="shell shell--wide">
            <div className="trust__grid">
              {items.map((item, index) => (
                <div className="trust__item" key={index}>
                  <span className="trust__icon">
                    <Icon name={PROMISE_ICONS[index % PROMISE_ICONS.length]} size={32} strokeWidth={1.2} />
                  </span>
                  <div>
                    <p className="trust__d">{String(index + 1).padStart(2, "0")}</p>
                    <p className="trust__t">{tl(item, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "traditionsRibbon": {
      const items = asTLArray(data.items);
      return (
        <>
          <section className="section--tight" style={{ paddingTop: "clamp(3.5rem,7vw,5.5rem)" }}>
            <Reveal className="shell shell--wide center">
              {tl(asTL(data.heading), locale) ? (
                <p className="eyebrow eyebrow--center">{tl(asTL(data.heading), locale)}</p>
              ) : null}
              {tl(asTL(data.note), locale) ? (
                <h2
                  className="display d3"
                  style={{ marginTop: "1rem", maxWidth: "24ch", marginInline: "auto" }}
                >
                  {tl(asTL(data.note), locale)}
                </h2>
              ) : null}
            </Reveal>
          </section>
          {items.length ? <TraditionsRibbon locale={locale} items={items} /> : null}
        </>
      );
    }

    case "featuredProducts": {
      const limit = typeof data.limit === "number" ? data.limit : 6;
      const products = context.featured.slice(0, limit);

      return (
        <section className="section">
          <div className="shell shell--wide">
            <Reveal className="section-head">
              <div className="section-head__text">
                <h2 className="display d2">
                  {tl(asTL(data.heading), locale) || t(SHOP.featuredTitle, locale)}
                </h2>
                {tl(asTL(data.sub), locale) ? <p className="lead">{tl(asTL(data.sub), locale)}</p> : null}
              </div>
              <Link className="btn btn--ghost" href={localePath(locale, "/shop")}>
                {t(UI.allFormulas, locale)}{" "}
                <span className="btn__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>

            {products.length ? (
              <div className="product-grid">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} locale={locale} delay={index * 90} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="body">{t(SHOP.emptyCabinet, locale)}</p>
              </div>
            )}
          </div>
        </section>
      );
    }

    case "categoryGrid": {
      if (context.categories.length === 0) return null;
      return (
        <section className="section bg-paper" style={{ borderBlock: "1px solid var(--color-line)" }}>
          <div className="shell shell--wide">
            {tl(asTL(data.heading), locale) ? (
              <h2 className="display d2">{tl(asTL(data.heading), locale)}</h2>
            ) : null}
            {tl(asTL(data.sub), locale) ? (
              <p className="lead" style={{ marginTop: ".75rem" }}>
                {tl(asTL(data.sub), locale)}
              </p>
            ) : null}

            <div className="category-grid">
              {context.categories.map((parent) => (
                <Link
                  className="category-card"
                  key={parent.id}
                  href={`${localePath(locale, "/shop")}?category=${parent.slug}`}
                >
                  <h3 className="display d4">{tl(parent.name, locale)}</h3>
                  {parent.children.length ? (
                    <p className="category-card__children">
                      {parent.children.map((child) => tl(child.name, locale)).join(" · ")}
                    </p>
                  ) : null}
                  <span className="link-arrow">
                    <span>{t(UI.allFormulas, locale)}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "methodTeaser":
      return (
        <section className="section bg-paper" style={{ borderBlock: "1px solid var(--color-line)" }}>
          <div className="shell shell--wide">
            <div className="method-teaser">
              <Reveal>
                {tl(asTL(data.heading), locale) ? (
                  <h2 className="display d2">{tl(asTL(data.heading), locale)}</h2>
                ) : null}
                {tl(asTL(data.body), locale) ? (
                  <p className="body" style={{ marginTop: "1.2rem", maxWidth: "44ch" }}>
                    {tl(asTL(data.body), locale)}
                  </p>
                ) : null}
                {asLink(data.cta).href ? (
                  <Link className="btn btn--ghost" style={{ marginTop: "2rem" }} href={asLink(data.cta).href}>
                    {tl(asLink(data.cta).label, locale)}{" "}
                    <span className="btn__arrow" aria-hidden="true">&rarr;</span>
                  </Link>
                ) : null}
              </Reveal>
              <MethodSteps locale={locale} />
            </div>
          </div>
        </section>
      );

    case "richText": {
      const body = paragraphs(tl(asTL(data.body), locale));
      return (
        <section className="section--tight">
          <div className="shell shell--narrow">
            {tl(asTL(data.eyebrow), locale) ? (
              <p className="eyebrow">{tl(asTL(data.eyebrow), locale)}</p>
            ) : null}
            {tl(asTL(data.heading), locale) ? (
              <h2 className="display d3" style={{ marginTop: ".8rem" }}>
                {tl(asTL(data.heading), locale)}
              </h2>
            ) : null}
            {body.map((paragraph, index) => (
              <p className="body" key={index} style={{ marginTop: "1rem" }}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      );
    }

    case "accordion": {
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) return null;
      return (
        <section className="section--tight">
          <div className="shell shell--narrow">
            {tl(asTL(data.heading), locale) ? (
              <h2 className="display d3" style={{ marginBottom: "1.5rem" }}>
                {tl(asTL(data.heading), locale)}
              </h2>
            ) : null}
            <Accordion
              items={items.map((item, index) => {
                const entry = item as { q?: unknown; a?: unknown };
                return {
                  key: String(index),
                  title: tl(asTL(entry.q), locale),
                  body: tl(asTL(entry.a), locale),
                };
              })}
            />
          </div>
        </section>
      );
    }

    case "imageText": {
      const image = typeof data.image === "string" ? data.image : "";
      const body = paragraphs(tl(asTL(data.body), locale));
      const cta = asLink(data.cta);

      return (
        <section className="section">
          <div className="shell shell--wide">
            <div className={`image-text${data.side === "right" ? " image-text--right" : ""}`}>
              {image ? (
                <div className="image-text__media">
                  <Image
                    src={image}
                    alt={tl(asTL(data.imageAlt), locale)}
                    width={720}
                    height={560}
                    unoptimized={!image.startsWith("/img/")}
                  />
                </div>
              ) : null}
              <div>
                {tl(asTL(data.heading), locale) ? (
                  <h2 className="display d3">{tl(asTL(data.heading), locale)}</h2>
                ) : null}
                {body.map((paragraph, index) => (
                  <p className="body" key={index} style={{ marginTop: "1rem" }}>
                    {paragraph}
                  </p>
                ))}
                {cta.href ? (
                  <Link className="btn btn--ghost" style={{ marginTop: "1.75rem" }} href={cta.href}>
                    {tl(cta.label, locale)}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "noteBox": {
      const heading = tl(asTL(data.heading), locale);
      const body = paragraphs(tl(asTL(data.body), locale));
      const dark = data.dark === true;
      return (
        <section className="section--tight">
          <div className="shell shell--wide">
            <Reveal className={dark ? "panel panel--dark" : "panel panel--advisory"}>
              {heading ? <p className="eyebrow eyebrow--plain">{heading}</p> : null}
              {body.map((paragraph, index) => (
                <p className="body" key={index} style={{ marginTop: heading || index ? ".9rem" : 0, maxWidth: "82ch" }}>
                  {paragraph}
                </p>
              ))}
            </Reveal>
          </div>
        </section>
      );
    }

    case "advisory":
      return (
        <section className="section--tight">
          <div className="shell shell--wide">
            <Advisory locale={locale} />
          </div>
        </section>
      );

    case "ctaBanner": {
      const cta = asLink(data.cta);
      const heading = tl(asTL(data.heading), locale);
      const body = tl(asTL(data.body), locale);
      const href = cmsHref(cta.href, locale);
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body);
      return (
        <section className="cta-close">
          <div className="shell shell--wide cta-banner">
            <div>
              {heading ? <h2 className="display d3">{heading}</h2> : null}
              {body ? (
                email ? (
                  <a className="cta-banner__mail" href={`mailto:${body}`}>{body}</a>
                ) : (
                  <p className="body">{body}</p>
                )
              ) : null}
            </div>
            {href ? (
              <Link className="btn btn--brand" href={href}>
                {tl(cta.label, locale)}{" "}
                <span className="btn__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            ) : null}
          </div>
        </section>
      );
    }

    default:
      // Copy blocks and unknown types are rendered by their own pages, not here.
      return null;
  }
}
