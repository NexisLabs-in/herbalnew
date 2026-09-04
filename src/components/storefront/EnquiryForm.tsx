"use client";

import { useActionState } from "react";
import { SHOP } from "@/content/shop";
import { submitPriceEnquiry, type EnquiryState } from "@/server/actions/storefront";
import { t, type Locale } from "@/lib/i18n";

/** What a request-price product shows instead of a price (requirement C1).
 *
 *  Open to signed-out visitors: making somebody create an account before they
 *  can ask what something costs loses the enquiry. The admin answers with a
 *  quoted price, and that is where the account is needed — to pay.
 */
export function EnquiryForm({
  productId,
  locale,
  defaultEmail,
  defaultName,
}: {
  productId: string;
  locale: Locale;
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [state, submit, pending] = useActionState<EnquiryState, FormData>(submitPriceEnquiry, {});

  if (state.ok) {
    return (
      <div className="buy-box" id="enquire">
        <p className="eyebrow eyebrow--plain">{t(SHOP.enquiryTitle, locale)}</p>
        <p className="body" style={{ marginTop: ".9rem" }} role="status">
          {t(SHOP.enquiryDone, locale)}
        </p>
      </div>
    );
  }

  return (
    <form className="buy-box" id="enquire" action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />

      <p className="eyebrow eyebrow--plain">{t(SHOP.enquiryTitle, locale)}</p>
      <p className="body small" style={{ marginTop: ".8rem", maxWidth: "46ch" }}>
        {t(SHOP.enquiryBody, locale)}
      </p>

      {state.error ? (
        <p className="auth-card__error" style={{ marginTop: "1rem", marginBottom: 0 }} role="alert">
          {t(SHOP.enquiryFailed, locale)}
        </p>
      ) : null}

      <div className="stack" style={{ ["--stack" as string]: ".9rem", marginTop: "1.25rem" }}>
        <label className="field">
          <span className="field__label">{t(SHOP.enquiryName, locale)}</span>
          <input className="field__input" name="name" required defaultValue={defaultName} autoComplete="name" />
        </label>

        <label className="field">
          <span className="field__label">{t(SHOP.enquiryEmail, locale)}</span>
          <input
            className="field__input"
            name="email"
            type="email"
            required
            dir="ltr"
            defaultValue={defaultEmail}
            autoComplete="email"
          />
        </label>

        <div className="field__row">
          <label className="field">
            <span className="field__label">{t(SHOP.enquiryPhone, locale)}</span>
            <input className="field__input" name="phone" type="tel" dir="ltr" autoComplete="tel" />
          </label>

          <label className="field">
            <span className="field__label">{t(SHOP.enquiryQty, locale)}</span>
            <input
              className="field__input"
              name="qty"
              type="number"
              min={1}
              max={999}
              defaultValue={1}
              dir="ltr"
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">{t(SHOP.enquiryMessage, locale)}</span>
          <textarea className="field__input" name="message" rows={3} />
        </label>

        <button className="btn btn--brand btn--block" type="submit" disabled={pending}>
          {pending ? t(SHOP.enquirySending, locale) : t(SHOP.enquirySubmit, locale)}
          {!pending ? <span className="btn__arrow" aria-hidden="true">&rarr;</span> : null}
        </button>
      </div>
    </form>
  );
}
