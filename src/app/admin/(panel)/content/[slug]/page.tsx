import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { consolidateLegalPage } from "@/lib/cms/catalogue";
import { isRetiredPolicySlug, LEGAL_PAGE_SLUG } from "@/lib/cms/order";
import { CopyEditor } from "@/components/admin/CopyEditor";
import { ensureFaqClosing, ensurePageCopy } from "@/lib/cms/copy";
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

  if (isRetiredPolicySlug(slug)) redirect(`/admin/content/${LEGAL_PAGE_SLUG}`);

  if (slug === LEGAL_PAGE_SLUG) await consolidateLegalPage();
  if (slug === "method" || slug === "contact") await ensurePageCopy(slug);
  if (slug === "faq") await ensureFaqClosing();

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

  const copy = sections.find((section) => section.type === "methodCopy" || section.type === "contactCopy");

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="admin-crumb">
            <Link href="/admin/content">Pages</Link> / {page.title.en || slug}
          </p>
          <h1 className="admin-head__title">{page.title.en || slug}</h1>
        </div>
      </div>

      {slug === "method" || slug === "contact" ? (
        <CopyEditor
          slug={slug}
          title={{ en: page.title.en, ar: page.title.ar ?? "" }}
          seo={{
            title: { en: page.seo?.title?.en ?? "", ar: page.seo?.title?.ar ?? "" },
            description: { en: page.seo?.description?.en ?? "", ar: page.seo?.description?.ar ?? "" },
          }}
          published={page.published}
          data={copy?.data ?? {}}
        />
      ) : (
      <PageEditor
        slug={slug}
        blanks={blanks}
        headingLabel={slug === LEGAL_PAGE_SLUG ? "Page heading" : undefined}
        introLabel={slug === LEGAL_PAGE_SLUG ? "Intro" : undefined}
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
      )}
    </>
  );
}
