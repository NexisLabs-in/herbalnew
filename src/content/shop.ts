import type { L } from "@/lib/i18n";

/**
 * Storefront copy for the shop, product page and stock states.
 *
 * Kept apart from `brand.ts`, whose copy is transcribed verbatim from the live
 * site. Everything here is new writing for surfaces the old site did not have —
 * filters, baskets, stock notices — in both languages.
 */
export const SHOP: Record<string, L> = {
  // --- Catalogue ------------------------------------------------------------
  search: { en: "Search", ar: "بحث" },
  searchPlaceholder: { en: "Search the cabinet", ar: "ابحث في الخزانة" },
  clear: { en: "Clear", ar: "مسح" },
  filterAll: { en: "All", ar: "الكل" },
  filterByShelf: { en: "Shelf", ar: "الرف" },
  filterByForm: { en: "Form", ar: "الشكل" },
  sortBy: { en: "Sort", ar: "الترتيب" },
  sortFeatured: { en: "Featured", ar: "المميزة" },
  sortNewest: { en: "Newest", ar: "الأحدث" },
  sortPriceAsc: { en: "Price: low to high", ar: "السعر: من الأقل" },
  sortPriceDesc: { en: "Price: high to low", ar: "السعر: من الأعلى" },
  sortName: { en: "Name", ar: "الاسم" },
  resultsOne: { en: "1 formula", ar: "تركيبة واحدة" },
  resultsMany: { en: "formulas", ar: "تركيبة" },
  noResults: { en: "Nothing matches that search.", ar: "لا توجد نتائج مطابقة." },
  noResultsHint: {
    en: "Try a different word, or browse the whole cabinet.",
    ar: "جرّب كلمة أخرى، أو تصفّح الخزانة كاملة.",
  },
  showAll: { en: "Show the whole cabinet", ar: "عرض الخزانة كاملة" },
  previous: { en: "Previous", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  page: { en: "Page", ar: "صفحة" },
  of: { en: "of", ar: "من" },

  // --- Price ----------------------------------------------------------------
  priceOnRequest: { en: "Price on request", ar: "السعر عند الطلب" },
  was: { en: "Was", ar: "كان" },
  off: { en: "off", ar: "خصم" },
  save: { en: "Save", ar: "وفّر" },

  // --- Stock (C12) ----------------------------------------------------------
  inStock: { en: "In stock", ar: "متوفر" },
  outOfStock: { en: "Out of stock", ar: "غير متوفر" },
  onlyLeftOne: { en: "Only 1 left", ar: "بقيت قطعة واحدة" },
  onlyLeftPrefix: { en: "Only", ar: "بقي" },
  onlyLeftSuffix: { en: "left", ar: "فقط" },

  // --- Notify me (plan 8.7) -------------------------------------------------
  notifyTitle: { en: "Tell me when it is back", ar: "أخبرني عند توفره" },
  notifyBody: {
    en: "Leave your email and we will write to you once this formula is back in stock. Nothing else — no newsletter.",
    ar: "اترك بريدك الإلكتروني وسنراسلك فور عودة هذه التركيبة للتوفر. لا شيء آخر — لا نشرة بريدية.",
  },
  notifyPlaceholder: { en: "you@example.com", ar: "you@example.com" },
  notifyButton: { en: "Notify me", ar: "أخبرني" },
  notifyDone: {
    en: "Done. We will email you as soon as it is back.",
    ar: "تم. سنراسلك فور عودته للتوفر.",
  },
  notifyAlready: {
    en: "You are already on the list for this one.",
    ar: "أنت مسجّل بالفعل لهذا المنتج.",
  },
  notifyBadEmail: { en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." },

  // --- Request price (C1) ---------------------------------------------------
  enquiryTitle: { en: "Ask for a price", ar: "اطلب السعر" },
  enquiryBody: {
    en: "This formula is priced per order. Tell us what you need and we will send you a price.",
    ar: "تُسعَّر هذه التركيبة حسب الطلب. أخبرنا بما تحتاجه وسنرسل لك السعر.",
  },
  enquiryName: { en: "Your name", ar: "الاسم" },
  enquiryEmail: { en: "Email", ar: "البريد الإلكتروني" },
  enquiryPhone: { en: "Phone (optional)", ar: "الهاتف (اختياري)" },
  enquiryQty: { en: "How many", ar: "الكمية" },
  enquiryMessage: { en: "Anything else (optional)", ar: "ملاحظات (اختياري)" },
  enquirySubmit: { en: "Request a price", ar: "اطلب السعر" },
  enquirySending: { en: "Sending…", ar: "جارٍ الإرسال…" },
  enquiryDone: {
    en: "Thank you. We have your request and will email you a price shortly.",
    ar: "شكراً لك. وصلنا طلبك وسنرسل لك السعر قريباً.",
  },
  enquiryFailed: {
    en: "That did not send. Please try again.",
    ar: "لم يتم الإرسال. حاول مرة أخرى.",
  },

  // --- Product page ---------------------------------------------------------
  relatedTitle: { en: "From the same shelf", ar: "من الرف نفسه" },
  composition: { en: "Composition", ar: "التركيب" },
  chemistryEffects: { en: "Chemistry & effects", ar: "الكيمياء والتأثيرات" },
  featuredTitle: { en: "Featured formulas", ar: "تركيبات مميزة" },
  emptyCabinet: {
    en: "The cabinet is being stocked. Formulas appear here as they are cleared for sale.",
    ar: "يجري تجهيز الخزانة. ستظهر التركيبات هنا فور اعتمادها للبيع.",
  },
};
