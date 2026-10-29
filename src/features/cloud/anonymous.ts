import type { SupabaseClient, Session } from '@supabase/supabase-js';

let pending: Promise<Session> | undefined;

/** Recheck inside a cross-tab lock; never create a new user after a session error. */
export function ensureAnonymousSession(client: SupabaseClient): Promise<Session> {
  if (pending) return pending;
  const initialize = async () => {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
    const result = await client.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data.session) throw new Error('anonymous_session_missing');
    return result.data.session;
  };
  const run = async (): Promise<Session> => {
    if (typeof navigator !== 'undefined' && navigator.locks)
      return await navigator.locks.request('kokjipseo:anonymous-session', initialize);
    return await initialize();
  };
  pending = run().finally(() => { pending = undefined; });
  return pending;
}
