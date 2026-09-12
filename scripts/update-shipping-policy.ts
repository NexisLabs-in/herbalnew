/**
 * Adds the two refund clauses the client asked for to the live Shipping &
 * Returns policy: the seal-and-packaging condition, and inspection before
 * approval. The storefront reads this copy from the CMS record once the
 * Policies page has been seeded, so editing src/content/legal.ts alone would
 * not change a running site.
 *
 * Safe to re-run: a clause already present is left alone, and if the client has
 * rewritten the surrounding text so an anchor is gone, the new clause is
 * appended rather than dropped.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/update-shipping-policy.ts
 */
import { connectDb, disconnectDb } from "@/lib/db";
import { consolidateLegalPage, LEGAL_PAGE_SLUG } from "@/lib/cms/catalogue";
import { ContentPage, type ContentSectionDoc } from "@/lib/models/ContentPage";

const log = (message: string) => console.log(`  ${message}`);

type Body = { en: string; ar: string };

/** Each clause names the paragraph it belongs in front of, so the policy reads
 *  rule-then-exception rather than the other way round. */
const ADDITIONS: { anchor: Body; text: Body }[] = [
  {
    anchor: {
      en: "For safety, opened consumable products",
      ar: "لأسباب السلامة",
    },
    text: {
      en: "A refund may be approved only if the product is unopened and the original seal and packaging are intact.",
      ar: "لا يُوافق على استرداد المبلغ إلا إذا كان المنتج غير مفتوح وبقي الغلاف الأصلي والعبوة سليمين.",
    },
  },
  {
    anchor: {
      en: "Approved refunds are returned",
      ar: "تُعاد المبالغ المعتمدة",
    },
    text: {
      en: "Refund approval follows inspection of the returned product.",
      ar: "تُمنح الموافقة على الاسترداد بعد فحص المنتج المُعاد.",
    },
  },
];

function addClauses(body: string, locale: "en" | "ar"): { body: string; added: number } {
  const clauses = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  let added = 0;

  for (const addition of ADDITIONS) {
    const text = addition.text[locale];
    if (clauses.some((clause) => clause === text)) continue;

    const anchor = addition.anchor[locale];
    const at = clauses.findIndex((clause) => clause.includes(anchor));
    if (at === -1) {
      log(`${locale}: anchor "${anchor}" not found — appending instead`);
      clauses.push(text);
    } else {
      clauses.splice(at, 0, text);
    }
    added += 1;
  }

  return { body: clauses.join("\n\n"), added };
}

async function main() {
  await connectDb();

  // Creates the Policies page from src/content/legal.ts if it is not there yet,
  // so this works on a fresh database as well as a live one.
  await consolidateLegalPage();

  const page = await ContentPage.findOne({ slug: LEGAL_PAGE_SLUG });
  if (!page) throw new Error(`No "${LEGAL_PAGE_SLUG}" page — nothing to update.`);

  const index = page.sections.findIndex((section: ContentSectionDoc) => {
    if (section.type !== "richText") return false;
    const data = section.data as { heading?: { en?: string }; body?: { en?: string } };
    return (
      /shipping|return/i.test(data.heading?.en ?? "") ||
      (data.body?.en ?? "").includes("Approved refunds are returned")
    );
  });

  if (index === -1) throw new Error("No Shipping & Returns section on the Policies page.");

  const data = page.sections[index].data as {
    heading?: { en?: string; ar?: string };
    body?: { en?: string; ar?: string };
  };

  const en = addClauses(data.body?.en ?? "", "en");
  const ar = addClauses(data.body?.ar ?? "", "ar");

  if (en.added === 0 && ar.added === 0) {
    log("already up to date — no changes");
    await disconnectDb();
    return;
  }

  page.set(`sections.${index}.data`, { ...data, body: { en: en.body, ar: ar.body } });
  page.markModified(`sections.${index}.data`);
  await page.save();

  log(`updated "${LEGAL_PAGE_SLUG}" — ${en.added} EN, ${ar.added} AR clause(s) added`);
  await disconnectDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
