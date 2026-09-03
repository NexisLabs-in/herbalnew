import type { L } from "@/lib/i18n";

export const HERO = {
  sub: {
    en: "Schools of traditional medicine, in one formula",
    ar: "مدارس الطب التقليدي في تركيبة واحدة",
  } as L,
  desc: {
    en: "A meeting place for traditional medicine approaches, creating precise formulations with a modern method.",
    ar: "ملتقى لمناهج الطب التقليدي وصنع تركيبات دقيقة بأسلوب حديث.",
  } as L,
  body: {
    en: "Herbal blends and extracts inspired by knowledge from different cultures. Each formulation contains plant compounds combined in balanced proportions, prepared to clear standards and accompanied by responsible guidance.",
    ar: "خلطات ومستخلصات عشبية مستوحاة من معارف ثقافات مختلفة، تحتوي كل تركيبة على مركبات نباتية مدمجة بنسب متوازنة، ومحضرة وفق معايير واضحة، ومرفقة بإرشادات مسؤولة.",
  } as L,
  cta1: { en: "Explore the Herb Cabinet", ar: "استكشف خزانة الأعشاب" } as L,
  cta2: { en: "Discover our method", ar: "اكتشف منهجيتنا" } as L,
};

export const METHOD_HEADING: L = { en: "How the house works", ar: "كيف يعمل البيت" };

export const METHOD_SUB: L = {
  en: "Respect the sources, determine ingredient proportions, explain the compounds within each product — and place safety first.",
  ar: "تقدير المصادر وتحديد نسب المكونات وإبراز المركبات الموجودة في كل منتج مع وضع السلامة أولاً.",
};

export const METHOD_STEPS: { title: L; detail: L }[] = [
  {
    title: { en: "Listen to tradition", ar: "نصغي إلى التقاليد" },
    detail: {
      en: "Begin with documented uses and preparation methods from the relevant traditional medicine approaches.",
      ar: "نبدأ بالاستخدامات وطرق التحضير الموثقة في مناهج الطب التقليدي ذات الصلة.",
    },
  },
  {
    title: { en: "Identify relevant compounds", ar: "نحدد المركبات الفعالة" },
    detail: {
      en: "Define the target plant constituents and the plants that can supply them.",
      ar: "نحدد المكونات النباتية المستهدفة ومصادرها.",
    },
  },
  {
    title: { en: "Balance the formula", ar: "نوازن التركيبة" },
    detail: {
      en: "Select ingredients on compatibility, then determine their proportions and their suitability for the intended use.",
      ar: "نختار المكونات بناءً على توافقها، ونحدد نسبها ومدى ملاءمتها للاستخدام المستهدف.",
    },
  },
  {
    title: { en: "Explain responsible use", ar: "نوضح الاستخدام المسؤول" },
    detail: {
      en: "Provide ingredients, directions, warnings and storage instructions with every product.",
      ar: "نوفر المكونات والتعليمات والتحذيرات وطرق التخزين مع كل منتج.",
    },
  },
];

