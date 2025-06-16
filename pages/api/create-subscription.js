import Stripe from 'stripe';
import { verifyNonce } from '@/utils/nonce'; // Adjust import path if needed
import { applyCORS } from '@/lib/cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});
    
export default async function handler(req, res) {
  if (applyCORS(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const token = req.headers['x-csrf-token'];
  if (!verifyNonce(token, 'cs_booking')) {
    return res.status(403).json({ error: 'Invalid or expired nonce' });
  }

  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      nameOnCard,
      address,
      city,
      postCode,
      swimmerFirstName,
      swimmerLastName,
      swimmerAge,
      swimmerAbility,
      swimmerSameAsApplicant,
      price,
    } = req.body;

    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        firstName,
        lastName,
        phone,
        nameOnCard,
        address,
        city,
        postCode,
        email,
        swimmerFirstName,
        swimmerLastName,
        swimmerAge,
        swimmerAbility,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        firstName,
        lastName,
        phone,
        nameOnCard,
        address,
        city,
        postCode,
        email,
        swimmerFirstName,
        swimmerLastName,
        swimmerAge,
        swimmerSameAsApplicant,
        swimmerAbility,
      },
    });

    res.json({
      clientSecret: subscription.latest_invoice.confirmation_secret.client_secret,
      subscriptionId: subscription.id,
      customerId: customer.id,
    });
  } catch (err) {
    console.error('[create-subscription]', err);
    res.status(500).json({ error: err.message });
  }
}