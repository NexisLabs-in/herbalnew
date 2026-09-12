import "server-only";
import { TAXONOMY_SLUGS } from "@/content/taxonomy";
import { connectDb } from "./db";
import { Category } from "./models/Category";
import { Product, type ProductDoc } from "./models/Product";
import { Sale } from "./models/Sale";
import type { ImageKind, PricingMode, ProductForm } from "./models/enums";
import { isSaleLive, resolveUnitPrice, stockStateOf, type StockState, type UnitPrice } from "./pricing";
import { getSettings } from "./settings";
import type { TL } from "./i18n";

/** Reading the catalogue for the storefront.
 *
 *  Everything here returns **plain view models**, not Mongoose documents. Two
 *  reasons: documents cannot cross into a client component, and the price a
 *  page shows should be resolved once on the server rather than by every
 *  component that happens to render a number.
 */

export type ProductImageView = {
  url: string;
  alt: TL;
  kind: ImageKind;
  isPrimary: boolean;
};

export type ProductCardView = {
  id: string;
  slug: string;
  name: TL;
  summary: TL;
  form: ProductForm;
  formLabel: TL;
  categoryId: string;
  categoryName: TL | null;
  pricingMode: PricingMode;
  /** Null for request-price products (C1). */
  price: UnitPrice | null;
  stockState: StockState;
  /** Only meaningful when `stockState` is "low" — drives "Only X left" (C12). */
  stock: number;
  image: ProductImageView | null;
  targetGroup: TL;
  shelfLifeMonths: number | null;
  ratingAvg: number;
  reviewCount: number;
  /** Set only when the price the customer sees is from a live sale, not a
   *  standing discount — the product page uses this to say so. */
  sale: { name: string; endAt: string } | null;
};

export type ProductDetailView = ProductCardView & {
  images: ProductImageView[];
  composition: TL;
  chemistryEffects: TL;
  netQuantity: TL;
  batch: TL;
  storage: TL;
  directions: {
    steps: { detail: TL; measure: string }[];
    frequency: TL;
    maximum: TL;
  } | null;
  safety: { targetGroup: TL; cautions: TL[]; seekAdvice: TL[] };
  seo: { title: TL; description: TL };
  minOrderQty: number;
  maxOrderQty: number | null;
};

export type CategoryView = {
  id: string;
  slug: string;
  name: TL;
  note: TL;
  description: TL;
  /** Null for a top-level category. Products only ever sit on subcategories. */
  parentId: string | null;
};

/** A parent with its subcategories, for the two-level shop filter. */
export type CategoryTreeNode = CategoryView & { children: CategoryView[] };

const tl = (value: { en?: string; ar?: string } | null | undefined): TL => ({
  en: value?.en ?? "",
  ar: value?.ar ?? "",
});

const imageView = (image: ProductDoc["images"][number]): ProductImageView => ({
  url: image.url,
  alt: tl(image.alt),
  kind: image.kind,
  isPrimary: image.isPrimary,
});

/** The image a card should lead with: the one marked primary, else the first. */
const primaryImage = (images: ProductDoc["images"]): ProductImageView | null => {
  if (images.length === 0) return null;
  return imageView(images.find((image) => image.isPrimary) ?? images[0]);
};

type LiveSale = { percent: number; name: string; endAt: string };

function toCard(
  product: ProductDoc,
  sales: Map<string, LiveSale>,
  categories: Map<string, CategoryView>,
  lowStockThreshold: number,
): ProductCardView {
  const id = String(product._id);
  const live = sales.get(id);
  const price = resolveUnitPrice(
    {
      id,
      pricingMode: product.pricingMode,
      priceFils: product.priceFils,
      permanentDiscount: product.permanentDiscount ?? null,
    },
    live?.percent ?? 0,
  );
  return {
    id,
    slug: product.slug,
    name: tl(product.name),
    summary: tl(product.summary),
    form: product.form,
    formLabel: tl(product.formLabel),
    categoryId: String(product.categoryId),
    categoryName: categories.get(String(product.categoryId))?.name ?? null,
    pricingMode: product.pricingMode,
    price,
    stockState: stockStateOf(product, lowStockThreshold),
    stock: product.stock,
    image: primaryImage(product.images),
    targetGroup: tl(product.safety?.targetGroup),
    shelfLifeMonths: product.shelfLifeMonths ?? null,
    ratingAvg: product.ratingAvg,
    reviewCount: product.reviewCount,
    sale: price?.source === "sale" && live ? { name: live.name, endAt: live.endAt } : null,
  };
}

/** Live sales, resolved once per request. Keeps the winning percent *and* the
 *  sale that produced it, so the page can name the sale and say when it ends.
 *  Same winner rule as the pricing engine: the larger percent, first on a tie. */
