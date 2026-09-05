import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { CartSummary } from "@/components/storefront/CartSummary";
import { CartTable } from "@/components/storefront/CartTable";
import { findCart, priceCartView } from "@/lib/cart";
import { isLocale, localePath, t, tl, type Locale } from "@/lib/i18n";

/** Per-visitor and priced live, so never cached. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(SHOP.basketTitle, locale), robots: { index: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const cart = await priceCartView(await findCart());
  const empty = cart.lines.length === 0;

  // Checkout is blocked while anything in the basket cannot actually be bought.
  const blocked = cart.lines.some((line) => line.unavailableReason !== null);

  const productNames = Object.fromEntries(
    cart.lines.map((line) => [line.productId, tl(line.name, locale)]),
  );

  return (
    <>
      <PageHead
        kicker={BRAND.name}
        title={t(SHOP.basketTitle, locale)}
        sub={
          empty
            ? undefined
            : `${cart.totals.itemCount} ${
                cart.totals.itemCount === 1 ? t(SHOP.item, locale) : t(SHOP.items, locale)
              }`
        }
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(SHOP.basketTitle, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          {empty ? (
            <div className="empty-state">
              <p className="display d4">{t(SHOP.basketEmpty, locale)}</p>
              <p className="body" style={{ marginTop: ".75rem" }}>
                {t(SHOP.basketEmptyHint, locale)}
              </p>
              <Link className="btn btn--brand" style={{ marginTop: "1.5rem" }} href={localePath(locale, "/shop")}>
                {t(SHOP.showAll, locale)}
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <CartTable lines={cart.lines} locale={locale} blocked={cart.problems} />
              <CartSummary
                totals={cart.totals}
                couponCode={cart.couponCode}
                locale={locale}
                blocked={blocked}
                productNames={productNames}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
