import { describe, expect, it } from "vitest";
import { toFils } from "./money";
import {
  bestSaleDiscounts,
  evaluateCoupon,
  isBuyable,
  isSaleLive,
  priceCart,
  priceLine,
  resolveUnitPrice,
  stockStateOf,
  type PriceableCoupon,
  type PriceableProduct,
  type PricingSettings,
} from "./pricing";

/** The pricing engine is the one place a bug costs real money, so it is the one
 *  place with tests. Each case here is a rule from the client's requirements. */

const fixed = (over: Partial<PriceableProduct> = {}): PriceableProduct => ({
  id: "p1",
  pricingMode: "fixed",
  priceFils: toFils(100),
  permanentDiscount: null,
  ...over,
});

describe("resolveUnitPrice", () => {
  it("returns null for a request-price product — it has no price to resolve (C1)", () => {
    expect(resolveUnitPrice(fixed({ pricingMode: "request", priceFils: null }))).toBeNull();
  });

  it("returns the list price when nothing is discounted", () => {
    const price = resolveUnitPrice(fixed());
    expect(price).toMatchObject({
      listFils: 10000,
      discountFils: 0,
      finalFils: 10000,
      source: "none",
      percentOff: 0,
    });
  });

  it("applies a permanent percentage discount (C7)", () => {
    const price = resolveUnitPrice(fixed({ permanentDiscount: { type: "percent", value: 20 } }));
    expect(price).toMatchObject({ discountFils: 2000, finalFils: 8000, source: "permanent", percentOff: 20 });
  });

  it("applies a permanent amount discount", () => {
    const price = resolveUnitPrice(fixed({ permanentDiscount: { type: "amount", value: toFils(15) } }));
    expect(price).toMatchObject({ discountFils: 1500, finalFils: 8500, source: "permanent" });
  });

  it("applies a sale discount when there is no permanent one (C6)", () => {
    const price = resolveUnitPrice(fixed(), 30);
    expect(price).toMatchObject({ discountFils: 3000, finalFils: 7000, source: "sale", percentOff: 30 });
  });

  it("takes the larger discount and never stacks the two (C7)", () => {
    const saleWins = resolveUnitPrice(fixed({ permanentDiscount: { type: "percent", value: 10 } }), 25);
    expect(saleWins).toMatchObject({ discountFils: 2500, source: "sale" });

    const permanentWins = resolveUnitPrice(fixed({ permanentDiscount: { type: "percent", value: 40 } }), 25);
    expect(permanentWins).toMatchObject({ discountFils: 4000, source: "permanent" });
  });

  it("gives a tie to the sale — it is the deliberate, time-boxed decision", () => {
    const price = resolveUnitPrice(fixed({ permanentDiscount: { type: "percent", value: 20 } }), 20);
    expect(price?.source).toBe("sale");
    expect(price?.discountFils).toBe(2000);
  });

  it("never sells below zero, however large the amount discount", () => {
    const price = resolveUnitPrice(fixed({ permanentDiscount: { type: "amount", value: toFils(500) } }));
    expect(price).toMatchObject({ discountFils: 10000, finalFils: 0 });
  });

  it("rounds a fractional discount to whole fils", () => {
    // 15% of 33.33 AED is 4.9995 AED — 500 fils, not 499.95.
    const price = resolveUnitPrice(fixed({ priceFils: 3333 }), 15);
    expect(price?.discountFils).toBe(500);
    expect(price?.finalFils).toBe(2833);
    expect(Number.isInteger(price?.finalFils)).toBe(true);
  });

  it("reports no discount rather than a zero one, so no badge renders (C7)", () => {
    const price = resolveUnitPrice(fixed({ permanentDiscount: { type: "amount", value: 0 } }));
    expect(price?.source).toBe("none");
    expect(price?.percentOff).toBe(0);
  });
});

