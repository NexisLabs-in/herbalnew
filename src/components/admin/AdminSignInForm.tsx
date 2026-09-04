"use client";

import { useActionState } from "react";
import { adminSignIn, type AdminAuthState } from "@/server/actions/auth-admin";

export function AdminSignInForm() {
  const [state, submit, pending] = useActionState<AdminAuthState, FormData>(adminSignIn, {});

  return (
    <form action={submit} className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
      {state.error ? (
        <p className="auth-card__error" role="alert" style={{ marginBottom: 0 }}>
          {state.error}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="email">
          Email
        </label>
        <input
          className="field__input"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="password">
          Password
        </label>
        <input
          className="field__input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className="btn btn--brand btn--block" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
