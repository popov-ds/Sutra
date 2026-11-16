import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { readSupabaseConfig } from './supabaseConfig';

const AUTH_STORAGE_KEY = 'sutra-supabase-auth';

const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error('Облако не настроено');
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage,
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}
