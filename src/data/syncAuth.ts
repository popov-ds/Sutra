import type { Session } from '@supabase/supabase-js';

import { DomainError } from '@/domain/errors';
import { getSupabase, resetSupabaseClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabaseConfig';

export async function loadSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function requireSyncSession(): Promise<Session> {
  const session = await loadSession();
  if (!session?.user) {
    throw new DomainError('Войдите в аккаунт для синхронизации');
  }
  return session;
}

export async function sendEmailOtp(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@')) {
    throw new DomainError('Укажите email');
  }
  const { error } = await getSupabase().auth.signInWithOtp({
    email: trimmed,
    options: { shouldCreateUser: true },
  });
  if (error) throw new DomainError(error.message);
}

export async function verifyEmailOtp(email: string, code: string): Promise<Session> {
  const trimmed = email.trim().toLowerCase();
  const token = code.trim();
  if (!token) throw new DomainError('Введите код из письма');
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: trimmed,
    token,
    type: 'email',
  });
  if (error || !data.session) throw new DomainError(error?.message ?? 'Не удалось войти');
  return data.session;
}

export async function signOutCloud(): Promise<void> {
  await getSupabase().auth.signOut();
  resetSupabaseClient();
}
