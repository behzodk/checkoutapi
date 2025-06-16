// File: pages/api/check-email.js

import { createClient } from '@supabase/supabase-js';
import { applyCORS } from '@/lib/cors';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE, // Do NOT expose this in the browser
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
    if (applyCORS(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('[Supabase Error]', error);
      return res.status(500).json({ error: 'Supabase error' });
    }

    const exists = data.users.some((user) => user.email === email);

    return res.json({ exists });
  } catch (err) {
    console.error('[Server Error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}