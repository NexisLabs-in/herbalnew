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
  minQty = 1,
  maxQty = null,
  defaultEmail,
  defaultName,
}: {
  productId: string;
  locale: Locale;
  minQty?: number;
  maxQty?: number | null;
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [state, submit, pending] = useActionState<EnquiryState, FormData>(submitPriceEnquiry, {});

  if (state.ok) {
    return (
      <div className="enquire enquire--done" id="enquire">
        <p className="eyebrow eyebrow--plain">{t(SHOP.enquiryTitle, locale)}</p>
        <p className="body" role="status">
          {t(SHOP.enquiryDone, locale)}
        </p>
      </div>
    );
  }

  return (
    <form className="enquire" id="enquire" action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />

      <p className="eyebrow eyebrow--plain">{t(SHOP.enquiryTitle, locale)}</p>
      <p className="enquire__lead">{t(SHOP.enquiryBody, locale)}</p>

      {state.error ? (
        <p className="auth-card__error enquire__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="enquire__fields">
        <label className="enquire__field">
          <span>{t(SHOP.enquiryName, locale)}</span>
          <input name="name" required defaultValue={defaultName} autoComplete="name" />
        </label>

        <label className="enquire__field">
          <span>{t(SHOP.enquiryEmail, locale)}</span>
          <input name="email" type="email" required dir="ltr" defaultValue={defaultEmail} autoComplete="email" />
        </label>

        <div className="enquire__pair">
          <label className="enquire__field">
            <span>{t(SHOP.enquiryPhone, locale)}</span>
            <input name="phone" type="tel" dir="ltr" autoComplete="tel" />
          </label>

          <label className="enquire__field">
            <span>{t(SHOP.enquiryQty, locale)}</span>
            <input
              name="qty"
              type="number"
              min={Math.max(1, minQty)}
              {...(maxQty && maxQty > 0 ? { max: maxQty } : {})}
              defaultValue={Math.max(1, minQty)}
              dir="ltr"
            />
          </label>
        </div>

        <label className="enquire__field">
          <span>{t(SHOP.enquiryMessage, locale)}</span>
          <textarea name="message" rows={2} />
        </label>
      </div>

      <button className="btn btn--brand" type="submit" disabled={pending}>
        {pending ? t(SHOP.enquirySending, locale) : t(SHOP.enquirySubmit, locale)}
        {!pending ? <span className="btn__arrow" aria-hidden="true">&rarr;</span> : null}
      </button>
    </form>
  );
}
