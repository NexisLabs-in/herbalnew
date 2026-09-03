import type { L } from "@/lib/i18n";

/**
 * All copy below is transcribed verbatim from herb.nexislabs.in (/en and /ar).
 * Nothing here is invented, shortened or reworded.
 */

export const BRAND = {
  name: "HERBEDIA",
  nameLocal: { en: "HERBEDIA", ar: "هيربيديا" } as L,
  slogan: { en: "Many Schools & One Formula", ar: "مدارس متعددة وتركيبة واحدة" } as L,
  supporting: {
    en: "Traditions meet to find balanced formulas.",
    ar: "من مدارس مختلفة في الطب التقليدي إلى تركيبات متوازنة.",
  } as L,
  tagline: { en: "Nature is Cure", ar: "الطبيعة هي العلاج" } as L,
};

export const NAV: { key: string; label: L; href: string }[] = [
  { key: "cabinet", label: { en: "Herb Cabinet", ar: "خزانة الأعشاب" }, href: "/shop" },
  { key: "method", label: { en: "Our Method", ar: "منهجيتنا" }, href: "/method" },
  { key: "faq", label: { en: "FAQ", ar: "الأسئلة الشائعة" }, href: "/faq" },
  { key: "contact", label: { en: "Contact", ar: "اتصل بنا" }, href: "/contact" },
];

export const LEGAL_NAV = { label: { en: "Policies", ar: "السياسات" } as L, href: "/legal" };

export const UI = {
  skipToContent: { en: "Skip to content", ar: "تخطَّ إلى المحتوى" },
  menu: { en: "Menu", ar: "القائمة" },
  closeMenu: { en: "Close menu", ar: "إغلاق القائمة" },
  basket: { en: "Basket", ar: "السلة" },
  switchLanguage: { en: "العربية", ar: "English" },
  switchLanguageAria: { en: "Switch to Arabic", ar: "التبديل إلى الإنجليزية" },
  allFormulas: { en: "All formulas", ar: "كل التركيبات" },
  formulas: { en: "Formulas", ar: "التركيبات" },
  shelves: { en: "Shelves", ar: "الأرفف" },
  inPreparation: { en: "In preparation", ar: "قيد التحضير" },
  viewFormula: { en: "View formula", ar: "عرض التركيبة" },
  form: { en: "Form", ar: "الشكل" },
  targetGroup: { en: "Prepared for", ar: "الفئة المستهدفة" },
  netQuantity: { en: "Net quantity", ar: "الكمية الصافية" },
  shelfLife: { en: "Shelf life", ar: "مدة الصلاحية" },
  months: { en: "months", ar: "شهراً" },
  storage: { en: "Storage", ar: "التخزين" },
  batch: { en: "Batch", ar: "رقم الدفعة" },
  directions: { en: "Directions", ar: "طريقة الاستخدام" },
  frequency: { en: "Frequency", ar: "التكرار" },
  maximum: { en: "Daily limit", ar: "الحد اليومي" },
  compounds: { en: "Plant compounds", ar: "المركبات النباتية" },
  safety: { en: "Safety", ar: "السلامة" },
  cautions: { en: "Cautions", ar: "التحذيرات" },
  seekAdvice: { en: "Seek advice before use", ar: "اطلب المشورة قبل الاستخدام" },
  readBeforeBuying: { en: "Read before ordering", ar: "اقرأ قبل الطلب" },
  pending: { en: "Awaiting confirmation", ar: "بانتظار الاعتماد" },
  pricePending: { en: "Price to be confirmed", ar: "السعر قيد الاعتماد" },
  compoundsPending: {
    en: "The verified compound profile for this formula is being finalised and will be published in full before this product goes on sale.",
    ar: "يجري استكمال ملف المركبات المعتمد لهذه التركيبة وسيُنشر بالكامل قبل طرح المنتج للبيع.",
  },
  notYetOnSale: { en: "Not yet on sale", ar: "غير متاح للبيع بعد" },
  enquire: { en: "Enquire about this formula", ar: "استفسر عن هذه التركيبة" },
  notifyNote: {
    en: "Write to us and we will confirm the price and availability as soon as this formula is cleared for sale.",
    ar: "راسلنا وسنؤكد السعر والتوافر فور اعتماد هذه التركيبة للبيع.",
  },
} satisfies Record<string, L>;

export const TRADITIONS: L[] = [
  { en: "Ayurveda", ar: "الأيورفيدا" },
  { en: "Traditional Chinese Medicine", ar: "الطب الصيني" },
  { en: "Arabic medicine", ar: "الطب العربي" },
  { en: "Greek medicine", ar: "الطب اليوناني" },
  { en: "European herbalists", ar: "العشابون الأوروبيون" },
];

export const TRADITIONS_HEADING: L = {
  en: "The traditions we study",
  ar: "التقاليد التي ندرسها",
};

export const TRADITIONS_NOTE: L = {
  en: "To integrate traditional medicines and provide balanced products.",
  ar: "دمج معارف الطب التقليدي لتقديم منتجات متوازنة.",
};

export const PROMISE_TITLE: L = { en: "Brand promise", ar: "وعد العلامة" };

export const PROMISE: L[] = [
  { en: "Comprehensive traditional-medicine research", ar: "بحث شامل في الطب التقليدي" },
  { en: "Balanced-proportion products", ar: "منتجات متوازنة النسب" },
  { en: "Safety as a success factor", ar: "السلامة عامل أساسي للنجاح" },
  { en: "Clear guidelines", ar: "توجيهات واضحة" },
];

export const ADVISORY: L = {
  en: "These products are for the general wellbeing of adults. Results vary from person to person. Consultation with a health professional is necessary for anyone who is pregnant or breastfeeding, takes medication, has a health condition or is preparing for surgery.",
  ar: "هذه المنتجات للصحة العامة للبالغين، تختلف النتائج من شخص إلى آخر، استشارة متخصص صحي ضرورية للحامل أو المرضعة، ولمن يتناول أدوية أو يعاني من حالة صحية أو يستعد لعملية جراحية.",
};

export const DISCLAIMER_TITLE: L = { en: "Medical disclaimer", ar: "إخلاء المسؤولية الطبي" };

export const DISCLAIMER: L = {
  en: "Information on this website is general information and product-use guidance. It is not medical advice intended to diagnose, treat, cure or prevent disease unless a specific product is legally authorised and clearly labelled for that purpose. Individual responses vary. Do not delay or stop medical care because of website content. In an emergency, contact local emergency services immediately.",
  ar: "المعلومات الواردة في هذا الموقع عبارة عن معلومات عامة وإرشادات متعلقة باستعمال المنتجات، وليست نصيحة أو استشارة طبية تهدف إلى تشخيص مرض أو علاجه أو شفائه أو الوقاية منه، إلا إذا كان المنتج مرخصاً قانوناً وموسوماً بطريقة واضحة تدل على ذلك الغرض، تختلف استجابات الأفراد للمنتجات، يجب عدم تأخير الرعاية الطبية أو إيقافها بسبب محتوى الموقع، وفي حالات الطوارئ اتصل بخدمات الطوارئ المحلية فوراً.",
};