describe("isSaleLive", () => {
  const window = {
    startAt: new Date("2026-01-10T00:00:00Z"),
    endAt: new Date("2026-01-20T00:00:00Z"),
  };

  it("is live inside its window", () => {
    expect(isSaleLive({ active: true, ...window }, new Date("2026-01-15T12:00:00Z"))).toBe(true);
  });

  it("is not live before it starts or after it ends", () => {
    expect(isSaleLive({ active: true, ...window }, new Date("2026-01-09T23:59:00Z"))).toBe(false);
    expect(isSaleLive({ active: true, ...window }, new Date("2026-01-20T00:00:01Z"))).toBe(false);
  });

  it("is not live when switched off, even inside its window", () => {
    expect(isSaleLive({ active: false, ...window }, new Date("2026-01-15T12:00:00Z"))).toBe(false);
  });
});

describe("bestSaleDiscounts", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const window = { startAt: new Date("2026-01-10"), endAt: new Date("2026-01-20") };

  it("gives the customer the better of two overlapping sales", () => {
    const best = bestSaleDiscounts(
      [
        { active: true, ...window, entries: [{ productId: "p1", discountPercent: 10 }] },
        { active: true, ...window, entries: [{ productId: "p1", discountPercent: 35 }] },
      ],
      now,
    );
    expect(best.get("p1")).toBe(35);
  });

  it("ignores sales that are not live", () => {
    const best = bestSaleDiscounts(
      [
        { active: false, ...window, entries: [{ productId: "p1", discountPercent: 50 }] },
        {
          active: true,
          startAt: new Date("2026-02-01"),
          endAt: new Date("2026-02-10"),
          entries: [{ productId: "p1", discountPercent: 60 }],
        },
      ],
      now,
    );
    expect(best.has("p1")).toBe(false);
  });
});

describe("stockStateOf", () => {
  it('reports "low" at or below the threshold, which is what shows "Only X left" (C12)', () => {
    expect(stockStateOf({ trackInventory: true, stock: 5 }, 5)).toBe("low");
    expect(stockStateOf({ trackInventory: true, stock: 1 }, 5)).toBe("low");
    expect(stockStateOf({ trackInventory: true, stock: 6 }, 5)).toBe("in");
  });

  it("reports out of stock at zero", () => {
    expect(stockStateOf({ trackInventory: true, stock: 0 }, 5)).toBe("out");
  });

  it("reports untracked when stock is not being counted", () => {
    expect(stockStateOf({ trackInventory: false, stock: 0 }, 5)).toBe("untracked");
  });
});

describe("isBuyable", () => {
  const buyable = { ...fixed(), trackInventory: true, stock: 10, status: "published" };

  it("allows a published, in-stock, fixed-price product", () => {
    expect(isBuyable(buyable, 5)).toBe(true);
  });

  it("refuses a request-price product — it is bought through a quote (C1)", () => {
    expect(isBuyable({ ...buyable, pricingMode: "request", priceFils: null }, 5)).toBe(false);
  });

  it("refuses a draft or archived product", () => {
    expect(isBuyable({ ...buyable, status: "draft" }, 5)).toBe(false);
    expect(isBuyable({ ...buyable, status: "archived" }, 5)).toBe(false);
  });

  it("refuses one that is out of stock", () => {
    expect(isBuyable({ ...buyable, stock: 0 }, 5)).toBe(false);
  });

  it("allows an untracked product regardless of its stock number", () => {
    expect(isBuyable({ ...buyable, trackInventory: false, stock: 0 }, 5)).toBe(true);
  });
});

// --- Cart level --------------------------------------------------------------

const line = (productId: string, qty: number, priceAed: number, discountPercent = 0) =>
  priceLine(productId, qty, resolveUnitPrice(fixed({ id: productId, priceFils: toFils(priceAed) }), discountPercent)!);

