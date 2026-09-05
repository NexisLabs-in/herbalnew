"use client";

import { useActionState, useEffect, useState } from "react";
import { SHOP } from "@/content/shop";
import { EMIRATES } from "@/lib/models/enums";
import { startCheckout, type CheckoutState } from "@/server/actions/checkout";
import { t, type Locale } from "@/lib/i18n";

/** Delivery address, then payment.
 *
 *  The only thing this form actually sends is an address — every price is
 *  recomputed on the server from the stored basket. The action returns Stripe's
 *  hosted payment URL, which the browser then follows.
 */

export type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  emirate: string;
  isDefault: boolean;
};

const COPY = {
  deliverTo: { en: "Deliver to", ar: "التوصيل إلى" },
  newAddress: { en: "Use a new address", ar: "استخدام عنوان جديد" },
  savedAddress: { en: "Use a saved address", ar: "استخدام عنوان محفوظ" },
  fullName: { en: "Full name", ar: "الاسم الكامل" },
  phone: { en: "Phone", ar: "رقم الهاتف" },
  line1: { en: "Address", ar: "العنوان" },
  line2: { en: "Apartment, floor (optional)", ar: "شقة، طابق (اختياري)" },
  city: { en: "Area or city", ar: "المنطقة أو المدينة" },
  emirate: { en: "Emirate", ar: "الإمارة" },
  chooseEmirate: { en: "Choose an emirate", ar: "اختر الإمارة" },
  label: { en: "Name this address (optional)", ar: "تسمية العنوان (اختياري)" },
  saveDefault: { en: "Make this my default address", ar: "اجعله عنواني الافتراضي" },
  payNow: { en: "Pay securely", ar: "ادفع بأمان" },
  redirecting: { en: "Taking you to payment…", ar: "جارٍ تحويلك إلى الدفع…" },
  stripeNote: {
    en: "You will be taken to Stripe to pay. We never see your card details.",
    ar: "سيتم تحويلك إلى سترايب للدفع. لا نطّلع على بيانات بطاقتك إطلاقاً.",
  },
  cancelled: {
    en: "Payment was cancelled. Your basket is untouched.",
    ar: "تم إلغاء الدفع. سلتك كما هي.",
  },
  refusalEmpty: { en: "Your basket is empty.", ar: "سلتك فارغة." },
  refusalUnavailable: {
    en: "Some items are no longer available. Go back to your basket to fix it.",
    ar: "بعض العناصر لم تعد متوفرة. عد إلى سلتك لتعديلها.",
  },
  refusalCoupon: {
    en: "Your coupon is no longer valid for this basket. Go back and review it.",
    ar: "لم يعد الكوبون صالحاً لهذه السلة. عد وراجعها.",
  },
} as const;

