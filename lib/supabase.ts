import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// DEMO CONFIG
// Easiest: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a
// .env file (see .env.example) or as Cloud Agent secrets — no code edit needed.
// Or hardcode the two fallback constants below for a quick demo.
// (Project Settings -> API -> Project URL and the "anon public" key.)
// (Open RLS policies in schema.sql are DEMO-ONLY. See README.)
// ---------------------------------------------------------------------------
const FALLBACK_URL = 'https://YOUR_PROJECT.supabase.co';
const FALLBACK_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? FALLBACK_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_ANON_KEY;

export const SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR_ANON');

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
