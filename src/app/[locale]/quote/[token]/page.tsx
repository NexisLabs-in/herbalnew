import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { PageHead } from "@/components/Blocks";
import { QuoteCheckout } from "@/components/storefront/QuoteCheckout";
import { getCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { PriceEnquiry } from "@/lib/models/PriceEnquiry";
import { Product } from "@/lib/models/Product";
import { getSettings } from "@/lib/settings";
import { formatFils, isLocale, localePath, t, tl, type L, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COPY: Record<string, L> = {
  title: { en: "Your quote", ar: "عرض السعر" },
  kicker: { en: "Price on request", ar: "السعر عند الطلب" },
  each: { en: "each", ar: "للوحدة" },
  quantity: { en: "Quantity", ar: "الكمية" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  validUntil: { en: "Valid until", ar: "صالح حتى" },
  expiredTitle: { en: "This quote has expired", ar: "انتهت صلاحية عرض السعر" },
  expiredBody: {
    en: "Prices change, so quotes do not last forever. Ask us again and we will send a fresh one.",
    ar: "تتغير الأسعار، لذا لا تدوم عروض الأسعار. اطلب منا مرة أخرى وسنرسل عرضاً جديداً.",
  },
  usedTitle: { en: "This quote has been used", ar: "تم استخدام عرض السعر" },
  usedBody: {
    en: "An order has already been placed from this quote.",
    ar: "تم بالفعل تقديم طلب من عرض السعر هذا.",
  },
  goneTitle: { en: "This link is not valid", ar: "هذا الرابط غير صالح" },
  goneBody: {
    en: "It may have expired or been replaced by a newer quote. Please contact us.",
    ar: "قد تكون صلاحيته انتهت أو استُبدل بعرض أحدث. يرجى التواصل معنا.",
  },
  shopLink: { en: "Back to the cabinet", ar: "العودة إلى الخزانة" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(COPY.title, locale), robots: { index: false } };
}

export default async function QuotePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: raw, token } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await connectDb();
  const enquiry = await PriceEnquiry.findOne({ quoteToken: token }).lean();

  // A spent, replaced or closed token clears the field, so an unknown token and
  // a used one look the same here. The message covers both rather than telling
  // a stranger which it was.
  if (!enquiry || enquiry.quotedUnitPriceFils === null) {
    return (
      <QuoteNotice title={t(COPY.goneTitle, locale)} body={t(COPY.goneBody, locale)} locale={locale} />
    );
  }

  if (enquiry.status === "accepted") {
    return (
      <QuoteNotice title={t(COPY.usedTitle, locale)} body={t(COPY.usedBody, locale)} locale={locale} />
    );
  }

  if (enquiry.quoteExpiresAt && new Date(enquiry.quoteExpiresAt).getTime() < Date.now()) {
    return (
      <QuoteNotice
        title={t(COPY.expiredTitle, locale)}
        body={t(COPY.expiredBody, locale)}
        locale={locale}
      />
    );
  }

  const [product, settings, customer] = await Promise.all([
    Product.findById(enquiry.productId).lean(),
    getSettings(),
    getCustomer(),
  ]);
  if (!product) {
    return (
      <QuoteNotice title={t(COPY.goneTitle, locale)} body={t(COPY.goneBody, locale)} locale={locale} />
    );
  }

  const lineTotal = enquiry.quotedUnitPriceFils * enquiry.qty;

  return (
    <>
      <PageHead
        kicker={t(COPY.kicker, locale)}
        title={t(COPY.title, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(COPY.title, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="cart-layout">
            <QuoteCheckout
              token={token}
              locale={locale}
              signedIn={Boolean(customer)}
              defaultAddress={
                customer?.addresses.find((address) => address.isDefault) ?? customer?.addresses[0]
                  ? {
                      fullName:
                        (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0])
                          .fullName,
                      phone:
                        (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0]).phone,
                      line1:
                        (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0]).line1,
                      line2:
                        (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0])
                          .line2 ?? "",
                      city: (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0]).city,
                      emirate:
                        (customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0])
                          .emirate,
                    }
                  : undefined
              }
            />

            <aside className="cart-summary">
              <h2 className="display d4">{tl(product.name, locale)}</h2>

              <dl className="cart-totals">
                <div>
                  <dt>{t(COPY.each, locale)}</dt>
                  <dd>{formatFils(enquiry.quotedUnitPriceFils, locale)}</dd>
                </div>
                <div>
                  <dt>{t(COPY.quantity, locale)}</dt>
                  <dd>{enquiry.qty}</dd>
                </div>
                <div className="cart-totals__grand">
                  <dt>{t(COPY.subtotal, locale)}</dt>
                  <dd>{formatFils(lineTotal, locale)}</dd>
                </div>
              </dl>

              <p className="cart-note">
                {locale === "ar"
                  ? "تُضاف رسوم الشحن والضريبة عند إتمام الشراء."
                  : "Shipping and tax are added at checkout."}
              </p>

              {enquiry.quoteExpiresAt ? (
                <p className="cart-nudge">
                  {t(COPY.validUntil, locale)}{" "}
                  {new Date(enquiry.quoteExpiresAt).toLocaleDateString(
                    locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </p>
              ) : null}

              {enquiry.adminNote ? (
                <p className="body small" style={{ whiteSpace: "pre-line" }}>
                  {enquiry.adminNote}
                </p>
              ) : null}

              <p className="visually-hidden">{settings.store.name}</p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

function QuoteNotice({ title, body, locale }: { title: string; body: string; locale: Locale }) {
  return (
    <section className="section">
      <div className="shell shell--narrow center">
        <div className="buy-box">
          <h1 className="display d3">{title}</h1>
          <p className="body" style={{ marginTop: "1rem" }}>
            {body}
          </p>
          <a className="btn btn--brand" style={{ marginTop: "1.5rem" }} href={localePath(locale, "/shop")}>
            {t(COPY.shopLink, locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
