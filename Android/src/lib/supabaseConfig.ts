import Constants from 'expo-constants';

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function readSupabaseConfig(): SupabasePublicConfig | null {
  const extra = Constants.expoConfig?.extra as
    | { supabaseUrl?: string; supabaseAnonKey?: string }
    | undefined;
  const url =
    extra?.supabaseUrl?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey =
    extra?.supabaseAnonKey?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null;
}
