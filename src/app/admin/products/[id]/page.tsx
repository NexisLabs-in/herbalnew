import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { Category, Product, type ProductDoc } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { toAed } from "@/lib/money";

export const metadata: Metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

type StoredTL = { en?: string; ar?: string } | null | undefined;

/** The database allows a missing Arabic side; the form always renders both
 *  inputs, so blanks are filled in here rather than guarded at every field. */
const tl = (value: StoredTL) => ({ en: value?.en ?? "", ar: value?.ar ?? "" });

/** Money is stored as integer fils and typed by humans as AED. */
const aed = (fils: number | null | undefined) =>
  fils === null || fils === undefined ? "" : toAed(fils).toFixed(2);

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("products:read");
  const { id } = await params;

  await connectDb();
  const [product, categories, settings] = await Promise.all([
    Product.findById(id).lean<ProductDoc | null>().catch(() => null),
    Category.find().sort({ order: 1 }).lean(),
    getSettings(),
  ]);

  if (!product) notFound();

  const initial: ProductFormValue = {
    slug: product.slug,
    sku: product.sku,
    name: tl(product.name),
    summary: tl(product.summary),
    categoryId: String(product.categoryId),
    form: product.form,
    formLabel: tl(product.formLabel),
    pricingMode: product.pricingMode,
    price: aed(product.priceFils),
    permanentDiscount: product.permanentDiscount
      ? {
          type: product.permanentDiscount.type as "percent" | "amount",
          value:
            product.permanentDiscount.type === "percent"
              ? String(product.permanentDiscount.value)
              : aed(product.permanentDiscount.value),
        }
      : null,
    trackInventory: product.trackInventory,
    stock: String(product.stock),
    composition: tl(product.composition),
    chemistryEffects: tl(product.chemistryEffects),
    netQuantity: tl(product.netQuantity),
    batch: tl(product.batch),
    shelfLifeMonths: product.shelfLifeMonths ? String(product.shelfLifeMonths) : "",
    storage: tl(product.storage),
    directions: product.directions
      ? {
          steps: product.directions.steps.map((step) => ({
            detail: tl(step.detail),
            measure: step.measure ?? "",
          })),
          frequency: tl(product.directions.frequency),
          maximum: tl(product.directions.maximum),
        }
      : null,
    safety: {
      targetGroup: tl(product.safety?.targetGroup),
      cautions: (product.safety?.cautions ?? []).map(tl),
      seekAdvice: (product.safety?.seekAdvice ?? []).map(tl),
    },
    images: product.images.map((image) => ({
      key: image.key,
      url: image.url,
      alt: tl(image.alt),
      isPrimary: image.isPrimary,
      kind: image.kind,
    })),
    featured: product.featured,
    featuredOrder: String(product.featuredOrder),
    status: product.status,
    seo: { title: tl(product.seo?.title), description: tl(product.seo?.description) },
  };

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <p className="admin-crumb">
            <Link href="/admin/products">Products</Link> / {product.sku}
          </p>
          <h1 className="admin-head__title">{product.name.en}</h1>
          <p className="admin-head__sub">
            {product.status === "published" ? (
              <>
                Live at{" "}
                <a href={`/en/shop/${product.slug}`} target="_blank" rel="noreferrer">
                  /en/shop/{product.slug}
                </a>
              </>
            ) : (
              `${product.status === "draft" ? "Draft" : "Archived"} — not visible on the storefront`
            )}
          </p>
        </div>
      </div>

      <ProductForm
        productId={id}
        initial={initial}
        lowStockThreshold={settings.inventory.lowStockThreshold}
        categories={categories
          .filter((category) => category.parentId === null)
          .map((parent) => ({
            parent: parent.name.en,
            children: categories
              .filter((child) => String(child.parentId ?? "") === String(parent._id))
              .map((child) => ({ id: String(child._id), name: child.name.en })),
          }))
          .filter((group) => group.children.length > 0)}
      />
    </AdminShell>
  );
}
