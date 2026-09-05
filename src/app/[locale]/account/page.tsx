import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { ACCOUNT } from "@/content/account";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { requireCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import type { FulfillmentStatus } from "@/lib/models/enums";
import { formatFils, isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

/** Per-customer content — never prerender or cache it. */
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<FulfillmentStatus, L> = {
  new: { en: "Order received", ar: "تم استلام الطلب" },
  packed: { en: "Packed", ar: "تم التجهيز" },
  dispatched: { en: "Dispatched", ar: "تم الشحن" },
  out_for_delivery: { en: "Out for delivery", ar: "خارج للتوصيل" },
  delivered: { en: "Delivered", ar: "تم التوصيل" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  returned: { en: "Returned", ar: "مُرجع" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: t(ACCOUNT.dashboard, locale), robots: { index: false } };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account"));

  await connectDb();
  const [orders, orderCount] = await Promise.all([
    Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(3).lean<OrderDoc[]>(),
    Order.countDocuments({ customerId: customer._id }),
  ]);

  // Name and address are collected lazily (C5), so an account can legitimately
  // be empty. The nudge appears only while there is something to complete.
  const incomplete = !customer.name || customer.addresses.length === 0;

  const stats = [
    { label: t(ACCOUNT.ordersPlaced, locale), value: orderCount },
    { label: t(ACCOUNT.savedAddresses, locale), value: customer.addresses.length },
    { label: t(ACCOUNT.savedItems, locale), value: customer.wishlist.length },
  ];

  return (
    <>
      <PageHead
        compact
        kicker={t(ACCOUNT.account, locale)}
        title={customer.name || t(ACCOUNT.welcome, locale)}
        sub={`${t(ACCOUNT.signedInAs, locale)} ${customer.email}`}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(ACCOUNT.account, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />

            <div>
              {incomplete ? (
                <p className="admin-note" style={{ marginBottom: "1.5rem" }}>
                  {t(ACCOUNT.completeProfile, locale)}
                </p>
              ) : null}

              <div className="account-stats">
                {stats.map((stat) => (
                  <div className="account-stat" key={stat.label}>
                    <p className="admin-stat__label">{stat.label}</p>
                    <p className="display d3" style={{ marginTop: ".4rem" }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="section-head" style={{ marginTop: "2.5rem", marginBottom: "1.25rem" }}>
                <h2 className="display d4">{t(ACCOUNT.recentOrders, locale)}</h2>
                {orderCount > 0 ? (
                  <Link className="link-plain" href={localePath(locale, "/account/orders")}>
                    {t(ACCOUNT.viewAll, locale)}
                  </Link>
                ) : null}
              </div>

              {orders.length === 0 ? (
                <div className="empty-state">
                  <p className="body">{t(ACCOUNT.nothingYet, locale)}</p>
                  <Link className="btn btn--ghost" style={{ marginTop: "1.25rem" }} href={localePath(locale, "/shop")}>
                    {t(ACCOUNT.browse, locale)}
                  </Link>
                </div>
              ) : (
                <div className="cart-lines">
                  {orders.map((order) => (
                    <Link
                      className="order-row"
                      key={String(order._id)}
                      href={localePath(locale, `/account/orders/${order.orderNumber}`)}
                    >
                      <span>
                        <strong dir="ltr">{order.orderNumber}</strong>
                        <span className="cart-line__unit">
                          {new Date(order.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                      </span>
                      <span className="order-row__status">
                        {t(STATUS_LABEL[order.fulfillmentStatus], locale)}
                      </span>
                      <strong>{formatFils(order.grandTotalFils, locale)}</strong>
                    </Link>
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
