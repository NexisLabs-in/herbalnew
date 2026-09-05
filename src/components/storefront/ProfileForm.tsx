"use client";

import { useActionState } from "react";
import { ACCOUNT } from "@/content/account";
import { updateProfile } from "@/server/actions/account";
import type { ActionState } from "@/lib/validation/shared";
import { t, type Locale } from "@/lib/i18n";

export function ProfileForm({
  locale,
  name,
  phone,
  email,
}: {
  locale: Locale;
  name: string;
  phone: string;
  email: string;
}) {
  const [state, submit, pending] = useActionState<ActionState, FormData>(updateProfile, {});

  return (
    <form action={submit} className="stack" style={{ ["--stack" as string]: "1.25rem" }}>
      {state.error ? (
        <p className="auth-card__error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="admin-note" role="status">
          {t(ACCOUNT.saved, locale)}
        </p>
      ) : null}

      <label className="field">
        <span className="field__label">{t(ACCOUNT.yourName, locale)}</span>
        <input className="field__input" name="name" defaultValue={name} autoComplete="name" />
        {state.fieldErrors?.name ? (
          <span className="field__error">{state.fieldErrors.name}</span>
        ) : null}
      </label>

      <label className="field">
        <span className="field__label">{t(ACCOUNT.phone, locale)}</span>
        <input
          className="field__input"
          name="phone"
          type="tel"
          dir="ltr"
          defaultValue={phone}
          autoComplete="tel"
        />
        {state.fieldErrors?.phone ? (
          <span className="field__error">{state.fieldErrors.phone}</span>
        ) : null}
      </label>

      {/* The email is the login identity (C5). Changing it would need the new
          address verified before the old one stops working, or a typo locks
          the customer out of their own account. */}
      <label className="field">
        <span className="field__label">{t(ACCOUNT.email, locale)}</span>
        <input className="field__input" value={email} dir="ltr" disabled readOnly />
        <span className="field__hint">{t(ACCOUNT.emailFixed, locale)}</span>
      </label>

      <div>
        <button className="btn btn--brand" type="submit" disabled={pending}>
          {pending ? t(ACCOUNT.saving, locale) : t(ACCOUNT.save, locale)}
        </button>
      </div>
    </form>
  );
}
