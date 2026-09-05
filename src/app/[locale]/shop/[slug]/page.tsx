import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORY, BRAND, NAV, UI } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { Price } from "@/components/Price";
import { ProductCard } from "@/components/ProductCard";
import { StockLine } from "@/components/StockLine";
import { AddToCart } from "@/components/storefront/AddToCart";
import { EnquiryForm } from "@/components/storefront/EnquiryForm";
import { NotifyMeForm } from "@/components/storefront/NotifyMeForm";
import { getCustomer } from "@/lib/auth/guards";
import { getProductBySlug, getPublishedSlugs, getRelatedProducts } from "@/lib/catalogue";
import { isLocale, locales, localePath, t, tl, type Locale } from "@/lib/i18n";

export const revalidate = 300;

/** Prerenders the published catalogue at build time; anything published later
 *  is rendered on first request and then cached (`dynamicParams` defaults on). */
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const product = await getProductBySlug(slug);
  if (!product) return {};

  // The SEO fields are optional overrides; the product's own name and summary
  // are the sensible default rather than something an admin must retype.
  return {
    title: tl(product.seo.title, locale) || tl(product.name, locale),
    description: tl(product.seo.description, locale) || tl(product.summary, locale),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, customer] = await Promise.all([getRelatedProducts(product), getCustomer()]);

  const name = tl(product.name, locale);
  const form = tl(product.formLabel, locale);
  const requestPrice = product.pricingMode === "request";
  const outOfStock = product.stockState === "out";

  const views = product.images.map((image) => ({
    src: image.url,
    alt: tl(image.alt, locale) || name,
    photo: image.kind === "photo",
  }));

  return (
    <>
      <PageHead
        kicker={product.categoryName ? tl(product.categoryName, locale) : BRAND.name}
        title={name}
        sub={tl(product.summary, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(NAV[0].label, locale), href: localePath(locale, "/shop") },
          { label: name },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="pdp">
            {views.length ? <Gallery views={views} label={name} /> : <div />}

            <div className="stack" style={{ ["--stack" as string]: "clamp(1.75rem,3vw,2.5rem)" }}>
              <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                {form ? <span className="chip chip--brand">{form}</span> : null}
                {product.categoryName ? (
                  <span className="chip">{tl(product.categoryName, locale)}</span>
                ) : null}
                {product.price && product.price.source !== "none" ? (
                  <span className="chip chip--sale">
                    {product.price.percentOff}% {t(SHOP.off, locale)}
                  </span>
                ) : null}
              </div>

              <dl className="spec-grid">
                {form ? (
                  <div className="spec">
                    <dt>{t(UI.form, locale)}</dt>
                    <dd>{form}</dd>
                  </div>
                ) : null}
                {tl(product.safety.targetGroup, locale) ? (
                  <div className="spec">
                    <dt>{t(UI.targetGroup, locale)}</dt>
                    <dd>{tl(product.safety.targetGroup, locale)}</dd>
                  </div>
                ) : null}
                {product.shelfLifeMonths ? (
                  <div className="spec">
                    <dt>{t(UI.shelfLife, locale)}</dt>
                    <dd>
                      {product.shelfLifeMonths} {t(UI.months, locale)}
                    </dd>
                  </div>
                ) : null}
                <div className="spec">
                  <dt>{t(UI.netQuantity, locale)}</dt>
                  <dd>{tl(product.netQuantity, locale) || t(UI.pending, locale)}</dd>
                </div>
                <div className="spec">
                  <dt>{t(UI.batch, locale)}</dt>
                  <dd>{tl(product.batch, locale) || t(UI.pending, locale)}</dd>
                </div>
                {tl(product.storage, locale) ? (
                  <div className="spec">
                    <dt>{t(UI.storage, locale)}</dt>
                    <dd style={{ fontSize: ".8125rem" }}>{tl(product.storage, locale)}</dd>
                  </div>
                ) : null}
              </dl>

              {/* Three mutually exclusive buy states: ask for a price, tell me
                  when it is back, or the price itself. */}
              {requestPrice ? (
                <EnquiryForm
                  productId={product.id}
                  locale={locale}
                  defaultEmail={customer?.email}
                  defaultName={customer?.name || undefined}
                />
              ) : (
                <div className="buy-box">
                  <p className="eyebrow eyebrow--plain">{form || t(UI.form, locale)}</p>
                  <div style={{ marginTop: ".9rem" }}>
                    <Price price={product.price} locale={locale} size="lg" />
                  </div>
                  <div style={{ marginTop: ".8rem" }}>
                    <StockLine
                      state={product.stockState}
                      stock={product.stock}
                      locale={locale}
                      showInStock
                    />
                  </div>

                  {outOfStock ? (
                    <div style={{ marginTop: "1.4rem" }}>
                      <NotifyMeForm
                        productId={product.id}
                        locale={locale}
                        defaultEmail={customer?.email}
                      />
                    </div>
                  ) : (
                    <div style={{ marginTop: "1.4rem" }}>
                      <AddToCart
                        productId={product.id}
                        locale={locale}
                        maxQty={product.stockState === "untracked" ? null : product.stock}
                      />
                    </div>
                  )}
                </div>
              )}

              {tl(product.composition, locale) ? (
                <section>
                  <p className="eyebrow">01 — {t(SHOP.composition, locale)}</p>
                  <p className="body" style={{ marginTop: ".7rem" }}>
                    {tl(product.composition, locale)}
                  </p>
                </section>
              ) : null}

              <section>
                <p className="eyebrow">02 — {t(SHOP.chemistryEffects, locale)}</p>
                {tl(product.chemistryEffects, locale) ? (
                  <p className="body" style={{ marginTop: ".7rem" }}>
                    {tl(product.chemistryEffects, locale)}
                  </p>
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
                <p className="eyebrow">03 — {t(UI.directions, locale)}</p>
                {product.directions ? (
                  <>
                    <ol style={{ marginTop: "1rem" }}>
                      {product.directions.steps.map((step, index) => (
                        <li className="dose" key={index}>
                          <span className="dose__n">{String(index + 1).padStart(2, "0")}</span>
                          <div className="dose__d">
                            {tl(step.detail, locale)}
                            {step.measure ? <p className="dose__m">{step.measure}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <dl className="spec-grid" style={{ marginTop: "1.25rem" }}>
                      {tl(product.directions.frequency, locale) ? (
                        <div className="spec">
                          <dt>{t(UI.frequency, locale)}</dt>
                          <dd style={{ fontSize: ".875rem" }}>
                            {tl(product.directions.frequency, locale)}
                          </dd>
                        </div>
                      ) : null}
                      {tl(product.directions.maximum, locale) ? (
                        <div className="spec">
                          <dt>{t(UI.maximum, locale)}</dt>
                          <dd style={{ fontSize: ".875rem" }}>
                            {tl(product.directions.maximum, locale)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </>
                ) : (
                  /* Dosage is medical instruction. Where the business has not
                     confirmed it, the page says so rather than inventing one. */
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
                <p className="eyebrow">04 — {t(UI.safety, locale)}</p>
                <div className="panel panel--advisory" style={{ marginTop: "1rem" }}>
                  <p className="eyebrow eyebrow--plain">{t(UI.readBeforeBuying, locale)}</p>
                  <p className="body small" style={{ marginTop: ".8rem" }}>
                    {t(ADVISORY, locale)}
                  </p>
                </div>

                {product.safety.cautions.length ? (
                  <>
                    <h3 className="display d4" style={{ marginTop: "1.75rem" }}>
                      {t(UI.cautions, locale)}
                    </h3>
                    <ul style={{ marginTop: ".6rem" }}>
                      {product.safety.cautions.map((caution, index) => (
                        <li className="tick" key={index}>
                          <span className="tick__i">
                            <Icon name="check" size={17} />
                          </span>
                          <span>{tl(caution, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {product.safety.seekAdvice.length ? (
                  <>
                    <h3 className="display d4" style={{ marginTop: "1.5rem" }}>
                      {t(UI.seekAdvice, locale)}
                    </h3>
                    <ul style={{ marginTop: ".6rem" }}>
                      {product.safety.seekAdvice.map((item, index) => (
                        <li className="tick" key={index}>
                          <span className="tick__i">
                            <Icon name="check" size={17} />
                          </span>
                          <span>{tl(item, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>

              <Link className="link-arrow" href={localePath(locale, "/shop")}>
                <span>{t(UI.allFormulas, locale)}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="section bg-paper" style={{ borderBlockStart: "1px solid var(--color-line)" }}>
          <div className="shell shell--wide">
            <h2 className="display d3">{t(SHOP.relatedTitle, locale)}</h2>
            <div className="product-grid" style={{ marginTop: "clamp(1.5rem,3vw,2.5rem)" }}>
              {related.map((item, index) => (
                <ProductCard key={item.id} product={item} locale={locale} delay={index * 90} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
