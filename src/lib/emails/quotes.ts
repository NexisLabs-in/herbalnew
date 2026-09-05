import "server-only";
import { env } from "../env";
import { formatFils, type Locale, type TL } from "../i18n";
import type { PriceEnquiryDoc } from "../models/PriceEnquiry";
import { button, emailShell, h1, muted, p } from "./layout";

/** The quote email (requirement C1).
 *
 *  Sent in the language the enquiry was made in, and carrying the only link
 *  that can pay it.
 */
const COPY = {
  subject: { en: (n: string) => `Your price for ${n}`, ar: (n: string) => `سعرك لـ ${n}` },
  title: { en: "Here is your price", ar: "إليك السعر" },
  body: {
    en: "Thank you for asking. This price is held for you until the date below.",
    ar: "شكراً لسؤالك. هذا السعر محجوز لك حتى التاريخ أدناه.",
  },
  each: { en: "each", ar: "للوحدة" },
  quantity: { en: "Quantity", ar: "الكمية" },
  validUntil: { en: "Valid until", ar: "صالح حتى" },
  pay: { en: "Accept and pay", ar: "القبول والدفع" },
  note: {
    en: "Shipping and tax are added at checkout.",
    ar: "تُضاف رسوم الشحن والضريبة عند إتمام الشراء.",
  },
} as const;

export function quoteEmail(input: {
  enquiry: PriceEnquiryDoc & { quoteToken?: string | null };
  productName: TL;
  storeName: string;
}) {
  const locale = (input.enquiry.locale ?? "en") as Locale;
  const align = locale === "ar" ? "right" : "left";
  const name = (locale === "ar" && input.productName.ar) || input.productName.en;
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const link = `${site}/${locale}/quote/${input.enquiry.quoteToken}`;

  const expires = input.enquiry.quoteExpiresAt
    ? new Date(input.enquiry.quoteExpiresAt).toLocaleDateString(
        locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : "";

  return {
    subject: COPY.subject[locale](name),
    html: emailShell(
      [
        h1(COPY.title[locale], align),
        p(COPY.body[locale]),
        `<p style="margin:0 0 8px;font-size:20px;font-weight:600;">${name}</p>
         <p style="margin:0 0 4px;font-size:22px;color:#512BC7;font-weight:600;">
           ${formatFils(input.enquiry.quotedUnitPriceFils ?? 0, locale)} ${COPY.each[locale]}</p>
         <p style="margin:0 0 14px;font-size:14px;color:#6b6482;">
           ${COPY.quantity[locale]}: ${input.enquiry.qty}${expires ? ` · ${COPY.validUntil[locale]} ${expires}` : ""}</p>`,
        input.enquiry.adminNote ? p(input.enquiry.adminNote) : "",
        button(COPY.pay[locale], link),
        muted(COPY.note[locale]),
      ].join(""),
      { locale, preheader: COPY.title[locale], storeName: input.storeName, siteUrl: site },
    ),
  };
}
