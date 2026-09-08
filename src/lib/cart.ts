import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getCustomer } from "./auth/guards";
import { connectDb } from "./db";
import { Cart, cartExpiry, type CartDocument } from "./models/Cart";
import { Coupon } from "./models/Coupon";
import { CouponRedemption } from "./models/Coupon";
import { Product, type ProductDoc } from "./models/Product";
import { Sale } from "./models/Sale";
import {
  bestSaleDiscounts,
  priceCart,
  priceLine,
  resolveUnitPrice,
  stockStateOf,
  type CartTotals,
  type PriceableCoupon,
  type PricedLine,
} from "./pricing";
import { getSettings, toPricingSettings } from "./settings";
import type { TL } from "./i18n";

/** The basket: storage, and turning it into something priced.
 *
 *  Carts live server-side rather than in localStorage, so the same basket
 *  follows a customer between phone and laptop and the abandoned-cart job has
 *  something to read. An anonymous shopper gets a `hb_cart` cookie; on login
 *  that cart merges into the customer's and the anonymous row is deleted.
 *
 *  **No prices are stored in a cart** — only product ids and quantities. Every
 *  total is recomputed on read, so a basket left open across a sale ending, a
 *  price change or a coupon expiring cannot buy at yesterday's terms.
 */

export const CART_COOKIE = "hb_cart";
export const MAX_LINE_QTY = 99;

/** The range a customer may put in one order of this product.
 *
 *  Minimum defaults to 1. An empty maximum means no product cap — stock and
 *  the basket line limit still apply. If stock cannot cover the minimum, the
 *  product cannot be ordered at all. */
export function orderQtyLimits(product: {
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
  trackInventory?: boolean;
  stock?: number;
}): { min: number; max: number; impossible: boolean } {
  const min = Math.min(MAX_LINE_QTY, Math.max(1, product.minOrderQty ?? 1));
  const productMax =
    product.maxOrderQty && product.maxOrderQty > 0 ? product.maxOrderQty : MAX_LINE_QTY;
  let max = Math.min(MAX_LINE_QTY, productMax);
  if (product.trackInventory) max = Math.min(max, Math.max(0, product.stock ?? 0));
  return { min, max, impossible: max < min };
}

export type CartLineView = {
  productId: string;
  slug: string;
  name: TL;
  image: string | null;
  qty: number;
  /** Set when the line can still be bought. Null means it has become
   *  unavailable — unpublished, sold out, or switched to request-price. */
  priced: PricedLine | null;
  unavailableReason: "gone" | "out_of_stock" | "request_price" | null;
  /** How many are actually available, when that is less than the quantity in
   *  the basket. */
  availableQty: number | null;
  /** Allowed order range for the stepper. */
  minQty: number;
  maxQty: number;
  /** Set when the basket quantity is outside the product's order range. */
  qtyLimit: "below_min" | "above_max" | null;
};

export type CartView = {
  cartId: string | null;
  lines: CartLineView[];
  /** Only the lines that can be bought are priced. */
  totals: CartTotals;
  couponCode: string | null;
  /** Lines that cannot be bought and must be dealt with before checkout. */
  problems: CartLineView[];
};

// --- Storage -----------------------------------------------------------------

/** Reads the cart for the current visitor without writing anything.
 *
 *  Safe to call from a page: server components cannot set cookies, so a cart is
 *  only ever created by an action. A visitor with no cookie simply has no cart.
 */
export async function findCart(): Promise<CartDocument | null> {
  await connectDb();

  const customer = await getCustomer();
  if (customer) {
    const owned = await Cart.findOne({ customerId: customer._id });
    if (owned) return owned;
  }

  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (!cartId) return null;

  const cart = await Cart.findOne({ cartId });
  // A cart belonging to somebody else's account is not ours to read.
  if (cart?.customerId && (!customer || String(cart.customerId) !== String(customer._id))) {
    return null;
  }
  return cart;
}

/** Reads or creates the cart. Only for server actions — it sets a cookie. */
export async function openCart(): Promise<CartDocument> {
  const existing = await findCart();
  if (existing) return existing;

  const customer = await getCustomer();
  const cartId = randomUUID();

  const cart = await Cart.create({
    cartId,
    customerId: customer?._id ?? null,
    items: [],
    expiresAt: cartExpiry(),
  });

  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return cart;
}

/** Called after a successful login.
 *
 *  Merging rather than replacing: somebody who filled a basket signed out and
 *  then remembered their account should not lose it, and neither should the
 *  basket already on their account. Quantities add, capped at the line limit.
 */
export async function mergeCartOnLogin(customerId: string): Promise<void> {
  await connectDb();

  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (!cartId) return;

  const anonymous = await Cart.findOne({ cartId, customerId: null });
  if (!anonymous) return;

  const owned = await Cart.findOne({ customerId });

  if (!owned) {
    anonymous.set("customerId", customerId);
    anonymous.expiresAt = cartExpiry();
    await anonymous.save();
    return;
  }

  for (const item of anonymous.items) {
    const existing = owned.items.find(
      (line: { productId: unknown }) => String(line.productId) === String(item.productId),
    );
    if (existing) {
      existing.qty = Math.min(existing.qty + item.qty, MAX_LINE_QTY);
    } else {
      owned.items.push(item);
    }
  }

  // A coupon typed while signed out is worth keeping, but never overwrites one
  // already on the account's cart.
  if (anonymous.couponCode && !owned.couponCode) owned.couponCode = anonymous.couponCode;

  owned.expiresAt = cartExpiry();
  await owned.save();
  await anonymous.deleteOne();
}

