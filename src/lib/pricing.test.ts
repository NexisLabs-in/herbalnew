import { describe, expect, it } from "vitest";
import { toFils } from "./money";
import {
  bestSaleDiscounts,
  isBuyable,
  isSaleLive,
  resolveUnitPrice,
  stockStateOf,
  type PriceableProduct,
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
