import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SAFE_SUPABASE_URL = 'https://mdvpabimxsithkmsxstb.supabase.co';
const SAFE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aEn9r4Opz_hvd_o5J-QlLA_bATwZ-Xw';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? SAFE_SUPABASE_URL).trim().replace(/\/+$/, '');
const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? SAFE_SUPABASE_PUBLISHABLE_KEY
).trim();

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabaseClient: SupabaseClient | null = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
