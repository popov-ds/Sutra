import { clockInTimeZone, todayIsoInTimeZone } from "../domain/digestDates.js";
import { config } from "../config.js";
import { dbEnabled } from "../db/pool.js";
import { runMorningDigestJob } from "./morningDigestJob.js";
import { supabaseAdminEnabled } from "./supabaseAdmin.js";

const CHECK_MS = 60_000;
const WINDOW_MINUTES = 5;

let lastRanTouchOn: string | null = null;
let started = false;

function inDigestWindow(now: Date): boolean {
  const { hour, minute } = clockInTimeZone(config.morningDigestTz, now);
  return hour === config.morningDigestHour && minute < WINDOW_MINUTES;
}

async function tick(now = new Date()): Promise<void> {
  if (!config.morningDigestEnabled || !dbEnabled() || !supabaseAdminEnabled()) return;
  if (!inDigestWindow(now)) return;

  const touchOn = todayIsoInTimeZone(config.morningDigestTz, now);
  if (lastRanTouchOn === touchOn) return;

  lastRanTouchOn = touchOn;
  try {
    await runMorningDigestJob(now);
  } catch (err) {
    console.error("morning-digest scheduler:", err);
    lastRanTouchOn = null;
  }
}

export function startMorningDigestScheduler(): void {
  if (started) return;
  if (!config.morningDigestEnabled) {
    console.log("morning-digest: отключён (MORNING_DIGEST_ENABLED=0)");
    return;
  }
  if (!supabaseAdminEnabled()) {
    console.warn("morning-digest: нужны EXPO_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
    return;
  }
  started = true;
  console.log(
    `morning-digest: планировщик ${config.morningDigestHour}:00 (${config.morningDigestTz}), окно ${WINDOW_MINUTES} мин`,
  );
  void tick();
  setInterval(() => void tick(), CHECK_MS);
}