import Image from "next/image";
import { SHOP } from "@/content/shop";
import type { CartLineView } from "@/lib/cart";
import type { CartTotals } from "@/lib/pricing";
import { formatFils, t, tl, type Locale } from "@/lib/i18n";

/** What is being paid for, on the checkout page.
 *
 *  Read-only on purpose. Quantities are changed in the basket, not at the
 *  payment step — a total that moves while somebody is entering an address is
 *  how a customer ends up paying for something they did not mean to.
 */
export function OrderSummary({
  totals,
  lines,
  locale,
}: {
  totals: CartTotals;
  lines: CartLineView[];
  locale: Locale;
}) {
  const buyable = lines.filter((line) => line.priced);

  return (
    <aside className="cart-summary">
      <h2 className="display d4">{t(SHOP.basketTitle, locale)}</h2>

      <ul className="summary-lines">
        {buyable.map((line) => (
          <li key={line.productId}>
            {line.image ? (
              <Image
                src={line.image}
                alt=""
                width={48}
                height={48}
                unoptimized={!line.image.startsWith("/img/")}
              />
            ) : null}
            <span className="summary-lines__name">
              {tl(line.name, locale)}
              <span className="summary-lines__qty"> × {line.priced!.qty}</span>
            </span>
            <span className="summary-lines__total">
              {formatFils(line.priced!.lineTotalFils, locale)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="cart-totals">
        <div>
          <dt>{t(SHOP.subtotal, locale)}</dt>
          <dd>{formatFils(totals.subtotalFils, locale)}</dd>
        </div>

        {totals.productDiscountFils > 0 ? (
          <div className="cart-totals__save">
            <dt>{t(SHOP.productDiscounts, locale)}</dt>
            <dd>−{formatFils(totals.productDiscountFils, locale)}</dd>
          </div>
        ) : null}

        {totals.coupon?.ok && totals.couponDiscountFils > 0 ? (
          <div className="cart-totals__save">
            <dt>
              {t(SHOP.couponLabel, locale)} · {totals.coupon.code}
            </dt>
            <dd>−{formatFils(totals.couponDiscountFils, locale)}</dd>
          </div>
        ) : null}

        <div>
          <dt>{t(SHOP.shipping, locale)}</dt>
          <dd>
            {totals.shippingFils === 0
              ? t(SHOP.shippingFree, locale)
              : formatFils(totals.shippingFils, locale)}
          </dd>
        </div>

        {totals.taxFils > 0 ? (
          <div>
            <dt>
              {locale === "ar" ? "ضريبة القيمة المضافة" : "VAT"} {totals.taxRate}%
            </dt>
            <dd>{formatFils(totals.taxFils, locale)}</dd>
          </div>
        ) : null}

        <div className="cart-totals__grand">
          <dt>{t(SHOP.total, locale)}</dt>
          <dd>{formatFils(totals.grandTotalFils, locale)}</dd>
        </div>
      </dl>
    </aside>
  );
}
