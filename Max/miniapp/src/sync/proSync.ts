import type { MeResponse } from "../api.js";
import { subscribeData } from "../data/events.js";
import { getSupabase, runCloudSync } from "./cloudSync.js";

const DEBOUNCE_MS = 400;

let profile: MeResponse | null = null;
let signedIn = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncRunning = false;
let pendingAfterRun = false;

function canAutoSync(): boolean {
  return (
    profile?.tier === "pro" &&
    signedIn &&
    Boolean(profile.supabaseUrl && profile.supabaseAnonKey)
  );
}

function clearDebounce(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function scheduleAutoSync(delayMs = DEBOUNCE_MS): void {
  if (!canAutoSync()) return;
  clearDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoSync();
  }, delayMs);
}

async function runAutoSync(): Promise<void> {
  if (!canAutoSync()) return;
  if (syncRunning) {
    pendingAfterRun = true;
    return;
  }
  syncRunning = true;
  try {
    const supabase = getSupabase(profile!.supabaseUrl!, profile!.supabaseAnonKey!);
    await runCloudSync(supabase);
  } catch (err) {
    console.warn("Cloud sync failed", err);
  } finally {
    syncRunning = false;
    if (pendingAfterRun) {
      pendingAfterRun = false;
      void runAutoSync();
    }
  }
}

/** Pro + вход в Supabase: стартовый sync и подписка на локальные изменения. */
export function configureProSync(me: MeResponse, cloudSignedIn: boolean): void {
  profile = me;
  signedIn = cloudSignedIn;
  if (canAutoSync()) scheduleAutoSync(0);
}

subscribeData(() => scheduleAutoSync());