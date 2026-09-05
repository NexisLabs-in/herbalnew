import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageEditor, type EditorSection } from "@/components/admin/PageEditor";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { ContentPage, type ContentPageDoc } from "@/lib/models";
import { SECTION_TYPES, type SectionType } from "@/lib/models/enums";
import { blankSection } from "@/lib/cms/registry";

export const metadata: Metadata = { title: "Edit page" };
export const dynamic = "force-dynamic";

export default async function EditContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdminPage("content:write");
  const { slug } = await params;

  await connectDb();
  const page = await ContentPage.findOne({ slug }).lean<ContentPageDoc | null>();
  if (!page) notFound();

  const sections: EditorSection[] = (page.sections ?? [])
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      type: section.type as SectionType,
      visible: section.visible,
      data: (section.data ?? {}) as Record<string, unknown>,
    }));

  // An empty, valid instance of every type, built here so the browser never
  // needs to know the shapes the registry defines.
  const blanks = Object.fromEntries(
    SECTION_TYPES.map((type) => [type, blankSection(type) as Record<string, unknown>]),
  );

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <p className="admin-crumb">
            <Link href="/admin/content">Pages</Link> / {slug}
          </p>
          <h1 className="admin-head__title">{page.title.en || slug}</h1>
        </div>
      </div>

      <PageEditor
        slug={slug}
        blanks={blanks}
        initial={{
          title: { en: page.title.en, ar: page.title.ar ?? "" },
          seo: {
            title: { en: page.seo?.title?.en ?? "", ar: page.seo?.title?.ar ?? "" },
            description: { en: page.seo?.description?.en ?? "", ar: page.seo?.description?.ar ?? "" },
          },
          published: page.published,
          sections,
        }}
      />
    </AdminShell>
  );
}
