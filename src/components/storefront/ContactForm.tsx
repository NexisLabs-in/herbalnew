"use client";

import { useActionState } from "react";
import { submitContactMessage, type ContactState } from "@/server/actions/storefront";
import { t, type L, type Locale } from "@/lib/i18n";

const COPY: Record<string, L> = {
  name: { en: "Your name", ar: "الاسم" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  phone: { en: "Phone (optional)", ar: "الهاتف (اختياري)" },
  subject: { en: "Subject (optional)", ar: "الموضوع (اختياري)" },
  message: { en: "Message", ar: "الرسالة" },
  send: { en: "Send message", ar: "إرسال الرسالة" },
  sending: { en: "Sending…", ar: "جارٍ الإرسال…" },
  done: {
    en: "Thank you. We have your message and will reply by email.",
    ar: "شكراً لك. وصلتنا رسالتك وسنرد عبر البريد الإلكتروني.",
  },
  shortName: { en: "Enter your name.", ar: "أدخل اسمك." },
  shortMessage: { en: "Tell us a little more.", ar: "أخبرنا بالمزيد." },
  rate: {
    en: "You have sent several messages already. Please wait a while before sending another.",
    ar: "لقد أرسلت عدة رسائل. يرجى الانتظار قليلاً قبل إرسال أخرى.",
  },
  failed: { en: "Please check the form.", ar: "يرجى التحقق من النموذج." },
};

export function ContactForm({ locale }: { locale: Locale }) {
  const [state, submit, pending] = useActionState<ContactState, FormData>(submitContactMessage, {});

  if (state.ok) {
    return (
      <p className="admin-note" role="status">
        {t(COPY.done, locale)}
      </p>
    );
  }

  const error =
    state.error === "short_name"
      ? t(COPY.shortName, locale)
      : state.error === "short_message"
        ? t(COPY.shortMessage, locale)
        : state.error === "rate"
          ? t(COPY.rate, locale)
          : state.error
            ? t(COPY.failed, locale)
            : null;

  return (
    <form action={submit} className="stack" style={{ ["--stack" as string]: "1rem" }}>
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
      />

      {error ? (
        <p className="auth-card__error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span className="field__label">{t(COPY.name, locale)}</span>
        <input className="field__input" name="name" required autoComplete="name" />
      </label>

      <div className="field__row">
        <label className="field">
          <span className="field__label">{t(COPY.email, locale)}</span>
          <input className="field__input" name="email" type="email" dir="ltr" required autoComplete="email" />
        </label>
        <label className="field">
          <span className="field__label">{t(COPY.phone, locale)}</span>
          <input className="field__input" name="phone" type="tel" dir="ltr" autoComplete="tel" />
        </label>
      </div>

      <label className="field">
        <span className="field__label">{t(COPY.subject, locale)}</span>
        <input className="field__input" name="subject" />
      </label>

      <label className="field">
        <span className="field__label">{t(COPY.message, locale)}</span>
        <textarea className="field__input" name="message" rows={5} required minLength={10} />
      </label>

      <div>
        <button className="btn btn--brand" type="submit" disabled={pending}>
          {pending ? t(COPY.sending, locale) : t(COPY.send, locale)}
        </button>
      </div>
    </form>
  );
}
