"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type L, type Locale } from "@/lib/i18n";

/** Shown when the customer arrives back from Stripe before the webhook has.
 *
 *  The redirect and the webhook are two separate races back to us, and the
 *  browser usually wins. Rather than claiming an order is paid on the strength
 *  of a URL — which anybody could open — this waits for the webhook and polls
 *  until the order actually says paid.
 *
 *  It gives up after a couple of minutes and tells the customer where to look,
 *  because a spinner that never resolves is worse than an honest "check your
 *  email".
 */

const COPY: Record<string, L> = {
  title: { en: "Confirming your payment…", ar: "جارٍ تأكيد الدفع…" },
  body: {
    en: "This usually takes a few seconds. Do not close this page.",
    ar: "يستغرق هذا عادةً بضع ثوانٍ. لا تغلق هذه الصفحة.",
  },
  slow: {
    en: "This is taking longer than usual. Your payment may still have gone through — check your email, or open your orders in a moment.",
    ar: "يستغرق الأمر وقتاً أطول من المعتاد. قد تكون عملية الدفع قد تمت — تحقق من بريدك أو افتح طلباتك بعد قليل.",
  },
  orderNumber: { en: "Order", ar: "الطلب" },
};

const POLL_MS = 2500;
const GIVE_UP_MS = 120_000;

export function AwaitingPayment({
  orderNumber,
  locale,
}: {
  orderNumber: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const started = Date.now();

    const timer = setInterval(() => {
      if (Date.now() - started > GIVE_UP_MS) {
        setSlow(true);
        clearInterval(timer);
        return;
      }
      // Re-renders the server component, which re-reads the order. When the
      // webhook has landed, this page becomes the confirmation.
      router.refresh();
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <section className="section">
      <div className="shell shell--narrow center">
        <div className="buy-box">
          <p className="eyebrow eyebrow--plain">
            {t(COPY.orderNumber, locale)} {orderNumber}
          </p>
          <h1 className="display d3" style={{ marginTop: ".8rem" }}>
            {t(COPY.title, locale)}
          </h1>
          <p className="body" style={{ marginTop: "1rem" }} role="status" aria-live="polite">
            {slow ? t(COPY.slow, locale) : t(COPY.body, locale)}
          </p>
        </div>
      </div>
    </section>
  );
}
