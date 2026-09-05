import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { ContentPage, type ContentPageDoc } from "@/lib/models";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

/** Where each page appears on the storefront, so an admin can find it. */
const ROUTE: Record<string, string> = {
  home: "/en",
  method: "/en/method",
  faq: "/en/faq",
  contact: "/en/contact",
  "legal-notice": "/en/legal",
  privacy: "/en/legal",
  terms: "/en/legal",
  returns: "/en/legal",
};

export default async function AdminContentPage() {
  const admin = await requireAdminPage("content:read");

  await connectDb();
  const pages = await ContentPage.find().sort({ slug: 1 }).lean<ContentPageDoc[]>();

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Pages</h1>
          <p className="admin-head__sub">
            Sections come from a fixed set, so an edited page always matches the rest of the site.
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
                  <span className="admin-table__meta">{ROUTE[page.slug] ?? `/${page.slug}`}</span>
                </td>
                <td>
                  {page.sections.length === 0 ? (
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

      <p className="admin-note" style={{ marginTop: "1.25rem" }}>
        A page with no sections keeps the version built into the site. Adding a section takes it
        over — so moving a page into the CMS is a decision, not something that happens by itself.
      </p>
    </AdminShell>
  );
}