export const METHOD_PAGE = {
  kicker: { en: "The house", ar: "عن العلامة" } as L,
  intro: {
    en: "Herbedia is an online store offering natural herbal blends and oils for the general wellbeing of adults. The company studies herbal healing practices from multiple traditional medicine schools to help develop effective botanical blends.",
    ar: "هيربيديا متجر إلكتروني يقدم خلطات عشبية طبيعية وزيوتاً للصحة العامة للبالغين، تدرس الشركة ممارسات التداوي بالأعشاب في مدارس متعددة من الطب التقليدي للمساعدة في تطوير خلطات نباتية فعالة.",
  } as L,
  paras: [
    {
      en: "For centuries, herbal medicine developed separately across human cultures. Plant selection evolved in response to local environments, available botanicals and knowledge accumulated over generations. These traditions include Ayurveda, Traditional Chinese Medicine, Arabic medicine, Greek medicine and European herbalists. Each school used its own language, method and plant materials.",
      ar: "على مدى قرون، تطور الطب بالأعشاب بصورة منفصلة بين الثقافات البشرية، وتطورت ممارسات اختيار النباتات وطرق استخدامها حسب البيئات المحلية والنباتات المتاحة والمعارف المتراكمة عبر الأجيال، ومنها الطب العربي والطب الصيني والطب اليوناني والعشابون الأوروبيون والأيورفيدا، وقد استخدمت كل مدرسة لغتها ومنهجها وموادها النباتية الخاصة بها.",
    },
    {
      en: "Herbedia takes a different route into that inheritance. We study where the traditions differ and where they intersect, then investigate how compatible plants can be selected and proportioned to produce balanced concentrations of effective constituents — while they retain their role as primary and authentic herbal agents.",
      ar: "تبتكر هيربيديا نهجاً جديداً لصياغة الأدوية العشبية من خلال الاستفادة من هذه الخبرات المتفرقة، فنحن ندرس اختلافاتها ونقاط تقاطعها، ثم نبحث في كيفية اختيار النباتات ومدى توافقها وتحديد نسبها لإنتاج تراكيز متوازنة من مكوناتها الفعالة، مع الحفاظ على تأثيرها كعوامل عشبية رئيسية وأصيلة.",
    },
    {
      en: "Our insight comes from accumulated human experience. Our discipline comes from modern standards and quality control.",
      ar: "نستمد بصيرتنا من الخبرات البشرية المتراكمة، وانضباطنا من المعايير الحديثة وضوابط الجودة.",
    },
  ] as L[],
  valueTitle: { en: "Value and benefits", ar: "القيمة والفوائد" } as L,
  valueSub: {
    en: "To bring together traditional medicines so they can be studied, understood and integrated.",
    ar: "جمع معارف الطب التقليدي لدراستها وفهمها ودمجها.",
  } as L,
  values: [
    {
      en: "One place to draw on the advantages of several traditional medicines.",
      ar: "مكان واحد للاستفادة من مزايا الأدوية التقليدية المتنوعة.",
    },
    {
      en: "Balanced formulations of target compounds, rather than simple lists of herbs.",
      ar: "تركيبات متوازنة من المركبات المستهدفة بدلاً من قوائم بسيطة من الأعشاب.",
    },
    {
      en: "Herbs and oils selected on the properties and concentrations of their constituents.",
      ar: "اختيار الأعشاب والزيوت وفق خصائص مكوناتها وتراكيزها.",
    },
    {
      en: "Transparency about the phytochemical profile and the method of use.",
      ar: "الشفافية في إبراز المركبات النباتية للمنتجات وطرق استخدامها.",
    },
    {
      en: "A balanced approach with gradual effects that may differ from person to person.",
      ar: "نهج متوازن وتأثير تدريجي للمنتج مع اختلافه من شخص إلى آخر.",
    },
    {
      en: "Continuous safety review and clear customer warnings.",
      ar: "مراجعة مستمرة للسلامة وتحذيرات واضحة للعملاء.",
    },
  ] as L[],
};

export const FAQ: { id: string; q: L; a: L }[] = [
  {
    id: "distinguishes",
    q: { en: "What distinguishes Herbedia?", ar: "ما الذي يميز هيربيديا؟" },
    a: {
      en: "We aim to benefit from the variety of traditional medicines, which developed in different environments with different knowledge. Studying varied approaches can inspire the formulation of novel products: it highlights what the schools share and where they diverge — an insight that helps avoid the random mixing of many plants.",
      ar: "نهدف إلى الاستفادة من تنوع خلطات الأعشاب التقليدية والتي تطورت في بيئات مختلفة وبمعارف متنوعة، فمن خلالها تتضح أوجه التشابه والاختلاف بين تلك المدارس، وذلك لتجنب خلط عدد كبير من النباتات عشوائياً.",
    },
  },
  {
    id: "treat",
    q: { en: "Do your products treat diseases?", ar: "هل تعالج منتجاتكم الأمراض؟" },
    a: {
      en: "Herbedia products do not replace diagnosis, treatment or medical consultation, and we cannot promise a cure from using our products.",
      ar: "لا تحل منتجات هيربيديا محل التشخيص أو العلاج أو الاستشارة الطبية، ولا يمكننا الوعد بالشفاء نتيجة استخدام منتجاتنا.",
    },
  },
  {
    id: "safe",
    q: { en: "Are natural products always safe?", ar: "هل المنتجات الطبيعية آمنة دائماً؟" },
    a: {
      en: "No. Natural ingredients may cause allergies, side effects or interactions with medical treatments. Safety depends on product quality, the amount used, the person's condition, and other medicines they take.",
      ar: "لا، قد تسبب المكونات الطبيعية الحساسية أو آثاراً جانبية أو تداخلات مع العلاجات الطبية، وتعتمد السلامة على جودة المنتج والكمية المستخدمة وحالة الشخص والأدوية الأخرى التي يستخدمها.",
    },
  },
  {
    id: "slower",
    q: {
      en: "Why can herbal products take longer to have an effect?",
      ar: "لماذا تحتاج المنتجات العشبية وقتاً أطول للتأثير؟",
    },
    a: {
      en: "Some people perceive herbal products as gradual, but onset and outcome depend on the ingredients, the method, the amount used and the individual. Do not stop medical treatment while waiting for our products to have an effect.",
      ar: "قد يرى بعض الناس أن تأثير المنتجات العشبية تدريجي، لكن بداية التأثير والنتيجة تعتمدان على المكونات وطرق التحضير والكمية المستخدمة والفرد، لا توقف العلاج الطبي أثناء انتظار تأثير منتجاتنا.",
    },
  },
  {
    id: "balancing",
    q: { en: "What does balancing product constituents mean?", ar: "ماذا يعني توازن مكونات المنتج؟" },
    a: {
      en: "We first identify the plant constituents considered relevant to the intended wellbeing objective. We then select plants containing those compounds and adjust their proportions, while considering integration, safety and the method of use.",
      ar: "نحدد أولاً المكونات النباتية ذات الصلة بهدف العافية المقصود، ثم نختار النباتات التي تحتوي على تلك المركبات ونضبط نسبها مع مراعاة التكامل والسلامة وطريقة الاستخدام.",
    },
  },
  {
    id: "medicine",
    q: {
      en: "Can I use a product alongside prescribed medicine?",
      ar: "هل أستخدم المنتج مع دواء موصوف؟",
    },
    a: {
      en: "Consult a qualified pharmacist or doctor first. Herbal products may interact with medicines and may be unsuitable for certain conditions or before surgery.",
      ar: "استشر صيدلانياً أو طبيباً مؤهلاً أولاً، قد تتداخل المنتجات العشبية مع الأدوية، وقد لا تناسب حالات معينة أو الفترة السابقة للجراحة.",
    },
  },
  {
    id: "advice",
    q: { en: "Who should seek advice before use?", ar: "من ينبغي له طلب المشورة قبل الاستخدام؟" },
    a: {
      en: "Pregnant or breastfeeding people, children, older adults taking multiple medicines, people with allergies or an unstable health condition, and anyone preparing for surgery.",
      ar: "الحوامل والمرضعات والأطفال وكبار السن الذين يتناولون أدوية متعددة، ومن لديهم حساسية أو حالة صحية غير مستقرة، وكل من يستعد لعملية جراحية.",
    },
  },
];

