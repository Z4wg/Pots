import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// DEMO CONFIG
// Replace these two constants with your own Supabase project values.
// Project Settings -> API -> Project URL and the "anon public" key.
// (Open RLS policies in schema.sql are DEMO-ONLY. See README.)
// ---------------------------------------------------------------------------
export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

export const SUPABASE_CONFIGURED =
  !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_ANON');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});