async function liveSales(): Promise<Map<string, LiveSale>> {
  const now = new Date();
  const sales = await Sale.find({ active: true, startAt: { $lte: now }, endAt: { $gte: now } }).lean();
  const best = new Map<string, LiveSale>();

  for (const sale of sales) {
    if (!isSaleLive(sale, now)) continue;
    for (const entry of sale.entries) {
      const id = String(entry.productId);
      const current = best.get(id);
      if (!current || entry.discountPercent > current.percent) {
        best.set(id, {
          percent: entry.discountPercent,
          name: sale.name,
          endAt: new Date(sale.endAt).toISOString(),
        });
      }
    }
  }

  return best;
}

async function categoryMap(): Promise<Map<string, CategoryView>> {
  const categories = await Category.find({ published: true }).sort({ order: 1 }).lean();
  return new Map(
    categories.map((category) => [
      String(category._id),
      {
        id: String(category._id),
        slug: category.slug,
        name: tl(category.name),
        note: tl(category.note),
        description: tl(category.description),
        parentId: category.parentId ? String(category.parentId) : null,
      },
    ]),
  );
}

export async function getCategories(): Promise<CategoryView[]> {
  await connectDb();
  return [...(await categoryMap()).values()].filter((category) => TAXONOMY_SLUGS.has(category.slug));
}

/** Parents with their subcategories nested, in admin order. A subcategory whose
 *  parent is unpublished is dropped rather than promoted — hiding a shelf
 *  should hide what is on it. */
export function buildCategoryTree(categories: CategoryView[]): CategoryTreeNode[] {
  const parents = categories.filter((category) => category.parentId === null);
  return parents.map((parent) => ({
    ...parent,
    children: categories.filter((category) => category.parentId === parent.id),
  }));
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  return buildCategoryTree(await getCategories());
}

/** Published product counts keyed by category slug — for subcategory pills. */
export async function getCategoryProductCounts(): Promise<Record<string, number>> {
  await connectDb();
  const [products, categories] = await Promise.all([
    Product.find({ status: "published" }, { categoryId: 1 }).lean<{ categoryId: unknown }[]>(),
    categoryMap(),
  ]);

  const counts: Record<string, number> = {};
  for (const product of products) {
    const category = categories.get(String(product.categoryId));
    if (category) counts[category.slug] = (counts[category.slug] ?? 0) + 1;
  }
  return counts;
}

/** Resolves a slug from the URL to the set of categories to match.
 *
 *  A parent means "everything beneath it": products sit on subcategories, so a
 *  parent selection has to expand to its children or it would match nothing. */
export function categoryIdsFor(slug: string, categories: CategoryView[]): string[] | null {
  const match = categories.find((category) => category.slug === slug);
  if (!match) return null;
  if (match.parentId !== null) return [match.id];
  const children = categories.filter((category) => category.parentId === match.id);
  return children.length ? children.map((child) => child.id) : [match.id];
}

export type ShopSort = "featured" | "newest" | "price-asc" | "price-desc" | "name";

export type ShopQuery = {
  category?: string;
  form?: ProductForm | "all";
  q?: string;
  sort?: ShopSort;
  page?: number;
  perPage?: number;
};

