import type { L } from "@/lib/i18n";

/** Review copy, both languages. */
export const REVIEWS: Record<string, L> = {
  heading: { en: "Reviews", ar: "التقييمات" },
  none: { en: "No reviews yet.", ar: "لا توجد تقييمات بعد." },
  noneHint: {
    en: "Reviews come from customers who have received this formula.",
    ar: "تأتي التقييمات من العملاء الذين استلموا هذه التركيبة.",
  },
  outOf: { en: "out of 5", ar: "من ٥" },
  oneReview: { en: "1 review", ar: "تقييم واحد" },
  manyReviews: { en: "reviews", ar: "تقييمات" },
  verified: { en: "Verified buyer", ar: "مشترٍ موثّق" },
  writeTitle: { en: "Write a review", ar: "اكتب تقييماً" },
  yourRating: { en: "Your rating", ar: "تقييمك" },
  title: { en: "Headline (optional)", ar: "عنوان (اختياري)" },
  body: { en: "Your review", ar: "تقييمك" },
  submit: { en: "Post review", ar: "نشر التقييم" },
  sending: { en: "Posting…", ar: "جارٍ النشر…" },
  submittedLive: {
    en: "Thank you — your review is now on the page.",
    ar: "شكراً لك — تم نشر تقييمك على الصفحة.",
  },
  submittedModerated: {
    en: "Thank you. Your review will appear once we have read it.",
    ar: "شكراً لك. سيظهر تقييمك بعد مراجعته.",
  },
};
