"use client";

import { useEffect, useState } from "react";
import { SHOP } from "@/content/shop";
import { t, type Locale } from "@/lib/i18n";
import { Icon } from "./Icon";

/** Pale offer strip: name, end date, and a live countdown. Matches the
 *  product-page sale tile — a standing discount never renders this. */

type Remain = { days: number; hours: number; minutes: number; seconds: number };

function remainUntil(endAt: string, now: number): Remain {
  const total = Math.max(0, Math.floor((new Date(endAt).getTime() - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function SaleCallout({
  name,
  endAt,
  locale,
}: {
  name: string;
  endAt: string;
  locale: Locale;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remain = remainUntil(endAt, now);
  const ends = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(endAt));
  const title = name.trim() || t(SHOP.saleLimited, locale);

  const units = [
    { value: remain.days, label: t(SHOP.saleDays, locale) },
    { value: remain.hours, label: t(SHOP.saleHours, locale) },
    { value: remain.minutes, label: t(SHOP.saleMins, locale) },
    { value: remain.seconds, label: t(SHOP.saleSecs, locale) },
  ];

  return (
    <aside className="sale-callout" aria-label={t(SHOP.saleSpecial, locale)}>
      <div className="sale-callout__lead">
        <span className="sale-callout__icon" aria-hidden="true">
          <Icon name="tag" size={18} />
        </span>
        <div>
          <p className="sale-callout__kicker">{t(SHOP.saleSpecial, locale)}</p>
          <p className="sale-callout__meta">
            {title}
            <span aria-hidden="true"> • </span>
            {t(SHOP.saleEnds, locale)} {ends}
          </p>
        </div>
      </div>

      <ol className="sale-callout__clock" aria-hidden="true" suppressHydrationWarning>
        {units.map((unit) => (
          <li key={unit.label} className="sale-callout__unit">
            <span className="sale-callout__num">{pad(unit.value)}</span>
            <span className="sale-callout__lbl">{unit.label}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
