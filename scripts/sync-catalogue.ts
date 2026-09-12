/**
 * Normalises the catalogue to the client's four-shelf taxonomy:
 * unpublishes stray categories and reassigns products to subcategories.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/sync-catalogue.ts
 */
import { connectDb, disconnectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { PRODUCT_CATEGORY, TAXONOMY_SLUGS } from "@/content/taxonomy";

const log = (message: string) => console.log(`  ${message}`);

async function main() {
  await connectDb();

  const categories = await Category.find({}).lean();
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  for (const category of categories) {
    if (TAXONOMY_SLUGS.has(category.slug)) continue;
    await Category.updateOne({ _id: category._id }, { $set: { published: false } });
    log(`unpublished stray category "${category.slug}"`);
  }

  const products = await Product.find({}, { slug: 1, categoryId: 1 }).lean();
  let moved = 0;

  for (const product of products) {
    const targetSlug = PRODUCT_CATEGORY[product.slug];
    if (!targetSlug) {
      log(`skipped "${product.slug}" — no category mapping`);
      continue;
    }

    const target = bySlug.get(targetSlug);
    if (!target) {
      log(`skipped "${product.slug}" — category "${targetSlug}" missing`);
      continue;
    }

    if (String(product.categoryId) === String(target._id)) continue;

    await Product.updateOne({ _id: product._id }, { $set: { categoryId: target._id } });
    log(`moved "${product.slug}" -> ${targetSlug}`);
    moved += 1;
  }

  await disconnectDb();
  log(`done (${moved} product${moved === 1 ? "" : "s"} moved)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
