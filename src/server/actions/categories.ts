"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { categorySchema } from "@/lib/validation/product";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Indication categories, two levels deep.
 *
 *  The rules enforced here are the ones a schema cannot see, because each needs
 *  to look at the other categories:
 *
 *    - **Exactly two levels.** A subcategory cannot become a parent, and a
 *      category that already has children cannot be moved under someone else.
 *    - **Products live on subcategories.** A parent is a grouping; making one
 *      hold products directly would make "everything under Beauty" ambiguous.
 *    - **Nothing is deleted out from under something that references it.**
 */

function revalidateShop() {
  revalidatePath("/[locale]/shop", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function saveCategory(categoryId: string | null, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("categories:write");

  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Some fields need attention.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const { parentId, ...rest } = parsed.data;
  const parent = parentId || null;

  if (parent) {
    const proposed = await Category.findById(parent);
    if (!proposed) {
      return { error: "That parent category no longer exists.", fieldErrors: { parentId: "Choose again." } };
    }
    // Two levels, no more.
    if (proposed.parentId) {
      return {
        error: "Categories go two levels deep. Pick a top-level category as the parent.",
        fieldErrors: { parentId: "This is already a subcategory." },
      };
    }
    if (categoryId && String(proposed._id) === categoryId) {
      return { error: "A category cannot be its own parent.", fieldErrors: { parentId: "Pick a different one." } };
    }
  }

  if (categoryId) {
    const existing = await Category.findById(categoryId);
    if (!existing) return { error: "That category no longer exists." };

    const children = await Category.countDocuments({ parentId: categoryId });

    // Moving a parent under another parent would create a third level.
    if (parent && children > 0) {
      return {
        error: `This category has ${children} subcategor${children === 1 ? "y" : "ies"}, so it cannot become one itself. Move them first.`,
        fieldErrors: { parentId: "Has subcategories." },
      };
    }

    // Promoting a subcategory to the top level would strand its products,
    // which are only ever allowed on subcategories.
    if (!parent && existing.parentId) {
      const held = await Product.countDocuments({ categoryId, status: { $ne: "archived" } });
      if (held > 0) {
        return {
          error: `${held} product${held === 1 ? " is" : "s are"} in this subcategory. Move them before making it a top-level category.`,
          fieldErrors: { parentId: "Still holds products." },
        };
      }
    }

    try {
      await Category.findByIdAndUpdate(categoryId, { $set: { ...rest, parentId: parent } });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return { error: "That web address is already used by another category.", fieldErrors: { slug: "Already in use." } };
      }
      throw error;
    }

    await recordAudit(admin, {
      action: "update",
      entity: "Category",
      entityId: categoryId,
      entityLabel: rest.name.en,
    });
  } else {
    try {
      const created = await Category.create({ ...rest, parentId: parent });
      await recordAudit(admin, {
        action: "create",
        entity: "Category",
        entityId: String(created._id),
        entityLabel: created.name.en,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return { error: "That web address is already used by another category.", fieldErrors: { slug: "Already in use." } };
      }
      throw error;
    }
  }

  revalidateShop();
  return { ok: true, notice: "Saved." };
}

/** Refused while anything still points at it: `categoryId` is required on a
 *  product, so deleting a category in use makes those rows unsaveable and
 *  breaks their pages. */
export async function deleteCategory(categoryId: string): Promise<ActionState> {
  const admin = await requireAdmin("categories:write");
  await connectDb();

  const children = await Category.countDocuments({ parentId: categoryId });
  if (children > 0) {
    return {
      error: `This category has ${children} subcategor${children === 1 ? "y" : "ies"}. Delete or move them first.`,
    };
  }

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