export function CheckoutForm({
  locale,
  addresses,
  cancelled,
}: {
  locale: Locale;
  addresses: SavedAddress[];
  cancelled: boolean;
}) {
  const [state, submit, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  const defaultId = addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [addressId, setAddressId] = useState(defaultId);
  const usingNew = addressId === "";

  // The action returns Stripe's hosted URL rather than redirecting itself: a
  // server action cannot cleanly redirect to another origin.
  useEffect(() => {
    if (state.ok && state.notice?.startsWith("http")) window.location.href = state.notice;
  }, [state]);

  const err = (path: string) => state.fieldErrors?.[path];

  const refusalMessage =
    state.refusal === "empty"
      ? t(COPY.refusalEmpty, locale)
      : state.refusal === "coupon_invalid"
        ? t(COPY.refusalCoupon, locale)
        : state.refusal === "unavailable"
          ? t(COPY.refusalUnavailable, locale)
          : null;

  return (
    <form action={submit} className="checkout-form">
      <input type="hidden" name="locale" value={locale} />
      {!usingNew ? <input type="hidden" name="addressId" value={addressId} /> : null}

      {cancelled ? (
        <p className="admin-note" role="status">
          {t(COPY.cancelled, locale)}
        </p>
      ) : null}

      {refusalMessage ? (
        <p className="auth-card__error" role="alert">
          {refusalMessage}
        </p>
      ) : null}

      {state.error && !refusalMessage ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <h2 className="display d4">{t(COPY.deliverTo, locale)}</h2>

      {addresses.length > 0 ? (
        <div className="address-choices">
          {addresses.map((address) => (
            <label
              className={`address-choice${addressId === address.id ? " is-active" : ""}`}
              key={address.id}
            >
              <input
                type="radio"
                name="addressChoice"
                checked={addressId === address.id}
                onChange={() => setAddressId(address.id)}
              />
              <span>
                <strong>{address.fullName}</strong>
                {address.label ? <em> · {address.label}</em> : null}
                <br />
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.emirate}
                <br />
                {address.phone}
              </span>
            </label>
          ))}

          <label className={`address-choice${usingNew ? " is-active" : ""}`}>
            <input
              type="radio"
              name="addressChoice"
              checked={usingNew}
              onChange={() => setAddressId("")}
            />
            <span>{t(COPY.newAddress, locale)}</span>
          </label>
        </div>
      ) : null}

      {usingNew ? (
        <div className="stack" style={{ ["--stack" as string]: "1rem" }}>
          <label className="field">
            <span className="field__label">{t(COPY.fullName, locale)}</span>
            <input className="field__input" name="fullName" required autoComplete="name" />
            {err("address.fullName") ? <span className="field__error">{err("address.fullName")}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">{t(COPY.phone, locale)}</span>
            <input className="field__input" name="phone" type="tel" dir="ltr" required autoComplete="tel" />
            {err("address.phone") ? <span className="field__error">{err("address.phone")}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">{t(COPY.line1, locale)}</span>
            <input className="field__input" name="line1" required autoComplete="address-line1" />
            {err("address.line1") ? <span className="field__error">{err("address.line1")}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">{t(COPY.line2, locale)}</span>
            <input className="field__input" name="line2" autoComplete="address-line2" />
          </label>

          <div className="field__row">
            <label className="field">
              <span className="field__label">{t(COPY.city, locale)}</span>
              <input className="field__input" name="city" required autoComplete="address-level2" />
              {err("address.city") ? <span className="field__error">{err("address.city")}</span> : null}
            </label>

            <label className="field">
              <span className="field__label">{t(COPY.emirate, locale)}</span>
              {/* A closed list: shipping is UAE-only, so a free-text region
                  field would only invite addresses we cannot deliver to. */}
              <select className="field__input" name="emirate" required defaultValue="">
                <option value="" disabled>
                  {t(COPY.chooseEmirate, locale)}
                </option>
                {EMIRATES.map((emirate) => (
                  <option key={emirate} value={emirate}>
                    {emirate}
                  </option>
                ))}
              </select>
              {err("address.emirate") ? <span className="field__error">{err("address.emirate")}</span> : null}
            </label>
          </div>

          <label className="field">
            <span className="field__label">{t(COPY.label, locale)}</span>
            <input className="field__input" name="label" placeholder="Home, office…" />
          </label>

          {addresses.length > 0 ? (
            <label className="admin-toggle">
              <input type="checkbox" name="isDefault" />
              <span className="admin-toggle__label">{t(COPY.saveDefault, locale)}</span>
            </label>
          ) : null}
        </div>
      ) : null}

      <button className="btn btn--brand btn--block" type="submit" disabled={pending}>
        {pending ? t(COPY.redirecting, locale) : t(COPY.payNow, locale)}
        {!pending ? <span className="btn__arrow" aria-hidden="true">&rarr;</span> : null}
      </button>

      <p className="field__hint" style={{ textAlign: "center" }}>
        {t(COPY.stripeNote, locale)}
      </p>
      <p className="visually-hidden">{t(SHOP.checkout, locale)}</p>
    </form>
  );
}
