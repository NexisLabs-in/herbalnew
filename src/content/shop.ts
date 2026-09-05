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

  // --- Basket ---------------------------------------------------------------
  addToBasket: { en: "Add to basket", ar: "أضف إلى السلة" },
  adding: { en: "Adding…", ar: "جارٍ الإضافة…" },
  added: { en: "Added to your basket", ar: "أُضيف إلى سلتك" },
  viewBasket: { en: "View basket", ar: "عرض السلة" },
  quantity: { en: "Quantity", ar: "الكمية" },
  basketTitle: { en: "Your basket", ar: "سلتك" },
  basketEmpty: { en: "Your basket is empty.", ar: "سلتك فارغة." },
  basketEmptyHint: {
    en: "Browse the cabinet and add a formula to get started.",
    ar: "تصفّح الخزانة وأضف تركيبة للبدء.",
  },
  remove: { en: "Remove", ar: "إزالة" },
  item: { en: "item", ar: "منتج" },
  items: { en: "items", ar: "منتجات" },

  // --- Totals ---------------------------------------------------------------
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  productDiscounts: { en: "Discounts", ar: "الخصومات" },
  couponLabel: { en: "Coupon", ar: "كوبون" },
  couponPlaceholder: { en: "Discount code", ar: "رمز الخصم" },
  couponApply: { en: "Apply", ar: "تطبيق" },
  couponRemove: { en: "Remove code", ar: "إزالة الرمز" },
  shipping: { en: "Shipping", ar: "الشحن" },
  shippingFree: { en: "Free", ar: "مجاني" },
  freeShippingNudge: {
    en: "Spend {amount} more for free shipping.",
    ar: "أنفق {amount} إضافية للحصول على شحن مجاني.",
  },
  total: { en: "Total", ar: "الإجمالي" },
  checkout: { en: "Checkout", ar: "إتمام الشراء" },
  continueShopping: { en: "Continue shopping", ar: "متابعة التسوق" },
  taxNote: {
    en: "Tax is calculated at checkout.",
    ar: "تُحتسب الضريبة عند إتمام الشراء.",
  },

  // --- Coupon rejections (C8) -----------------------------------------------
  couponUnknown: { en: "That code is not recognised.", ar: "الرمز غير معروف." },
  couponInactive: { en: "That code is no longer active.", ar: "لم يعد هذا الرمز فعالاً." },
  couponExpired: { en: "That code has expired.", ar: "انتهت صلاحية هذا الرمز." },
  couponExhausted: { en: "That code has been fully used.", ar: "تم استخدام هذا الرمز بالكامل." },
  couponCustomerLimit: {
    en: "You have already used that code.",
    ar: "لقد استخدمت هذا الرمز من قبل.",
  },
  couponMinOrder: {
    en: "That code needs a basket of at least {amount}.",
    ar: "يتطلب هذا الرمز سلة بقيمة {amount} على الأقل.",
  },
  couponNotCovered: {
    en: "That code does not apply to {product}. Remove it from your basket, or use a different code.",
    ar: "لا ينطبق هذا الرمز على {product}. أزله من سلتك أو استخدم رمزاً آخر.",
  },
  couponEmptyCart: { en: "Add something to your basket first.", ar: "أضف شيئاً إلى سلتك أولاً." },

  // --- Unavailable lines ----------------------------------------------------
  lineGone: { en: "No longer available", ar: "لم يعد متوفراً" },
  lineOutOfStock: { en: "Out of stock", ar: "غير متوفر" },
  lineRequestPrice: { en: "Now priced on request", ar: "أصبح السعر عند الطلب" },
  lineReduced: {
    en: "Only {qty} available — quantity reduced.",
    ar: "المتوفر {qty} فقط — تم تقليل الكمية.",
  },
  removeUnavailable: { en: "Remove unavailable items", ar: "إزالة العناصر غير المتوفرة" },
  cartBlocked: {
    en: "Some items cannot be bought right now. Remove them to continue.",
    ar: "بعض العناصر غير قابلة للشراء الآن. أزلها للمتابعة.",
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
