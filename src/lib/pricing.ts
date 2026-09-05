import { clampDiscount, percentOf, sum, type Fils } from "./money";

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
 *  Two levels: `resolveUnitPrice` for one product, and `priceCart` for a whole
 *  basket including the coupon, shipping and tax.
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

// --- Cart totals -------------------------------------------------------------

/** One line as the engine sees it: a resolved unit price and a quantity. */
export type PricedLine = {
  productId: string;
  qty: number;
  unit: UnitPrice;
  /** Before discount. */
  lineListFils: Fils;
  lineDiscountFils: Fils;
  lineTotalFils: Fils;
};

export function priceLine(productId: string, qty: number, unit: UnitPrice): PricedLine {
  return {
    productId,
    qty,
    unit,
    lineListFils: unit.listFils * qty,
    lineDiscountFils: unit.discountFils * qty,
    lineTotalFils: unit.finalFils * qty,
  };
}

/** The subset of a coupon the engine needs (requirement C8). */
export type PriceableCoupon = {
  code: string;
  discountType: "percent" | "amount";
  value: number;
  /** The "select all" shortcut — a flag rather than a snapshot of every id, so
   *  products added later are covered automatically. */
  allProducts: boolean;
  productIds: string[];
  expiresAt: Date | string | null;
  minOrderFils: Fils | null;
  usageLimit: number | null;
  usedCount: number;
  usageLimitPerCustomer: number | null;
  active: boolean;
};

export type CouponRejection =
  | "unknown"
  | "inactive"
  | "expired"
  | "exhausted"
  | "customer_limit"
  | "min_order"
  | "not_covered"
  | "empty_cart";

export type CouponResult =
  | { ok: true; code: string; discountFils: Fils }
  | {
      ok: false;
      code: string;
      reason: CouponRejection;
      /** Set for "not_covered" so the message can name what is in the way. */
      offendingProductId?: string;
      /** Set for "min_order" so the message can say how much more is needed. */
      minOrderFils?: Fils;
    };

/** Validates and values a coupon against a cart.
 *
 *  The client's rule is deliberate and unusual (C8): a coupon carries a
 *  hand-picked product list, it discounts the **whole cart**, and it is
 *  **rejected outright** if the cart contains anything outside that list. It is
 *  never applied to part of a basket. Rejecting names the product in the way,
 *  because "invalid coupon" on a five-item cart is a puzzle, not a message.
 */
export function evaluateCoupon(
  coupon: PriceableCoupon | null,
  lines: PricedLine[],
  discountedSubtotalFils: Fils,
  options: { now?: Date; customerRedemptions?: number } = {},
): CouponResult | null {
  if (!coupon) return null;

  const now = options.now ?? new Date();
  const code = coupon.code;

  if (lines.length === 0) return { ok: false, code, reason: "empty_cart" };
  if (!coupon.active) return { ok: false, code, reason: "inactive" };

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return { ok: false, code, reason: "expired" };
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, code, reason: "exhausted" };
  }

  if (
    coupon.usageLimitPerCustomer !== null &&
    (options.customerRedemptions ?? 0) >= coupon.usageLimitPerCustomer
  ) {
    return { ok: false, code, reason: "customer_limit" };
  }

  // All or nothing: one uncovered product rejects the whole coupon.
  if (!coupon.allProducts) {
    const covered = new Set(coupon.productIds);
    const offending = lines.find((line) => !covered.has(line.productId));
    if (offending) {
      return { ok: false, code, reason: "not_covered", offendingProductId: offending.productId };
    }
  }

  if (coupon.minOrderFils !== null && discountedSubtotalFils < coupon.minOrderFils) {
    return { ok: false, code, reason: "min_order", minOrderFils: coupon.minOrderFils };
  }

  const raw =
    coupon.discountType === "percent"
      ? percentOf(discountedSubtotalFils, coupon.value)
      : coupon.value;

  // A 50 AED coupon on a 30 AED cart takes the cart to zero, never below it,
  // and never eats into shipping.
  return { ok: true, code, discountFils: clampDiscount(raw, discountedSubtotalFils) };
}

/** Shipping and tax configuration, as the engine needs it (C11). */
export type PricingSettings = {
  shipping: { flatRateFils: Fils; freeAboveFils: Fils | null };
  tax: { enabled: boolean; ratePercent: number };
};

export type CartTotals = {
  lines: PricedLine[];
  itemCount: number;
  /** Sum of list prices, before any discount. */
  subtotalFils: Fils;
  /** Sale and permanent discounts, summed. */
  productDiscountFils: Fils;
  /** What the goods cost after product-level discounts. */
  discountedSubtotalFils: Fils;
  coupon: CouponResult | null;
  couponDiscountFils: Fils;
  /** Goods total the customer actually pays, after the coupon. */
  goodsTotalFils: Fils;
  shippingFils: Fils;
  /** How much more to spend for free shipping, or null when it does not apply
   *  — drives the "spend X more" nudge. */
  freeShippingRemainingFils: Fils | null;
  taxRate: number;
  taxFils: Fils;
  grandTotalFils: Fils;
};

/** The whole cart, priced.
 *
 *  Order matters and follows the plan (§6): product discounts, then the coupon
 *  on what is left, then shipping, then tax on goods-plus-shipping.
 *
 *  Free shipping is judged on the goods total **after** the coupon — what the
 *  customer actually pays for goods, not what they would have paid. That is the
 *  conventional reading and the conservative one; the alternative lets a coupon
 *  buy free shipping it did not earn.
 */
export function priceCart(input: {
  lines: PricedLine[];
  coupon?: PriceableCoupon | null;
  settings: PricingSettings;
  now?: Date;
  customerRedemptions?: number;
}): CartTotals {
  const { lines, settings } = input;

  const subtotalFils = sum(lines.map((line) => line.lineListFils));
  const productDiscountFils = sum(lines.map((line) => line.lineDiscountFils));
  const discountedSubtotalFils = sum(lines.map((line) => line.lineTotalFils));

  const coupon = evaluateCoupon(input.coupon ?? null, lines, discountedSubtotalFils, {
    now: input.now,
    customerRedemptions: input.customerRedemptions,
  });
  const couponDiscountFils = coupon?.ok ? coupon.discountFils : 0;
  const goodsTotalFils = discountedSubtotalFils - couponDiscountFils;

  // An empty cart is not charged for delivery.
  const { flatRateFils, freeAboveFils } = settings.shipping;
  const qualifiesFree = freeAboveFils !== null && goodsTotalFils >= freeAboveFils;
  const shippingFils = lines.length === 0 || qualifiesFree ? 0 : flatRateFils;

  const freeShippingRemainingFils =
    freeAboveFils === null || qualifiesFree || lines.length === 0
      ? null
      : freeAboveFils - goodsTotalFils;

  const taxRate = settings.tax.enabled ? settings.tax.ratePercent : 0;
  const taxFils = taxRate > 0 ? percentOf(goodsTotalFils + shippingFils, taxRate) : 0;

  return {
    lines,
    itemCount: lines.reduce((total, line) => total + line.qty, 0),
    subtotalFils,
    productDiscountFils,
    discountedSubtotalFils,
    coupon,
    couponDiscountFils,
    goodsTotalFils,
    shippingFils,
    freeShippingRemainingFils,
    taxRate,
    taxFils,
    grandTotalFils: goodsTotalFils + shippingFils + taxFils,
  };
}
