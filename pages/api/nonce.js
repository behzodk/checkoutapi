import { createNonce } from '@/utils/nonce'; // adjust the path as needed
import { applyCORS } from '@/lib/cors';

export default function handler(req, res) {
    if (applyCORS(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const nonce = createNonce('cs_booking');
  res.status(200).json({ nonce });
}