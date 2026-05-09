import type { AuthChangeEvent, Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { PROFILE_SEEDS, PROFILE_SEED_USERS } from '../data/profileSeeds';
import type { User, UserRole } from '../types';
import { supabaseClient } from './supabaseClient';

// Synthetic auth domain for login->email conversion in Supabase Auth.
// It does not need public DNS resolution; it only must be consistent across sign-in/user creation.
const AUTH_EMAIL_DOMAIN = 'auth.prokeratin.internal';
const STARTER_USER_PASSWORD = '1234';

interface ProfileRow {
  id: string;
  login: string;
  name: string;
  role: UserRole;
  avatar: string | null;
  color: string | null;
}

export interface ProfileSeed {
  login: string;
  name: string;
  role: UserRole;
  color?: string;
}

export interface EnsureStarterProfilesResult {
  created: number;
  existing: number;
  users: User[];
}

export function toAuthEmail(login: string): string {
  return `${login.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    login: row.login,
    name: row.name,
    role: row.role,
    avatar: row.avatar ?? undefined,
    color: row.color ?? undefined,
  };
}

async function fetchProfiles(): Promise<User[]> {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id,login,name,role,avatar,color')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) return [];
  return ((data ?? []) as ProfileRow[]).map(toUser);
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

export async function ensureStarterProfiles(): Promise<EnsureStarterProfilesResult> {
  if (!supabaseClient) {
    return {
      created: 0,
      existing: PROFILE_SEED_USERS.length,
      users: PROFILE_SEED_USERS,
    };
  }

  const existingUsers = await fetchProfiles();
  if (existingUsers.length > 0) {
    return {
      created: 0,
      existing: existingUsers.length,
      users: existingUsers,
    };
  }

  let created = 0;
  const seenLogins = new Set<string>();

  for (const seed of PROFILE_SEEDS) {
    const login = seed.login.trim().toLowerCase();
    if (seenLogins.has(login)) continue;
    seenLogins.add(login);

    const email = toAuthEmail(login);
    const signUpResult = await supabaseClient.auth.signUp({
      email,
      password: STARTER_USER_PASSWORD,
    });
    let authUser: SupabaseAuthUser | null;
    if (!signUpResult.error) {
      authUser = signUpResult.data.user ?? null;
    } else {
      const message = signUpResult.error.message.toLowerCase();
      const alreadyExists = message.includes('already registered') || message.includes('already exists');
      if (!alreadyExists) continue;
      const signInResult = await signInWithLogin(login, STARTER_USER_PASSWORD);
      if (!signInResult.ok || !signInResult.user) continue;
      authUser = signInResult.user;
    }

    if (!authUser) continue;
    await ensureProfileForAuthUser(authUser, seed);
    created += 1;
    await signOutAuth();
  }

  const users = await fetchProfiles();
  return {
    created,
    existing: Math.max(0, users.length - created),
    users: users.length > 0 ? users : PROFILE_SEED_USERS,
  };
}
