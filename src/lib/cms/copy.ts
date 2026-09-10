import { BRAND, TRADITIONS, TRADITIONS_HEADING, TRADITIONS_NOTE } from "@/content/brand";
import { HERO, METHOD_HEADING, METHOD_PAGE, METHOD_STEPS, METHOD_SUB, CONTACT } from "@/content/pages";
import { connectDb } from "@/lib/db";
import { ContentPage } from "@/lib/models/ContentPage";
import type { L } from "@/lib/i18n";

const tl = (value: L) => ({ en: value.en, ar: value.ar });

export function methodCopyData() {
  return {
    heading: tl(BRAND.slogan),
    standfirst: tl(BRAND.supporting),
    kicker: tl(METHOD_PAGE.kicker),
    traditionsHeading: tl(TRADITIONS_HEADING),
    traditionsNote: tl(TRADITIONS_NOTE),
    traditions: TRADITIONS.map(tl),
    intro: tl(METHOD_PAGE.intro),
    paragraphs: METHOD_PAGE.paras.map(tl),
    stepsHeading: tl(METHOD_HEADING),
    stepsSub: tl(METHOD_SUB),
    steps: METHOD_STEPS.map((step) => ({ title: tl(step.title), detail: tl(step.detail) })),
    valuesHeading: tl(METHOD_PAGE.valueTitle),
    valuesSub: tl(METHOD_PAGE.valueSub),
    values: METHOD_PAGE.values.map(tl),
    cta: tl(HERO.cta1),
  };
}

export function contactCopyData() {
  return {
    company: tl(CONTACT.company),
    about: tl(CONTACT.about),
    email: CONTACT.email,
    hours: tl(CONTACT.hours),
    address: tl(CONTACT.address),
    mobile: CONTACT.mobile,
    website: CONTACT.site,
    country: tl(CONTACT.country),
    pendingTitle: tl(CONTACT.pendingTitle),
    pendingNote: tl(CONTACT.pendingNote),
    pending: CONTACT.pending.map((label) => ({ label: tl(label), href: "" })),
  };
}

/** Writes the current page text into the CMS if it is not there yet.
 *  An edited page is left alone. Safe to call on every visit. */
export async function ensurePageCopy(slug: "method" | "contact"): Promise<void> {
  await connectDb();
  const type = slug === "method" ? "methodCopy" : "contactCopy";
  const page = await ContentPage.findOne({ slug });
  if (!page) return;

  const already = (page.sections ?? []).some((section: { type?: string }) => section.type === type);
  if (already) {
    if (slug === "contact") {
      await migrateContactMobile(page);
      await fillContactChannels(page);
    }
    return;
  }

  page.set("sections", [
    {
      type,
      order: 0,
      visible: true,
      data: slug === "method" ? methodCopyData() : contactCopyData(),
    },
  ]);
  await page.save();
}

/** Retire the old trade-licence field in favour of mobile number. */
async function migrateContactMobile(page: {
  sections?: { type?: string; data?: Record<string, unknown> }[];
  set: (path: string, value: unknown) => void;
  markModified: (path: string) => void;
  save: () => Promise<unknown>;
}) {
  const section = (page.sections ?? []).find((item) => item.type === "contactCopy");
  const data = (section?.data ?? {}) as Record<string, unknown>;
  if (!("licence" in data)) return;

  const sections = (page.sections ?? []).map((item) => {
    if (item.type !== "contactCopy") return item;
    const { licence: _removed, ...rest } = data;
    return { ...item, data: { ...rest, mobile: CONTACT.mobile } };
  });
  page.set("sections", sections);
  page.markModified("sections");
  await page.save();
}

/** The channel list was added after the first contact copy was saved.
 *  Fill it once when those fields are missing, without touching the rest. */
async function fillContactChannels(page: {
  sections?: { type?: string; data?: Record<string, unknown> }[];
  set: (path: string, value: unknown) => void;
  markModified: (path: string) => void;
  save: () => Promise<unknown>;
}) {
  const section = (page.sections ?? []).find((item) => item.type === "contactCopy");
  const data = (section?.data ?? {}) as Record<string, unknown>;
  const title = data.pendingTitle as { en?: string } | undefined;
  const titleIsDraft = !title?.en || title.en === "Still to confirm";
  const pending = Array.isArray(data.pending) ? data.pending : [];
  const linksMissing = pending.some((item) => !item || typeof item !== "object" || !("href" in item));
  const missingList = pending.length === 0;
  // A stray effect of the trade-licence -> mobile migration: it always wrote
  // an empty string, even where a placeholder was available to fall back to.
  const mobileMissing = !data.mobile && Boolean(CONTACT.mobile);
  if (!titleIsDraft && !missingList && !linksMissing && !mobileMissing) return;

  const seeded = contactCopyData();
  const withLinks = pending.map((item) => {
    const record = (item ?? {}) as { en?: string; ar?: string; label?: unknown; href?: string };
    return {
      label: record.label && typeof record.label === "object" ? record.label : { en: record.en ?? "", ar: record.ar ?? "" },
      href: typeof record.href === "string" ? record.href : "",
    };
  });
  const sections = (page.sections ?? []).map((item) => {
    if (item.type !== "contactCopy") return item;
    return {
      ...item,
      data: {
        ...data,
        pendingTitle: titleIsDraft ? seeded.pendingTitle : data.pendingTitle,
        pendingNote: data.pendingNote ?? seeded.pendingNote,
        pending: missingList ? seeded.pending : withLinks,
        mobile: mobileMissing ? seeded.mobile : data.mobile,
      },
    };
  });
  page.set("sections", sections);
  page.markModified("sections");
  await page.save();
}

/** The closing strip on FAQ used to be painted by the page itself, so it never
 *  appeared in the editor. Add it once, after the questions, and leave anything
 *  already there alone. */
export async function ensureFaqClosing(): Promise<void> {
  await connectDb();
  const page = await ContentPage.findOne({ slug: "faq" });
  if (!page) return;
  const sections = page.sections ?? [];
  if (sections.some((section: { type?: string }) => section.type === "ctaBanner")) return;

  const order =
    sections.reduce((max: number, section: { order?: number }) => Math.max(max, section.order ?? 0), -1) + 1;
  page.set("sections", [
    ...sections,
    {
      type: "ctaBanner",
      order,
      visible: true,
      data: {
        heading: { en: CONTACT.labels.contact.en, ar: CONTACT.labels.contact.ar },
        body: { en: CONTACT.email, ar: "" },
        cta: { label: { en: HERO.cta2.en, ar: HERO.cta2.ar }, href: "/method" },
      },
    },
  ]);
  page.markModified("sections");
  await page.save();
}
