// File: pages/api/webhook.js
import { buffer } from 'micro';
import Stripe from 'stripe';
import { applyCORS } from '@/lib/cors';

export const config = {
  api: {
    bodyParser: false, // ⛔ Required for Stripe signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
}); 

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET // Set this in Vercel or .env
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.paid':
      console.log('✅ Invoice paid');
      // TODO: update Supabase profile/subscription here
      break;
    case 'invoice.payment_failed':
      console.warn('❌ Payment failed');
      // TODO: notify user or take action
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}