"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import {
  abandonedCartReminders,
  backInStockNotices,
  expireQuotes,
  lowStockDigest,
  retireFinishedSales,
  type TaskResult,
} from "@/lib/jobs/tasks";

/** Running a scheduled job by hand.
 *
 *  Useful for two things a cron cannot give you: proving the job works without
 *  waiting until 8am, and catching up after the server was down. Every task is
 *  safe to run twice, which is what makes this safe to expose at all.
 */
const TASKS = {
  lowStockDigest,
  abandonedCart: abandonedCartReminders,
  backInStock: backInStockNotices,
  expireQuotes,
  retireSales: retireFinishedSales,
} as const;

export type JobName = keyof typeof TASKS;

export async function runJob(name: JobName): Promise<{ ok?: boolean; error?: string; notice?: string }> {
  const admin = await requireAdmin("settings:write");

  const task = TASKS[name];
  if (!task) return { error: "Unknown job." };

  try {
    const result: TaskResult = await task();
    await recordAudit(admin, {
      action: "update",
      entity: "Job",
      entityLabel: result.task,
      diff: { done: result.done, note: result.note },
    });
    return {
      ok: true,
      notice: `${result.task}: ${result.done} handled${result.note ? ` — ${result.note}` : ""}.`,
    };
  } catch (error) {
    console.error(`[jobs] ${name} failed`, error);
    return { error: error instanceof Error ? error.message : "The job failed." };
  }
}
