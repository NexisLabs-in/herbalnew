import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { ACCOUNT } from "@/content/account";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { ProfileForm } from "@/components/storefront/ProfileForm";
import { requireCustomer } from "@/lib/auth/guards";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(ACCOUNT.profile, locale), robots: { index: false } };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/profile"));

  return (
    <>
      <PageHead
        compact
        kicker={t(ACCOUNT.account, locale)}
        title={t(ACCOUNT.profile, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(ACCOUNT.account, locale), href: localePath(locale, "/account") },
          { label: t(ACCOUNT.profile, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />
            <div style={{ maxWidth: "480px" }}>
              <ProfileForm
                locale={locale}
                name={customer.name ?? ""}
                phone={customer.phone ?? ""}
                email={customer.email}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
