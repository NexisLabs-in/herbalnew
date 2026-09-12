import type { L } from "@/lib/i18n";

/**
 * The client's indication taxonomy, transcribed verbatim from
 * `docs/Products categories.docx`. Both languages come from that document —
 * nothing here is translated by us.
 *
 * Two levels, except where the client listed none: a parent with children is a
 * grouping ("everything under Beauty" is the union of its children). A parent
 * with no children holds products itself — Reproductive & Hormone Health.
 *
 * This file seeds the database. After the first `npm run seed` the categories
 * are the admin's to edit, and this stays as the record of what was supplied.
 */

export type TaxonomyChild = { slug: string; name: L; description: L };
export type TaxonomyParent = { slug: string; name: L; children: TaxonomyChild[] };

export const TAXONOMY: TaxonomyParent[] = [
  {
    slug: "beauty-personal-care",
    name: { en: "Beauty & Personal Care", ar: "الجمال والعناية الشخصية" },
    children: [
      {
        slug: "hair-care-growth",
        name: { en: "Hair Care & Growth", ar: "العناية بالشعر ونموه" },
        description: {
          en: "Herbal Oils for hair health and scalp nourishment.",
          ar: "زيوت عشبية لصحة الشعر وتغذية فروة الرأس.",
        },
      },
      {
        slug: "skin-cleansing-glow",
        name: { en: "Skin Cleansing & Glow", ar: "تنظيف البشرة وإشراقها" },
        description: {
          en: "Topical botanical treatments, creams, and facial oils.",
          ar: "علاجات نباتية موضعية، كريمات، وزيوت للوجه.",
        },
      },
    ],
  },
  {
    slug: "wellness-lifestyle",
    name: { en: "Wellness & Lifestyle", ar: "الصحة العامة ونمط الحياة" },
    children: [
      {
        slug: "detox-cleansing",
        name: { en: "Detox & Cleansing", ar: "التخلص من السموم وتنظيف الجسم" },
        description: {
          en: "Herbs formulated to flush out toxins and refresh the body.",
          ar: "أعشاب مُصممة لطرد السموم وإنعاش الجسم.",
        },
      },
      {
        slug: "weight-management",
        name: { en: "Weight Management", ar: "إدارة الوزن" },
        description: {
          en: "Natural remedies designed to support either losing weight (metabolism boosters) or gaining weight (appetite stimulants).",
          ar: "علاجات طبيعية مُصممة لدعم فقدان الوزن (معززات الأيض) أو زيادة الوزن (محفزات الشهية).",
        },
      },
    ],
  },
  {
    slug: "body-systems",
    name: { en: "Body Systems & Chronic Support", ar: "أجهزة الجسم ودعم الأمراض المزمنة" },
    children: [
      {
        slug: "digestive-health",
        name: { en: "Digestive Health", ar: "صحة الجهاز الهضمي" },
        description: {
          en: "Remedies for bloating, gut health, indigestion, and bowel regularity.",
          ar: "علاجات للانتفاخ، وصحة الأمعاء، وعسر الهضم، وانتظام حركة الأمعاء.",
        },
      },
      {
        slug: "heart-blood-pressure",
        name: { en: "Heart & Blood Pressure", ar: "القلب وضغط الدم" },
        description: {
          en: "Herbs formulated to reduce hypertension, support circulation, and maintain cardiovascular health.",
          ar: "أعشاب مُصممة لخفض ضغط الدم المرتفع، ودعم الدورة الدموية، والحفاظ على صحة القلب والأوعية الدموية.",
        },
      },
    ],
  },
  {
    slug: "reproductive-hormonal",
    name: { en: "Reproductive & Hormonal Health", ar: "الصحة الإنجابية والهرمونية" },
    children: [],
  },
];

/** Where each seeded formula sits, by product slug. */
export const PRODUCT_CATEGORY: Record<string, string> = {
  "hair-growth": "hair-care-growth",
  "prostate-health": "reproductive-hormonal",
  "lavender-amethyst-moon-salve": "skin-cleansing-glow",
  "herbal-tea": "digestive-health",
  "digestive-ease": "digestive-health",
  "ginger-relief": "digestive-health",
  "fennel-calm": "digestive-health",
  "peppermint-blend": "digestive-health",
  "chamomile-settle": "digestive-health",
  "liquorice-root": "digestive-health",
  "cumin-digest": "digestive-health",
  "cardamom-blend": "digestive-health",
  "anise-settle": "digestive-health",
  "coriander-ease": "digestive-health",
  "caraway-blend": "digestive-health",
  "dill-seed": "digestive-health",
  "ajwain-comfort": "digestive-health",
  "lemon-balm": "digestive-health",
  "marshmallow-root": "digestive-health",
  "slippery-elm": "digestive-health",
};

/** Every slug the storefront is allowed to show — parents for grouping, children for filters. */
export const TAXONOMY_SLUGS = new Set(
  TAXONOMY.flatMap((parent) => [parent.slug, ...parent.children.map((child) => child.slug)]),
);
