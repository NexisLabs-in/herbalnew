"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EMIRATES } from "@/lib/models/enums";
import { payQuote, type QuoteCheckoutState } from "@/server/actions/enquiries";
import { localePath, t, type L, type Locale } from "@/lib/i18n";

/** Accepting a quote and paying for it (C1).
 *
 *  Payment needs an account — the same rule as any other order — so a
 *  signed-out visitor is asked to sign in first and returned to this page.
 */
const COPY: Record<string, L> = {
  deliverTo: { en: "Deliver to", ar: "التوصيل إلى" },
  fullName: { en: "Full name", ar: "الاسم الكامل" },
  phone: { en: "Phone", ar: "رقم الهاتف" },
  line1: { en: "Address", ar: "العنوان" },
  line2: { en: "Apartment, floor (optional)", ar: "شقة، طابق (اختياري)" },
  city: { en: "Area or city", ar: "المنطقة أو المدينة" },
  emirate: { en: "Emirate", ar: "الإمارة" },
  chooseEmirate: { en: "Choose an emirate", ar: "اختر الإمارة" },
  pay: { en: "Accept and pay", ar: "القبول والدفع" },
  redirecting: { en: "Taking you to payment…", ar: "جارٍ تحويلك إلى الدفع…" },
  signIn: { en: "Sign in to accept this quote", ar: "سجّل الدخول لقبول عرض السعر" },
  signInBody: {
    en: "Paying needs an account, so your order and invoice have somewhere to live.",
    ar: "يتطلب الدفع وجود حساب لحفظ طلبك وفاتورتك.",
  },
};

export function QuoteCheckout({
  token,
  locale,
  signedIn,
  defaultAddress,
}: {
  token: string;
  locale: Locale;
  signedIn: boolean;
  defaultAddress?: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    emirate: string;
  };
}) {
  const [state, submit, pending] = useActionState<QuoteCheckoutState, FormData>(payQuote, {});
  const pathname = usePathname();

  useEffect(() => {
    if (state.redirect) window.location.href = state.redirect;
  }, [state]);

  if (!signedIn) {
    return (
      <div className="buy-box">
        <p className="eyebrow eyebrow--plain">{t(COPY.signIn, locale)}</p>
        <p className="body small" style={{ marginTop: ".8rem" }}>
          {t(COPY.signInBody, locale)}
        </p>
        <Link
          className="btn btn--brand btn--block"
          style={{ marginTop: "1.4rem" }}
          href={`${localePath(locale, "/login")}?next=${encodeURIComponent(pathname)}`}
        >
          {t(COPY.signIn, locale)}
        </Link>
      </div>
    );
  }

  const err = (path: string) => state.fieldErrors?.[path];

  return (
    <form action={submit} className="checkout-form">
      <input type="hidden" name="token" value={token} />

      {state.error && state.error !== "sign_in" ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <h2 className="display d4">{t(COPY.deliverTo, locale)}</h2>

      <div className="stack" style={{ ["--stack" as string]: "1rem" }}>
        <label className="field">
          <span className="field__label">{t(COPY.fullName, locale)}</span>
          <input className="field__input" name="fullName" required defaultValue={defaultAddress?.fullName} />
          {err("fullName") ? <span className="field__error">{err("fullName")}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">{t(COPY.phone, locale)}</span>
          <input className="field__input" name="phone" type="tel" dir="ltr" required defaultValue={defaultAddress?.phone} />
          {err("phone") ? <span className="field__error">{err("phone")}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">{t(COPY.line1, locale)}</span>
          <input className="field__input" name="line1" required defaultValue={defaultAddress?.line1} />
          {err("line1") ? <span className="field__error">{err("line1")}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">{t(COPY.line2, locale)}</span>
          <input className="field__input" name="line2" defaultValue={defaultAddress?.line2} />
        </label>

        <div className="field__row">
          <label className="field">
            <span className="field__label">{t(COPY.city, locale)}</span>
            <input className="field__input" name="city" required defaultValue={defaultAddress?.city} />
            {err("city") ? <span className="field__error">{err("city")}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">{t(COPY.emirate, locale)}</span>
            <select className="field__input" name="emirate" required defaultValue={defaultAddress?.emirate ?? ""}>
              <option value="" disabled>
                {t(COPY.chooseEmirate, locale)}
              </option>
              {EMIRATES.map((emirate) => (
                <option key={emirate} value={emirate}>
                  {emirate}
                </option>
              ))}
            </select>
            {err("emirate") ? <span className="field__error">{err("emirate")}</span> : null}
          </label>
        </div>
      </div>

      <button className="btn btn--brand btn--block" type="submit" disabled={pending}>
        {pending ? t(COPY.redirecting, locale) : t(COPY.pay, locale)}
      </button>
    </form>
  );
}
