import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsers, type AdminRow, type RoleRow } from "@/components/admin/AdminUsers";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { AdminRole, AdminUser } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdminPage("admins:read");

  await connectDb();
  const [users, roles] = await Promise.all([
    AdminUser.find().sort({ createdAt: 1 }).lean(),
    AdminRole.find().sort({ isSystem: -1, name: 1 }).lean(),
  ]);

  const memberCount = new Map<string, number>();
  for (const user of users) {
    const key = String(user.roleId);
    memberCount.set(key, (memberCount.get(key) ?? 0) + 1);
  }

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
    <AdminShell admin={admin}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Admin users</h1>
          <p className="admin-head__sub">
            {adminRows.length} account{adminRows.length === 1 ? "" : "s"} · {roleRows.length} roles
          </p>
        </div>
      </div>

      <AdminUsers
        admins={adminRows}
        roles={roleRows}
        canWrite={can(admin.permissions, "admins:write")}
      />
    </AdminShell>
  );
}
