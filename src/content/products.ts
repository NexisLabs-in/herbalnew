import type { L } from "@/lib/i18n";

export type Shelf = { id: string; name: L; note: L };

export type Product = {
  id: string;
  slug: string;
  name: L;
  summary: L;
  form: "oil" | "powder";
  formLabel: L;
  shelf: string;
  /** null until the client confirms pricing; the storefront renders the
   *  "not yet on sale" state while this is null. */
  priceAed: number | null;
  netQuantity: L | null;
  batch: L | null;
  shelfLifeMonths: number;
  storage: L;
  /** null while the preparation method is still unconfirmed. */
  directions: {
    steps: { detail: L; measure?: string }[];
    frequency: L;
    maximum: L | null;
  } | null;
  compounds: never[];
  safety: { targetGroup: L; cautions: L[]; seekAdvice: L[] };
  available: boolean;
  /** Placeholder catalogue filler, not a real Herbedia formula. */
  demo?: boolean;
  media: {
    /** Vector packshot — the art-directed stand-in. */
    pack: string;
    carton?: string;
    plate?: string;
    /** Real photography. When set it replaces the packshot everywhere, and the
     *  frame switches from vector-on-plinth to a full-bleed crop. */
    photo?: string;
    photoAlt?: L;
  };
};

export const SHELVES: Shelf[] = [
  {
    id: "hair",
    name: { en: "Hair & Scalp", ar: "الشعر وفروة الرأس" },
    note: {
      en: "Botanical oils prepared for daily topical use.",
      ar: "زيوت نباتية محضرة للاستخدام الموضعي اليومي.",
    },
  },
  {
    id: "prostate",
    name: { en: "Men's Health", ar: "صحة الرجل" },
    note: {
      en: "Herbal blends prepared fresh as an infusion.",
      ar: "خلطات عشبية تُحضَّر طازجة كمنقوع.",
    },
  },
  // Shelves below exist only to hold the demo catalogue.
  {
    id: "skin",
    name: { en: "Skin & Body", ar: "البشرة والجسم" },
    note: {
      en: "Botanical oils prepared for daily topical use.",
      ar: "زيوت نباتية محضرة للاستخدام الموضعي اليومي.",
    },
  },
  {
    id: "digestion",
    name: { en: "Digestion", ar: "الجهاز الهضمي" },
    note: {
      en: "Herbal blends prepared fresh as an infusion.",
      ar: "خلطات عشبية تُحضَّر طازجة كمنقوع.",
    },
  },
  {
    id: "calm",
    name: { en: "Rest & Calm", ar: "الراحة والهدوء" },
    note: {
      en: "Herbal blends prepared fresh as an infusion.",
      ar: "خلطات عشبية تُحضَّر طازجة كمنقوع.",
    },
  },
];

export const FORM_LABELS = {
  oil: { en: "Oil", ar: "زيت" } as L,
  powder: { en: "Powder", ar: "مسحوق" } as L,
};

const STORAGE: L = {
  en: "Keep tightly closed at 23 °C in a dry place, away from direct sunlight.",
  ar: "يُحفظ محكم الإغلاق في درجة حرارة ٢٣ مئوية في مكان جاف بعيداً عن أشعة الشمس.",
};

const CAUTIONS_COMMON: L[] = [
  {
    en: "For the general wellbeing of adults. Results vary from person to person.",
    ar: "للصحة العامة للبالغين، تختلف النتائج من شخص إلى آخر.",
  },
  {
    en: "Not a substitute for diagnosis, treatment or medical advice. We cannot promise a cure.",
    ar: "ليست بديلاً عن التشخيص أو العلاج أو المشورة الطبية، ولا يمكننا الوعد بالشفاء.",
  },
  {
    en: "Natural ingredients may cause allergies, side effects or interactions with medical treatments.",
    ar: "قد تسبب المكونات الطبيعية الحساسية أو آثاراً جانبية أو تداخلات مع العلاجات الطبية.",
  },
  {
    en: "Do not stop or delay medical treatment while waiting for this product to take effect.",
    ar: "لا توقف العلاج الطبي أو تؤخره أثناء انتظار تأثير هذا المنتج.",
  },
];

const SEEK_ADVICE: L[] = [
  { en: "Pregnant or breastfeeding people", ar: "الحوامل والمرضعات" },
  { en: "Children", ar: "الأطفال" },
  { en: "Older adults taking multiple medicines", ar: "كبار السن الذين يتناولون أدوية متعددة" },
  {
    en: "People with allergies or an unstable health condition",
    ar: "من لديهم حساسية أو حالة صحية غير مستقرة",
  },
  { en: "Anyone preparing for surgery", ar: "كل من يستعد لعملية جراحية" },
];

