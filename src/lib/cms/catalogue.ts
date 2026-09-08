import { LEGAL, LEGAL_INTRO, LEGAL_TITLE, type LegalSection } from "@/content/legal";
import { connectDb } from "@/lib/db";
import { CMS_PAGES, LEGAL_PAGE_SLUG, RETIRED_POLICY_SLUGS } from "@/lib/cms/order";
import { ContentPage, type ContentPageDoc } from "@/lib/models/ContentPage";
import type { L } from "@/lib/i18n";

export { CMS_PAGES, LEGAL_PAGE_SLUG, RETIRED_POLICY_SLUGS };

const RETIRED_TO_POLICY: Record<string, string> = {
  terms: "terms",
  privacy: "privacy",
  "legal-notice": "cookies",
  returns: "shipping",
};

const tl = (value: L) => ({ en: value.en, ar: value.ar });

function policyBody(doc: LegalSection) {
  return {
    en: doc.clauses.map((clause) => clause.en).join("\n\n"),
    ar: doc.clauses.map((clause) => clause.ar).join("\n\n"),
  };
}

function richTextFrom(doc: LegalSection, saved?: { heading?: { en?: string; ar?: string }; body?: { en?: string; ar?: string } }) {
  const savedBody = saved?.body;
  const hasSaved = Boolean(savedBody?.en?.trim() || savedBody?.ar?.trim());
  const savedHeading = saved?.heading?.en?.trim() ?? "";
  const headingIsWrongName = savedHeading === "Legal Notice" || savedHeading === "Return Policy";
  const heading = saved?.heading;
  return {
    type: "richText" as const,
    visible: true,
    data: {
      eyebrow: { en: "", ar: "" },
      heading:
        savedHeading && !headingIsWrongName
          ? { en: heading?.en ?? "", ar: heading?.ar ?? "" }
          : tl(doc.title),
      body: hasSaved
        ? { en: savedBody?.en ?? "", ar: savedBody?.ar ?? "" }
        : policyBody(doc),
    },
  };
}

function savedRichText(page: ContentPageDoc | undefined) {
  const section = (page?.sections ?? []).find((item) => item.type === "richText");
  const data = (section?.data ?? {}) as {
    heading?: { en?: string; ar?: string };
    body?: { en?: string; ar?: string };
  };
  return section ? data : undefined;
}

/** One Policies page, four text sections, then the old records are deleted.
 *
 *  Safe to call on every admin visit and on the storefront: if the fold has
 *  already happened it returns immediately. Existing text on the old records
 *  is copied into the matching section; a Policies page that already has
 *  sections is left alone. */
export async function consolidateLegalPage(): Promise<void> {
  await connectDb();

  const [legal, retired] = await Promise.all([
    ContentPage.findOne({ slug: LEGAL_PAGE_SLUG }),
    ContentPage.find({ slug: { $in: [...RETIRED_POLICY_SLUGS] } }).lean<ContentPageDoc[]>(),
  ]);

  if (retired.length === 0 && legal && legal.sections.length > 0) return;

  const byPolicy = new Map(
    retired.map((page) => [RETIRED_TO_POLICY[page.slug], page] as const),
  );

  if (!legal || legal.sections.length === 0) {
    const sections = LEGAL.map((doc, order) => ({
      ...richTextFrom(doc, savedRichText(byPolicy.get(doc.id))),
      order,
    }));

    if (legal) {
      legal.set("sections", sections);
      if (!legal.title?.en) legal.set("title", tl(LEGAL_TITLE));
      if (!legal.seo?.description?.en) {
        legal.set("seo", {
          title: legal.seo?.title ?? { en: "", ar: "" },
          description: tl(LEGAL_INTRO),
        });
      }
      legal.set("isSystem", true);
      legal.set("published", legal.published ?? true);
      await legal.save();
    } else {
      await ContentPage.create({
        slug: LEGAL_PAGE_SLUG,
        title: tl(LEGAL_TITLE),
        seo: { title: { en: "", ar: "" }, description: tl(LEGAL_INTRO) },
        published: true,
        isSystem: true,
        sections,
      });
    }
  }

  if (retired.length > 0) {
    await ContentPage.deleteMany({ slug: { $in: [...RETIRED_POLICY_SLUGS] } });
  }
}
