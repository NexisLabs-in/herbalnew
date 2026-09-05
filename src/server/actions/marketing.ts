"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Coupon } from "@/lib/models/Coupon";
import { Product } from "@/lib/models/Product";
import { Sale } from "@/lib/models/Sale";
import { couponSchema, featuredSchema, saleSchema } from "@/lib/validation/marketing";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Sales (C6), coupons (C8) and the homepage featured list (C10).
 *
 *  All three change what customers pay or see, so all three invalidate the
 *  storefront caches on write.
 */

function revalidateStorefront() {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]/shop/[slug]", "page");
  revalidatePath("/[locale]/cart", "page");
}

// --- Sales -------------------------------------------------------------------

export async function saveSale(saleId: string | null, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("sales:write");

  const parsed = saleSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the sale.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const data = {
    name: parsed.data.name,
    startAt: new Date(parsed.data.startAt),
    endAt: new Date(parsed.data.endAt),
    active: parsed.data.active,
    entries: parsed.data.entries,
  };

  if (saleId) {
    const sale = await Sale.findById(saleId);
    if (!sale) return { error: "That sale no longer exists." };
    sale.set(data);
    await sale.save();
    await recordAudit(admin, { action: "update", entity: "Sale", entityId: saleId, entityLabel: data.name });
  } else {
    const created = await Sale.create(data);
    await recordAudit(admin, {
      action: "create",
      entity: "Sale",
      entityId: String(created._id),
      entityLabel: data.name,
    });
  }

  revalidateStorefront();
  revalidatePath("/admin/sales");
  return { ok: true, notice: "Saved." };
}

/** Pausing rather than deleting keeps the dates and the product list, so a
 *  seasonal sale can be switched back on next year. */
export async function setSaleActive(saleId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin("sales:write");
  await connectDb();

  const sale = await Sale.findByIdAndUpdate(saleId, { $set: { active } });
  if (!sale) return { error: "That sale no longer exists." };

  await recordAudit(admin, {
    action: "update",
    entity: "Sale",
    entityId: saleId,
    entityLabel: sale.name,
    diff: { active },
  });

  revalidateStorefront();
  revalidatePath("/admin/sales");
  return { ok: true, notice: active ? "Sale switched on." : "Sale paused." };
}

export async function deleteSale(saleId: string): Promise<ActionState> {
  const admin = await requireAdmin("sales:write");
  await connectDb();

  const sale = await Sale.findByIdAndDelete(saleId);
  if (!sale) return { error: "That sale no longer exists." };

  await recordAudit(admin, { action: "delete", entity: "Sale", entityId: saleId, entityLabel: sale.name });
  revalidateStorefront();
  revalidatePath("/admin/sales");
  return { ok: true, notice: `${sale.name} deleted.` };
}

// --- Coupons -----------------------------------------------------------------

export async function saveCoupon(couponId: string | null, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("coupons:write");

  const parsed = couponSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the coupon.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const input = parsed.data;

  const data = {
    code: input.code,
    description: input.description,
    discountType: input.discountType,
    value: input.discountType === "percent" ? (input.percentValue ?? 0) : (input.amountValue ?? 0),
    allProducts: input.allProducts,
    // Selecting all stores the flag, not the ids — products added tomorrow are
    // covered without anybody editing the coupon.
    productIds: input.allProducts ? [] : input.productIds,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    minOrderFils: input.minOrder,
    usageLimit: input.usageLimit,
    usageLimitPerCustomer: input.usageLimitPerCustomer,
    active: input.active,
  };

  try {
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      if (!coupon) return { error: "That coupon no longer exists." };
      // usedCount is never overwritten from a form — it is a record of what
      // happened, not a setting.
      coupon.set(data);
      await coupon.save();
      await recordAudit(admin, { action: "update", entity: "Coupon", entityId: couponId, entityLabel: data.code });
    } else {
      const created = await Coupon.create(data);
      await recordAudit(admin, {
        action: "create",
        entity: "Coupon",
        entityId: String(created._id),
        entityLabel: data.code,
      });
    }
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { error: "That code already exists.", fieldErrors: { code: "Already in use." } };
    }
    throw error;
  }

  revalidatePath("/admin/coupons");
  return { ok: true, notice: "Saved." };
}

export async function setCouponActive(couponId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin("coupons:write");
  await connectDb();

  const coupon = await Coupon.findByIdAndUpdate(couponId, { $set: { active } });
  if (!coupon) return { error: "That coupon no longer exists." };

  await recordAudit(admin, {
    action: "update",
    entity: "Coupon",
    entityId: couponId,
    entityLabel: coupon.code,
    diff: { active },
  });

  revalidatePath("/admin/coupons");
  return { ok: true, notice: active ? "Coupon switched on." : "Coupon switched off." };
}

/** Deactivating is almost always what is meant; deleting loses the record of
 *  what was redeemed against it, so it is refused once a coupon has been used. */
export async function deleteCoupon(couponId: string): Promise<ActionState> {
  const admin = await requireAdmin("coupons:write");
  await connectDb();

  const coupon = await Coupon.findById(couponId);
  if (!coupon) return { error: "That coupon no longer exists." };

  if (coupon.usedCount > 0) {
    return {
      error: `${coupon.code} has been used ${coupon.usedCount} time${coupon.usedCount === 1 ? "" : "s"}. Switch it off instead, so the orders that used it keep their history.`,
    };
  }

  await coupon.deleteOne();
  await recordAudit(admin, {
    action: "delete",
    entity: "Coupon",
    entityId: couponId,
    entityLabel: coupon.code,
  });

  revalidatePath("/admin/coupons");
  return { ok: true, notice: `${coupon.code} deleted.` };
}

// --- Featured (C10) ----------------------------------------------------------

export async function saveFeatured(payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("featured:write");

  const parsed = featuredSchema.safeParse(payload);
  if (!parsed.success) return { error: "Check the selection." };

  await connectDb();
  const chosen = parsed.data.entries;

  // Anything not chosen is unfeatured, so the list on screen is the list on the
  // homepage — no orphaned flags left behind.
  await Product.updateMany({ featured: true }, { $set: { featured: false } });

  for (const entry of chosen) {
    await Product.updateOne(
      { _id: entry.productId, status: "published" },
      { $set: { featured: true, featuredOrder: entry.order } },
    );
  }

  await recordAudit(admin, {
    action: "update",
    entity: "Product",
    entityLabel: "Featured products",
    diff: { featured: chosen.length },
  });

  revalidateStorefront();
  revalidatePath("/admin/featured");
  return { ok: true, notice: `${chosen.length} product${chosen.length === 1 ? "" : "s"} featured.` };
}
