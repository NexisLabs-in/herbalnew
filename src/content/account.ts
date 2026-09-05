import type { L } from "@/lib/i18n";

/** Customer portal copy, both languages. */
export const ACCOUNT: Record<string, L> = {
  // --- Navigation -----------------------------------------------------------
  account: { en: "Your account", ar: "حسابك" },
  dashboard: { en: "Overview", ar: "نظرة عامة" },
  orders: { en: "Orders", ar: "الطلبات" },
  addresses: { en: "Addresses", ar: "العناوين" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  wishlist: { en: "Wishlist", ar: "قائمة الرغبات" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },

  // --- Dashboard ------------------------------------------------------------
  welcome: { en: "Welcome back", ar: "أهلاً بعودتك" },
  signedInAs: { en: "Signed in as", ar: "تم تسجيل الدخول باسم" },
  ordersPlaced: { en: "Orders placed", ar: "الطلبات" },
  savedAddresses: { en: "Saved addresses", ar: "العناوين المحفوظة" },
  savedItems: { en: "Saved items", ar: "العناصر المحفوظة" },
  recentOrders: { en: "Recent orders", ar: "أحدث الطلبات" },
  viewAll: { en: "View all", ar: "عرض الكل" },
  nothingYet: { en: "Nothing here yet.", ar: "لا يوجد شيء هنا بعد." },
  completeProfile: {
    en: "Add your name and a delivery address to make checkout quicker next time.",
    ar: "أضف اسمك وعنوان التوصيل لتسريع عملية الشراء في المرة القادمة.",
  },

  // --- Profile --------------------------------------------------------------
  yourName: { en: "Your name", ar: "الاسم" },
  phone: { en: "Phone", ar: "رقم الهاتف" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  emailFixed: {
    en: "This is how you sign in, so it cannot be changed here. Contact us if you need it moved.",
    ar: "هذا هو بريد تسجيل الدخول، ولا يمكن تغييره هنا. تواصل معنا إذا احتجت إلى تغييره.",
  },
  save: { en: "Save", ar: "حفظ" },
  saving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  saved: { en: "Saved.", ar: "تم الحفظ." },

  // --- Addresses ------------------------------------------------------------
  addAddress: { en: "Add an address", ar: "إضافة عنوان" },
  editAddress: { en: "Edit address", ar: "تعديل العنوان" },
  noAddresses: {
    en: "No addresses saved yet. You can add one here, or when you place an order.",
    ar: "لا توجد عناوين محفوظة. يمكنك إضافة عنوان هنا أو عند إتمام الطلب.",
  },
  defaultAddress: { en: "Default", ar: "الافتراضي" },
  makeDefault: { en: "Make default", ar: "اجعله الافتراضي" },
  edit: { en: "Edit", ar: "تعديل" },
  remove: { en: "Remove", ar: "حذف" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  fullName: { en: "Full name", ar: "الاسم الكامل" },
  line1: { en: "Address", ar: "العنوان" },
  line2: { en: "Apartment, floor (optional)", ar: "شقة، طابق (اختياري)" },
  city: { en: "Area or city", ar: "المنطقة أو المدينة" },
  emirate: { en: "Emirate", ar: "الإمارة" },
  chooseEmirate: { en: "Choose an emirate", ar: "اختر الإمارة" },
  label: { en: "Name this address (optional)", ar: "تسمية العنوان (اختياري)" },
  setAsDefault: { en: "Use this as my default address", ar: "استخدمه كعنواني الافتراضي" },

  // --- Wishlist -------------------------------------------------------------
  wishlistEmpty: { en: "Nothing saved yet.", ar: "لم تحفظ أي شيء بعد." },
  wishlistHint: {
    en: "Tap the heart on any formula to keep it here.",
    ar: "اضغط على القلب في أي تركيبة لحفظها هنا.",
  },
  saveItem: { en: "Save for later", ar: "احفظ لاحقاً" },
  savedItem: { en: "Saved", ar: "محفوظ" },
  signInToSave: { en: "Sign in to save items", ar: "سجّل الدخول لحفظ العناصر" },
  browse: { en: "Browse the cabinet", ar: "تصفّح الخزانة" },
};
