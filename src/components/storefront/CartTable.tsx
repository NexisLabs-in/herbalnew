"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SHOP } from "@/content/shop";
import type { CartLineView } from "@/lib/cart";
import { formatFils, localePath, t, tl, type Locale } from "@/lib/i18n";
import { removeFromCart, removeUnavailable, setCartQty } from "@/server/actions/cart";
import { notifyCartChanged } from "./CartCount";

/** The basket lines.
 *
 *  Lines that cannot be bought are shown rather than silently dropped — a
 *  basket that quietly loses an item leaves the customer wondering whether they
 *  added it. They are marked, excluded from the totals, and can be cleared in
 *  one action.
 */
export function CartTable({
  lines,
  locale,
  blocked,
}: {
  lines: CartLineView[];
  locale: Locale;
  blocked: CartLineView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (action: () => Promise<unknown>) =>
    start(async () => {
      await action();
      notifyCartChanged();
      router.refresh();
    });

  const reasonLabel = (line: CartLineView) => {
    if (line.unavailableReason === "gone") return t(SHOP.lineGone, locale);
    if (line.unavailableReason === "out_of_stock") return t(SHOP.lineOutOfStock, locale);
    if (line.unavailableReason === "request_price") return t(SHOP.lineRequestPrice, locale);
    if (line.qtyLimit === "below_min") {
      return t(SHOP.lineBelowMin, locale).replace("{qty}", String(line.minQty));
    }
    if (line.qtyLimit === "above_max") {
      return t(SHOP.lineAboveMax, locale).replace("{qty}", String(line.maxQty));
    }
    if (line.availableQty !== null) {
      return t(SHOP.lineReduced, locale).replace("{qty}", String(line.availableQty));
    }
    return null;
  };

  return (
    <div className="cart-lines">
      {blocked.some((line) => line.unavailableReason) ? (
        <div className="cart-alert" role="alert">
          <span>{t(SHOP.cartBlocked, locale)}</span>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                removeUnavailable(
                  blocked.filter((line) => line.unavailableReason).map((line) => line.productId),
                ),
              )
            }
          >
            {t(SHOP.removeUnavailable, locale)}
          </button>
        </div>
      ) : null}

      {lines.map((line) => {
        const note = reasonLabel(line);
        const href = localePath(locale, `/shop/${line.slug}`);

        return (
          <article
            className={`cart-line${line.unavailableReason ? " cart-line--blocked" : ""}`}
            key={line.productId}
          >
            <div className="cart-line__media">
              {line.image ? (
                <Image
                  src={line.image}
                  alt={tl(line.name, locale)}
                  width={96}
                  height={96}
                  unoptimized={!line.image.startsWith("/img/")}
                />
              ) : (
                <div className="cart-line__placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="cart-line__body">
              <h3 className="cart-line__name">
                {line.slug ? <Link href={href}>{tl(line.name, locale)}</Link> : tl(line.name, locale)}
              </h3>

              {line.priced ? (
                <p className="cart-line__unit">
                  {formatFils(line.priced.unit.finalFils, locale)}
                  {line.priced.unit.source !== "none" ? (
                    <>
                      {" "}
                      <s aria-hidden="true">{formatFils(line.priced.unit.listFils, locale)}</s>
                    </>
                  ) : null}
                </p>
              ) : null}

              {note ? <p className="cart-line__note">{note}</p> : null}
            </div>

            <div className="cart-line__qty">
              {line.unavailableReason ? null : (
                <div className="qty qty--sm">
                  <button
                    type="button"
                    className="qty__btn"
                    aria-label="−"
                    disabled={pending || line.qty <= line.minQty}
                    onClick={() => run(() => setCartQty(line.productId, line.qty - 1, locale))}
                  >
                    −
                  </button>
                  <span className="qty__value" aria-live="polite">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    className="qty__btn"
                    aria-label="+"
                    disabled={pending || (line.maxQty !== null && line.qty >= line.maxQty)}
                    onClick={() =>
                      run(() =>
                        setCartQty(
                          line.productId,
                          line.maxQty !== null && line.qty > line.maxQty
                            ? line.maxQty
                            : line.qty + 1,
                          locale,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            <div className="cart-line__total">
              {line.priced ? <strong>{formatFils(line.priced.lineTotalFils, locale)}</strong> : null}
              <button
                className="link-plain"
                type="button"
                disabled={pending}
                onClick={() => run(() => removeFromCart(line.productId))}
              >
                {t(SHOP.remove, locale)}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
