import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdmin, getCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import { getSettings } from "@/lib/settings";
import { formatFils, isLocale, t, tl, type L, type Locale } from "@/lib/i18n";
import "./invoice.css";

export const dynamic = "force-dynamic";

/** A printable invoice.
 *
 *  HTML rather than a generated PDF. Every JavaScript PDF library renders
 *  Arabic as disconnected letters — the script needs contextual shaping that
 *  none of them do — and the alternative, headless Chrome, means ~300MB of
 *  Chromium on the server for one document. The browser already has a perfect
 *  Arabic text engine and a "Save as PDF" button, so this page is styled for
 *  print and gets out of the way.
 */

const COPY: Record<string, L> = {
  invoice: { en: "Invoice", ar: "فاتورة" },
  invoiceNumber: { en: "Invoice number", ar: "رقم الفاتورة" },
  orderNumber: { en: "Order number", ar: "رقم الطلب" },
  date: { en: "Date", ar: "التاريخ" },
  billedTo: { en: "Billed to", ar: "فاتورة إلى" },
  from: { en: "From", ar: "من" },
  item: { en: "Item", ar: "الصنف" },
  qty: { en: "Qty", ar: "الكمية" },
  unit: { en: "Unit price", ar: "سعر الوحدة" },
  amount: { en: "Amount", ar: "المبلغ" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  discounts: { en: "Discounts", ar: "الخصومات" },
  coupon: { en: "Coupon", ar: "كوبون" },
  shipping: { en: "Shipping", ar: "الشحن" },
  free: { en: "Free", ar: "مجاني" },
  tax: { en: "VAT", ar: "ضريبة القيمة المضافة" },
  total: { en: "Total", ar: "الإجمالي" },
  paid: { en: "Paid", ar: "مدفوعة" },
  unpaid: { en: "Unpaid", ar: "غير مدفوعة" },
  trn: { en: "TRN", ar: "الرقم الضريبي" },
  print: { en: "Print or save as PDF", ar: "اطبع أو احفظ كملف PDF" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${t(COPY.invoice, locale)} ${orderNumber}`, robots: { index: false } };
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale: raw, orderNumber } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  await connectDb();
  const [order, settings] = await Promise.all([
    Order.findOne({ orderNumber }).lean<OrderDoc | null>(),
    getSettings(),
  ]);
  if (!order) notFound();

  // The buyer, or any admin who can see orders. Order numbers are sequential
  // and guessable, so possession of the URL is not authorisation.
  const [customer, admin] = await Promise.all([getCustomer(), getAdmin()]);
  const isBuyer = customer && String(order.customerId) === String(customer._id);
  if (!isBuyer && !admin) notFound();

  const address = order.shippingAddress;
  const store = settings.store;

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: t(COPY.subtotal, locale), value: formatFils(order.subtotalFils, locale) ?? "" },
    ...(order.productDiscountFils > 0
      ? [{ label: t(COPY.discounts, locale), value: `−${formatFils(order.productDiscountFils, locale)}` }]
      : []),
    ...(order.couponDiscountFils > 0
      ? [
          {
            label: `${t(COPY.coupon, locale)} ${order.couponCode ?? ""}`.trim(),
            value: `−${formatFils(order.couponDiscountFils, locale)}`,
          },
        ]
      : []),
    {
      label: t(COPY.shipping, locale),
      value:
        order.shippingFils === 0
          ? t(COPY.free, locale)
          : (formatFils(order.shippingFils, locale) ?? ""),
    },
    ...(order.taxFils > 0
      ? [
          {
            label: `${t(COPY.tax, locale)} ${order.taxRate}%`,
            value: formatFils(order.taxFils, locale) ?? "",
          },
        ]
      : []),
    { label: t(COPY.total, locale), value: formatFils(order.grandTotalFils, locale) ?? "", strong: true },
  ];

  return (
    <main className="invoice" dir={locale === "ar" ? "rtl" : "ltr"}>
      <button className="invoice__print btn btn--ghost btn--sm" type="button" data-print>
        {t(COPY.print, locale)}
      </button>

      <header className="invoice__head">
        <div>
          <p className="invoice__brand">{store.name}</p>
          {tl(store.address, locale) ? <p className="invoice__meta">{tl(store.address, locale)}</p> : null}
          {store.contactEmail ? <p className="invoice__meta">{store.contactEmail}</p> : null}
          {store.contactPhone ? <p className="invoice__meta" dir="ltr">{store.contactPhone}</p> : null}
          {settings.invoice.trn ? (
            <p className="invoice__meta">
              {t(COPY.trn, locale)}: {settings.invoice.trn}
            </p>
          ) : null}
        </div>

        <div className="invoice__ident">
          <h1>{t(COPY.invoice, locale)}</h1>
          {order.invoiceNumber ? (
            <p>
              <span>{t(COPY.invoiceNumber, locale)}</span> <strong dir="ltr">{order.invoiceNumber}</strong>
            </p>
          ) : null}
          <p>
            <span>{t(COPY.orderNumber, locale)}</span> <strong dir="ltr">{order.orderNumber}</strong>
          </p>
          <p>
            <span>{t(COPY.date, locale)}</span>{" "}
            <strong dir="ltr">
              {new Date(order.paidAt ?? order.createdAt).toLocaleDateString(
                locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                { year: "numeric", month: "short", day: "numeric" },
              )}
            </strong>
          </p>
          <p className={`invoice__status invoice__status--${order.paymentStatus}`}>
            {order.paymentStatus === "paid" ? t(COPY.paid, locale) : t(COPY.unpaid, locale)}
          </p>
        </div>
      </header>

      <section className="invoice__party">
        <p className="invoice__label">{t(COPY.billedTo, locale)}</p>
        <p>
          {address.fullName}
          <br />
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}
          <br />
          {address.city}, {address.emirate}
          <br />
          <span dir="ltr">{address.phone}</span>
          <br />
          <span dir="ltr">{order.email}</span>
        </p>
      </section>

      <table className="invoice__table">
        <thead>
          <tr>
            <th>{t(COPY.item, locale)}</th>
            <th className="num">{t(COPY.qty, locale)}</th>
            <th className="num">{t(COPY.unit, locale)}</th>
            <th className="num">{t(COPY.amount, locale)}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td>
                {tl(item.name, locale)}
                {item.sku ? <span className="invoice__sku"> · {item.sku}</span> : null}
              </td>
              <td className="num">{item.qty}</td>
              <td className="num">
                {formatFils(item.unitPriceFils - item.discountFils, locale)}
              </td>
              <td className="num">{formatFils(item.lineTotalFils, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="invoice__totals">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.strong ? "is-total" : undefined}>
              <th>{row.label}</th>
              <td className="num">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {tl(settings.invoice.legalLines, locale) ? (
        <footer className="invoice__legal">{tl(settings.invoice.legalLines, locale)}</footer>
      ) : null}

      {/* One line of script rather than a client component: the page is
          otherwise entirely static, and printing is the only interaction. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.querySelector('[data-print]')?.addEventListener('click',()=>window.print())",
        }}
      />
    </main>
  );
}