/** The live site serves this English description on both locales; kept as
 *  metadata only, so the Arabic page shows no subtitle (as it does today). */
export const FAQ_DESCRIPTION =
  "What distinguishes Herbedia, what our products do and do not do, and who should seek advice before use.";

export const CONTACT = {
  company: { en: "Herbedia Company", ar: "شركة هيربيديا" } as L,
  about: {
    en: "Herbedia is an online store offering natural herbal blends and oils for the general wellbeing of adults. The company studies herbal healing practices from multiple traditional medicine schools to help develop effective botanical blends.",
    ar: "هيربيديا متجر إلكتروني يقدم خلطات عشبية طبيعية وزيوتاً للصحة العامة للبالغين، تدرس الشركة ممارسات التداوي بالأعشاب في مدارس متعددة من الطب التقليدي للمساعدة في تطوير خلطات نباتية فعالة.",
  } as L,
  email: "customerservice@herbedia.co.ae",
  site: "www.herbedia.com",
  licence: "1643172",
  labels: {
    email: { en: "Email", ar: "البريد الإلكتروني" } as L,
    hours: { en: "Hours", ar: "ساعات العمل" } as L,
    address: { en: "Address", ar: "العنوان" } as L,
    licence: { en: "Trade licence", ar: "الرخصة التجارية" } as L,
    website: { en: "Website", ar: "الموقع" } as L,
    country: { en: "Country", ar: "الدولة" } as L,
    contact: { en: "Contact", ar: "اتصل بنا" } as L,
  },
  hours: { en: "9:00 — 16:00, UAE time", ar: "٩:٠٠ - ١٦:٠٠ بتوقيت الإمارات" } as L,
  address: {
    en: "Office 503, Business Point Building, 22b St — Port Saeed, Deira, Dubai, UAE",
    ar: "المكتب 503، مبنى بزنس بوينت، شارع 22ب - بورسعيد - ديرة - دبي، الإمارات العربية المتحدة",
  } as L,
  country: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" } as L,
  pendingTitle: { en: "Still to confirm", ar: "بانتظار الاعتماد" } as L,
  pendingNote: { en: "Channels opening soon", ar: "قنوات قادمة قريباً" } as L,
  pending: [
    { en: "Telephone", ar: "الهاتف" },
    { en: "WhatsApp", ar: "واتساب" },
    { en: "Instagram", ar: "Instagram" },
    { en: "Facebook", ar: "Facebook" },
    { en: "LinkedIn", ar: "LinkedIn" },
  ] as L[],
};
