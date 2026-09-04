"use client";

import { useActionState } from "react";
import { adminSetPassword, type AdminAuthState } from "@/server/actions/auth-admin";

export function AdminSetPasswordForm() {
  const [state, submit, pending] = useActionState<AdminAuthState, FormData>(adminSetPassword, {});

  return (
    <form action={submit} className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
      {state.error ? (
        <p className="auth-card__error" role="alert" style={{ marginBottom: 0 }}>
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="current">
          Current password
        </label>
        <input
          className="field__input"
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="password">
          New password
        </label>
        <input
          className="field__input"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="field__hint">At least 10 characters.</p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="confirm">
          Confirm new password
        </label>
        <input
          className="field__input"
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>

      <button className="btn btn--brand btn--block" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
