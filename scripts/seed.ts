/**
 * Seeds a fresh database: the Owner role, one admin account, store settings,
 * the two indication categories and the two confirmed formulas.
 *
 *   npm run seed
 *
 * Safe to re-run. Everything is upserted by its natural key (role name, admin
 * email, category slug, product slug), so running it against a live database
 * refreshes the seeded records without touching orders, customers or anything
 * an admin has created since. Existing product prices, stock and images are
 * left alone — see `seedProducts`.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "@/lib/db";
import { env } from "@/lib/env";
import { PRODUCTS } from "@/content/products";
import { TAXONOMY, PRODUCT_CATEGORY } from "@/content/taxonomy";
import { OWNER_ROLE } from "@/lib/permissions";
import { AdminRole, AdminUser, Category, ContentPage, Product, Settings } from "@/lib/models";
import type { L } from "@/lib/i18n";

const log = (message: string) => console.log(`  ${message}`);

/** Content files carry `{ en, ar }` with both sides filled; the database shape
 *  allows a missing Arabic side. Same data, different guarantee. */
const tl = (value: L | null | undefined) =>
  value ? { en: value.en, ar: value.ar } : { en: "", ar: "" };

async function seedRoleAndAdmin() {
  const role = await AdminRole.findOneAndUpdate(
    { name: OWNER_ROLE.name },
    { $set: OWNER_ROLE },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  log(`role: ${role.name}`);

  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await AdminUser.findOne({ email });
  if (existing) {
    log(`admin: ${email} (already exists, password unchanged)`);
    return;
  }

  // A generated password is printed once and never stored in plain text. The
  // account is forced to change it at first login, so a password sitting in a
  // developer's scrollback is not a standing credential.
  const password = env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  await AdminUser.create({
    email,
    name: "Owner",
    passwordHash: await bcrypt.hash(password, 12),
    roleId: role._id,
    mustChangePassword: true,
  });

  log(`admin: ${email}`);
  if (!env.SEED_ADMIN_PASSWORD) {
    log(`        password: ${password}   <- shown once, change it at first login`);
  }
}

async function seedSettings() {
  await Settings.findOneAndUpdate(
    { singleton: "settings" },
    { $setOnInsert: { singleton: "settings" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  log("settings: store defaults in place");
}

/** The client's own taxonomy, two levels deep (docs/Products categories.docx).
 *  Both languages come from that document, so nothing here is translated by us. */
async function seedCategories() {
  for (const [index, parent] of TAXONOMY.entries()) {
    const saved = await Category.findOneAndUpdate(
      { slug: parent.slug },
      {
        $set: {
          name: tl(parent.name),
          parentId: null,
          order: index,
          published: true,
        },
        $setOnInsert: { slug: parent.slug },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    for (const [childIndex, child] of parent.children.entries()) {
      await Category.findOneAndUpdate(
        { slug: child.slug },
        {
          $set: {
            name: tl(child.name),
            description: tl(child.description),
            parentId: saved!._id,
            order: childIndex,
            published: true,
          },
          $setOnInsert: { slug: child.slug },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  const parents = TAXONOMY.length;
  const children = TAXONOMY.reduce((total, parent) => total + parent.children.length, 0);
  log(`categories: ${parents} top level, ${children} subcategories`);

}

/** The two placeholder shelves this project started with are not part of the
 *  client's taxonomy. Runs *after* products are repointed, or it would always
 *  find them still in use. Never deletes one that still holds a product —
 *  `categoryId` is required, so that would leave the product unsaveable. */
async function removePlaceholderCategories() {
  for (const slug of ["hair", "prostate"]) {
    const stale = await Category.findOne({ slug });
    if (!stale) continue;
    const held = await Product.countDocuments({ categoryId: stale._id });
    if (held === 0) {
      await Category.deleteOne({ _id: stale._id });
      log(`removed placeholder category "${slug}"`);
    } else {
      log(`kept placeholder category "${slug}" — ${held} product(s) still assigned`);
    }
  }
}

async function seedProducts() {
  for (const product of PRODUCTS) {
    // Products sit on a subcategory, never on a top-level grouping.
    const slug = PRODUCT_CATEGORY[product.slug];
    if (!slug) throw new Error(`No category mapping for product "${product.slug}"`);
    const category = await Category.findOne({ slug });
    if (!category) throw new Error(`No category "${slug}" for product "${product.slug}"`);

    const images = [
      { key: `seed/${product.media.pack}`, url: `/img/${product.media.pack}`, kind: "pack" as const, isPrimary: true },
      ...(product.media.carton
        ? [{ key: `seed/${product.media.carton}`, url: `/img/${product.media.carton}`, kind: "carton" as const, isPrimary: false }]
        : []),
      ...(product.media.plate
        ? [{ key: `seed/${product.media.plate}`, url: `/img/${product.media.plate}`, kind: "plate" as const, isPrimary: false }]
        : []),
    ].map((image) => ({ ...image, alt: tl(product.name) }));

    /** Written on insert only. Price, stock, status, images and the featured
     *  flag are the admin's to manage from here on — re-running the seed must
     *  not reset a live catalogue to "draft, 0 in stock, no price". */
    const onInsert = {
      slug: product.slug,
      sku: product.slug.toUpperCase().slice(0, 24),
      // Both formulas are pre-launch: no confirmed price yet, so they start as
      // request-price rather than fixed at a made-up number (C1).
      pricingMode: "request" as const,
      priceFils: null,
      permanentDiscount: null,
      trackInventory: true,
      stock: 0,
      status: "draft" as const,
      featured: true,
      featuredOrder: PRODUCTS.indexOf(product),
      images,
    };

    /** Refreshed on every run: the descriptive content, which lives in the
     *  content files until an admin edits it. */
    const always = {
      name: tl(product.name),
      summary: tl(product.summary),
      categoryId: category._id,
      form: product.form,
      formLabel: tl(product.formLabel),
      netQuantity: tl(product.netQuantity),
      batch: tl(product.batch),
      shelfLifeMonths: product.shelfLifeMonths,
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
        targetGroup: tl(product.safety.targetGroup),
        cautions: product.safety.cautions.map(tl),
        seekAdvice: product.safety.seekAdvice.map(tl),
      },
    };

    const existing = await Product.findOne({ slug: product.slug });
    if (existing) {
      existing.set(always);
      await existing.save();
    } else {
      await Product.create({ ...onInsert, ...always });
    }
  }
  log(`products: ${PRODUCTS.map((p) => p.slug).join(", ")}`);
}

/** The CMS pages that have a route in code. Created empty and unpublished
 *  section-wise; Phase 11 fills them from the existing content files. Marked
 *  `isSystem` so an admin cannot delete a page whose URL would then 404.
 *
 *  There is deliberately no harvest-calendar page (requirement C9). */
const SYSTEM_PAGES: { slug: string; title: L }[] = [
  { slug: "home", title: { en: "Home", ar: "الرئيسية" } },
  { slug: "method", title: { en: "Our Method", ar: "منهجنا" } },
  { slug: "faq", title: { en: "FAQ", ar: "الأسئلة الشائعة" } },
  { slug: "contact", title: { en: "Contact", ar: "تواصل معنا" } },
  { slug: "legal-notice", title: { en: "Legal Notice", ar: "إشعار قانوني" } },
  { slug: "privacy", title: { en: "Privacy Policy", ar: "سياسة الخصوصية" } },
  { slug: "terms", title: { en: "Terms & Conditions", ar: "الشروط والأحكام" } },
  { slug: "returns", title: { en: "Return Policy", ar: "سياسة الإرجاع" } },
];

async function seedContentPages() {
  for (const page of SYSTEM_PAGES) {
    await ContentPage.findOneAndUpdate(
      { slug: page.slug },
      { $setOnInsert: { slug: page.slug, title: tl(page.title), isSystem: true, sections: [] } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  log(`pages: ${SYSTEM_PAGES.map((p) => p.slug).join(", ")}`);
}

async function main() {
  // Redacted: the URI carries the database password, and this line ends up in
  // deploy logs and screenshots.
  const host = env.MONGODB_URI.replace(/\/\/[^@]*@/, "//***@");
  console.log(`\nSeeding ${env.MONGODB_DB} at ${host}\n`);
  await connectDb();

  await seedRoleAndAdmin();
  await seedSettings();
  await seedCategories();
  await seedProducts();
  await removePlaceholderCategories();
  await seedContentPages();

  // Declared on the schemas but only built in development; do it explicitly so
  // a production seed leaves the database ready rather than unindexed.
  log("indexes: building");
  await Promise.all(
    [AdminRole, AdminUser, Category, ContentPage, Product, Settings].map((model) =>
      model.syncIndexes(),
    ),
  );

  console.log("\nDone.\n");
  await disconnectDb();
}

main().catch(async (error) => {
  console.error("\nSeed failed:", error);
  await disconnectDb();
  process.exit(1);
});
