import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NAV } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { ShopHero } from "@/components/ShopHero";
import { ShopListing } from "@/components/ShopListing";
import { ShopListingSkeleton } from "@/components/ShopListingSkeleton";
import type { ShopParams } from "@/components/ShopFilters";
import { isLocale, t, type Locale } from "@/lib/i18n";

/** The Herb Cabinet, read from the database.
 *
 *  Revalidated rather than rendered per request: the catalogue changes when an
 *  admin saves, and every product write calls `revalidatePath` for this route,
 *  so the window is only how long a page can be stale if a revalidation is
 *  missed — not how often a shopper sees old prices.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(NAV[0].label, locale), description: t(SHOP.heroSub, locale) };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ShopParams>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <>
      <ShopHero locale={locale} />

      <section className="section--tight shop-page">
        <div className="shell shell--wide">
          <Suspense fallback={<ShopListingSkeleton />}>
            <ShopListing locale={locale} searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
