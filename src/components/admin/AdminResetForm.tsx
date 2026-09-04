"use client";

import { useActionState, useState } from "react";
import {
  adminCompleteReset,
  adminRequestReset,
  type AdminAuthState,
} from "@/server/actions/auth-admin";

/** Password recovery by emailed code: request a code, then set a new password.
 *
 *  The request step always reports the same thing whether or not the address
 *  belongs to an admin, so this form cannot be used to discover who the admins
 *  are — which is why the code step appears either way.
 */
export function AdminResetForm() {
  const [requestState, requestCode, requesting] = useActionState<AdminAuthState, FormData>(
    adminRequestReset,
    {},
  );
  const [completeState, complete, completing] = useActionState<AdminAuthState, FormData>(
    adminCompleteReset,
    {},
  );

  const [email, setEmail] = useState("");
  const onCodeStep = requestState.stage === "code" && completeState.stage !== "email";

  const notice = completeState.notice ?? requestState.notice;
  const error = onCodeStep ? completeState.error : (requestState.error ?? completeState.error);

  return (
    <>
      {notice ? (
        <p className="auth-card__notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="auth-card__error" role="alert">
          {error}
        </p>
      ) : null}

      {onCodeStep ? (
        <form action={complete} className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
          <input type="hidden" name="email" value={email} />

          <div className="field">
            <label className="field__label" htmlFor="code">
              Six-digit code
            </label>
            <input
              className="field__input field__input--code"
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
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

          <button className="btn btn--brand btn--block" type="submit" disabled={completing}>
            {completing ? "Saving…" : "Set new password"}
          </button>
        </form>
      ) : (
        <form action={requestCode} className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
            <p className="field__hint">We will email a six-digit code to this address.</p>
          </div>

          <button className="btn btn--brand btn--block" type="submit" disabled={requesting}>
            {requesting ? "Sending…" : "Send code"}
          </button>
        </form>
      )}
    </>
  );
}
