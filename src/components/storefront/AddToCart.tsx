"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHOP } from "@/content/shop";
import { Icon } from "@/components/Icon";
import { addToCart } from "@/server/actions/cart";
import { notifyCartChanged } from "./CartCount";
import { localePath, t, type Locale } from "@/lib/i18n";

/** Quantity and Add to basket.
 *
 *  Stays on the page after adding rather than pushing the customer to the
 *  basket: somebody buying two things should not have to navigate back. The
 *  confirmation carries the link for those who do want to go.
 */
export function AddToCart({
  productId,
  locale,
  minQty = 1,
  maxQty,
  compact = false,
}: {
  productId: string;
  locale: Locale;
  /** Fewest units in one order. The stepper cannot go below this. */
  minQty?: number;
  /** Live stock and the product maximum, already combined. */
  maxQty?: number | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const floor = Math.max(1, minQty);
  const [qty, setQty] = useState(floor);
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ error?: string; notice?: string } | null>(null);

  const ceiling = maxQty && maxQty > 0 ? Math.min(Math.max(maxQty, floor), 99) : 99;

  const submit = () =>
    start(async () => {
      const result = await addToCart(productId, qty, locale);
      setState(result);
      // The header badge fetches its own count, and the page may show stock
      // that this add has just changed.
      if (result.ok) {
        notifyCartChanged();
        router.refresh();
      }
    });

  return (
    <div className="addcart">
      {state?.error ? (
        <p className="field__error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="addcart__row">
        <label className="visually-hidden" htmlFor={`qty-${productId}`}>
          {t(SHOP.quantity, locale)}
        </label>
        <div className="qty">
          <button
            type="button"
            className="qty__btn"
            aria-label="−"
            disabled={qty <= floor || pending}
            onClick={() => setQty((current) => Math.max(floor, current - 1))}
          >
            −
          </button>
          <input
            className="qty__input"
            id={`qty-${productId}`}
            type="number"
            min={floor}
            max={ceiling}
            value={qty}
            dir="ltr"
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              setQty(Number.isFinite(next) ? Math.min(Math.max(floor, next), ceiling) : floor);
            }}
          />
          <button
            type="button"
            className="qty__btn"
            aria-label="+"
            disabled={qty >= ceiling || pending}
            onClick={() => setQty((current) => Math.min(ceiling, current + 1))}
          >
            +
          </button>
        </div>

        <button
          className={`btn btn--brand${compact ? " btn--sm" : " btn--block"}`}
          type="button"
          disabled={pending}
          onClick={submit}
        >
          {pending ? t(SHOP.adding, locale) : t(SHOP.addToBasket, locale)}
        </button>
      </div>

      {state?.notice ? (
        <p className="addcart__done" role="status">
          <Icon name="check" size={17} strokeWidth={2} className="addcart__done-icon" />
          <span>
            {state.notice}{" "}
            <Link className="link-plain" href={localePath(locale, "/cart")}>
              {t(SHOP.viewBasket, locale)}
            </Link>
          </span>
        </p>
      ) : null}
    </div>
  );
}
