"use client";

import { useActionState } from "react";
import { SHOP } from "@/content/shop";
import { requestBackInStock, type NotifyState } from "@/server/actions/storefront";
import { t, type Locale } from "@/lib/i18n";

/** What an out-of-stock product offers instead of a disabled button (plan 8.7).
 *
 *  The product keeps its page and its place in the catalogue when it sells out —
 *  hiding it throws away the search ranking and the returning visitor. This
 *  turns the dead end into the one useful thing left to do.
 */
export function NotifyMeForm({
  productId,
  locale,
  defaultEmail,
}: {
  productId: string;
  locale: Locale;
  defaultEmail?: string;
}) {
  const [state, submit, pending] = useActionState<NotifyState, FormData>(requestBackInStock, {});

  if (state.ok) {
    return (
      <p className="notify__done" role="status">
        {state.already ? t(SHOP.notifyAlready, locale) : t(SHOP.notifyDone, locale)}
      </p>
    );
  }

  return (
    <form className="notify" action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />

      <p className="eyebrow eyebrow--plain">{t(SHOP.notifyTitle, locale)}</p>
      <p className="body small" style={{ marginTop: ".7rem", maxWidth: "44ch" }}>
        {t(SHOP.notifyBody, locale)}
      </p>

      {state.error ? (
        <p className="field__error" role="alert">
          {t(SHOP.notifyBadEmail, locale)}
        </p>
      ) : null}

      <div className="notify__row">
        <label className="visually-hidden" htmlFor={`notify-${productId}`}>
          {t(SHOP.enquiryEmail, locale)}
        </label>
        <input
          className="field__input"
          id={`notify-${productId}`}
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          defaultValue={defaultEmail}
          placeholder={t(SHOP.notifyPlaceholder, locale)}
        />
        <button className="btn btn--brand btn--sm" type="submit" disabled={pending}>
          {t(SHOP.notifyButton, locale)}
        </button>
      </div>
    </form>
  );
}
