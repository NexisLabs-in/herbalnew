import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { PageHead } from "@/components/Blocks";
import { AwaitingPayment } from "@/components/storefront/AwaitingPayment";
import { getCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import { formatFils, isLocale, localePath, t, tl, type Locale } from "@/lib/i18n";
import type { L } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COPY: Record<string, L> = {
  title: { en: "Thank you", ar: "شكراً لك" },
  kicker: { en: "Order confirmed", ar: "تم تأكيد الطلب" },
  body: {
    en: "We have your payment and are preparing your order. A confirmation is on its way to your email.",
    ar: "استلمنا دفعتك ونقوم بتجهيز طلبك. تم إرسال تأكيد إلى بريدك الإلكتروني.",
  },
  orderNumber: { en: "Order number", ar: "رقم الطلب" },
  total: { en: "Total paid", ar: "المبلغ المدفوع" },
  deliveringTo: { en: "Delivering to", ar: "التوصيل إلى" },
  viewOrder: { en: "Track this order", ar: "تتبع هذا الطلب" },
  invoice: { en: "View invoice", ar: "عرض الفاتورة" },
  keepShopping: { en: "Continue shopping", ar: "متابعة التسوق" },
  notFound: { en: "We could not find that order.", ar: "لم نتمكن من العثور على هذا الطلب." },
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

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string; session?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  await connectDb();
  const order = await Order.findOne({ orderNumber }).lean<OrderDoc | null>();
  if (!order) notFound();

  // An order belongs to the account that placed it. Order numbers are
  // sequential and therefore guessable, so this page checks rather than
  // assuming that whoever holds the link is the buyer.
  const customer = await getCustomer();
  if (!customer || String(order.customerId) !== String(customer._id)) notFound();

  // The redirect from Stripe proves nothing — the customer may arrive before
  // the webhook does, or never have paid at all. Until the webhook confirms it,
  // this page says "confirming" rather than "thank you".
  if (order.paymentStatus !== "paid") {
    return <AwaitingPayment orderNumber={order.orderNumber} locale={locale} />;
  }

  const address = order.shippingAddress;

  return (
    <>
      <PageHead
        kicker={t(COPY.kicker, locale)}
        title={t(COPY.title, locale)}
        sub={t(COPY.body, locale)}
        crumbs={[{ label: BRAND.name, href: localePath(locale) }, { label: t(COPY.kicker, locale) }]}
      />

      <section className="section--tight">
        <div className="shell shell--narrow">
          <div className="buy-box">
            <p className="eyebrow eyebrow--plain">{t(COPY.orderNumber, locale)}</p>
            <p className="display d3" style={{ marginTop: ".6rem" }} dir="ltr">
              {order.orderNumber}
            </p>

            <dl className="spec-grid" style={{ marginTop: "1.5rem" }}>
              <div className="spec">
                <dt>{t(COPY.total, locale)}</dt>
                <dd>{formatFils(order.grandTotalFils, locale)}</dd>
              </div>
              <div className="spec">
                <dt>{t(COPY.deliveringTo, locale)}</dt>
                <dd style={{ fontSize: ".8125rem" }}>
                  {address.fullName}
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.emirate}
                </dd>
              </div>
            </dl>

            <ul className="summary-lines" style={{ marginTop: "1.5rem" }}>
              {order.items.map((item, index) => (
                <li key={index}>
                  <span className="summary-lines__name">
                    {tl(item.name, locale)}
                    <span className="summary-lines__qty"> × {item.qty}</span>
                  </span>
                  <span className="summary-lines__total">
                    {formatFils(item.lineTotalFils, locale)}
                  </span>
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginTop: "1.75rem" }}>
              <Link
                className="btn btn--brand"
                href={localePath(locale, `/account/orders/${order.orderNumber}`)}
              >
                {t(COPY.viewOrder, locale)}
              </Link>
              <Link
                className="btn btn--ghost"
                href={localePath(locale, `/invoice/${order.orderNumber}`)}
              >
                {t(COPY.invoice, locale)}
              </Link>
            </div>
          </div>

          <p style={{ marginTop: "2rem" }}>
            <Link className="link-arrow" href={localePath(locale, "/shop")}>
              <span>{t(COPY.keepShopping, locale)}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