const coupon = (over: Partial<PriceableCoupon> = {}): PriceableCoupon => ({
  code: "SAVE10",
  discountType: "percent",
  value: 10,
  allProducts: true,
  productIds: [],
  expiresAt: null,
  minOrderFils: null,
  usageLimit: null,
  usedCount: 0,
  usageLimitPerCustomer: null,
  active: true,
  ...over,
});

const settings = (over: Partial<PricingSettings> = {}): PricingSettings => ({
  shipping: { flatRateFils: toFils(25), freeAboveFils: null },
  tax: { enabled: false, ratePercent: 5 },
  ...over,
});

describe("evaluateCoupon — the client's all-or-nothing rule (C8)", () => {
  const lines = [line("p1", 1, 100), line("p2", 2, 50)];
  const total = 20000;

  it("applies to the whole cart when every product is covered", () => {
    const result = evaluateCoupon(coupon({ allProducts: false, productIds: ["p1", "p2"] }), lines, total);
    expect(result).toMatchObject({ ok: true, discountFils: 2000 });
  });

  it("rejects the whole coupon when one product is not covered, and names it", () => {
    const result = evaluateCoupon(coupon({ allProducts: false, productIds: ["p1"] }), lines, total);
    expect(result).toMatchObject({ ok: false, reason: "not_covered", offendingProductId: "p2" });
  });

  it("never applies to only the covered part of a basket", () => {
    const result = evaluateCoupon(coupon({ allProducts: false, productIds: ["p1"] }), lines, total);
    expect(result?.ok).toBe(false);
    expect(result).not.toHaveProperty("discountFils");
  });

  it("covers products added later when select-all was used", () => {
    const result = evaluateCoupon(coupon({ allProducts: true, productIds: [] }), lines, total);
    expect(result?.ok).toBe(true);
  });

  it("rejects an expired, inactive or exhausted coupon", () => {
    const past = new Date("2020-01-01");
    expect(evaluateCoupon(coupon({ expiresAt: past }), lines, total)).toMatchObject({ reason: "expired" });
    expect(evaluateCoupon(coupon({ active: false }), lines, total)).toMatchObject({ reason: "inactive" });
    expect(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), lines, total)).toMatchObject({
      reason: "exhausted",
    });
  });

  it("enforces a per-customer limit", () => {
    const result = evaluateCoupon(coupon({ usageLimitPerCustomer: 1 }), lines, total, {
      customerRedemptions: 1,
    });
    expect(result).toMatchObject({ reason: "customer_limit" });
  });

  it("enforces a minimum order and reports the threshold", () => {
    const result = evaluateCoupon(coupon({ minOrderFils: toFils(500) }), lines, total);
    expect(result).toMatchObject({ reason: "min_order", minOrderFils: 50000 });
  });

  it("takes a fixed amount off, clamped so a cart can never go negative", () => {
    const small = [line("p1", 1, 30)];
    const result = evaluateCoupon(
      coupon({ discountType: "amount", value: toFils(50) }),
      small,
      3000,
    );
    expect(result).toMatchObject({ ok: true, discountFils: 3000 });
  });

  it("rejects on an empty cart rather than discounting nothing", () => {
    expect(evaluateCoupon(coupon(), [], 0)).toMatchObject({ reason: "empty_cart" });
  });
});

