import { jobService } from "./job.service.js";

const DEFAULT_EXPIRATION_INTERVAL_MS = 60_000;

let activeRun: Promise<Awaited<ReturnType<typeof jobService.expirePastDue>>> | null = null;

/** Exported with an explicit time so tests and operational tools never need to wait for the timer. */
export function runJobExpiration(now = new Date()) {
  if (activeRun) return activeRun;
  activeRun = jobService.expirePastDue(now).finally(() => {
    activeRun = null;
  });
  return activeRun;
}

export function startJobExpirationScheduler(intervalMs = DEFAULT_EXPIRATION_INTERVAL_MS) {
  const runSafely = () => {
    void runJobExpiration().catch((error) => {
      console.error("[jobs] expiration pass failed:", error);
    });
  };

  runSafely();
  const timer = setInterval(runSafely, intervalMs);
  timer.unref();

  return () => clearInterval(timer);
}
