import { SHOP } from "@/content/shop";
import type { UnitPrice } from "@/lib/pricing";
import { formatFils, t, type Locale } from "@/lib/i18n";

/** Price display, in one place.
 *
 *  A discounted price is three facts, not one: what it costs now, what it cost
 *  before, and how much is off. Showing only the new number asks the customer
 *  to take the saving on trust; showing the old one struck through is what
 *  makes the discount legible — and it is what the permanent discount and sale
 *  features exist to produce (C6, C7).
 *
 *  A request-price product has no price at all (C1), and says so rather than
 *  rendering a zero.
 */
export function Price({
  price,
  locale,
  size = "md",
  showOff = true,
}: {
  price: UnitPrice | null;
  locale: Locale;
  size?: "sm" | "md" | "lg";
  /** Off when a sibling already names the cut — the sale banner on the PDP. */
  showOff?: boolean;
}) {
  if (!price) {
    return <span className={`price price--pending price--${size}`}>{t(SHOP.priceOnRequest, locale)}</span>;
  }

  const now = formatFils(price.finalFils, locale);

  if (price.source === "none") {
    return <span className={`price price--${size}`}>{now}</span>;
  }

  return (
    <span className={`price price--${size} price--cut`}>
      <span className="price__now">{now}</span>
      {/* The old price is decoration for a sighted reader and noise for a
          screen reader, which would otherwise read two prices in a row with no
          way to tell which one applies. */}
      <s className="price__was" aria-hidden="true">
        {formatFils(price.listFils, locale)}
      </s>
      {showOff ? (
        <span className="price__off">
          {price.percentOff}% {t(SHOP.off, locale)}
        </span>
      ) : null}
    </span>
  );
}
