"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCancellation } from "@/server/actions/orders";
import { t, type L, type Locale } from "@/lib/i18n";

/** Asking to cancel — a request, not a cancellation (plan 8.5).
 *
 *  The customer asks and an admin decides, because the refund is issued by hand
 *  in Stripe and a parcel that has already been packed may be halfway to a
 *  courier. Saying "requested" rather than "cancelled" is the honest word for
 *  what just happened.
 */

const COPY: Record<string, L> = {
  open: { en: "Request cancellation", ar: "طلب إلغاء" },
  title: { en: "Ask us to cancel this order", ar: "اطلب إلغاء هذا الطلب" },
  body: {
    en: "Tell us why and we will come back to you. Nothing is cancelled until we confirm it.",
    ar: "أخبرنا بالسبب وسنعاود التواصل معك. لا يُلغى شيء حتى نؤكد ذلك.",
  },
  reason: { en: "Reason", ar: "السبب" },
  submit: { en: "Send request", ar: "إرسال الطلب" },
  sending: { en: "Sending…", ar: "جارٍ الإرسال…" },
  cancel: { en: "Never mind", ar: "تراجع" },
};

export function CancelOrderForm({
  orderNumber,
  locale,
}: {
  orderNumber: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button className="link-plain" type="button" onClick={() => setOpen(true)}>
        {t(COPY.open, locale)}
      </button>
    );
  }

  return (
    <div className="panel">
      <p className="eyebrow eyebrow--plain">{t(COPY.title, locale)}</p>
      <p className="body small" style={{ marginTop: ".6rem" }}>
        {t(COPY.body, locale)}
      </p>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field" style={{ marginTop: ".9rem" }}>
        <span className="field__label">{t(COPY.reason, locale)}</span>
        <textarea
          className="field__input"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>

      <div style={{ display: "flex", gap: ".6rem", marginTop: ".9rem", flexWrap: "wrap" }}>
        <button
          className="btn btn--brand btn--sm"
          type="button"
          disabled={pending || reason.trim().length < 3}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await requestCancellation({ orderNumber, reason });
              if (result.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            })
          }
        >
          {pending ? t(COPY.sending, locale) : t(COPY.submit, locale)}
        </button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setOpen(false)}>
          {t(COPY.cancel, locale)}
        </button>
      </div>
    </div>
  );
}
