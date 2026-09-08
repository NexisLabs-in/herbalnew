import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { ACCOUNT } from "@/content/account";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { requireCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import type { FulfillmentStatus } from "@/lib/models/enums";
import { formatFils, isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** A page of the list, not the whole history. A customer with years of orders
 *  should not download every one of them to see the latest. */
const PER_PAGE = 10;

function pageNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

const COPY: Record<string, L> = {
  title: { en: "Your orders", ar: "طلباتك" },
  empty: { en: "You have not ordered anything yet.", ar: "لم تطلب أي شيء بعد." },
  emptyHint: { en: "The cabinet is open whenever you are.", ar: "الخزانة مفتوحة في أي وقت." },
  items: { en: "items", ar: "منتجات" },
  item: { en: "item", ar: "منتج" },
  view: { en: "View order", ar: "عرض الطلب" },
};

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
  return { title: t(COPY.title, locale), robots: { index: false } };
}

export default async function CustomerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/orders"));
  const { page: requested } = await searchParams;

  await connectDb();
  const filter = { customerId: customer._id };
  const total = await Order.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pageNumber(requested), pages);

  const orders =
    total === 0
      ? []
      : await Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * PER_PAGE)
          .limit(PER_PAGE)
          .lean<OrderDoc[]>();

  const pageHref = (n: number) =>
    n <= 1 ? localePath(locale, "/account/orders") : `${localePath(locale, "/account/orders")}?page=${n}`;

  return (
    <>
      <PageHead
        compact
        kicker={t(ACCOUNT.account, locale)}
        title={t(COPY.title, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(ACCOUNT.account, locale), href: localePath(locale, "/account") },
          { label: t(COPY.title, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />

            <div>
          {orders.length === 0 ? (
            <div className="empty-state">
              <p className="display d4">{t(COPY.empty, locale)}</p>
              <p className="body" style={{ marginTop: ".75rem" }}>
                {t(COPY.emptyHint, locale)}
              </p>
              <Link className="btn btn--brand" style={{ marginTop: "1.5rem" }} href={localePath(locale, "/shop")}>
                {t(SHOP.showAll, locale)}
              </Link>
            </div>
          ) : (
            <div className="cart-lines">
              {orders.map((order) => {
                const count = order.items.reduce((total, item) => total + item.qty, 0);
                return (
                  <Link
                    className="order-row"
                    key={String(order._id)}
                    href={localePath(locale, `/account/orders/${order.orderNumber}`)}
                  >
                    <span className="order-row__id">
                      <strong dir="ltr">{order.orderNumber}</strong>
                      <span className="order-row__meta">
                        {new Date(order.createdAt).toLocaleDateString(
                          locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}{" "}
                        · {count} {count === 1 ? t(COPY.item, locale) : t(COPY.items, locale)}
                      </span>
                    </span>
                    <span className="order-row__status">
                      {t(STATUS_LABEL[order.fulfillmentStatus], locale)}
                    </span>
                    <strong className="order-row__total">
                      {formatFils(order.grandTotalFils, locale)}
                    </strong>
                    <span className="order-row__view">
                      {t(COPY.view, locale)}
                      <span aria-hidden="true">&rarr;</span>
                    </span>
                  </Link>
                );
              })}
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
