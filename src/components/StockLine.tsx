import { SHOP } from "@/content/shop";
import type { StockState } from "@/lib/pricing";
import { t, type Locale } from "@/lib/i18n";

/** Stock, as a customer sees it (requirement C12).
 *
 *  "Only 3 left" is the one number here that has to be exact: it is a claim
 *  about scarcity, and an inflated one is a dark pattern. It comes straight
 *  from the stock count and appears only at or below the threshold the admin
 *  set — the same threshold that triggers their own low-stock email.
 *
 *  An untracked product says nothing at all. Announcing "in stock" for
 *  something nobody is counting would be a guess dressed as a fact.
 */
export function StockLine({
  state,
  stock,
  locale,
  showInStock = false,
}: {
  state: StockState;
  stock: number;
  locale: Locale;
  showInStock?: boolean;
}) {
  if (state === "untracked") return null;

  if (state === "out") {
    return <span className="stock stock--out">{t(SHOP.outOfStock, locale)}</span>;
  }

  if (state === "low") {
    const label =
      stock === 1
        ? t(SHOP.onlyLeftOne, locale)
        : `${t(SHOP.onlyLeftPrefix, locale)} ${stock} ${t(SHOP.onlyLeftSuffix, locale)}`;
    return <span className="stock stock--low">{label}</span>;
  }

  if (!showInStock) return null;
  return <span className="stock stock--in">{t(SHOP.inStock, locale)}</span>;
}
