import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { ACCOUNT } from "@/content/account";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { AddressBook, type AddressEntry } from "@/components/storefront/AddressBook";
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
  return { title: t(ACCOUNT.addresses, locale), robots: { index: false } };
}

export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/addresses"));

  const addresses: AddressEntry[] = customer.addresses.map((address) => ({
    id: String(address._id),
    label: address.label ?? "",
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    emirate: address.emirate,
    isDefault: address.isDefault,
  }));

  return (
    <>
      <PageHead
        kicker={t(ACCOUNT.account, locale)}
        title={t(ACCOUNT.addresses, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(ACCOUNT.account, locale), href: localePath(locale, "/account") },
          { label: t(ACCOUNT.addresses, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />
            <div>
              <AddressBook locale={locale} addresses={addresses} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
