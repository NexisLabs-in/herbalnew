import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/storefront/LoginForm";
import { getCustomer } from "@/lib/auth/guards";
import { isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

const COPY: Record<string, L> = {
  title: { en: "Sign in", ar: "تسجيل الدخول" },
  kicker: { en: "Your account", ar: "حسابك" },
  sub: {
    en: "Enter your email and we will send a six-digit code. No password to create or remember.",
    ar: "أدخل بريدك الإلكتروني وسنرسل لك رمزاً من ستة أرقام. لا كلمة مرور لإنشائها أو تذكرها.",
  },
  reassure: {
    en: "We never store a password, so there is none to lose.",
    ar: "لا نخزّن أي كلمة مرور، فلا شيء يمكن فقدانه.",
  },
  back: { en: "Back to the cabinet", ar: "العودة إلى الخزانة" },
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

/** Reads the session cookie to bounce anyone already signed in, so it must be
 *  rendered per request rather than prerendered at build time. */
export const dynamic = "force-dynamic";

/** Signing in.
 *
 *  Deliberately not built on `PageHead` like the shop and content pages. That
 *  component opens with a breadcrumb and a display-size heading, which is right
 *  for a page somebody browses and wrong for one with a single field on it — it
 *  left a wall of empty space above a small card and made the form look like an
 *  afterthought.
 *
 *  Here the heading is part of the card, sized to sit with it, and the whole
 *  thing is centred in the viewport. One column, one action, nothing else
 *  competing for attention.
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const { next } = await searchParams;

  // Already signed in: go where they were headed rather than showing a login
  // form to someone who is logged in.
  const customer = await getCustomer();
  if (customer) {
    redirect(next?.startsWith("/") && !next.startsWith("//") ? next : localePath(locale, "/account"));
  }

  return (
    <section className="auth-page">
      <div className="auth-page__botanical" aria-hidden="true">
        <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
            <path d="M300 560V180" />
            <path d="M300 400c-96 0-148-52-148-142 90 0 148 52 148 142zM300 400c96 0 148-52 148-142-90 0-148 52-148 142z" />
            <path d="M300 268c-70 0-108-38-108-104 66 0 108 38 108 104zM300 268c70 0 108-38 108-104-66 0-108 38-108 104z" />
          </g>
        </svg>
      </div>

      <div className="auth-page__inner">
        <div className="auth-card auth-card--lead">
          <p className="eyebrow">{t(COPY.kicker, locale)}</p>
          <h1 className="display d2 auth-card__title">{t(COPY.title, locale)}</h1>
          <p className="auth-card__sub">{t(COPY.sub, locale)}</p>

          <LoginForm locale={locale} next={next} />
        </div>

        <p className="auth-page__foot">
          {t(COPY.reassure, locale)}
          <span aria-hidden="true"> · </span>
          <Link href={localePath(locale, "/shop")}>{t(COPY.back, locale)}</Link>
        </p>
      </div>
    </section>
  );
}