describe("priceCart", () => {
  it("totals an undiscounted cart with flat shipping", () => {
    const totals = priceCart({ lines: [line("p1", 2, 100)], settings: settings() });
    expect(totals).toMatchObject({
      itemCount: 2,
      subtotalFils: 20000,
      productDiscountFils: 0,
      goodsTotalFils: 20000,
      shippingFils: 2500,
      taxFils: 0,
      grandTotalFils: 22500,
    });
  });

  it("applies product discounts before the coupon, and never stacks them", () => {
    // 100 AED with a 20% sale = 80; a 10% coupon then takes 8 off, not 10.
    const totals = priceCart({
      lines: [line("p1", 1, 100, 20)],
      coupon: coupon({ value: 10 }),
      settings: settings(),
    });
    expect(totals.productDiscountFils).toBe(2000);
    expect(totals.discountedSubtotalFils).toBe(8000);
    expect(totals.couponDiscountFils).toBe(800);
    expect(totals.goodsTotalFils).toBe(7200);
  });

  it("charges no shipping once the free-shipping threshold is met", () => {
    const config = settings({ shipping: { flatRateFils: toFils(25), freeAboveFils: toFils(150) } });
    const under = priceCart({ lines: [line("p1", 1, 100)], settings: config });
    expect(under.shippingFils).toBe(2500);
    expect(under.freeShippingRemainingFils).toBe(toFils(50));

    const over = priceCart({ lines: [line("p1", 2, 100)], settings: config });
    expect(over.shippingFils).toBe(0);
    expect(over.freeShippingRemainingFils).toBeNull();
  });

  it("judges free shipping on what is actually paid, after the coupon", () => {
    // 160 AED of goods clears a 150 threshold, but a 20% coupon leaves 128.
    const totals = priceCart({
      lines: [line("p1", 1, 160)],
      coupon: coupon({ value: 20 }),
      settings: settings({ shipping: { flatRateFils: toFils(25), freeAboveFils: toFils(150) } }),
    });
    expect(totals.goodsTotalFils).toBe(12800);
    expect(totals.shippingFils).toBe(2500);
  });

  it("adds tax on goods plus shipping when it is switched on", () => {
    const totals = priceCart({
      lines: [line("p1", 1, 100)],
      settings: settings({ tax: { enabled: true, ratePercent: 5 } }),
    });
    // (10000 + 2500) * 5% = 625
    expect(totals.taxFils).toBe(625);
    expect(totals.grandTotalFils).toBe(13125);
  });

  it("charges no shipping and no tax on an empty cart", () => {
    const totals = priceCart({
      lines: [],
      settings: settings({ tax: { enabled: true, ratePercent: 5 } }),
    });
    expect(totals).toMatchObject({ shippingFils: 0, taxFils: 0, grandTotalFils: 0, itemCount: 0 });
  });

  it("leaves the cart priced when a coupon is rejected", () => {
    const totals = priceCart({
      lines: [line("p1", 1, 100), line("p2", 1, 50)],
      coupon: coupon({ allProducts: false, productIds: ["p1"] }),
      settings: settings(),
    });
    expect(totals.coupon).toMatchObject({ ok: false, reason: "not_covered" });
    expect(totals.couponDiscountFils).toBe(0);
    expect(totals.goodsTotalFils).toBe(15000);
  });

  it("keeps every total a whole number of fils", () => {
    const totals = priceCart({
      lines: [line("p1", 3, 33.33, 15)],
      coupon: coupon({ value: 7 }),
      settings: settings({ tax: { enabled: true, ratePercent: 5 } }),
    });
    for (const value of [
      totals.subtotalFils,
      totals.productDiscountFils,
      totals.couponDiscountFils,
      totals.shippingFils,
      totals.taxFils,
      totals.grandTotalFils,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("adds up: goods + shipping + tax equals the grand total", () => {
    const totals = priceCart({
      lines: [line("p1", 2, 89.95, 12), line("p2", 1, 45.5)],
      coupon: coupon({ value: 15 }),
      settings: settings({
        shipping: { flatRateFils: toFils(25), freeAboveFils: toFils(300) },
        tax: { enabled: true, ratePercent: 5 },
      }),
    });
    expect(totals.grandTotalFils).toBe(totals.goodsTotalFils + totals.shippingFils + totals.taxFils);
    expect(totals.discountedSubtotalFils).toBe(totals.subtotalFils - totals.productDiscountFils);
    expect(totals.goodsTotalFils).toBe(totals.discountedSubtotalFils - totals.couponDiscountFils);
  });
});
