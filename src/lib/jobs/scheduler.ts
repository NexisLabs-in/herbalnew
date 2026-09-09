import "server-only";
import { schedule, type ScheduledTask } from "node-cron";
import { env } from "../env";
import { getSettings } from "../settings";
import { hourlyTasks, lowStockDigest, type TaskResult } from "./tasks";

/** In-process scheduling.
 *
 *  The client chose in-process `node-cron`, which is why the deploy target is a
 *  persistent Node server rather than serverless (plan §3). Two consequences
 *  handled here:
 *
 *   - **Start once.** Next re-evaluates modules on hot reload and can run more
 *     than one worker; a global guard means the jobs are registered a single
 *     time rather than once per reload or per worker.
 *   - **Never throw.** A task that fails must log and let the next tick try
 *     again. An unhandled rejection inside a cron callback takes the whole
 *     server down, and a shop that stops selling because a digest failed is a
 *     far worse outcome than a missed email.
 */

type SchedulerState = { started: boolean; jobs: ScheduledTask[] };

const globalForCron = globalThis as unknown as { _herbediaCron?: SchedulerState };
const state: SchedulerState = (globalForCron._herbediaCron ??= { started: false, jobs: [] });

function report(results: TaskResult[]) {
  const worked = results.filter((result) => result.done > 0);
  if (worked.length === 0) return;
  for (const result of worked) {
    console.info(`[cron] ${result.task}: ${result.done}${result.note ? ` (${result.note})` : ""}`);
  }
}

async function safely(label: string, run: () => Promise<TaskResult[] | TaskResult>) {
  try {
    const result = await run();
    report(Array.isArray(result) ? result : [result]);
  } catch (error) {
    console.error(`[cron] ${label} failed`, error);
  }
}

export async function startScheduler(): Promise<void> {
  if (state.started) return;
  if (!env.CRON_ENABLED) {
    console.info("[cron] disabled (CRON_ENABLED is not true)");
    return;
  }

  state.started = true;

  // The digest hour is an admin setting, so it is read once at boot. Changing
  // it takes effect on the next restart, which is the honest trade for not
  // re-registering a cron on every settings save.
  const settings = await getSettings().catch(() => null);
  const hour = settings?.notifications.digestHourLocal ?? 8;

  const options = { timezone: env.TimeZone } as const;

  state.jobs.push(
    schedule(`0 ${hour} * * *`, () => void safely("lowStockDigest", lowStockDigest), options),
  );

  state.jobs.push(
    schedule("5 * * * *", () => void safely("hourly", hourlyTasks), options),
  );

  console.info(`[cron] started — digest at ${hour}:00 ${env.TimeZone}, hourly sweep at :05`);
}

export function stopScheduler(): void {
  for (const job of state.jobs) void job.stop();
  state.jobs = [];
  state.started = false;
}
