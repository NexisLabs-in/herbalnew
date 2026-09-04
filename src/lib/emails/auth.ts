import "server-only";
import { env } from "../env";
import type { Locale } from "../i18n";
import { codeBlock, emailShell, h1, muted, p } from "./layout";

/** Login and password-reset emails, in both languages.
 *
 *  The Arabic here is written to be read by a customer, not machine-translated
 *  at send time — the store is bilingual and an English-only login code on the
 *  Arabic site would be the first thing that breaks the illusion.
 */

const COPY = {
  loginSubject: {
    en: (code: string) => `${code} is your Herbedia sign-in code`,
    ar: (code: string) => `${code} رمز الدخول إلى هيربيديا`,
  },
  loginTitle: { en: "Your sign-in code", ar: "رمز الدخول الخاص بك" },
  loginBody: {
    en: "Enter this code to sign in. It expires in 10 minutes.",
    ar: "أدخل هذا الرمز لتسجيل الدخول. تنتهي صلاحيته خلال ١٠ دقائق.",
  },
  ignore: {
    en: "If you did not ask to sign in, you can ignore this email — nobody can use the code without your inbox.",
    ar: "إذا لم تطلب تسجيل الدخول، تجاهل هذه الرسالة — لا يمكن لأحد استخدام الرمز دون الوصول إلى بريدك.",
  },
  resetSubject: { en: "Reset your Herbedia admin password", ar: "إعادة تعيين كلمة مرور الإدارة" },
  resetTitle: { en: "Reset your password", ar: "إعادة تعيين كلمة المرور" },
  resetBody: {
    en: "Enter this code in the admin panel to set a new password. It expires in 10 minutes.",
    ar: "أدخل هذا الرمز في لوحة الإدارة لتعيين كلمة مرور جديدة. تنتهي صلاحيته خلال ١٠ دقائق.",
  },
  resetIgnore: {
    en: "If you did not request this, ignore this email and your password stays as it is.",
    ar: "إذا لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة المرور كما هي.",
  },
} as const;

export function loginCodeEmail(code: string, locale: Locale) {
  const align = locale === "ar" ? "right" : "left";
  return {
    subject: COPY.loginSubject[locale](code),
    html: emailShell(
      [
        h1(COPY.loginTitle[locale], align),
        p(COPY.loginBody[locale]),
        codeBlock(code),
        muted(COPY.ignore[locale]),
      ].join(""),
      { locale, preheader: COPY.loginBody[locale], siteUrl: env.NEXT_PUBLIC_SITE_URL },
    ),
  };
}

export function adminResetCodeEmail(code: string) {
  // Admin-facing mail is English only — the admin panel itself is (plan §3).
  const locale: Locale = "en";
  return {
    subject: COPY.resetSubject.en,
    html: emailShell(
      [
        h1(COPY.resetTitle.en),
        p(COPY.resetBody.en),
        codeBlock(code),
        muted(COPY.resetIgnore.en),
      ].join(""),
      { locale, preheader: COPY.resetBody.en, siteUrl: env.NEXT_PUBLIC_SITE_URL },
    ),
  };
}
