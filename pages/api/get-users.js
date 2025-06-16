// File: pages/api/get-users.js

import { createClient } from '@supabase/supabase-js'
import { applyCORS } from '@/lib/cors';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE,
  { auth: { persistSession: false } }
)

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }

  const emails = data.users.map((user) => user.email)
  res.status(200).json({ data: emails })
}