import "server-only";
import { env } from "../env";
import { formatFils, type Locale } from "../i18n";
import type { OrderDoc } from "../models/Order";
import type { SettingsDoc } from "../models/Settings";
import type { FulfillmentStatus } from "../models/enums";
import { button, emailShell, escapeHtml, h1, muted, p, rule } from "./layout";

/** Order emails, in the language the order was placed in.
 *
 *  Amounts are formatted with the same helper the storefront uses, so an email
 *  and the order page can never disagree about what something cost.
 */

const COPY = {
  confirmedSubject: {
    en: (n: string) => `Order ${n} confirmed`,
    ar: (n: string) => `تم تأكيد الطلب ${n}`,
  },
  confirmedTitle: { en: "Thank you — your order is confirmed", ar: "شكراً لك — تم تأكيد طلبك" },
  confirmedBody: {
    en: "We have your payment and are preparing your order. You will hear from us when it is on its way.",
    ar: "استلمنا دفعتك ونقوم بتجهيز طلبك. سنراسلك عند شحنه.",
  },
  viewOrder: { en: "View your order", ar: "عرض طلبك" },
  invoice: { en: "Invoice", ar: "الفاتورة" },
  deliveringTo: { en: "Delivering to", ar: "التوصيل إلى" },
  orderNumber: { en: "Order", ar: "رقم الطلب" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  discounts: { en: "Discounts", ar: "الخصومات" },
  coupon: { en: "Coupon", ar: "كوبون" },
  shipping: { en: "Shipping", ar: "الشحن" },
  free: { en: "Free", ar: "مجاني" },
  tax: { en: "VAT", ar: "ضريبة القيمة المضافة" },
  total: { en: "Total", ar: "الإجمالي" },
  questions: {
    en: "Reply to this email if anything is not right.",
    ar: "راسلنا على هذا البريد إذا كان هناك أي خطأ.",
  },
} as const;

const STATUS_COPY: Record<FulfillmentStatus, { en: string; ar: string }> = {
  new: { en: "received", ar: "تم الاستلام" },
  packed: { en: "packed and ready to leave us", ar: "تم تجهيزه وجاهز للشحن" },
  dispatched: { en: "on its way", ar: "في الطريق" },
  out_for_delivery: { en: "out for delivery today", ar: "خارج للتوصيل اليوم" },
  delivered: { en: "delivered", ar: "تم التوصيل" },
  cancelled: { en: "cancelled", ar: "أُلغي" },
  returned: { en: "returned", ar: "أُرجع" },
};

const site = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

function itemRows(order: OrderDoc, locale: Locale): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;vertical-align:top;">
          ${escapeHtml(locale === "ar" && item.name.ar ? item.name.ar : item.name.en)}
          <span style="color:#6b6482;"> × ${item.qty}</span>
        </td>
        <td style="padding:8px 0;text-align:${locale === "ar" ? "left" : "right"};white-space:nowrap;vertical-align:top;">
          ${escapeHtml(formatFils(item.lineTotalFils, locale) ?? "")}
        </td>
      </tr>`,
    )
    .join("");
}

function totalRow(label: string, value: string, bold = false): string {
  return `
    <tr>
      <td style="padding:4px 0;color:#6b6482;${bold ? "font-weight:600;color:#1a1330;" : ""}">${escapeHtml(label)}</td>
      <td style="padding:4px 0;text-align:right;white-space:nowrap;${bold ? "font-weight:600;" : ""}">${escapeHtml(value)}</td>
    </tr>`;
}

export function orderConfirmationEmail(order: OrderDoc, settings: SettingsDoc) {
  const locale = (order.locale ?? "en") as Locale;
  const align = locale === "ar" ? "right" : "left";
  const address = order.shippingAddress;

  const totals = [
    totalRow(COPY.subtotal[locale], formatFils(order.subtotalFils, locale) ?? ""),
    order.productDiscountFils > 0
      ? totalRow(COPY.discounts[locale], `−${formatFils(order.productDiscountFils, locale)}`)
      : "",
    order.couponDiscountFils > 0
      ? totalRow(`${COPY.coupon[locale]} ${order.couponCode ?? ""}`, `−${formatFils(order.couponDiscountFils, locale)}`)
      : "",
    totalRow(
      COPY.shipping[locale],
      order.shippingFils === 0 ? COPY.free[locale] : (formatFils(order.shippingFils, locale) ?? ""),
    ),
    order.taxFils > 0
      ? totalRow(`${COPY.tax[locale]} ${order.taxRate}%`, formatFils(order.taxFils, locale) ?? "")
      : "",
    totalRow(COPY.total[locale], formatFils(order.grandTotalFils, locale) ?? "", true),
  ].join("");

  const body = [
    h1(COPY.confirmedTitle[locale], align),
    p(COPY.confirmedBody[locale]),
    `<p style="margin:0 0 14px;font-family:ui-monospace,monospace;font-size:13px;color:#512BC7;">
       ${escapeHtml(COPY.orderNumber[locale])} ${escapeHtml(order.orderNumber)}</p>`,
    rule(),
    `<table role="presentation" width="100%" style="font-size:14px;">${itemRows(order, locale)}</table>`,
    rule(),
    `<table role="presentation" width="100%" style="font-size:14px;">${totals}</table>`,
    rule(),
    `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6482;">
       ${escapeHtml(COPY.deliveringTo[locale])}</p>
     <p style="margin:0 0 14px;font-size:14px;line-height:1.5;">
       ${escapeHtml(address.fullName)}<br>
       ${escapeHtml(address.line1)}${address.line2 ? `<br>${escapeHtml(address.line2)}` : ""}<br>
       ${escapeHtml(address.city)}, ${escapeHtml(address.emirate)}<br>
       ${escapeHtml(address.phone)}
     </p>`,
    button(COPY.viewOrder[locale], `${site()}/${locale}/account/orders/${order.orderNumber}`),
    muted(COPY.questions[locale]),
  ].join("");

  return {
    subject: COPY.confirmedSubject[locale](order.orderNumber),
    html: emailShell(body, {
      locale,
      preheader: `${COPY.orderNumber[locale]} ${order.orderNumber}`,
      storeName: settings.store.name,
      siteUrl: site(),
    }),
  };
}

/** Told to the customer when an admin moves the order along (C3). */
export function orderStatusEmail(order: OrderDoc, status: FulfillmentStatus, settings: SettingsDoc) {
  const locale = (order.locale ?? "en") as Locale;
  const align = locale === "ar" ? "right" : "left";
  const state = STATUS_COPY[status][locale];

  const tracking =
    order.tracking?.number && (status === "dispatched" || status === "out_for_delivery")
      ? p(
          locale === "ar"
            ? `شركة الشحن: ${order.tracking.courier || "—"} · رقم التتبع: ${order.tracking.number}`
            : `Courier: ${order.tracking.courier || "—"} · Tracking: ${order.tracking.number}`,
        )
      : "";

  const title =
    locale === "ar"
      ? `طلبك ${order.orderNumber} ${state}`
      : `Your order ${order.orderNumber} is ${state}`;

  return {
    subject: title,
    html: emailShell(
      [
        h1(title, align),
        tracking,
        button(COPY.viewOrder[locale], `${site()}/${locale}/account/orders/${order.orderNumber}`),
      ].join(""),
      { locale, preheader: title, storeName: settings.store.name, siteUrl: site() },
    ),
  };
}

/** Admin-facing, so English only — the panel is (plan §3). */
export function newOrderAdminEmail(order: OrderDoc) {
  const lines = order.items
    .map((item) => `${item.name.en} × ${item.qty}`)
    .join("<br>");

  return {
    subject: `New order ${order.orderNumber} — ${formatFils(order.grandTotalFils, "en")}`,
    html: emailShell(
      [
        h1(`New order ${order.orderNumber}`),
        p(`${order.shippingAddress.fullName} · ${order.email}`),
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;">${lines}</p>`,
        p(`Total: ${formatFils(order.grandTotalFils, "en")}`),
        button("Open in admin", `${site()}/admin/orders/${order._id}`),
      ].join(""),
      { locale: "en", preheader: `${order.orderNumber} · ${formatFils(order.grandTotalFils, "en")}`, siteUrl: site() },
    ),
  };
}

/** Requirement C12: the instant alert when an order takes stock to or below
 *  the threshold. Sent once per dip, re-armed when the product is restocked. */
export function lowStockAdminEmail(
  products: { name: string; sku: string; stock: number }[],
  threshold: number,
) {
  const rows = products
    .map((product) => `${escapeHtml(product.name)} (${escapeHtml(product.sku)}) — ${product.stock} left`)
    .join("<br>");

  return {
    subject:
      products.length === 1
        ? `Low stock: ${products[0].name} (${products[0].stock} left)`
        : `Low stock: ${products.length} products`,
    html: emailShell(
      [
        h1("Stock is running low"),
        p(`These are at or below your threshold of ${threshold}:`),
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;">${rows}</p>`,
        button("Open inventory", `${site()}/admin/inventory`),
        muted("You will not be emailed about the same product again until it is restocked above the threshold."),
      ].join(""),
      { locale: "en", preheader: "Stock is running low", siteUrl: site() },
    ),
  };
}
