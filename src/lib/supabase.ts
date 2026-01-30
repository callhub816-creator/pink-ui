
// Supabase integration temporarily disabled as per requirements.
// Future implementation can be restored here.

/*
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let _supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('[Supabase] Init failed:', err);
  }
}
*/

export const supabase = null;
export default supabase;
