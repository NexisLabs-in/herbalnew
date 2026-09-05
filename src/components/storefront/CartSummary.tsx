"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHOP } from "@/content/shop";
import type { CartTotals } from "@/lib/pricing";
import { formatFils, localePath, t, type Locale } from "@/lib/i18n";
import { applyCoupon, removeCoupon } from "@/server/actions/cart";
import { notifyCartChanged } from "./CartCount";

/** Totals, the coupon field, and the way out to checkout.
 *
 *  The coupon's verdict is re-decided on every render by the pricing engine,
 *  not cached from when the code was typed — a code that qualified on a
 *  two-item basket may not qualify once a third item is added, which is exactly
 *  the client's all-or-nothing rule (C8) doing its job.
 */
export function CartSummary({
  totals,
  couponCode,
  locale,
  blocked,
  productNames,
}: {
  totals: CartTotals;
  couponCode: string | null;
  locale: Locale;
  blocked: boolean;
  /** Product id → display name, so a rejection can name what is in the way. */
  productNames: Record<string, string>;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await applyCoupon(code);
      if (result.error) setError(result.error);
      else {
        setCode("");
        notifyCartChanged();
        router.refresh();
      }
    });

  const drop = () =>
    start(async () => {
      await removeCoupon();
      router.refresh();
    });

  /** Turns the engine's rejection into something a customer can act on. */
  const rejection = (() => {
    const coupon = totals.coupon;
    if (!coupon || coupon.ok) return null;
    switch (coupon.reason) {
      case "not_covered":
        return t(SHOP.couponNotCovered, locale).replace(
          "{product}",
          productNames[coupon.offendingProductId ?? ""] ?? "an item in your basket",
        );
      case "min_order":
        return t(SHOP.couponMinOrder, locale).replace(
          "{amount}",
          formatFils(coupon.minOrderFils ?? 0, locale) ?? "",
        );
      case "expired":
        return t(SHOP.couponExpired, locale);
      case "inactive":
        return t(SHOP.couponInactive, locale);
      case "exhausted":
        return t(SHOP.couponExhausted, locale);
      case "customer_limit":
        return t(SHOP.couponCustomerLimit, locale);
      case "empty_cart":
        return t(SHOP.couponEmptyCart, locale);
      default:
        return t(SHOP.couponUnknown, locale);
    }
  })();

  return (
    <aside className="cart-summary">
      <h2 className="display d4">{t(SHOP.total, locale)}</h2>

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

        {totals.couponDiscountFils > 0 && totals.coupon?.ok ? (
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

      {totals.freeShippingRemainingFils !== null ? (
        <p className="cart-nudge">
          {t(SHOP.freeShippingNudge, locale).replace(
            "{amount}",
            formatFils(totals.freeShippingRemainingFils, locale) ?? "",
          )}
        </p>
      ) : null}

      {/* Coupon */}
      <div className="cart-coupon">
        {couponCode && totals.coupon?.ok ? (
          <div className="cart-coupon__applied">
            <span>
              {t(SHOP.couponLabel, locale)}: <strong>{couponCode}</strong>
            </span>
            <button className="link-plain" type="button" disabled={pending} onClick={drop}>
              {t(SHOP.couponRemove, locale)}
            </button>
          </div>
        ) : (
          <>
            <div className="cart-coupon__row">
              <label className="visually-hidden" htmlFor="coupon">
                {t(SHOP.couponLabel, locale)}
              </label>
              <input
                className="field__input"
                id="coupon"
                value={code}
                dir="ltr"
                placeholder={t(SHOP.couponPlaceholder, locale)}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                disabled={pending || !code.trim()}
                onClick={submit}
              >
                {t(SHOP.couponApply, locale)}
              </button>
            </div>
            {couponCode && rejection ? (
              <p className="cart-coupon__error" role="alert">
                <strong>{couponCode}</strong> — {rejection}{" "}
                <button className="link-plain" type="button" onClick={drop}>
                  {t(SHOP.couponRemove, locale)}
                </button>
              </p>
            ) : null}
            {error ? (
              <p className="cart-coupon__error" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>

      <Link
        className={`btn btn--brand btn--block${blocked || totals.itemCount === 0 ? " is-disabled" : ""}`}
        href={localePath(locale, "/checkout")}
        aria-disabled={blocked || totals.itemCount === 0}
      >
        {t(SHOP.checkout, locale)} <span className="btn__arrow" aria-hidden="true">&rarr;</span>
      </Link>

      {totals.taxRate === 0 ? <p className="cart-note">{t(SHOP.taxNote, locale)}</p> : null}

      <Link className="link-arrow" href={localePath(locale, "/shop")}>
        <span>{t(SHOP.continueShopping, locale)}</span>
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </aside>
  );
}
