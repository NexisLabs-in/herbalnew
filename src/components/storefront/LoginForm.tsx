"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  requestLoginCode,
  verifyLoginCode,
  type LoginState,
} from "@/server/actions/auth-customer";
import { t, type L, type Locale } from "@/lib/i18n";

/** Two-step login: email, then the six-digit code (C5).
 *
 *  Both steps are one component so the email typed in step one survives into
 *  step two without a round trip or a query string, and so "use another
 *  address" can step back without losing anything.
 */

const COPY: Record<string, L> = {
  emailLabel: { en: "Email address", ar: "البريد الإلكتروني" },
  emailHint: {
    en: "We will send you a six-digit code. No password to remember.",
    ar: "سنرسل إليك رمزاً من ستة أرقام. لا حاجة لتذكر كلمة مرور.",
  },
  sendCode: { en: "Send code", ar: "إرسال الرمز" },
  sending: { en: "Sending…", ar: "جارٍ الإرسال…" },
  codeLabel: { en: "Six-digit code", ar: "الرمز المكون من ستة أرقام" },
  codeHint: { en: "Sent to", ar: "أُرسل إلى" },
  verify: { en: "Sign in", ar: "تسجيل الدخول" },
  verifying: { en: "Checking…", ar: "جارٍ التحقق…" },
  resend: { en: "Send a new code", ar: "إرسال رمز جديد" },
  changeEmail: { en: "Use a different address", ar: "استخدام بريد آخر" },
};

export function LoginForm({ locale, next }: { locale: Locale; next?: string }) {
  const initial: LoginState = { stage: "email" };
  const [emailState, submitEmail, sendingEmail] = useActionState(requestLoginCode, initial);
  const [codeState, submitCode, verifying] = useActionState(verifyLoginCode, initial);

  // The email step owns the stage; once it reports "code" we stay there, even
  // after a wrong code, because the code action returns its own state.
  const [stepBack, setStepBack] = useState(false);
  const onCodeStep = !stepBack && emailState.stage === "code";
  const email = codeState.email ?? emailState.email ?? "";

  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (onCodeStep) codeRef.current?.focus();
  }, [onCodeStep]);

  const notice = onCodeStep ? (codeState.notice ?? emailState.notice) : emailState.notice;
  const error = onCodeStep ? codeState.error : emailState.error;

  return (
    <div className="auth-card">
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
        <form action={submitCode} className="stack" style={{ ["--stack" as string]: "1.1rem" }}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="field">
            <label className="field__label" htmlFor="code">
              {t(COPY.codeLabel, locale)}
            </label>
            <input
              ref={codeRef}
              className="field__input field__input--code"
              id="code"
              name="code"
              // A numeric keypad on mobile, and the OS offering the code
              // straight from the SMS/email notification.
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              dir="ltr"
            />
            <p className="field__hint">
              {t(COPY.codeHint, locale)} <strong>{email}</strong>
            </p>
          </div>

          <button className="btn btn--brand btn--block" type="submit" disabled={verifying}>
            {verifying ? t(COPY.verifying, locale) : t(COPY.verify, locale)}
          </button>

          <div className="auth-card__alts">
            <button className="link-plain" type="button" onClick={() => setStepBack(true)}>
              {t(COPY.changeEmail, locale)}
            </button>
          </div>
        </form>
      ) : (
        <form
          action={submitEmail}
          onSubmit={() => setStepBack(false)}
          className="stack"
          style={{ ["--stack" as string]: "1.1rem" }}
        >
          <input type="hidden" name="locale" value={locale} />

          <div className="field">
            <label className="field__label" htmlFor="email">
              {t(COPY.emailLabel, locale)}
            </label>
            <input
              className="field__input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
              required
              dir="ltr"
            />
            <p className="field__hint">{t(COPY.emailHint, locale)}</p>
          </div>

          <button className="btn btn--brand btn--block" type="submit" disabled={sendingEmail}>
            {sendingEmail ? t(COPY.sending, locale) : t(COPY.sendCode, locale)}
          </button>
        </form>
      )}
    </div>
  );
}
