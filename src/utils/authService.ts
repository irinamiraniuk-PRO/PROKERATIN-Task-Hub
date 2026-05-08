import type { AuthChangeEvent, Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { UserRole } from '../types';
import { supabaseClient } from './supabaseClient';

const AUTH_EMAIL_DOMAIN = 'prokeratin.local';

export interface ProfileSeed {
  login: string;
  name: string;
  role: UserRole;
  color?: string;
}

export function toAuthEmail(login: string): string {
  return `${login.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export async function signInWithLogin(login: string, password: string): Promise<{ ok: boolean; user: SupabaseAuthUser | null }> {
  if (!supabaseClient) return { ok: false, user: null };
  const email = toAuthEmail(login);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, user: null };
  return { ok: true, user: data.user };
}

export async function signOutAuth(): Promise<void> {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
}

export async function updateAuthPassword(login: string, currentPassword: string, nextPassword: string): Promise<boolean> {
  if (!supabaseClient) return false;
  const email = toAuthEmail(login);
  const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError) return false;
  const { error } = await supabaseClient.auth.updateUser({ password: nextPassword });
  return !error;
}

export async function getSessionUser(): Promise<SupabaseAuthUser | null> {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getUser();
  return data.user ?? null;
}

export function subscribeAuthState(cb: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  if (!supabaseClient) return () => {};
  const { data } = supabaseClient.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function ensureProfileForAuthUser(user: SupabaseAuthUser, seed: ProfileSeed): Promise<void> {
  if (!supabaseClient) return;
  const profileId = user.id;
  const { data: existing } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();

  if (existing?.id) return;

  await supabaseClient.from('profiles').insert({
    id: profileId,
    login: seed.login,
    name: seed.name,
    role: seed.role,
    color: seed.color ?? null,
    avatar: null,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  });
}
