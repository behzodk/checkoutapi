import Stripe from 'stripe';
import { verifyNonce } from '@/utils/nonce'; // Adjust if path differs
import { applyCORS } from '@/lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // CSRF nonce check
  const token = req.headers['x-csrf-token'];
  if (!verifyNonce(token, 'cs_booking')) {
    return res.status(403).json({ error: 'Invalid or expired nonce' });
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: 1000, // in minor units (pence)
      currency: 'gbp',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('[create-payment-intent]', err);
    res.status(500).json({ error: err.message });
  }
}