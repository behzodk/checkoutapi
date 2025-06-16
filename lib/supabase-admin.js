import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE,
  { auth: { persistSession: false } }
);