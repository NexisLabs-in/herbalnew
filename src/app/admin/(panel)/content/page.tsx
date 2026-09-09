import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/guards";
import { consolidateLegalPage } from "@/lib/cms/catalogue";
import { ensurePageCopy } from "@/lib/cms/copy";
import { CMS_PAGES } from "@/lib/cms/order";
import { cmsPagePath } from "@/lib/cms/routes";
import { connectDb } from "@/lib/db";
import { ContentPage, type ContentPageDoc } from "@/lib/models";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const admin = await requireAdminPage("content:read");

  await consolidateLegalPage();
  await Promise.all([ensurePageCopy("method"), ensurePageCopy("contact")]);
  await connectDb();
  const stored = await ContentPage.find({
    slug: { $in: CMS_PAGES.map((page) => page.slug) },
  }).lean<ContentPageDoc[]>();
  const bySlug = new Map(stored.map((page) => [page.slug, page]));
  const pages = CMS_PAGES.map((entry) => bySlug.get(entry.slug)).filter(
    (page): page is ContentPageDoc => Boolean(page),
  );

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Pages</h1>
          <p className="admin-head__sub">
            The same pages as the site, in the same order. Each one is edited as a whole.
          </p>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Sections</th>
              <th>State</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.slug}>
                <td>
                  <Link className="admin-table__title" href={`/admin/content/${page.slug}`}>
                    {page.title.en || page.slug}
                  </Link>
                  <span className="admin-table__meta">{cmsPagePath(page.slug)}</span>
                </td>
                <td>
                  {page.slug === "method" || page.slug === "contact" ? (
                    <span className="admin-table__meta">Text</span>
                  ) : page.sections.length === 0 ? (
                    <span className="admin-table__meta">Using the built-in page</span>
                  ) : (
                    `${page.sections.length}`
                  )}
                </td>
                <td>
                  <span className={`admin-chip ${page.published ? "admin-chip--published" : ""}`}>
                    {page.published ? "Published" : "Hidden"}
                  </span>
                </td>
                <td className="admin-table__actions">
                  <Link className="link-plain" href={`/admin/content/${page.slug}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
