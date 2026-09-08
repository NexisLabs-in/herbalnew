import "server-only";
import { findCart, priceCartView, type CartView } from "./cart";
import { connectDb } from "./db";
import { Order } from "./models/Order";
import { Product, type ProductDoc } from "./models/Product";
import { nextOrderNumber } from "./models/Counter";
import type { AddressInput } from "./validation/checkout";
import type { Locale } from "./i18n";
import type { CustomerDoc } from "./models/Customer";

/** Turning a basket into an order.
 *
 *  The rule that governs this file: **the server prices the order, not the
 *  browser.** Nothing the client sends is trusted — not the totals, not the
 *  line prices, not even the quantities beyond "how many did you want". The
 *  cart is re-read from the database, re-priced by the engine, and the result
 *  is what goes to Stripe. A tampered request buys at the real price or not at
 *  all.
 */

export type CheckoutRefusal =
  | { reason: "empty" }
  | { reason: "unavailable"; productNames: string[] }
  | { reason: "coupon_invalid" }
  | { reason: "stock"; productNames: string[] };

export type CheckoutPreparation =
  | { ok: true; cart: CartView }
  | { ok: false; refusal: CheckoutRefusal };

/** Re-checks a basket immediately before payment.
 *
 *  The cart page already flags problems, but a basket can go stale between
 *  looking at it and paying — someone else buys the last one, an admin
 *  unpublishes a product, a coupon expires. This is the check that matters,
 *  because it is the last one before money moves.
 */
export async function prepareCheckout(): Promise<CheckoutPreparation> {
  const cart = await priceCartView(await findCart());

  if (cart.totals.itemCount === 0) return { ok: false, refusal: { reason: "empty" } };

  const unavailable = cart.lines.filter((line) => line.unavailableReason !== null || line.qtyLimit !== null);
  if (unavailable.length > 0) {
    return {
      ok: false,
      refusal: { reason: "unavailable", productNames: unavailable.map((line) => line.name.en) },
    };
  }

  // A coupon that was valid when typed but is not valid now must not silently
  // vanish from the total the customer agreed to.
  if (cart.couponCode && cart.totals.coupon && !cart.totals.coupon.ok) {
    return { ok: false, refusal: { reason: "coupon_invalid" } };
  }

  return { ok: true, cart };
}

/** Creates the pending order.
 *
 *  Every line is a **snapshot** — name, price, discount, image, as they are
 *  right now. Editing or deleting a product later must never rewrite what
 *  somebody already bought, and an invoice reprinted next year has to match the
 *  one sent today.
 *
 *  Stock is *not* decremented here. It is claimed by the webhook when payment
 *  actually succeeds; holding inventory for an unpaid order lets an abandoned
 *  checkout starve the shelf.
 */
export async function createPendingOrder(input: {
  cart: CartView;
  customer: CustomerDoc;
  address: AddressInput & { _id?: unknown };
  locale: Locale;
}) {
  await connectDb();
  const { cart, customer, address, locale } = input;

  const productIds = cart.lines.filter((line) => line.priced).map((line) => line.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean<ProductDoc[]>();
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const items = cart.lines
    .filter((line) => line.priced)
    .map((line) => {
      const product = byId.get(line.productId);
      const priced = line.priced!;
      return {
        productId: line.productId,
        slug: line.slug,
        name: { en: line.name.en, ar: line.name.ar },
        sku: product?.sku ?? "",
        image: line.image ?? "",
        unitPriceFils: priced.unit.listFils,
        discountFils: priced.unit.discountFils,
        discountSource: priced.unit.source,
        qty: priced.qty,
        lineTotalFils: priced.lineTotalFils,
      };
    });

  const totals = cart.totals;

  return Order.create({
    orderNumber: await nextOrderNumber(),
    customerId: customer._id,
    email: customer.email,
    locale,
    items,
    subtotalFils: totals.subtotalFils,
    productDiscountFils: totals.productDiscountFils,
    couponCode: totals.coupon?.ok ? totals.coupon.code : null,
    couponDiscountFils: totals.couponDiscountFils,
    shippingFils: totals.shippingFils,
    taxRate: totals.taxRate,
    taxFils: totals.taxFils,
    grandTotalFils: totals.grandTotalFils,
    shippingAddress: {
      label: address.label ?? "",
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      emirate: address.emirate,
      country: "AE",
    },
    paymentStatus: "pending",
    fulfillmentStatus: "new",
    statusHistory: [],
  });
}
