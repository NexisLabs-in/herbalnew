import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BRAND } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { CheckoutForm, type SavedAddress } from "@/components/storefront/CheckoutForm";
import { OrderSummary } from "@/components/storefront/OrderSummary";
import { requireCustomer } from "@/lib/auth/guards";
import { findCart, priceCartView } from "@/lib/cart";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(SHOP.checkout, locale), robots: { index: false } };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const { cancelled } = await searchParams;

  // The middleware already gates this route; the guard is what makes it true
  // rather than merely hidden.
  const customer = await requireCustomer(locale, localePath(locale, "/checkout"));
  const cart = await priceCartView(await findCart());

  // Nothing to pay for — send them back rather than showing an empty form.
  if (cart.totals.itemCount === 0) redirect(localePath(locale, "/cart"));

  const addresses: SavedAddress[] = customer.addresses.map((address) => ({
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
        compact
        kicker={BRAND.name}
        title={t(SHOP.checkout, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(SHOP.basketTitle, locale), href: localePath(locale, "/cart") },
          { label: t(SHOP.checkout, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="cart-layout">
            <CheckoutForm locale={locale} addresses={addresses} cancelled={Boolean(cancelled)} />
            <OrderSummary totals={cart.totals} lines={cart.lines} locale={locale} />
          </div>

          <p style={{ marginTop: "2rem" }}>
            <Link className="link-arrow" href={localePath(locale, "/cart")}>
              <span>{t(SHOP.basketTitle, locale)}</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
