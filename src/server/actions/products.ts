"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { diffOf, recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { StockNotification } from "@/lib/models/StockNotification";
import { deleteObject } from "@/lib/storage";
import { productSchema } from "@/lib/validation/product";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Product create, update and archive.
 *
 *  Forms submit one JSON payload (see `@/lib/validation/shared`), so everything
 *  arrives typed after a single parse instead of being coerced field by field.
 */

/** Fields worth recording a before/after for. Deliberately not everything —
 *  an audit line should show the price moving, not drown it in unchanged prose. */
const AUDITED = [
  "slug",
  "sku",
  "pricingMode",
  "priceFils",
  "permanentDiscount",
  "stock",
  "minOrderQty",
  "maxOrderQty",
  "status",
  "featured",
  "categoryId",
] as const;

/** Turns the validated form payload into the document shape. The two differ:
 *  the form speaks AED strings and flat names, the database speaks fils. */
function toDocument(input: ReturnType<typeof productSchema.parse>) {
  return {
    slug: input.slug,
    sku: input.sku,
    name: input.name,
    summary: input.summary,
    categoryId: input.categoryId,
    form: input.form,
    formLabel: input.formLabel,
    pricingMode: input.pricingMode,
    // A request-price product must carry no price at all, or a stale number
    // could leak into a quote (C1).
    priceFils: input.pricingMode === "fixed" ? input.price : null,
    permanentDiscount: input.permanentDiscount,
    trackInventory: input.trackInventory,
    stock: input.stock,
    minOrderQty: input.minOrderQty,
    maxOrderQty: input.maxOrderQty,
    composition: input.composition,
    chemistryEffects: input.chemistryEffects,
    netQuantity: input.netQuantity,
    batch: input.batch,
    shelfLifeMonths: input.shelfLifeMonths,
    storage: input.storage,
    directions: input.directions,
    safety: input.safety,
    images: input.images,
    featured: input.featured,
    featuredOrder: input.featuredOrder,
    status: input.status,
    seo: input.seo,
  };
}

/** Anything that changes what a shopper sees has to invalidate the pages that
 *  show it. Cheap to over-invalidate here; expensive to serve a stale price. */
function revalidateStorefront(slug?: string) {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/shop", "page");
  if (slug) revalidatePath(`/[locale]/shop/${slug}`, "page");
  revalidatePath("/admin/products");
}

/** Mongo's duplicate-key error, turned into a message next to the right field. */
function duplicateFieldError(error: unknown): ActionState | null {
  const dup = error as { code?: number; keyPattern?: Record<string, unknown> };
  if (dup?.code !== 11000) return null;
  const field = Object.keys(dup.keyPattern ?? {})[0];
  if (field === "slug") return { error: "That web address is already used by another product.", fieldErrors: { slug: "Already in use." } };
  if (field === "sku") return { error: "That SKU already belongs to another product.", fieldErrors: { sku: "Already in use." } };
  return { error: "Another product already uses one of these values." };
}

export async function saveProduct(
  productId: string | null,
  payload: unknown,
): Promise<ActionState> {
  const admin = await requireAdmin("products:write");

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Some fields need attention.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  await connectDb();
  const data = toDocument(parsed.data);

  if (!productId) {
    try {
      const created = await Product.create(data);
      await recordAudit(admin, {
        action: "create",
        entity: "Product",
        entityId: String(created._id),
        entityLabel: created.name.en,
      });
      revalidateStorefront(created.slug);
    } catch (error) {
      const duplicate = duplicateFieldError(error);
      if (duplicate) return duplicate;
      throw error;
    }
    redirect("/admin/products?created=1");
  }

  const existing = await Product.findById(productId);
  if (!existing) return { error: "That product no longer exists." };

  const before = existing.toObject();
  const wasOutOfStock = existing.trackInventory && existing.stock === 0;

  existing.set(data);

  try {
    await existing.save();
  } catch (error) {
    const duplicate = duplicateFieldError(error);
    if (duplicate) return duplicate;
    throw error;
  }

  // Restocking re-arms the low-stock alert, so the next dip emails again
  // instead of staying silent (C12). Handled here as well as in the stock
  // adjustment screen because an admin can edit the number directly.
  if (existing.stock > 0 && existing.lowStockAlertedAt) {
    existing.lowStockAlertedAt = null;
    await existing.save();
  }

  await recordAudit(admin, {
    action: "update",
    entity: "Product",
    entityId: productId,
    entityLabel: existing.name.en,
    diff: diffOf(before, existing.toObject(), [...AUDITED]),
  });

  revalidateStorefront(existing.slug);
  if (before.slug !== existing.slug) revalidateStorefront(before.slug);

  // Back-in-stock notices are sent by the restock job in Phase 12; this only
  // records that the moment happened.
  if (wasOutOfStock && existing.stock > 0) {
    const waiting = await StockNotification.countDocuments({
      productId: existing._id,
      notifiedAt: null,
    });
    if (waiting > 0) {
      return { ok: true, notice: `Saved. ${waiting} customer${waiting === 1 ? "" : "s"} waiting for this to come back in stock.` };
    }
  }

  return { ok: true, notice: "Saved." };
}