// --- Pricing -----------------------------------------------------------------

const tl = (value: { en?: string; ar?: string } | null | undefined): TL => ({
  en: value?.en ?? "",
  ar: value?.ar ?? "",
});

async function loadCoupon(code: string | null): Promise<PriceableCoupon | null> {
  if (!code) return null;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();
  if (!coupon) return null;
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    allProducts: coupon.allProducts,
    productIds: coupon.productIds.map((id: unknown) => String(id)),
    expiresAt: coupon.expiresAt ?? null,
    minOrderFils: coupon.minOrderFils ?? null,
    usageLimit: coupon.usageLimit ?? null,
    usedCount: coupon.usedCount,
    usageLimitPerCustomer: coupon.usageLimitPerCustomer ?? null,
    active: coupon.active,
  };
}

/** Turns a stored cart into priced lines and totals.
 *
 *  Every line is re-checked against the live product on the way through, so a
 *  basket cannot outlive the thing in it. A product that has been unpublished,
 *  sold out or switched to request-price becomes a problem line: shown, kept,
 *  but excluded from the totals and blocking checkout until it is removed.
 */
export async function priceCartView(cart: CartDocument | null): Promise<CartView> {
  await connectDb();
  const settings = await getSettings();

  const empty = (couponCode: string | null = null): CartView => ({
    cartId: cart?.cartId ?? null,
    lines: [],
    totals: priceCart({ lines: [], settings: toPricingSettings(settings) }),
    couponCode,
    problems: [],
  });

  if (!cart || cart.items.length === 0) return empty(cart?.couponCode ?? null);

  const ids = cart.items.map((item: { productId: unknown }) => item.productId);
  const [products, sales] = await Promise.all([
    Product.find({ _id: { $in: ids } }).lean<ProductDoc[]>(),
    Sale.find({
      active: true,
      startAt: { $lte: new Date() },
      endAt: { $gte: new Date() },
    }).lean(),
  ]);

  const saleDiscounts = bestSaleDiscounts(
    sales.map((sale) => ({
      active: sale.active,
      startAt: sale.startAt,
      endAt: sale.endAt,
      entries: sale.entries.map((entry: { productId: unknown; discountPercent: number }) => ({
        productId: String(entry.productId),
        discountPercent: entry.discountPercent,
      })),
    })),
  );

  const byId = new Map(products.map((product) => [String(product._id), product]));
  const lines: CartLineView[] = [];

  for (const item of cart.items) {
    const id = String(item.productId);
    const product = byId.get(id);

    if (!product || product.status !== "published") {
      lines.push({
        productId: id,
        slug: product?.slug ?? "",
        name: tl(product?.name),
        image: null,
        qty: item.qty,
        priced: null,
        unavailableReason: "gone",
        availableQty: null,
        minQty: 1,
        maxQty: MAX_LINE_QTY,
        qtyLimit: null,
      });
      continue;
    }

    const image = product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? null;
    const limits = orderQtyLimits(product);
    const base = {
      productId: id,
      slug: product.slug,
      name: tl(product.name),
      image,
      qty: item.qty,
      minQty: limits.min,
      maxQty: limits.max,
    };

    const unit = resolveUnitPrice(
      {
        id,
        pricingMode: product.pricingMode,
        priceFils: product.priceFils,
        permanentDiscount: product.permanentDiscount ?? null,
      },
      saleDiscounts.get(id) ?? 0,
    );

    if (!unit) {
      // Switched to request-price while sitting in a basket.
      lines.push({ ...base, priced: null, unavailableReason: "request_price", availableQty: null, qtyLimit: null });
      continue;
    }

    const stockState = stockStateOf(product, settings.inventory.lowStockThreshold);
    if (stockState === "out" || limits.impossible) {
      lines.push({ ...base, priced: null, unavailableReason: "out_of_stock", availableQty: 0, qtyLimit: null });
      continue;
    }

    // More in the basket than on the shelf: price what can actually be sold and
    // tell the customer, rather than failing silently at checkout.
    const available = product.trackInventory ? Math.min(item.qty, product.stock) : item.qty;
    const qtyLimit = item.qty < limits.min ? "below_min" : item.qty > limits.max ? "above_max" : null;

    lines.push({
      ...base,
      // An out-of-range line is not priced, so it cannot slip into checkout.
      priced: qtyLimit ? null : priceLine(id, available, unit),
      unavailableReason: null,
      availableQty: available < item.qty ? available : null,
      qtyLimit,
    });
  }

  const priced = lines.filter((line) => line.priced).map((line) => line.priced!);
  const customer = await getCustomer();

  const customerRedemptions =
    customer && cart.couponCode
      ? await CouponRedemption.countDocuments({
          customerId: customer._id,
          couponId: (await Coupon.findOne({ code: cart.couponCode }).select("_id").lean())?._id,
        })
      : 0;

  return {
    cartId: cart.cartId,
    lines,
    totals: priceCart({
      lines: priced,
      coupon: await loadCoupon(cart.couponCode ?? null),
      settings: toPricingSettings(settings),
      customerRedemptions,
    }),
    couponCode: cart.couponCode ?? null,
    problems: lines.filter(
      (line) => line.unavailableReason !== null || line.availableQty !== null || line.qtyLimit !== null,
    ),
  };
}

/** The number on the header basket icon. Kept separate from the full view so
 *  the layout does not price the whole cart on every page. */
export async function cartItemCount(): Promise<number> {
  const cart = await findCart();
  if (!cart) return 0;
  return cart.items.reduce((total: number, item: { qty: number }) => total + item.qty, 0);
}
