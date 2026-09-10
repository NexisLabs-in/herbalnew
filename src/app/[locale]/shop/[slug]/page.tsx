import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADVISORY, BRAND, NAV, UI } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { Gallery } from "@/components/Gallery";
import { Icon } from "@/components/Icon";
import { Price } from "@/components/Price";
import { StockLine } from "@/components/StockLine";
import { AddToCart } from "@/components/storefront/AddToCart";
import { EnquiryForm } from "@/components/storefront/EnquiryForm";
import { NotifyMeForm } from "@/components/storefront/NotifyMeForm";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { ReviewForm } from "@/components/storefront/ReviewForm";
import { ReviewList } from "@/components/storefront/ReviewList";
import { REVIEWS } from "@/content/reviews";
import { getProductReviews, getReviewSummary, reviewableOrdersFor } from "@/lib/reviews";
import { getCustomer } from "@/lib/auth/guards";
import { RecommendedProducts } from "@/components/storefront/RecommendedProducts";
import { getProductBySlug, getPublishedSlugs, getRecommendedProducts } from "@/lib/catalogue";
import { isLocale, locales, localePath, t, tl, type Locale } from "@/lib/i18n";

export const revalidate = 300;

/** Prerenders the published catalogue at build time; anything published later
 *  is rendered on first request and then cached (`dynamicParams` defaults on).
 *  An empty list (database unreachable during build) is fine — pages still
 *  work on demand. */
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

  const [recommended, customer, reviews, summary] = await Promise.all([
    getRecommendedProducts(product),
    getCustomer(),
    getProductReviews(product.id),
    getReviewSummary(product.id),
  ]);

  // The form is only rendered for somebody who can actually write a review —
  // a verified buyer with a delivered order (C2) — rather than shown to
  // everyone and refused on submit.
  const canReview = customer
    ? (await reviewableOrdersFor(customer._id, product.id)).length > 0
    : false;

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
        compact
        className="page-head--product"
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
            {views.length ? (
              <Gallery
                views={views}
                label={name}
                action={
                  <WishlistButton
                    productId={product.id}
                    locale={locale}
                    returnTo={localePath(locale, `/shop/${product.slug}`)}
                  />
                }
              />
            ) : (
              <div />
            )}

            <div className="stack" style={{ ["--stack" as string]: "clamp(1.75rem,3vw,2.5rem)" }}>
              <div className="pdp__chips" style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
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
                {form ? (
                  <div className="spec">
                    <dt>{t(UI.form, locale)}</dt>
                    <dd>{form}</dd>
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
                  minQty={product.minOrderQty}
                  maxQty={product.maxOrderQty}
                  defaultEmail={customer?.email}
                  defaultName={customer?.name || undefined}
                />
              ) : (
                <div className="buy-box">
                  <div className="buy-box__price">
                    <Price price={product.price} locale={locale} size="lg" />
                  </div>
                  <div className="buy-box__stock">
                    <StockLine
                      state={product.stockState}
                      stock={product.stock}
                      locale={locale}
                      showInStock
                    />
                  </div>

                  {outOfStock ? (
                    <div className="buy-box__action">
                      <NotifyMeForm
                        productId={product.id}
                        locale={locale}
                        defaultEmail={customer?.email}
                      />
                    </div>
                  ) : (
                    <div className="buy-box__action">
                      <AddToCart
                        productId={product.id}
                        locale={locale}
                        minQty={product.minOrderQty}
                        maxQty={
                          product.stockState === "untracked"
                            ? product.maxOrderQty
                            : Math.min(product.stock, product.maxOrderQty ?? product.stock)
                        }
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
                <div className="advisory" style={{ marginTop: "1rem" }}>
                  <p className="advisory__label">{t(UI.readBeforeBuying, locale)}</p>
                  <p className="advisory__text">{t(ADVISORY, locale)}</p>
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

      <section className="section" id="reviews">
        <div className="shell shell--wide">
          <h2 className="display d3" style={{ marginBottom: "clamp(1.5rem,3vw,2.5rem)" }}>
            {t(REVIEWS.heading, locale)}
          </h2>

          <div className="reviews-layout">
            <ReviewList reviews={reviews} summary={summary} locale={locale} />
            {canReview ? <ReviewForm productId={product.id} locale={locale} /> : null}
          </div>
        </div>
      </section>

      <RecommendedProducts
        initial={recommended.products}
        total={recommended.total}
        categoryId={product.categoryId}
        excludeId={product.id}
        locale={locale}
      />
    </>
  );
}
