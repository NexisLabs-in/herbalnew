"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { connectDb } from "@/lib/db";
import { AdminRole } from "@/lib/models/AdminRole";
import { AdminUser } from "@/lib/models/AdminUser";
import { ALL_PERMISSIONS, isPermission } from "@/lib/permissions";
import { fieldErrorsFrom, type ActionState } from "@/lib/validation/shared";

/** Admin accounts and roles.
 *
 *  The client asked for a full role editor, so roles are data. The rules that
 *  keep an install from locking itself out live here:
 *
 *   - the seeded Owner role cannot be edited or deleted;
 *   - a role in use cannot be deleted;
 *   - an admin cannot deactivate or delete their own account.
 */

const roleSchema = z.object({
  name: z.string().trim().min(2, "Give the role a name.").max(60),
  description: z.string().trim().max(200).default(""),
  permissions: z.array(z.string()).default([]),
});

export async function saveRole(roleId: string | null, payload: unknown): Promise<ActionState> {
  const admin = await requireAdmin("admins:write");

  const parsed = roleSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the role.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  // Only permissions the app actually defines. An unknown string would sit in
  // the database looking like access it does not grant.
  const permissions = parsed.data.permissions.filter(isPermission);

  await connectDb();

  if (roleId) {
    const role = await AdminRole.findById(roleId);
    if (!role) return { error: "That role no longer exists." };
    if (role.isSystem) {
      return { error: "The Owner role cannot be changed — it is what guarantees somebody can always grant access back." };
    }
    role.set({ ...parsed.data, permissions });
    await role.save();
    await recordAudit(admin, { action: "update", entity: "AdminRole", entityId: roleId, entityLabel: role.name });
  } else {
    try {
      const created = await AdminRole.create({ ...parsed.data, permissions });
      await recordAudit(admin, {
        action: "create",
        entity: "AdminRole",
        entityId: String(created._id),
        entityLabel: created.name,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return { error: "A role with that name already exists." };
      }
      throw error;
    }
  }

  revalidatePath("/admin/admins");
  return { ok: true, notice: "Role saved." };
}

export async function deleteRole(roleId: string): Promise<ActionState> {
  const admin = await requireAdmin("admins:write");
  await connectDb();

  const role = await AdminRole.findById(roleId);
  if (!role) return { error: "That role no longer exists." };
  if (role.isSystem) return { error: "The Owner role cannot be deleted." };

  const inUse = await AdminUser.countDocuments({ roleId });
  if (inUse > 0) {
    return {
      error: `${inUse} admin${inUse === 1 ? " is" : "s are"} using this role. Move them to another role first.`,
    };
  }

  await role.deleteOne();
  await recordAudit(admin, { action: "delete", entity: "AdminRole", entityId: roleId, entityLabel: role.name });

  revalidatePath("/admin/admins");
  return { ok: true, notice: `${role.name} deleted.` };
}

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(2, "Enter a name.").max(120),
  roleId: z.string().regex(/^[0-9a-f]{24}$/i, "Choose a role."),
});

export async function createAdmin(payload: unknown): Promise<ActionState & { password?: string }> {
  const admin = await requireAdmin("admins:write");

  const parsed = adminSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: "Check the details.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  await connectDb();
  const role = await AdminRole.findById(parsed.data.roleId);
  if (!role) return { error: "That role no longer exists." };

  // A generated password shown once, and forced to be changed at first login,
  // so nothing anyone typed becomes a standing shared credential.
  const password = randomBytes(9).toString("base64url");

  try {
    const created = await AdminUser.create({
      email: parsed.data.email,
      name: parsed.data.name,
      roleId: role._id,
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    });

    await recordAudit(admin, {
      action: "create",
      entity: "AdminUser",
      entityId: String(created._id),
      entityLabel: `${created.email} as ${role.name}`,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { error: "An admin with that email already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/admins");
  return {
    ok: true,
    password,
    notice: `Created. Give them this password — it is shown once and must be changed at first sign-in.`,
  };
}

export async function setAdminRole(adminId: string, roleId: string): Promise<ActionState> {
  const admin = await requireAdmin("admins:write");
  await connectDb();

  const role = await AdminRole.findById(roleId);
  if (!role) return { error: "That role no longer exists." };

  const target = await AdminUser.findById(adminId);
  if (!target) return { error: "That admin no longer exists." };

  // Removing your own access mid-session is the one change nobody means to
  // make, and the only one that cannot be undone from the same screen.
  if (String(target._id) === admin.adminId && !role.permissions.includes(ALL_PERMISSIONS)) {
    return { error: "You cannot move yourself off the Owner role — ask another owner to do it." };
  }

  target.roleId = role._id;
  await target.save();

  await recordAudit(admin, {
    action: "update",
    entity: "AdminUser",
    entityId: adminId,
    entityLabel: target.email,
    diff: { role: role.name },
  });

  revalidatePath("/admin/admins");
  return { ok: true, notice: `${target.email} is now ${role.name}.` };
}

export async function setAdminActive(adminId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin("admins:write");
  if (adminId === admin.adminId) return { error: "You cannot deactivate your own account." };

  await connectDb();
  const target = await AdminUser.findByIdAndUpdate(adminId, { $set: { active } });
  if (!target) return { error: "That admin no longer exists." };

  await recordAudit(admin, {
    action: "update",
    entity: "AdminUser",
    entityId: adminId,
    entityLabel: target.email,
    diff: { active },
  });

  revalidatePath("/admin/admins");
  return { ok: true, notice: active ? "Account switched on." : "Account switched off." };
}

/** Forces a password change without knowing the old one — for an admin who has
 *  lost access and cannot use the emailed-code route. */
export async function resetAdminPassword(adminId: string): Promise<ActionState & { password?: string }> {
  const admin = await requireAdmin("admins:write");
  await connectDb();

  const target = await AdminUser.findById(adminId);
  if (!target) return { error: "That admin no longer exists." };

  const password = randomBytes(9).toString("base64url");
  target.passwordHash = await bcrypt.hash(password, 12);
  target.mustChangePassword = true;
  await target.save();

  await recordAudit(admin, {
    action: "update",
    entity: "AdminUser",
    entityId: adminId,
    entityLabel: target.email,
    diff: { passwordReset: true },
  });

  revalidatePath("/admin/admins");
  return { ok: true, password, notice: "New password below — shown once." };
}