const REAL_PRODUCTS: Product[] = [
  {
    id: "hg-01",
    slug: "hair-growth",
    name: { en: "Hair Growth", ar: "إنبات الشعر" },
    summary: {
      en: "A balanced combination of phytochemical compounds extracted from natural herbs in an appropriate botanical oil for daily use.",
      ar: "مزيج متوازن من مركبات كيميائية نباتية مستخلصة من أعشاب طبيعية في زيت نباتي مناسب للاستخدام اليومي.",
    },
    form: "oil",
    formLabel: FORM_LABELS.oil,
    shelf: "hair",
    priceAed: null,
    netQuantity: null,
    batch: null,
    shelfLifeMonths: 24,
    storage: STORAGE,
    directions: {
      steps: [
        {
          detail: {
            en: "Apply ten drops of the oil, spread it over the scalp and massage it in.",
            ar: "ضع عشر قطرات من الزيت، ووزّعه على فروة الرأس مع التدليك.",
          },
          measure: "10 drops",
        },
      ],
      frequency: { en: "Daily use", ar: "للاستخدام اليومي" },
      maximum: null,
    },
    compounds: [],
    safety: {
      targetGroup: { en: "Adult men and women", ar: "للبالغين من الرجال والنساء" },
      cautions: [
        ...CAUTIONS_COMMON,
        {
          en: "For external use on the scalp only. Avoid contact with the eyes.",
          ar: "للاستعمال الخارجي على فروة الرأس فقط، تجنب ملامسة العينين.",
        },
      ],
      seekAdvice: SEEK_ADVICE,
    },
    available: false,
    media: { pack: "pack-hair-growth.svg", carton: "carton-oil.svg", plate: "plate-hair.svg" },
  },
  {
    id: "ph-01",
    slug: "prostate-health",
    name: { en: "Prostate Health", ar: "صحة البروستات" },
    summary: {
      en: "A precisely proportioned combination of plant compounds prepared from a natural herbal blend.",
      ar: "مزيج مضبوط النسب من مركبات نباتية محضر من خليط عشبي طبيعي.",
    },
    form: "powder",
    formLabel: FORM_LABELS.powder,
    shelf: "prostate",
    priceAed: null,
    netQuantity: null,
    batch: null,
    shelfLifeMonths: 18,
    storage: STORAGE,
    directions: {
      steps: [
        {
          detail: {
            en: "Add ten grams of the herbal blend to 250–300 ml of hot water.",
            ar: "أضف عشرة غرامات من خليط الأعشاب إلى ٢٥٠-٣٠٠ مل من الماء الساخن.",
          },
          measure: "10 g · 250–300 ml",
        },
        {
          detail: {
            en: "Cover the cup and leave it to stand for thirty minutes.",
            ar: "غطِّ الكوب واتركه لمدة ثلاثين دقيقة.",
          },
          measure: "30 min",
        },
        {
          detail: {
            en: "Strain the liquid and let it cool to a suitable drinking temperature.",
            ar: "صفِّ السائل واتركه حتى يصبح بدرجة حرارة مناسبة للشرب.",
          },
        },
        {
          detail: { en: "Drink the prepared liquid.", ar: "اشرب السائل المحضَّر." },
        },
      ],
      frequency: {
        en: "Once daily. Prepare fresh before each use.",
        ar: "مرة واحدة يومياً، حضِّره طازجاً قبل كل استخدام.",
      },
      maximum: {
        en: "Do not exceed the recommended daily dose.",
        ar: "لا تتجاوز الجرعة اليومية الموصى بها.",
      },
    },
    compounds: [],
    safety: {
      targetGroup: { en: "Adult men", ar: "للبالغين من الرجال" },
      cautions: CAUTIONS_COMMON,
      seekAdvice: SEEK_ADVICE,
    },
    available: false,
    media: { pack: "pack-prostate-health.svg", carton: "carton-powder.svg", plate: "plate-prostate.svg" },
  },
];


/* ──────────────────────────────────────────────────────────────────────────
   Demo catalogue.

   These are NOT real Herbedia formulas. They exist so the storefront can be
   shown to the client with a populated cabinet instead of two lonely cards.

   Every product-specific instruction is deliberately left unset: `directions`
   is null and pricing, quantity and batch are pending, exactly as the two real
   formulas are. Inventing a dosage for a herbal product is inventing medical
   instruction, so the pages render the same "Awaiting confirmation" state the
   brand already uses rather than making one up.

   The Arabic here is a working translation and has not been reviewed by a
   native speaker — fine for a demo, not for launch.

   Turn the whole set off with NEXT_PUBLIC_SHOW_DEMO_PRODUCTS=false, or delete
   this block and the two extra shelves above it.
   ────────────────────────────────────────────────────────────────────────── */

