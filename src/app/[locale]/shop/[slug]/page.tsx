import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORY, BRAND, NAV, UI } from "@/content/brand";
import { CONTACT } from "@/content/pages";
import { PRODUCTS, getProduct, getShelf } from "@/content/products";
import { PageHead } from "@/components/Blocks";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { formatAed, isLocale, locales, localePath, t, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.flatMap((locale) => PRODUCTS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!isLocale(locale) || !product) return {};
  return { title: t(product.name, locale), description: t(product.summary, locale) };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const product = getProduct(slug);
  if (!product) notFound();

  const shelf = getShelf(product.shelf);
  const name = t(product.name, locale);
  const form = t(product.formLabel, locale);
  const price = formatAed(product.priceAed, locale);

  const views = [
    ...(product.media.photo
      ? [{
          src: `/img/${product.media.photo}`,
          alt: product.media.photoAlt ? t(product.media.photoAlt, locale) : name,
          photo: true,
        }]
      : []),
    { src: `/img/${product.media.pack}`, alt: `${name} — ${form.toLowerCase()}` },
    ...(product.media.carton
      ? [{ src: `/img/${product.media.carton}`, alt: `${name} — ${t(UI.form, locale)}` }]
      : []),
    ...(product.media.plate
      ? [{ src: `/img/${product.media.plate}`, alt: shelf ? t(shelf.name, locale) : name }]
      : []),
  ];

  return (
    <>
      <PageHead
        kicker={shelf ? t(shelf.name, locale) : BRAND.name}
        title={name}
        sub={t(product.summary, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[0].label, locale), href: localePath(locale, "/shop") },
          { label: name },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="pdp">
            <Gallery views={views} label={name} />

            <div className="stack" style={{ ["--stack" as string]: "clamp(1.75rem,3vw,2.5rem)" }}>
              <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                <span className="chip chip--brand">{form}</span>
                <span className="chip chip--dot">{t(UI.inPreparation, locale)}</span>
                {shelf ? <span className="chip">{t(shelf.name, locale)}</span> : null}
              </div>

              <dl className="spec-grid">
                <div className="spec">
                  <dt>{t(UI.form, locale)}</dt>
                  <dd>{form}</dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.targetGroup, locale)}</dt>
                  <dd>{t(product.safety.targetGroup, locale)}</dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.shelfLife, locale)}</dt>
                  <dd>
                    {product.shelfLifeMonths} {t(UI.months, locale)}
                  </dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.netQuantity, locale)}</dt>
                  <dd>{product.netQuantity ? t(product.netQuantity, locale) : t(UI.pending, locale)}</dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.batch, locale)}</dt>
                  <dd>{product.batch ? t(product.batch, locale) : t(UI.pending, locale)}</dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.storage, locale)}</dt>
                  <dd style={{ fontSize: ".8125rem" }}>{t(product.storage, locale)}</dd>
                </div>
              </dl>

              <div className="buy-box">
                <p className="eyebrow eyebrow--plain">
                  04 — {price ? form : t(UI.notYetOnSale, locale)}
                </p>
                <p className="display d3" style={{ marginTop: ".9rem" }}>
                  {price ?? t(UI.pricePending, locale)}
                </p>
                <p className="body small" style={{ marginTop: ".8rem", maxWidth: "46ch" }}>
                  {t(UI.notifyNote, locale)}
                </p>
                <a
                  className="btn btn--block"
                  style={{ marginTop: "1.4rem" }}
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(name)}`}
                >
                  {t(UI.enquire, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
                </a>
              </div>

              <section>
                <p className="eyebrow">01 — {t(UI.compounds, locale)}</p>
                <p className="display d4" style={{ marginTop: ".9rem" }}>
                  {t(UI.pending, locale)}
                </p>
                <p className="body" style={{ marginTop: ".7rem" }}>
                  {t(UI.compoundsPending, locale)}
                </p>
              </section>

              <section>
                <p className="eyebrow">02 — {t(UI.directions, locale)}</p>
                {product.directions ? (
                  <>
                    <ol style={{ marginTop: "1rem" }}>
                      {product.directions.steps.map((step, i) => (
                        <li className="dose" key={i}>
                          <span className="dose__n">{String(i + 1).padStart(2, "0")}</span>
                          <div className="dose__d">
                            {t(step.detail, locale)}
                            {step.measure ? <p className="dose__m">{step.measure}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <dl className="spec-grid" style={{ marginTop: "1.25rem" }}>
                      <div className="spec">
                        <dt>{t(UI.frequency, locale)}</dt>
                        <dd style={{ fontSize: ".875rem" }}>{t(product.directions.frequency, locale)}</dd>
                      </div>
                      <div className="spec">
                        {product.directions.maximum ? (
                          <>
                            <dt>{t(UI.maximum, locale)}</dt>
                            <dd style={{ fontSize: ".875rem" }}>{t(product.directions.maximum, locale)}</dd>
                          </>
                        ) : (
                          <>
                            <dt>{t(UI.storage, locale)}</dt>
                            <dd style={{ fontSize: ".8125rem" }}>{t(product.storage, locale)}</dd>
                          </>
                        )}
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <p className="display d4" style={{ marginTop: ".9rem" }}>
                      {t(UI.pending, locale)}
                    </p>
                    <p className="body" style={{ marginTop: ".7rem" }}>
                      {t(UI.compoundsPending, locale)}
                    </p>
                  </>
                )}
              </section>

              <section>
                <p className="eyebrow">03 — {t(UI.safety, locale)}</p>
                <div className="panel panel--advisory" style={{ marginTop: "1rem" }}>
                  <p className="eyebrow eyebrow--plain">{t(UI.readBeforeBuying, locale)}</p>
                  <p className="body small" style={{ marginTop: ".8rem" }}>
                    {t(ADVISORY, locale)}
                  </p>
                </div>

                <h3 className="display d4" style={{ marginTop: "1.75rem" }}>
                  {t(UI.cautions, locale)}
                </h3>
                <ul style={{ marginTop: ".6rem" }}>
                  {product.safety.cautions.map((caution, i) => (
                    <li className="tick" key={i}>
                      <span className="tick__i"><Icon name="check" size={17} /></span>
                      <span>{t(caution, locale)}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="display d4" style={{ marginTop: "1.5rem" }}>
                  {t(UI.seekAdvice, locale)}
                </h3>
                <ul style={{ marginTop: ".6rem" }}>
                  {product.safety.seekAdvice.map((item, i) => (
                    <li className="tick" key={i}>
                      <span className="tick__i"><Icon name="check" size={17} /></span>
                      <span>{t(item, locale)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <Link className="link-arrow" href={localePath(locale, "/shop")}>
                <span>{t(UI.allFormulas, locale)}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
