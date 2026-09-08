import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/content/brand";
import { PageHead } from "@/components/Blocks";
import { AccountNav } from "@/components/storefront/AccountNav";
import { CancelOrderForm } from "@/components/storefront/CancelOrderForm";
import { requireCustomer } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Order, type OrderDoc } from "@/lib/models/Order";
import { CANCELLABLE_STATUSES, type FulfillmentStatus } from "@/lib/models/enums";
import { formatFils, isLocale, localePath, t, tl, type L, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COPY: Record<string, L> = {
  title: { en: "Order", ar: "الطلب" },
  orders: { en: "Orders", ar: "الطلبات" },
  placed: { en: "Placed", ar: "تاريخ الطلب" },
  total: { en: "Total", ar: "الإجمالي" },
  status: { en: "Status", ar: "الحالة" },
  deliveringTo: { en: "Delivering to", ar: "التوصيل إلى" },
  tracking: { en: "Tracking", ar: "التتبع" },
  courier: { en: "Courier", ar: "شركة الشحن" },
  invoice: { en: "View invoice", ar: "عرض الفاتورة" },
  progress: { en: "Progress", ar: "مراحل الطلب" },
  awaitingPayment: { en: "Awaiting payment", ar: "بانتظار الدفع" },
};

/** The customer-facing stages. Cancelled and returned are deliberately absent:
 *  they are endings, not steps along the way, and are shown as a state instead. */
const JOURNEY: FulfillmentStatus[] = ["new", "packed", "dispatched", "out_for_delivery", "delivered"];

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
  params: Promise<{ locale: string; orderNumber: string }>;
}): Promise<Metadata> {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale)) return {};
  return { title: `${t(COPY.title, locale)} ${orderNumber}`, robots: { index: false } };
}

export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale: raw, orderNumber } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const customer = await requireCustomer(locale, localePath(locale, `/account/orders/${orderNumber}`));

  await connectDb();
  // Scoped to the signed-in customer: order numbers are sequential and
  // guessable, so the query itself is the authorisation.
  const order = await Order.findOne({ orderNumber, customerId: customer._id }).lean<OrderDoc | null>();
  if (!order) notFound();

  const address = order.shippingAddress;
  const ended = order.fulfillmentStatus === "cancelled" || order.fulfillmentStatus === "returned";
  const reached = JOURNEY.indexOf(order.fulfillmentStatus);

  const canCancel =
    order.paymentStatus === "paid" &&
    CANCELLABLE_STATUSES.includes(order.fulfillmentStatus) &&
    order.cancellationRequest?.status !== "requested" &&
    order.cancellationRequest?.status !== "approved";

  return (
    <>
      <PageHead
        compact
        kicker={t(COPY.orders, locale)}
        title={order.orderNumber}
        crumbs={[
          { label: BRAND.name, href: localePath(locale) },
          { label: t(COPY.orders, locale), href: localePath(locale, "/account/orders") },
          { label: order.orderNumber },
        ]}
      />

      <section className="section--tight">
        <div className="shell shell--wide">
          <div className="account-layout">
            <AccountNav locale={locale} />

            <div className="cart-layout">
            <div>
              {/* Progress, as a sequence of stages rather than a status word —
                  "dispatched" means little without knowing what comes next. */}
              {!ended ? (
                <ol className="journey">
                  {JOURNEY.map((stage, index) => (
                    <li
                      key={stage}
                      className={index <= reached ? "journey__step is-done" : "journey__step"}
                      aria-current={index === reached ? "step" : undefined}
                    >
                      <span className="journey__dot" aria-hidden="true" />
                      <span>{t(STATUS_LABEL[stage], locale)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cart-alert" style={{ marginBottom: "1.5rem" }}>
                  {t(STATUS_LABEL[order.fulfillmentStatus], locale)}
                </p>
              )}

              {order.paymentStatus !== "paid" ? (
                <p className="cart-alert">{t(COPY.awaitingPayment, locale)}</p>
              ) : null}

              <div className="cart-lines" style={{ marginTop: "1.5rem" }}>
                {order.items.map((item, index) => (
                  <article className="cart-line" key={index}>
                    <div className="cart-line__media">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={tl(item.name, locale)}
                          width={96}
                          height={96}
                          unoptimized={!item.image.startsWith("/img/")}
                        />
                      ) : (
                        <div className="cart-line__placeholder" aria-hidden="true" />
                      )}
                    </div>
                    <div className="cart-line__body">
                      <h3 className="cart-line__name">
                        <Link href={localePath(locale, `/shop/${item.slug}`)}>
                          {tl(item.name, locale)}
                        </Link>
                      </h3>
                      <p className="cart-line__unit">
                        {formatFils(item.unitPriceFils - item.discountFils, locale)} × {item.qty}
                      </p>
                    </div>
                    <div className="cart-line__qty" />
                    <div className="cart-line__total">
                      <strong>{formatFils(item.lineTotalFils, locale)}</strong>
                    </div>
                  </article>
                ))}
              </div>

              {order.tracking?.number ? (
                <div className="panel" style={{ marginTop: "1.5rem" }}>
                  <p className="eyebrow eyebrow--plain">{t(COPY.tracking, locale)}</p>
                  <p className="body" style={{ marginTop: ".6rem" }}>
                    {t(COPY.courier, locale)}: {order.tracking.courier || "—"}
                    <br />
                    <span dir="ltr">{order.tracking.number}</span>
                  </p>
                  {order.tracking.note ? (
                    <p className="body small" style={{ marginTop: ".5rem" }}>
                      {order.tracking.note}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {canCancel ? (
                <div style={{ marginTop: "1.5rem" }}>
                  <CancelOrderForm orderNumber={order.orderNumber} locale={locale} />
                </div>
              ) : null}

              {order.cancellationRequest?.status === "requested" ? (
                <p className="admin-note" style={{ marginTop: "1.5rem" }}>
                  {locale === "ar"
                    ? "وصلنا طلب الإلغاء وسنتواصل معك قريباً."
                    : "We have your cancellation request and will be in touch."}
                </p>
              ) : null}
            </div>

            <aside className="cart-summary">
              <dl className="cart-totals">
                <div>
                  <dt>{t(COPY.placed, locale)}</dt>
                  <dd>
                    {new Date(order.createdAt).toLocaleDateString(
                      locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t(COPY.status, locale)}</dt>
                  <dd>{t(STATUS_LABEL[order.fulfillmentStatus], locale)}</dd>
                </div>
                <div className="cart-totals__grand">
                  <dt>{t(COPY.total, locale)}</dt>
                  <dd>{formatFils(order.grandTotalFils, locale)}</dd>
                </div>
              </dl>

              <div>
                <p className="admin-stat__label">{t(COPY.deliveringTo, locale)}</p>
                <p className="body small" style={{ marginTop: ".4rem" }}>
                  {address.fullName}
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.emirate}
                </p>
              </div>

              {order.paymentStatus === "paid" ? (
                <Link
                  className="btn btn--ghost btn--block"
                  href={localePath(locale, `/invoice/${order.orderNumber}`)}
                >
                  {t(COPY.invoice, locale)}
                </Link>
              ) : null}
            </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
