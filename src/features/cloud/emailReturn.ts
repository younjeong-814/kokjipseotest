import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAnonymousSession } from './anonymous';

/** A navigation marker only; never use it to identify an owner or authorize access. */
export function isEmailReturn(hash: string): boolean {
  return new URLSearchParams(hash.split('?')[1] ?? '').get('source') === 'email';
}

export async function prepareEntrySession(client: SupabaseClient, emailReturn: boolean) {
  if (!emailReturn) return ensureAnonymousSession(client);
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  // Do not scatter an email visitor's records into another anonymous account.
  return data.session;
}
