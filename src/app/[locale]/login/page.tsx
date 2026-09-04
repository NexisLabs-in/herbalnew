import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BRAND } from "@/content/brand";
import { PageHead } from "@/components/Blocks";
import { LoginForm } from "@/components/storefront/LoginForm";
import { getCustomer } from "@/lib/auth/guards";
import { isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

const COPY: Record<string, L> = {
  title: { en: "Sign in", ar: "تسجيل الدخول" },
  kicker: { en: "Your account", ar: "حسابك" },
  sub: {
    en: "Sign in with your email address. We send a six-digit code — there is no password to create or remember.",
    ar: "سجّل الدخول ببريدك الإلكتروني. نرسل لك رمزاً من ستة أرقام — لا توجد كلمة مرور لإنشائها أو تذكرها.",
  },
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
    <>
      <PageHead
        kicker={t(COPY.kicker, locale)}
        title={t(COPY.title, locale)}
        sub={t(COPY.sub, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(COPY.title, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--narrow" style={{ maxWidth: "480px" }}>
          <LoginForm locale={locale} next={next} />
        </div>
      </section>
    </>
  );
}
