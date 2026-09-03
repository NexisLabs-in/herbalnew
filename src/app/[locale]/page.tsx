import Link from "next/link";
import Image from "next/image";
import {
  BRAND, NAV, PROMISE, TRADITIONS, TRADITIONS_HEADING, TRADITIONS_NOTE, UI,
} from "@/content/brand";
import { HERO, METHOD_HEADING, METHOD_SUB } from "@/content/pages";
import { PRODUCTS, SHELVES } from "@/content/products";
import { Advisory } from "@/components/Blocks";
import { Icon, type IconName } from "@/components/Icon";
import { MethodSteps } from "@/components/MethodSteps";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { TraditionsRibbon } from "@/components/TraditionsRibbon";
import { localePath, isLocale, t, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";

const PROMISE_ICONS: IconName[] = ["research", "balance", "shield", "doc"];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <svg className="hero__botanical" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="#B3A4EE" strokeOpacity=".16" strokeWidth="1.1" strokeLinecap="round">
            <path d="M-40 700c160-30 250-120 270-260M-40 700c40-150 140-230 270-260" />
            <path d="M1480 90c-170 34-266 128-288 274M1480 90c-42 158-146 242-288 274" />
            <g transform="translate(1180 560)">
              <path d="M0 160V-40" />
              <path d="M0 70c-60 0-92-32-92-88 56 0 92 32 92 88zM0 70c60 0 92-32 92-88-56 0-92 32-92 88z" />
              <path d="M0-10c-44 0-68-24-68-64 42 0 68 24 68 64zM0-10c44 0 68-24 68-64-42 0-68 24-68 64z" />
            </g>
            <g transform="translate(180 180) scale(.8)">
              <path d="M0 200V0" />
              <path d="M0 120c-56 0-86-30-86-82 52 0 86 30 86 82zM0 120c56 0 86-30 86-82-52 0-86 30-86 82z" />
            </g>
            <circle cx="720" cy="120" r="260" strokeOpacity=".07" />
            <circle cx="720" cy="120" r="380" strokeOpacity=".05" />
          </g>
        </svg>

        <div className="shell shell--wide hero__grid">
          <div>
            <p className="eyebrow">{t(BRAND.tagline, locale)}</p>
            <h1 className="display d1">{t(BRAND.slogan, locale)}</h1>
            <p className="hero__sub">{t(HERO.sub, locale)}</p>
            <p className="lead hero__body">{t(HERO.desc, locale)}</p>
            <p className="hero__body small">{t(HERO.body, locale)}</p>

            <div className="hero__cta">
              <Link className="btn btn--brand" href={localePath(locale, "/shop")}>
                {t(HERO.cta1, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="btn btn--on-dark" href={localePath(locale, "/method")}>
                {t(HERO.cta2, locale)}
              </Link>
            </div>

            <dl className="hero__meta">
              <div>
                <dt>{t(UI.formulas, locale)}</dt>
                <dd>{PRODUCTS.length}</dd>
              </div>
              <div>
                <dt>{t(UI.shelves, locale)}</dt>
                <dd>{SHELVES.length}</dd>
              </div>
              <div>
                <dt>{t(TRADITIONS_HEADING, locale)}</dt>
                <dd>{TRADITIONS.length}</dd>
              </div>
            </dl>
          </div>

          <div className="hero__stage">
            <span className="hero__ring" aria-hidden="true" />
            <span className="hero__plinth" aria-hidden="true" />
            <Image
              className="hero__packshot"
              src={`/img/${PRODUCTS[0].media.pack}`}
              alt={t(PRODUCTS[0].name, locale)}
              width={400}
              height={660}
              priority
            />
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="shell shell--wide">
          <div className="trust__grid">
            {PROMISE.map((promise, i) => (
              <div className="trust__item" key={i}>
                <span className="trust__icon">
                  <Icon name={PROMISE_ICONS[i]} size={32} strokeWidth={1.2} />
                </span>
                <div>
                  <p className="trust__d">{String(i + 1).padStart(2, "0")}</p>
                  <p className="trust__t">{t(promise, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ paddingTop: "clamp(3.5rem,7vw,5.5rem)" }}>
        <Reveal className="shell shell--wide center">
          <p className="eyebrow eyebrow--center">{t(TRADITIONS_HEADING, locale)}</p>
          <h2 className="display d3" style={{ marginTop: "1rem", maxWidth: "24ch", marginInline: "auto" }}>
            {t(TRADITIONS_NOTE, locale)}
          </h2>
        </Reveal>
      </section>
      <TraditionsRibbon locale={locale} />

      <section className="section">
        <div className="shell shell--wide">
          <Reveal className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">{t(BRAND.tagline, locale)}</p>
              <h2 className="display d2">{t(NAV[0].label, locale)}</h2>
              <p className="lead">{t(BRAND.supporting, locale)}</p>
            </div>
            <Link className="btn btn--ghost" href={localePath(locale, "/shop")}>
              {t(UI.allFormulas, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
            </Link>
          </Reveal>

          <div className="product-grid">
            {PRODUCTS.map((product, i) => (
              <ProductCard key={product.id} product={product} locale={locale} delay={i * 90} />
            ))}
          </div>

          <div style={{ marginTop: "clamp(2rem,4vw,3rem)" }}>
            <Advisory locale={locale} />
          </div>
        </div>
      </section>

      <section className="section bg-paper" style={{ borderBlock: "1px solid var(--color-line)" }}>
        <div className="shell shell--wide">
          <div
            className="grid"
            style={{
              gridTemplateColumns: "minmax(0,.85fr) minmax(0,1.15fr)",
              gap: "clamp(2rem,5vw,4.5rem)",
              alignItems: "start",
            }}
          >
            <Reveal>
              <p className="eyebrow">{t(BRAND.tagline, locale)}</p>
              <h2 className="display d2" style={{ marginTop: "1rem" }}>
                {t(METHOD_HEADING, locale)}
              </h2>
              <p className="body" style={{ marginTop: "1.2rem", maxWidth: "44ch" }}>
                {t(METHOD_SUB, locale)}
              </p>
              <Link className="btn btn--ghost" style={{ marginTop: "2rem" }} href={localePath(locale, "/method")}>
                {t(HERO.cta2, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
              </Link>
            </Reveal>
            <MethodSteps locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}
