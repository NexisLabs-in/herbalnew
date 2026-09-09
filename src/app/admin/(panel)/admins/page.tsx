import type { Metadata } from "next";
import { AdminPager } from "@/components/admin/AdminPager";
import { AdminUsers, type AdminRow, type RoleRow } from "@/components/admin/AdminUsers";
import { pageNumber, pageWindow } from "@/lib/admin/paging";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { AdminRole, AdminUser } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdminPage("admins:read");
  const { page: requested } = await searchParams;

  await connectDb();
  const total = await AdminUser.countDocuments();
  const { page, pages, skip, perPage } = pageWindow(pageNumber(requested), total);

  const [users, roles, membership] = await Promise.all([
    AdminUser.find().sort({ createdAt: 1 }).skip(skip).limit(perPage).lean(),
    AdminRole.find().sort({ isSystem: -1, name: 1 }).lean(),
    AdminUser.aggregate<{ _id: unknown; count: number }>([{ $group: { _id: "$roleId", count: { $sum: 1 } } }]),
  ]);

  const memberCount = new Map(membership.map((row) => [String(row._id), row.count]));

  const roleName = new Map(roles.map((role) => [String(role._id), role.name]));

  const roleRows: RoleRow[] = roles.map((role) => ({
    id: String(role._id),
    name: role.name,
    description: role.description ?? "",
    permissions: role.permissions,
    isSystem: role.isSystem,
    memberCount: memberCount.get(String(role._id)) ?? 0,
  }));

  const adminRows: AdminRow[] = users.map((user) => ({
    id: String(user._id),
    email: user.email,
    name: user.name,
    roleId: String(user.roleId),
    roleName: roleName.get(String(user.roleId)) ?? "—",
    active: user.active,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
    isSelf: String(user._id) === admin.adminId,
  }));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Admin users</h1>
          <p className="admin-head__sub">
            {total} account{total === 1 ? "" : "s"} · {roleRows.length} roles
          </p>
        </div>
      </div>

      <AdminUsers
        admins={adminRows}
        roles={roleRows}
        canWrite={can(admin.permissions, "admins:write")}
      />
      <AdminPager path="/admin/admins" page={page} pages={pages} />
    </>
  );
}
