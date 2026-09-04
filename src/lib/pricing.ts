import { clampDiscount, percentOf, type Fils } from "./money";

/** The pricing engine.
 *
 *  Every surface that shows or charges money goes through here — product card,
 *  product page, cart, checkout, the Stripe session, the order snapshot and the
 *  invoice. Nothing recomputes a price of its own, because the moment two
 *  places calculate the same total they eventually disagree, and the one that
 *  disagrees with Stripe is the one that costs money.
 *
 *  A pure module by design: no database, no `server-only`, no request context.
 *  That is what makes it the one thing in this codebase under unit test.
 *
 *  This file currently covers the **product level** — list price and the
 *  single best discount. Cart totals, coupons, shipping and tax build on
 *  `resolveUnitPrice` and arrive with the cart.
 */

export type DiscountSource = "none" | "permanent" | "sale" | "quote";

/** The subset of a product the engine needs. Deliberately not the Mongoose
 *  document: the engine should be callable with a plain object in a test. */
export type PriceableProduct = {
  id: string;
  pricingMode: "fixed" | "request";
  priceFils: Fils | null;
  permanentDiscount: { type: "percent" | "amount"; value: number } | null;
};

/** One product's entry in a running sale (requirement C6). */
export type SaleEntry = { productId: string; discountPercent: number };

export type UnitPrice = {
  /** Before any discount — shown struck through when something applies. */
  listFils: Fils;
  /** Per unit. Zero when nothing applies. */
  discountFils: Fils;
  /** What the customer actually pays per unit. */
  finalFils: Fils;
  source: DiscountSource;
  /** Rounded, for a "20% off" badge. Zero when there is no discount. */
  percentOff: number;
};

/** A request-price product has no price to resolve — it is quoted per enquiry
 *  (C1). Callers must handle null rather than being handed a zero. */
export function resolveUnitPrice(
  product: PriceableProduct,
  saleDiscountPercent = 0,
): UnitPrice | null {
  if (product.pricingMode === "request" || product.priceFils === null) return null;

  const listFils = product.priceFils;

  // Two candidate discounts, both expressed in fils so they can be compared.
  const saleFils = saleDiscountPercent > 0 ? percentOf(listFils, saleDiscountPercent) : 0;

  const permanentFils = product.permanentDiscount
    ? product.permanentDiscount.type === "percent"
      ? percentOf(listFils, product.permanentDiscount.value)
      : product.permanentDiscount.value
    : 0;

  // The client's rule: the larger of the two wins, and they never stack (C7).
  // Ties go to the sale, because a sale is the deliberate, time-boxed decision.
  let discountFils = 0;
  let source: DiscountSource = "none";

  if (saleFils > 0 && saleFils >= permanentFils) {
    discountFils = saleFils;
    source = "sale";
  } else if (permanentFils > 0) {
    discountFils = permanentFils;
    source = "permanent";
  }

  // An amount-off discount is admin-entered and could exceed the price if the
  // price were later lowered; nothing may ever be sold for less than nothing.
  discountFils = clampDiscount(discountFils, listFils);
  if (discountFils === 0) source = "none";

  return {
    listFils,
    discountFils,
    finalFils: listFils - discountFils,
    source,
    percentOff: discountFils === 0 ? 0 : Math.round((discountFils / listFils) * 100),
  };
}

/** A sale is live only when it is switched on *and* now falls inside its
 *  window, so sales start and end on their own with nothing running at
 *  midnight to make prices correct. */
export function isSaleLive(
  sale: { active: boolean; startAt: Date | string; endAt: Date | string },
  now: Date = new Date(),
): boolean {
  if (!sale.active) return false;
  const start = new Date(sale.startAt).getTime();
  const end = new Date(sale.endAt).getTime();
  const at = now.getTime();
  return at >= start && at <= end;
}

/** Collapses every live sale into one discount per product.
 *
 *  Sales can overlap — a seasonal sale and a clearance can both list the same
 *  product — and the customer gets the better of the two rather than the one
 *  that happens to be found first. */
export function bestSaleDiscounts(
  sales: { active: boolean; startAt: Date | string; endAt: Date | string; entries: SaleEntry[] }[],
  now: Date = new Date(),
): Map<string, number> {
  const best = new Map<string, number>();

  for (const sale of sales) {
    if (!isSaleLive(sale, now)) continue;
    for (const entry of sale.entries) {
      const current = best.get(entry.productId) ?? 0;
      if (entry.discountPercent > current) best.set(entry.productId, entry.discountPercent);
    }
  }

  return best;
}

// --- Stock -------------------------------------------------------------------

export type StockState = "in" | "low" | "out" | "untracked";

/** Requirement C12: one threshold from settings drives the public "Only X
 *  left" notice as well as the admin alerts. */
export function stockStateOf(
  product: { trackInventory: boolean; stock: number },
  lowStockThreshold: number,
): StockState {
  if (!product.trackInventory) return "untracked";
  if (product.stock <= 0) return "out";
  if (product.stock <= lowStockThreshold) return "low";
  return "in";
}

/** Whether this product can go in a basket at all. Request-price products
 *  cannot: they are bought through an accepted quote instead. */
export function isBuyable(
  product: PriceableProduct & { trackInventory: boolean; stock: number; status: string },
  lowStockThreshold: number,
): boolean {
  if (product.status !== "published") return false;
  if (product.pricingMode !== "fixed" || product.priceFils === null) return false;
  return stockStateOf(product, lowStockThreshold) !== "out";
}
