import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { PageHead } from "@/components/Blocks";
import { LogoutButton } from "@/components/storefront/LogoutButton";
import { requireCustomer } from "@/lib/auth/guards";
import { isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

/** Customer dashboard.
 *
 *  A placeholder shape for now: Phase 7 fills in orders, addresses, profile and
 *  the wishlist. What it already proves is the whole auth path — the middleware
 *  gate, the session cookie and the guard all have to work for this to render.
 */

const COPY: Record<string, L> = {
  kicker: { en: "Your account", ar: "حسابك" },
  title: { en: "Dashboard", ar: "لوحة الحساب" },
  signedInAs: { en: "Signed in as", ar: "تم تسجيل الدخول باسم" },
  incomplete: {
    en: "Your profile is empty. You can add your name and delivery address here, or when you place your first order.",
    ar: "ملفك الشخصي فارغ. يمكنك إضافة اسمك وعنوان التوصيل هنا، أو عند إتمام أول طلب.",
  },
  soon: {
    en: "Orders, addresses and your wishlist appear here.",
    ar: "ستظهر هنا الطلبات والعناوين وقائمة رغباتك.",
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

/** Per-customer content — never prerender or cache it. Without this the parent
 *  layout's `generateStaticParams` prerenders /en/account and /ar/account at
 *  build time and every signed-in customer is served the same baked page. */
export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account"));
  const profileEmpty = !customer.name && customer.addresses.length === 0;

  return (
    <>
      <PageHead
        kicker={t(COPY.kicker, locale)}
        title={customer.name || t(COPY.title, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(COPY.title, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="panel" style={{ maxWidth: "56ch" }}>
            <p className="eyebrow eyebrow--plain">{t(COPY.signedInAs, locale)}</p>
            <p className="display d4" style={{ marginTop: ".7rem" }} dir="ltr">
              {customer.email}
            </p>
            <p className="body small" style={{ marginTop: "1rem" }}>
              {profileEmpty ? t(COPY.incomplete, locale) : t(COPY.soon, locale)}
            </p>
            <div style={{ marginTop: "1.6rem" }}>
              <LogoutButton locale={locale} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
