import "server-only";
import { headers } from "next/headers";
import { AuditLog } from "./models/AuditLog";
import type { AdminContext } from "./auth/guards";

/** Records who changed what.
 *
 *  With a full role editor and several staff accounts, "the price was wrong on
 *  Tuesday" needs an answer. Every admin mutation calls this.
 *
 *  Logging must never break the operation it is recording — a failed write here
 *  is swallowed and reported to the server log. Losing an audit line is bad;
 *  failing a customer's order because the audit collection hiccuped is worse.
 */

export type AuditEntry = {
  action: "create" | "update" | "delete" | "archive" | "restore" | "status" | "approve" | "reject" | "adjust" | "refund";
  entity: string;
  entityId?: string;
  entityLabel?: string;
  diff?: unknown;
};

export async function recordAudit(admin: AdminContext, entry: AuditEntry): Promise<void> {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    await AuditLog.create({
      adminId: admin.adminId,
      adminEmail: admin.email,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? "",
      entityLabel: entry.entityLabel ?? "",
      diff: entry.diff ?? null,
      ip,
    });
  } catch (error) {
    console.error("[audit] could not record entry", entry.entity, entry.action, error);
  }
}

/** The changed fields between two versions, for the audit diff.
 *
 *  Compared by serialised value so nested bilingual objects and arrays are
 *  handled without a deep-equality dependency. Only what actually changed is
 *  stored — a full before/after of every product would bloat the collection and
 *  bury the one field that moved.
 */
export function diffOf<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: (keyof T)[],
): Record<string, { from: unknown; to: unknown }> | null {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    const from = JSON.stringify(before[field] ?? null);
    const to = JSON.stringify(after[field] ?? null);
    if (from !== to) diff[String(field)] = { from: before[field] ?? null, to: after[field] ?? null };
  }
  return Object.keys(diff).length ? diff : null;
}
