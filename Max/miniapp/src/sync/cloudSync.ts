import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Pro: синхронизация Sutra через Supabase (pull/push локальной SQLite).
 * Полная реализация sync — следующий этап; здесь — вход и заготовка.
 */
let client: SupabaseClient | null = null;

export function getSupabase(url: string, anonKey: string): SupabaseClient {
  if (!client) client = createClient(url, anonKey);
  return client;
}

export async function sendEmailOtp(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyEmailOtp(supabase: SupabaseClient, email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
}

export async function runCloudSyncPlaceholder(): Promise<string> {
  return "Синхронизация: реализуйте pull/push SQLite → Supabase в miniapp/src/sync/cloudSync.ts.";
}