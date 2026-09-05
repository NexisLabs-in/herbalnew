import "server-only";
import { env } from "../env";
import type { Locale, TL } from "../i18n";
import { button, emailShell, escapeHtml, h1, muted, p } from "./layout";

/** Reminder emails sent by the scheduled jobs. */

const site = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

const COPY = {
  cartSubject: { en: "You left something in your basket", ar: "تركت شيئاً في سلتك" },
  cartTitle: { en: "Your basket is waiting", ar: "سلتك في انتظارك" },
  cartBody: {
    en: "We kept it for you. Nothing is reserved, so anything low in stock may not wait.",
    ar: "احتفظنا بها لك. لا شيء محجوز، وقد لا تنتظر المنتجات محدودة الكمية.",
  },
  cartCta: { en: "Go to your basket", ar: "اذهب إلى سلتك" },
  cartOnce: {
    en: "We only send this once.",
    ar: "نرسل هذه الرسالة مرة واحدة فقط.",
  },
  stockSubject: { en: (n: string) => `${n} is back in stock`, ar: (n: string) => `${n} متوفر مجدداً` },
  stockTitle: { en: "It is back", ar: "عاد للتوفر" },
  stockBody: {
    en: "You asked to hear when this came back in. Here it is — while it lasts.",
    ar: "طلبت أن نخبرك عند توفره. ها هو، ما دام متوفراً.",
  },
  stockCta: { en: "View the formula", ar: "عرض التركيبة" },
} as const;

export function abandonedCartEmail(input: { locale: Locale; storeName: string; items: TL[] }) {
  const { locale } = input;
  const align = locale === "ar" ? "right" : "left";

  const list = input.items
    .map((item) => `<li>${escapeHtml((locale === "ar" && item.ar) || item.en)}</li>`)
    .join("");

  return {
    subject: COPY.cartSubject[locale],
    html: emailShell(
      [
        h1(COPY.cartTitle[locale], align),
        p(COPY.cartBody[locale]),
        `<ul style="margin:0 0 14px;padding-inline-start:20px;font-size:14px;line-height:1.7;">${list}</ul>`,
        button(COPY.cartCta[locale], `${site()}/${locale}/cart`),
        muted(COPY.cartOnce[locale]),
      ].join(""),
      { locale, preheader: COPY.cartTitle[locale], storeName: input.storeName, siteUrl: site() },
    ),
  };
}

export function backInStockEmail(input: {
  locale: Locale;
  storeName: string;
  name: TL;
  slug: string;
}) {
  const { locale } = input;
  const align = locale === "ar" ? "right" : "left";
  const name = (locale === "ar" && input.name.ar) || input.name.en;

  return {
    subject: COPY.stockSubject[locale](name),
    html: emailShell(
      [
        h1(COPY.stockTitle[locale], align),
        `<p style="margin:0 0 14px;font-size:20px;font-weight:600;">${escapeHtml(name)}</p>`,
        p(COPY.stockBody[locale]),
        button(COPY.stockCta[locale], `${site()}/${locale}/shop/${input.slug}`),
      ].join(""),
      { locale, preheader: COPY.stockTitle[locale], storeName: input.storeName, siteUrl: site() },
    ),
  };
}