export type ShopResult = {
  products: ProductCardView[];
  categories: CategoryView[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
};

const SORTS: Record<ShopSort, Record<string, 1 | -1>> = {
  // Featured first, then newest — the default a shopper sees.
  featured: { featured: -1, featuredOrder: 1, createdAt: -1 },
  newest: { createdAt: -1 },
  // Request-price products have a null price. Mongo sorts null lowest, so they
  // lead a cheap-first list; that is the honest place for "ask us" and matches
  // the fact that they carry no number at all.
  "price-asc": { priceFils: 1 },
  "price-desc": { priceFils: -1 },
  name: { "name.en": 1 },
};

export async function getShopProducts(query: ShopQuery = {}): Promise<ShopResult> {
  await connectDb();
  const settings = await getSettings();

  const perPage = Math.min(Math.max(query.perPage ?? 12, 1), 48);
  const page = Math.max(query.page ?? 1, 1);

  const categories = await categoryMap();

  // Only published products are ever visible. Drafts and archived products stay
  // out of the storefront entirely, including direct URLs.
  const filter: Record<string, unknown> = { status: "published" };

  if (query.category && query.category !== "all") {
    // A parent expands to its subcategories, since products only ever sit on a
    // subcategory. An unknown slug matches nothing rather than silently showing
    // everything — a wrong URL should look wrong.
    const ids = categoryIdsFor(query.category, [...categories.values()]);
    filter.categoryId = ids ? { $in: ids } : null;
  }

  if (query.form && query.form !== "all") filter.form = query.form;

  if (query.q) {
    // A regex rather than the text index: the catalogue is small, and a regex
    // matches partial words ("prost" finds "Prostate"), which a text index
    // does not. Escaped so a customer typing "(" does not throw.
    const safe = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { "name.en": { $regex: safe, $options: "i" } },
      { "name.ar": { $regex: safe, $options: "i" } },
      { "summary.en": { $regex: safe, $options: "i" } },
      { "summary.ar": { $regex: safe, $options: "i" } },
    ];
  }

  const [total, docs, saleDiscounts] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort(SORTS[query.sort ?? "featured"])
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean<ProductDoc[]>(),
    liveSales(),
  ]);

  return {
    products: docs.map((doc) => toCard(doc, saleDiscounts, categories, settings.inventory.lowStockThreshold)),
    categories: [...categories.values()],
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetailView | null> {
  await connectDb();
  const settings = await getSettings();

  const product = await Product.findOne({ slug, status: "published" }).lean<ProductDoc | null>();
  if (!product) return null;

  const [saleDiscounts, categories] = await Promise.all([liveSales(), categoryMap()]);
  const card = toCard(product, saleDiscounts, categories, settings.inventory.lowStockThreshold);

  return {
    ...card,
    images: product.images.map(imageView),
    composition: tl(product.composition),
    chemistryEffects: tl(product.chemistryEffects),
    netQuantity: tl(product.netQuantity),
    batch: tl(product.batch),
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
    seo: { title: tl(product.seo?.title), description: tl(product.seo?.description) },
    minOrderQty: product.minOrderQty ?? 1,
    maxOrderQty: product.maxOrderQty ?? null,
  };
}

/** How many recommended cards to send at a time. Two rows of the product grid. */
export const RECOMMENDED_PAGE = 8;

export type RecommendedPage = {
  products: ProductCardView[];
  total: number;
  page: number;
  pages: number;
};

/** Every other published formula on the same shelf, highest rated first.
 *
 *  The current product is left out — recommending the page you are already on
 *  is noise. Unrated formulas (average 0) fall to the end; a shared average
 *  is broken by how many reviews earned it, so the order stays stable. */
export async function getRecommendedProducts(
  product: { id: string; categoryId: string },
  page = 1,
): Promise<RecommendedPage> {
  await connectDb();
  const settings = await getSettings();

  const safePage = Math.max(1, Math.floor(page) || 1);
  const filter = {
    status: "published" as const,
    categoryId: product.categoryId,
    _id: { $ne: product.id },
  };

  const [total, docs, saleDiscounts, categories] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort({ ratingAvg: -1, reviewCount: -1, createdAt: -1 })
      .skip((safePage - 1) * RECOMMENDED_PAGE)
      .limit(RECOMMENDED_PAGE)
      .lean<ProductDoc[]>(),
    liveSales(),
    categoryMap(),
  ]);

  return {
    products: docs.map((doc) => toCard(doc, saleDiscounts, categories, settings.inventory.lowStockThreshold)),
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / RECOMMENDED_PAGE)),
  };
}

/** The homepage Featured products section (C10), chosen in the admin panel. */
export async function getFeaturedProducts(limit = 6): Promise<ProductCardView[]> {
  await connectDb();
  const settings = await getSettings();

  const docs = await Product.find({ status: "published", featured: true })
    .sort({ featuredOrder: 1, createdAt: -1 })
    .limit(limit)
    .lean<ProductDoc[]>();

  const [saleDiscounts, categories] = await Promise.all([liveSales(), categoryMap()]);
  return docs.map((doc) => toCard(doc, saleDiscounts, categories, settings.inventory.lowStockThreshold));
}

/** Published products by id, in the order the ids were given.
 *
 *  Mongo returns documents in its own order, so the caller's order — a
 *  wishlist's, most recently saved last — is restored here rather than lost. */
export async function getProductsByIds(ids: string[]): Promise<ProductCardView[]> {
  if (ids.length === 0) return [];
  await connectDb();
  const settings = await getSettings();

  const docs = await Product.find({ _id: { $in: ids }, status: "published" }).lean<ProductDoc[]>();
  const [saleDiscounts, categories] = await Promise.all([liveSales(), categoryMap()]);

  const cards = new Map(
    docs.map((doc) => [
      String(doc._id),
      toCard(doc, saleDiscounts, categories, settings.inventory.lowStockThreshold),
    ]),
  );

  return ids.map((id) => cards.get(id)).filter((card): card is ProductCardView => Boolean(card));
}

/** Slugs for `generateStaticParams` and the sitemap.
 *
 *  Returns an empty list when the database is unreachable (Docker builds that
 *  forgot to pass MONGODB_URI, Atlas briefly down). Callers then skip
 *  prerender and serve on first request instead of failing `next build`. */
export async function getPublishedSlugs(): Promise<string[]> {
  try {
    await connectDb();
    const docs = await Product.find({ status: "published" }).select("slug").lean();
    return docs.map((doc) => doc.slug);
  } catch (error) {
    console.warn("[catalogue] getPublishedSlugs skipped — database unavailable at build", error);
    return [];
  }
}
