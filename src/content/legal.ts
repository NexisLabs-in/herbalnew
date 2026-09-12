import type { L } from "@/lib/i18n";

export const LEGAL_TITLE: L = { en: "Policies", ar: "السياسات" };

/** Fallback heading and standfirst, used until the Policies page is edited.
 *  The live page reads its heading and intro from that one CMS record. */
export const LEGAL_INTRO: L = {
  en: "How we sell, ship, protect your data and handle returns. Please read these before ordering.",
  ar: "كيف نبيع ونشحن ونحمي بياناتك ونتعامل مع الإرجاع. يرجى قراءتها قبل الطلب.",
};

/** Shown in the admin editor only — not on the public page. */
export const PENDING_TITLE: L = { en: "Still to confirm", ar: "بانتظار الاعتماد" };

export type LegalSection = { id: string; title: L; clauses: L[]; pending: L[] };

export const LEGAL: LegalSection[] = [
  {
    id: "terms",
    title: { en: "Terms & Conditions", ar: "الشروط والأحكام" },
    clauses: [
      {
        en: "These Terms govern the herbal-blend and oil products purchased from Herbedia Company, Office 503, Business Point Building, 22b St — Port Saeed, Deira, Dubai, UAE.",
        ar: "تحكم هذه الشروط شراء منتجات الخلطات العشبية والزيوت من شركة هيربيديا، المكتب 503، مبنى بزنس بوينت، شارع 22ب - بورسعيد - ديرة - دبي، الإمارات العربية المتحدة.",
      },
      {
        en: "Products are subject to availability, order acceptance and successful payment. Genuine price or description errors may be corrected before dispatch, while preserving mandatory legal rights.",
        ar: "تخضع المنتجات لتوفرها وقبول طلب شرائها ونجاح عملية الدفع، مع إمكانية تصحيح الأخطاء المتعلقة بالسعر أو الوصف قبل الشحن مع منح الحقوق التي يفرضها القانون.",
      },
      {
        en: "Product information is educational and is not a substitute for medical advice. Use each product according to its label and seek professional advice for pregnancy, breastfeeding, medication, allergies, health conditions or planned surgery.",
        ar: "معلومات المنتجات تعليمية وليست بديلة للمشورة الطبية، يُستخدم المنتج وفق العلامة الملصقة عليه، ويجب طلب المشورة الطبية في حالات الحمل أو الرضاعة أو تناول الأدوية أو الحساسية أو الحالات الصحية أو التخطيط لإجراء العمليات الجراحية.",
      },
      {
        en: "Prices, taxes, currency, delivery costs and payment methods appear at checkout.",
        ar: "تظهر الأسعار والضرائب والعملة وتكاليف التوصيل وطرق الدفع عند إتمام الطلب.",
      },
      {
        en: "The Returns Policy and mandatory consumer rights apply. Opened consumable products are not accepted unless defective, unsafe or supplied in error, subject to applicable law.",
        ar: "تُطبق سياسة الإرجاع والحقوق الإلزامية للمستهلك، لا تسترجع المنتجات القابلة للاستهلاك بعد فتحها إلا إذا كانت معيبة أو غير آمنة أو أُرسلت بالخطأ، وفق القانون.",
      },
      {
        en: "Original company text, trademarks and images belong to the company. Traditional knowledge is attributed to its sources and is not claimed as exclusive property; formulations developed by the company are exclusively owned by the company.",
        ar: "تعود النصوص والعلامة والصور الأصلية للشركة، وتُنسب المعارف التقليدية إلى مصادرها ولا تدعي الشركة ملكيتها الحصرية، أما التركيبات التي تم تحضيرها في الشركة فهي مملوكة حصرياً للشركة.",
      },
    ],
    pending: [
      { en: "Governing law and jurisdiction", ar: "القانون الحاكم والاختصاص القضائي" },
      { en: "Payment provider", ar: "مزود خدمة الدفع" },
      { en: "Legal contact address", ar: "عنوان التواصل القانوني" },
    ],
  },
  {
    id: "privacy",
    title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    clauses: [
      {
        en: "Data controller: Herbedia Company, Office 503, Business Point Building, 22b St — Port Saeed, Deira, Dubai, UAE.",
        ar: "المتحكم بالبيانات: شركة هيربيديا، المكتب 503، مبنى بزنس بوينت، شارع 22ب - بورسعيد - ديرة - دبي، الإمارات العربية المتحدة.",
      },
      {
        en: "Data collected: identity, contact, orders, payment token, delivery, account, support, device, cookie and preference information.",
        ar: "البيانات: الهوية والتواصل والطلبات ورمز الدفع والتوصيل والحساب والدعم والجهاز وملفات الارتباط والتفضيلات.",
      },
      {
        en: "Purposes: order fulfilment, support, fraud prevention, compliance, website security and improvement, and marketing where a lawful basis exists.",
        ar: "الأغراض: تنفيذ الطلبات والدعم ومنع الاحتيال والامتثال وتأمين الموقع وتحسينه والتسويق عند وجود أساس قانوني.",
      },
      {
        en: "Sharing: payment, delivery, hosting, analytics and support providers, and professional advisers where necessary and under appropriate safeguards.",
        ar: "المشاركة: مزودو الدفع والتوصيل والاستضافة والتحليلات والدعم والمستشارون عند الضرورة وبضمانات مناسبة.",
      },
      {
        en: "Security: proportionate technical and organisational controls are used, but no electronic system can be guaranteed completely secure.",
        ar: "الأمن: تُستخدم ضوابط تقنية وتنظيمية متناسبة، ولا يمكن ضمان الأمان المطلق لأي نظام إلكتروني.",
      },
    ],
    pending: [
      { en: "Retention periods", ar: "مدد الاحتفاظ بالبيانات" },
      { en: "International transfers", ar: "النقل الدولي للبيانات" },
      { en: "Individual rights and complaint authority", ar: "حقوق الأفراد وسلطة الشكاوى" },
      { en: "Last updated date", ar: "تاريخ آخر تحديث" },
    ],
  },
  {
    id: "cookies",
    title: { en: "Cookie Policy", ar: "سياسة ملفات الارتباط" },
    clauses: [
      {
        en: "Necessary cookies for the basket, checkout, security, session and consent preferences.",
        ar: "ملفات ضرورية للسلة والدفع والأمان والجلسة وتفضيلات الموافقة.",
      },
      {
        en: "Preference cookies for language, region and display choices.",
        ar: "ملفات تفضيلات للغة والمنطقة وطريقة العرض.",
      },
      {
        en: "Analytics and marketing cookies activate only with the required consent.",
        ar: "ملفات تحليلات وتسويق لا تُفعّل إلا بالموافقة المطلوبة.",
      },
      {
        en: "The consent banner must offer clear and balanced Accept, Reject and Manage choices where required.",
        ar: "يجب أن يتيح الشريط خيارات واضحة ومتوازنة للقبول والرفض والإدارة حيث يلزم.",
      },
    ],
    pending: [
      {
        en: "Live cookie table: name, provider, purpose, duration and category",
        ar: "جدول حي لملفات الارتباط: الاسم والمزود والغرض والمدة والفئة",
      },
      { en: "Consent settings link", ar: "رابط إعدادات الموافقة" },
    ],
  },
  {
    id: "shipping",
    title: { en: "Shipping & Returns", ar: "الشحن والإرجاع" },
    clauses: [
      {
        en: "A refund may be approved only if the product is unopened and the original seal and packaging are intact.",
        ar: "لا يُوافق على استرداد المبلغ إلا إذا كان المنتج غير مفتوح وبقي الغلاف الأصلي والعبوة سليمين.",
      },
      {
        en: "For safety, opened consumable products are not accepted unless required by law, or where a product is defective, damaged or supplied in error.",
        ar: "لأسباب السلامة، لا تُقبل المنتجات القابلة للاستهلاك بعد فتحها إلا إذا فرض القانون ذلك أو عند وجود عيب أو ضرر أو خطأ في المنتج.",
      },
      {
        en: "Report transit damage with the order number and photographs within 3 days of receipt.",
        ar: "يُبلّغ عن ضرر النقل برقم الطلب والصور خلال ٣ أيام من استلام المنتج.",
      },
      {
        en: "Refund approval follows inspection of the returned product.",
        ar: "تُمنح الموافقة على الاسترداد بعد فحص المنتج المُعاد.",
      },
      {
        en: "Approved refunds are returned through the customer's original payment method within 7 business days.",
        ar: "تُعاد المبالغ المعتمدة من خلال وسيلة الدفع الأصلية المستخدمة خلال ٧ أيام عمل.",
      },
      {
        en: "Return address: Office 503, Business Point Building, 22b St — Port Saeed, Deira, Dubai, UAE.",
        ar: "عنوان الإرجاع: المكتب 503، مبنى بزنس بوينت، شارع 22ب - بورسعيد - ديرة - دبي، الإمارات العربية المتحدة.",
      },
    ],
    pending: [
      {
        en: "Shipping territories, exclusions, processing time and delivery estimates",
        ar: "مناطق الشحن والاستثناءات ومدة التجهيز والتوصيل",
      },
      {
        en: "Temperature handling, customs and import restrictions",
        ar: "الحرارة والجمارك وقيود الاستيراد",
      },
      { en: "Cancellation and return-request period", ar: "فترة الإلغاء وطلب الإرجاع" },
    ],
  },
];
