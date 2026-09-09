import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { MessageInbox, type InboxMessage } from "@/components/admin/MessageInbox";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { ContactMessage, type ContactMessageDoc } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const admin = await requireAdminPage("messages:read");
  const { status, page: requested } = await searchParams;

  await connectDb();
  // Archived messages are hidden unless asked for — an inbox that never empties
  // stops being read.
  const filter = status ? { status } : { status: { $ne: "archived" } };

  const total = await ContactMessage.countDocuments(filter);
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);

  const [messages, unread] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean<ContactMessageDoc[]>(),
    ContactMessage.countDocuments({ status: "new" }),
  ]);

  const rows: InboxMessage[] = messages.map((message) => ({
    id: String(message._id),
    name: message.name,
    email: message.email,
    phone: message.phone ?? "",
    subject: message.subject ?? "",
    message: message.message,
    status: message.status,
    locale: message.locale ?? "en",
    createdAt: new Date(message.createdAt).toISOString(),
  }));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Messages</h1>
          <p className="admin-head__sub">{unread} unread · replies go by email</p>
        </div>
      </div>

      <form className="admin-filters" action="/admin/messages">
        <select className="field__input field__input--sm" name="status" defaultValue={status ?? ""} style={{ maxWidth: "180px" }}>
          <option value="">Inbox</option>
          <option value="new">Unread</option>
          <option value="read">Read</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn btn--ghost btn--sm" type="submit">
          Filter
        </button>
      </form>

      <MessageInbox messages={rows} canWrite={can(admin.permissions, "messages:write")} />
      <AdminPager path="/admin/messages" page={page} pages={pages} params={{ status }} />
    </>
  );
}
