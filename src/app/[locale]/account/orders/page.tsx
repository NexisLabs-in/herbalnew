import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { SHOP } from "@/content/shop";
import { PageHead } from "@/components/Blocks";
import { requireCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import type { FulfillmentStatus } from "@/lib/models/enums";
import { formatFils, isLocale, localePath, t, type L, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COPY: Record<string, L> = {
  title: { en: "Your orders", ar: "طلباتك" },
  empty: { en: "You have not ordered anything yet.", ar: "لم تطلب أي شيء بعد." },
  emptyHint: { en: "The cabinet is open whenever you are.", ar: "الخزانة مفتوحة في أي وقت." },
  items: { en: "items", ar: "منتجات" },
  item: { en: "item", ar: "منتج" },
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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, "/account/orders"));

  await connectDb();
  const orders = await Order.find({ customerId: customer._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<OrderDoc[]>();

  return (
    <>
      <PageHead
        kicker={BRAND.name}
        title={t(COPY.title, locale)}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(COPY.title, locale) },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
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
                    <span>
                      <strong dir="ltr">{order.orderNumber}</strong>
                      <span className="cart-line__unit">
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
                    <strong>{formatFils(order.grandTotalFils, locale)}</strong>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
