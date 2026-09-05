import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { ACCOUNT } from "@/content/account";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { ProductCard } from "@/components/ProductCard";
import { requireCustomer } from "@/lib/auth/guards";
import { getProductsByIds } from "@/lib/catalogue";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(ACCOUNT.wishlist, locale), robots: { index: false } };
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/wishlist"));

  // A saved product can be unpublished later; those simply drop out rather than
  // showing a broken card.
  const products = await getProductsByIds(customer.wishlist.map((id) => String(id)));

  return (
    <>
      <PageHead
        kicker={t(ACCOUNT.account, locale)}
        title={t(ACCOUNT.wishlist, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(ACCOUNT.account, locale), href: localePath(locale, "/account") },
          { label: t(ACCOUNT.wishlist, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />

            <div>
              {products.length === 0 ? (
                <div className="empty-state">
                  <p className="display d4">{t(ACCOUNT.wishlistEmpty, locale)}</p>
                  <p className="body" style={{ marginTop: ".75rem" }}>
                    {t(ACCOUNT.wishlistHint, locale)}
                  </p>
                  <Link className="btn btn--brand" style={{ marginTop: "1.5rem" }} href={localePath(locale, "/shop")}>
                    {t(ACCOUNT.browse, locale)}
                  </Link>
                </div>
              ) : (
                <div className="product-grid">
                  {products.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      locale={locale}
                      delay={index * 90}
                      wishlist
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
