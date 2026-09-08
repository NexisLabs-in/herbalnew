import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { ACCOUNT } from "@/content/account";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { ProductCard } from "@/components/ProductCard";
import { requireCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { getProductsByIds } from "@/lib/catalogue";
import { Product } from "@/lib/models/Product";
import { isLocale, localePath, t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** A page of saved items, not the whole list. Same size as the orders list. */
const PER_PAGE = 10;

function pageNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(ACCOUNT.wishlist, locale), robots: { index: false } };
}

export default async function WishlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/wishlist"));
  const { page: requested } = await searchParams;

  const saved = customer.wishlist.map((id) => String(id));
  await connectDb();
  // A saved product can be unpublished later; those drop out before paging so
  // a page is not a short list of holes, and only this page's cards are loaded.
  const live = saved.length
    ? await Product.find({ _id: { $in: saved }, status: "published" }).select("_id").lean()
    : [];
  const liveIds = new Set(live.map((doc) => String(doc._id)));
  const visible = saved.filter((id) => liveIds.has(id));

  const pages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const page = Math.min(pageNumber(requested), pages);
  const products = await getProductsByIds(visible.slice((page - 1) * PER_PAGE, page * PER_PAGE));

  const pageHref = (n: number) =>
    n <= 1 ? localePath(locale, "/account/wishlist") : `${localePath(locale, "/account/wishlist")}?page=${n}`;

  return (
    <>
      <PageHead
        compact
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

              {pages > 1 ? (
                <nav className="pager" aria-label={t(SHOP.page, locale)}>
                  {page > 1 ? (
                    <Link className="btn btn--ghost btn--sm" href={pageHref(page - 1)}>
                      {t(SHOP.previous, locale)}
                    </Link>
                  ) : (
                    <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
                      {t(SHOP.previous, locale)}
                    </span>
                  )}
                  <span className="pager__count">
                    {t(SHOP.page, locale)} {page} {t(SHOP.of, locale)} {pages}
                  </span>
                  {page < pages ? (
                    <Link className="btn btn--ghost btn--sm" href={pageHref(page + 1)}>
                      {t(SHOP.next, locale)}
                    </Link>
                  ) : (
                    <span className="btn btn--ghost btn--sm is-disabled" aria-disabled="true">
                      {t(SHOP.next, locale)}
                    </span>
                  )}
                </nav>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
