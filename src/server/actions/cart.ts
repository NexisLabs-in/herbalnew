"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_LINE_QTY, findCart, openCart } from "@/lib/cart";
import { connectDb } from "@/lib/db";
import { cartExpiry } from "@/lib/models/Cart";
import { Coupon } from "@/lib/models/Coupon";
import { Product } from "@/lib/models/Product";
import { getSettings } from "@/lib/settings";
import { stockStateOf } from "@/lib/pricing";

/** Cart mutations.
 *
 *  Quantities are checked against live stock here as well as at checkout. This
 *  is a courtesy — telling somebody now rather than at the payment step — not
 *  the guarantee. Stock is only truly claimed when the Stripe webhook confirms
 *  payment, because anything earlier lets an abandoned basket hold inventory
 *  hostage.
 */

export type CartActionState = { ok?: boolean; error?: string; notice?: string };

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

function revalidateCart() {
  revalidatePath("/[locale]/cart", "page");
  // The header count lives in the layout, which every page renders.
  revalidatePath("/[locale]", "layout");
}

export async function addToCart(productId: string, qty = 1): Promise<CartActionState> {
  if (!objectId.safeParse(productId).success) return { error: "That product could not be found." };

  await connectDb();
  const settings = await getSettings();

  const product = await Product.findById(productId).lean();
  if (!product || product.status !== "published") {
    return { error: "That product is no longer available." };
  }

  // Request-price products are bought through an accepted quote, never a
  // basket (C1) — enforced here, not only hidden in the UI.
  if (product.pricingMode !== "fixed" || product.priceFils === null) {
    return { error: "This formula is priced per order. Ask for a price instead." };
  }

  if (stockStateOf(product, settings.inventory.lowStockThreshold) === "out") {
    return { error: "That product is out of stock." };
  }

  const cart = await openCart();
  const existing = cart.items.find(
    (item: { productId: unknown }) => String(item.productId) === productId,
  );

  const wanted = Math.min((existing?.qty ?? 0) + Math.max(1, qty), MAX_LINE_QTY);
  const allowed = product.trackInventory ? Math.min(wanted, product.stock) : wanted;

  if (existing) existing.qty = allowed;
  else cart.items.push({ productId: product._id, qty: allowed, addedAt: new Date() });

  cart.expiresAt = cartExpiry();
  await cart.save();
  revalidateCart();

  if (allowed < wanted) {
    return {
      ok: true,
      notice: `Only ${allowed} available — your basket has been set to that.`,
    };
  }
  return { ok: true, notice: "Added to your basket." };
}

export async function setCartQty(productId: string, qty: number): Promise<CartActionState> {
  if (!objectId.safeParse(productId).success) return { error: "That product could not be found." };

  const cart = await findCart();
  if (!cart) return { error: "Your basket is empty." };

  if (qty <= 0) return removeFromCart(productId);

  await connectDb();
  const product = await Product.findById(productId).lean();
  if (!product) return removeFromCart(productId);

  const item = cart.items.find(
    (line: { productId: unknown }) => String(line.productId) === productId,
  );
  if (!item) return { error: "That item is not in your basket." };

  const wanted = Math.min(qty, MAX_LINE_QTY);
  const allowed = product.trackInventory ? Math.min(wanted, product.stock) : wanted;

  if (allowed <= 0) return removeFromCart(productId);

  item.qty = allowed;
  cart.expiresAt = cartExpiry();
  await cart.save();
  revalidateCart();

  if (allowed < wanted) return { ok: true, notice: `Only ${allowed} available.` };
  return { ok: true };
}

export async function removeFromCart(productId: string): Promise<CartActionState> {
  const cart = await findCart();
  if (!cart) return { ok: true };

  cart.set(
    "items",
    cart.items.filter((item: { productId: unknown }) => String(item.productId) !== productId),
  );
  await cart.save();
  revalidateCart();
  return { ok: true };
}

/** Stores the code and lets the pricing engine judge it.
 *
 *  Only the obvious failure — no such code — is caught here. Everything else
 *  (expired, exhausted, minimum not met, and the client's all-or-nothing
 *  product rule) is decided by the engine on every render, because a cart that
 *  qualified when the code was typed may not qualify once another item is
 *  added. Storing the code and re-judging it is the only way that stays true.
 */
export async function applyCoupon(code: string): Promise<CartActionState> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { error: "Enter a code." };

  await connectDb();
  const coupon = await Coupon.findOne({ code: clean }).lean();
  if (!coupon) return { error: "That code is not recognised." };

  const cart = await openCart();
  cart.couponCode = clean;
  await cart.save();
  revalidateCart();

  return { ok: true };
}

export async function removeCoupon(): Promise<CartActionState> {
  const cart = await findCart();
  if (!cart) return { ok: true };

  cart.couponCode = null;
  await cart.save();
  revalidateCart();
  return { ok: true };
}

/** Drops lines that can no longer be bought, so a customer with a stale basket
 *  can clear the blockage in one click instead of removing them one by one. */
export async function removeUnavailable(productIds: string[]): Promise<CartActionState> {
  const cart = await findCart();
  if (!cart) return { ok: true };

  const drop = new Set(productIds);
  cart.set(
    "items",
    cart.items.filter((item: { productId: unknown }) => !drop.has(String(item.productId))),
  );
  await cart.save();
  revalidateCart();
  return { ok: true, notice: "Removed the items that are no longer available." };
}
