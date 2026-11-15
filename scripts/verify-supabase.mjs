/**
 * Checks Supabase project: tables, RLS, optional auth smoke test.
 * Usage: node scripts/verify-supabase.mjs
 * Env: .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * Optional: SUPABASE_TEST_EMAIL + SUPABASE_TEST_OTP for authenticated push test
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(resolve(root, '.env'));

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const tables = ['clients', 'client_requests', 'products', 'purchases', 'tasks'];

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function fail(message) {
  console.error('FAIL:', message);
  process.exitCode = 1;
}

function ok(message) {
  console.log('OK:', message);
}

if (!url || !anonKey) {
  fail('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log('Project:', url);
const anon = createClient(url, anonKey);

let tablesReady = true;

for (const table of tables) {
  const { data, error, status } = await anon.from(table).select('id').limit(1);
  if (error) {
    tablesReady = false;
    console.log(`TABLE ${table}: HTTP ${status ?? '?'} — ${error.message} (${error.code ?? 'no-code'})`);
    continue;
  }
  ok(`${table}: reachable (anon select → ${data?.length ?? 0} rows, RLS should hide others' data)`);
}

if (!tablesReady) {
  console.log('\n→ Таблицы ещё не созданы. Выполните в SQL Editor по порядку:');
  console.log('  supabase/steps/01_tables.sql');
  console.log('  supabase/steps/02_indexes.sql');
  console.log('  supabase/steps/03_enable_rls.sql');
  console.log('  supabase/steps/04_policies.sql');
  process.exit(1);
}

const probeUser = '00000000-0000-0000-0000-000000000001';
const now = new Date().toISOString();
const { error: insertError } = await anon.from('clients').insert({
  user_id: probeUser,
  id: 'rls-probe-client',
  name: 'RLS probe',
  phone: '',
  status: 'newbie',
  health_tags: '[]',
  family_notes: '',
  created_at: now,
  updated_at: now,
});

if (insertError) {
  const msg = insertError.message.toLowerCase();
  if (msg.includes('row-level security') || msg.includes('policy') || insertError.code === '42501') {
    ok('RLS blocks anonymous INSERT (expected)');
  } else {
    fail(`Unexpected INSERT error: ${insertError.message}`);
  }
} else {
  fail('Anonymous INSERT succeeded — RLS misconfigured!');
  await anon.from('clients').delete().eq('id', 'rls-probe-client');
}

const testEmail = process.env.SUPABASE_TEST_EMAIL?.trim();
const testOtp = process.env.SUPABASE_TEST_OTP?.trim();
if (testEmail && testOtp) {
  const authed = createClient(url, anonKey);
  const { data: verify, error: verifyErr } = await authed.auth.verifyOtp({
    email: testEmail,
    token: testOtp,
    type: 'email',
  });
  if (verifyErr || !verify.session) {
    fail(`OTP verify failed: ${verifyErr?.message ?? 'no session'}`);
  } else {
    ok(`Signed in as ${verify.session.user.email}`);
    const userId = verify.session.user.id;
    const row = {
      user_id: userId,
      id: 'sync-smoke-' + Date.now(),
      name: 'Smoke test',
      phone: '',
      status: 'newbie',
      health_tags: '[]',
      family_notes: '',
      created_at: now,
      updated_at: now,
    };
    const { error: upErr } = await authed.from('clients').upsert(row, { onConflict: 'user_id,id' });
    if (upErr) fail(`Authenticated upsert failed: ${upErr.message}`);
    else ok('Authenticated upsert to clients succeeded (sync push path OK)');
    await authed.from('clients').delete().eq('user_id', userId).eq('id', row.id);
  }
} else {
  console.log('SKIP: authenticated upsert (set SUPABASE_TEST_EMAIL + SUPABASE_TEST_OTP after Send code in app)');
}

if (process.exitCode === 1) process.exit(1);
console.log('\nAll checks passed.');
