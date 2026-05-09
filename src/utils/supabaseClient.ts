import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mdvpabimxsithkmsxstb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aEn9r4Opz_hvd_o5J-QlLA_bATwZ-Xw';

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase connected:', !!supabase);

export const supabaseClient = supabase;