export const SHOW_DEMO_PRODUCTS = process.env.NEXT_PUBLIC_SHOW_DEMO_PRODUCTS !== "false";

const demo = (
  id: string,
  slug: string,
  name: L,
  summary: L,
  form: "oil" | "powder",
  shelf: string,
  targetGroup: L,
  shelfLifeMonths: number,
): Product => ({
  id,
  slug,
  name,
  summary,
  form,
  formLabel: FORM_LABELS[form],
  shelf,
  priceAed: null,
  netQuantity: null,
  batch: null,
  shelfLifeMonths,
  storage: STORAGE,
  directions: null,
  compounds: [],
  safety: { targetGroup, cautions: CAUTIONS_COMMON, seekAdvice: SEEK_ADVICE },
  available: false,
  demo: true,
  media: { pack: `pack-${slug}.svg` },
});

const ADULTS: L = { en: "Adult men and women", ar: "للبالغين من الرجال والنساء" };
const ADULT_MEN: L = { en: "Adult men", ar: "للبالغين من الرجال" };

const DEMO_PRODUCTS: Product[] = [
  demo("sb-01", "scalp-balance",
    { en: "Scalp Balance", ar: "توازن فروة الرأس" },
    { en: "A botanical oil combining plant compounds selected for the scalp, blended in balanced proportions for daily topical use.",
      ar: "زيت نباتي يجمع مركبات نباتية مختارة لفروة الرأس، ممزوجة بنسب متوازنة للاستخدام الموضعي اليومي." },
    "oil", "hair", ADULTS, 24),

  demo("bc-01", "beard-care",
    { en: "Beard Care", ar: "العناية باللحية" },
    { en: "A balanced combination of phytochemical compounds in a light botanical oil, prepared for daily use on facial hair and the skin beneath it.",
      ar: "مزيج متوازن من المركبات الكيميائية النباتية في زيت نباتي خفيف، محضر للاستخدام اليومي على شعر الوجه والبشرة تحته." },
    "oil", "hair", ADULT_MEN, 24),

  demo("sc-01", "skin-clarity",
    { en: "Skin Clarity", ar: "نقاء البشرة" },
    { en: "Plant compounds drawn from several traditions and proportioned into a light oil for daily topical use.",
      ar: "مركبات نباتية مستمدة من عدة مدارس ومضبوطة النسب في زيت خفيف للاستخدام الموضعي اليومي." },
    "oil", "skin", ADULTS, 24),

  demo("db-01", "daily-balance",
    { en: "Daily Balance", ar: "التوازن اليومي" },
    { en: "A precisely proportioned herbal blend prepared fresh as an infusion, for the general wellbeing of adults.",
      ar: "خليط عشبي مضبوط النسب يُحضَّر طازجاً كمنقوع، للصحة العامة للبالغين." },
    "powder", "prostate", ADULT_MEN, 18),

  demo("de-01", "digestive-ease",
    { en: "Digestive Ease", ar: "راحة الهضم" },
    { en: "A herbal blend of plant compounds combined in balanced proportions and prepared fresh as an infusion.",
      ar: "خليط عشبي من مركبات نباتية مدمجة بنسب متوازنة ويُحضَّر طازجاً كمنقوع." },
    "powder", "digestion", ADULTS, 18),

  demo("ec-01", "evening-calm",
    { en: "Evening Calm", ar: "هدوء المساء" },
    { en: "A blend of plant compounds selected across traditions and proportioned for an infusion prepared at the end of the day.",
      ar: "مزيج من مركبات نباتية مختارة من مدارس متعددة ومضبوطة النسب لمنقوع يُحضَّر في نهاية اليوم." },
    "powder", "calm", ADULTS, 18),
];

export const PRODUCTS: Product[] = SHOW_DEMO_PRODUCTS
  ? [...REAL_PRODUCTS, ...DEMO_PRODUCTS]
  : REAL_PRODUCTS;

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const getShelf = (id: string) => SHELVES.find((s) => s.id === id);

/** True once any formula has both a price and availability. Drives whether the
 *  basket is meaningful at all. */
export const ANY_AVAILABLE = PRODUCTS.some((p) => p.available && p.priceAed !== null);
