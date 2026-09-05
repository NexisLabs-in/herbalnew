"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { ContentPage } from "@/lib/models/ContentPage";
import { SECTION_TYPES } from "@/lib/models/enums";
import { parseSection } from "@/lib/cms/registry";
import { bilingual, type ActionState } from "@/lib/validation/shared";

/** Editing CMS pages.
 *
 *  Each section's data is validated against its own schema from the registry,
 *  because the database stores it as Mixed and the registry is the only thing
 *  that knows the shape. A section that fails validation names itself in the
 *  error rather than the whole save failing anonymously.
 */

const pageSchema = z.object({
  title: bilingual({ required: true, max: 160 }),
  seo: z.object({ title: bilingual({ max: 160 }), description: bilingual({ max: 320 }) }),
  published: z.boolean().default(true),
  sections: z.array(
    z.object({
      type: z.enum(SECTION_TYPES),
      visible: z.boolean().default(true),
      data: z.unknown(),
    }),
  ),
});

export async function savePage(slug: string, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("content:write");

  const parsed = pageSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the page." };
  }

  // Validate every section before writing any of them, so a page is never left
  // half-saved with one broken block.
  const sections: { type: string; order: number; visible: boolean; data: Record<string, unknown> }[] = [];
  for (const [index, section] of parsed.data.sections.entries()) {
    const result = parseSection(section.type, section.data);
    if (!result.ok) {
      return { error: `Section ${index + 1} (${section.type}): ${result.error}` };
    }
    sections.push({ type: section.type, order: index, visible: section.visible, data: result.data });
  }

  await connectDb();
  const page = await ContentPage.findOneAndUpdate(
    { slug },
    {
      $set: {
        title: parsed.data.title,
        seo: parsed.data.seo,
        published: parsed.data.published,
        sections,
      },
      $setOnInsert: { slug },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  await recordAudit(admin, {
    action: "update",
    entity: "ContentPage",
    entityId: String(page?._id ?? ""),
    entityLabel: slug,
    diff: { sections: sections.length },
  });

  // A CMS page can appear anywhere, so the whole storefront is invalidated
  // rather than guessing which routes embed it.
  revalidatePath("/[locale]", "layout");
  revalidatePath(`/admin/content/${slug}`);
  revalidatePath("/admin/content");

  return { ok: true, notice: "Saved." };
}
