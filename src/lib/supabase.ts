import { createClient } from '@supabase/supabase-js';

// Pick VITE_ vars (Vite project). Fall back to REACT_APP_ if present.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || (process.env.REACT_APP_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (process.env.REACT_APP_SUPABASE_ANON_KEY as string) || '';

// If env vars are missing, don't call createClient with empty URL (it throws).
// Instead, log a helpful warning and export `null` so the app can guard against absent Supabase.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

let _supabase = null as ReturnType<typeof createClient> | null;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (err) {
  // If initialization fails for any reason, avoid crashing the whole app.
  // Consumers should check for `null` before using `supabase`.
  // Log the error for debugging.
  // eslint-disable-next-line no-console
  console.error('[supabase] Failed to initialize Supabase client:', err);
  _supabase = null;
}

export const supabase = _supabase;
export default supabase;
