"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { StockNotification } from "@/lib/models/StockNotification";
import { getSettings } from "@/lib/settings";
import { stockAdjustmentSchema } from "@/lib/validation/product";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Stock adjustments.
 *
 *  Adjustments are **relative** (`+12`, `-3`), not absolute. Two admins
 *  counting the same shelf at the same time should add up rather than overwrite
 *  each other, and `$inc` makes that atomic at the database rather than in a
 *  read-modify-write that can lose one of them.
 */
export async function adjustStock(payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("inventory:write");

  const parsed = stockAdjustmentSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the adjustment.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { productId, delta, reason } = parsed.data;
  if (delta === 0) return { error: "Enter an amount to add or remove." };

  await connectDb();
  const settings = await getSettings();

  const product = await Product.findById(productId);
  if (!product) return { error: "That product no longer exists." };

  const before = product.stock;
  const after = before + delta;
  if (after < 0) {
    return { error: `Only ${before} in stock — that would take it below zero.` };
  }

  const wasOutOfStock = before === 0;

  const updated = await Product.findOneAndUpdate(
    // The stock guard is repeated in the query so a concurrent sale cannot slip
    // between the read above and this write and drive the count negative.
    { _id: productId, stock: { $gte: -delta } },
    {
      $inc: { stock: delta },
      // Coming back above the threshold re-arms the low-stock email, so the
      // next dip alerts again instead of staying quiet (C12).
      ...(after > settings.inventory.lowStockThreshold ? { $set: { lowStockAlertedAt: null } } : {}),
    },
    { returnDocument: "after" },
  );

  if (!updated) return { error: "Stock changed while you were editing. Try again." };

  await recordAudit(admin, {
    action: "adjust",
    entity: "Product",
    entityId: productId,
    entityLabel: updated.name.en,
    diff: { stock: { from: before, to: updated.stock }, reason },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath(`/[locale]/shop/${updated.slug}`, "page");
  revalidatePath("/[locale]/shop", "page");

  const waiting =
    wasOutOfStock && updated.stock > 0
      ? await StockNotification.countDocuments({ productId, notifiedAt: null })
      : 0;

  const low = updated.stock <= settings.inventory.lowStockThreshold;

  return {
    ok: true,
    notice:
      `${updated.name.en}: ${before} → ${updated.stock}.` +
      (low ? ` Still at or below the low-stock threshold of ${settings.inventory.lowStockThreshold}.` : "") +
      (waiting ? ` ${waiting} customer${waiting === 1 ? "" : "s"} waiting to be told it is back.` : ""),
  };
}
