/** Money is integer **fils** everywhere — 1 AED = 100 fils.
 *
 *  Floats cannot represent 0.10 exactly, so a percentage discount on a float
 *  price drifts by a hundredth here and there and a cart stops adding up to its
 *  own total. Every amount that crosses a boundary — DB, Stripe, invoice — is an
 *  integer. Stripe's own API takes the minor unit too, so no conversion is
 *  needed at the payment edge.
 */

export type Fils = number;

/** 12.5 -> 1250. For seeds, admin input and tests; never inside the engine. */
export function toFils(aed: number): Fils {
  return Math.round(aed * 100);
}

/** 1250 -> 12.5. Display and Stripe metadata only. */
export function toAed(fils: Fils): number {
  return fils / 100;
}

/** Parses an admin's typed price ("12.50", "12,50", " 12 ") into fils.
 *  Returns null for anything that is not a non-negative amount, so callers can
 *  report a field error instead of storing NaN. */
export function parseAedInput(input: string): Fils | null {
  const cleaned = input.trim().replace(/,/g, ".").replace(/\s/g, "");
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return toFils(Number(cleaned));
}

/** A percentage of an amount, rounded half-up to whole fils.
 *  Used for discounts and tax; the single rounding point per step. */
export function percentOf(amount: Fils, percent: number): Fils {
  return Math.round((amount * percent) / 100);
}

/** Clamps a discount so it can never exceed the thing being discounted —
 *  a 30 AED coupon on a 20 AED cart must not produce a negative total. */
export function clampDiscount(discount: Fils, ceiling: Fils): Fils {
  return Math.max(0, Math.min(discount, ceiling));
}

export function sum(values: Fils[]): Fils {
  return values.reduce((total, value) => total + value, 0);
}
