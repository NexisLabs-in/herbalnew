import "server-only";

/** Starts the scheduler once per server process.
 *
 *  This lives here rather than in `instrumentation.ts` because Next compiles
 *  instrumentation for the Edge runtime too whenever middleware exists, and
 *  the Edge bundle cannot contain Mongoose — it reaches for `net` and
 *  `child_process`, which do not exist there. A dynamic import does not help;
 *  the bundler still traces it.
 *
 *  Imported by the root layout instead, which only ever renders under Node.
 *  The cost is that the jobs register on the first request rather than at
 *  process start, which is a few milliseconds later and arguably the better
 *  moment: nothing runs before the app can serve.
 */
const globalForBoot = globalThis as unknown as { _herbediaBooted?: boolean };

export function bootOnce(): void {
  if (globalForBoot._herbediaBooted) return;
  globalForBoot._herbediaBooted = true;

  void (async () => {
    try {
      const { warnAboutStubs } = await import("../env");
      const stubbed = warnAboutStubs();
      if (stubbed.length > 0 && process.env.NODE_ENV !== "production") {
        console.info(`[env] running on stubs: ${stubbed.join("; ")}`);
      }

      const { startScheduler } = await import("./scheduler");
      await startScheduler();
    } catch (error) {
      // Boot work must never take the server down with it.
      console.error("[boot] start-up tasks failed", error);
    }
  })();
}