/** Archiving rather than deleting is the default: orders hold a snapshot of
 *  their items, but reports, reviews and enquiries all still reference the
 *  product, and a deleted row turns those into dangling ids. */
export async function archiveProduct(productId: string): Promise<ActionState> {
  const admin = await requireAdmin("products:write");
  await connectDb();

  const product = await Product.findById(productId);
  if (!product) return { error: "That product no longer exists." };

  product.status = "archived";
  product.featured = false; // an archived product must not sit on the homepage
  await product.save();

  await recordAudit(admin, {
    action: "archive",
    entity: "Product",
    entityId: productId,
    entityLabel: product.name.en,
  });

  revalidateStorefront(product.slug);
  return { ok: true, notice: `${product.name.en} archived.` };
}

export async function restoreProduct(productId: string): Promise<ActionState> {
  const admin = await requireAdmin("products:write");
  await connectDb();

  const product = await Product.findById(productId);
  if (!product) return { error: "That product no longer exists." };

  // Back to draft, not straight back on sale — restoring should be a decision
  // to edit, not an accidental republish.
  product.status = "draft";
  await product.save();

  await recordAudit(admin, {
    action: "restore",
    entity: "Product",
    entityId: productId,
    entityLabel: product.name.en,
  });

  revalidateStorefront(product.slug);
  return { ok: true, notice: `${product.name.en} restored as a draft.` };
}

/** Removes an image from a product and from storage. Separate from the form
 *  save so a deleted file cannot be orphaned by an abandoned edit. */
export async function removeProductImage(productId: string, key: string): Promise<ActionState> {
  const admin = await requireAdmin("products:write");
  await connectDb();

  const product = await Product.findById(productId);
  if (!product) return { error: "That product no longer exists." };

  const remaining = product.images.filter((image: { key: string }) => image.key !== key);
  if (remaining.length === product.images.length) return { ok: true };

  // Never leave a product with images but no primary one.
  if (remaining.length && !remaining.some((image: { isPrimary: boolean }) => image.isPrimary)) {
    remaining[0].isPrimary = true;
  }

  product.set("images", remaining);
  await product.save();
  await deleteObject(key);

  await recordAudit(admin, {
    action: "update",
    entity: "Product",
    entityId: productId,
    entityLabel: product.name.en,
    diff: { images: { from: "removed", to: key } },
  });

  revalidateStorefront(product.slug);
  return { ok: true };
}

/** The homepage featured section (C10). Toggled from the product list and from
 *  the dedicated Featured screen, so it lives here rather than in either. */
export async function setFeatured(productId: string, featured: boolean): Promise<ActionState> {
  const admin = await requireAdmin("featured:write");
  await connectDb();

  const product = await Product.findById(productId);
  if (!product) return { error: "That product no longer exists." };

  if (featured && product.status !== "published") {
    return { error: "Publish the product before featuring it on the homepage." };
  }

  product.featured = featured;
  await product.save();

  await recordAudit(admin, {
    action: "update",
    entity: "Product",
    entityId: productId,
    entityLabel: product.name.en,
    diff: { featured: { from: !featured, to: featured } },
  });

  revalidateStorefront(product.slug);
  return { ok: true };
}
