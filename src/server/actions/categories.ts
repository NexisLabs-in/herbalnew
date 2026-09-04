"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { categorySchema } from "@/lib/validation/product";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Indication categories — the shelves of the Herb Cabinet.
 *
 *  They are a filter on /shop rather than pages of their own (plan §3), so
 *  there is no SEO copy here and nothing to revalidate beyond the shop.
 */

function revalidateShop() {
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/admin/categories");
}

export async function saveCategory(categoryId: string | null, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("categories:write");

  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Some fields need attention.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();

  try {
    if (categoryId) {
      const category = await Category.findByIdAndUpdate(categoryId, { $set: parsed.data });
      if (!category) return { error: "That category no longer exists." };
      await recordAudit(admin, {
        action: "update",
        entity: "Category",
        entityId: categoryId,
        entityLabel: parsed.data.name.en,
      });
    } else {
      const created = await Category.create(parsed.data);
      await recordAudit(admin, {
        action: "create",
        entity: "Category",
        entityId: String(created._id),
        entityLabel: created.name.en,
      });
    }
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { error: "That web address is already used by another category.", fieldErrors: { slug: "Already in use." } };
    }
    throw error;
  }

  revalidateShop();
  return { ok: true, notice: "Saved." };
}

/** Deleting a category would orphan its products — `categoryId` is required on
 *  a product, so those rows would become unsaveable and their pages would
 *  break. Refused while anything still points at it. */
export async function deleteCategory(categoryId: string): Promise<ActionState> {
  const admin = await requireAdmin("categories:write");
  await connectDb();

  const inUse = await Product.countDocuments({ categoryId, status: { $ne: "archived" } });
  if (inUse > 0) {
    return {
      error: `${inUse} product${inUse === 1 ? " is" : "s are"} still in this category. Move them first, or hide the category instead.`,
    };
  }

  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) return { error: "That category no longer exists." };

  await recordAudit(admin, {
    action: "delete",
    entity: "Category",
    entityId: categoryId,
    entityLabel: category.name.en,
  });

  revalidateShop();
  return { ok: true, notice: `${category.name.en} deleted.` };
}
