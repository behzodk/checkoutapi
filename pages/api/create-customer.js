import { createClient } from '@supabase/supabase-js';
import { verifyNonce } from '@/utils/nonce'; // Adjust import path
import Stripe from 'stripe';
import { applyCORS } from '@/lib/cors';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SERVICE_ROLE,
  { auth: { persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',
});

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  console.log('🔥 /api/create-customer was hit');

  try {
    const {
      email,
      firstName,
      lastName,
      address,
      city,
      postCode,
      phone,
      customerId,
      swimmerSameAsApplicant,
      swimmerFirstName,
      swimmerLastName,
      subscriptionId,
      priceName,
      price,
      formattedClasses,
    } = req.body;
    console.log(email, firstName, lastName, address, city, postCode, phone, customerId, swimmerSameAsApplicant, swimmerFirstName, swimmerLastName, subscriptionId, priceName, price, formattedClasses);
    console.log(process.env.VITE_SUPABASE_URL, process.env.SERVICE_ROLE);

    const location = `${address}, ${city}, ${postCode}`;

    // 1 ─ Create Supabase user
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(2),
      email_confirm: true,
    });

    let userId;
    if (createErr) {
      // If already exists, look it up
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ email });
      if (listErr || !listData?.users?.length) {
        return res.status(400).json({ error: listErr?.message || 'User not found after conflict' });
      }
      return res.json({ user: listData.users[0], created: false });
    } else {
      userId = createData.user.id;
    }

    // 2 ─ Create applicant profile
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        location,
        phone,
        stripe_customer_id: customerId,
      })
      .select();

    if (profileErr) return res.status(500).json({ error: profileErr.message });

    const parentId = profileData?.[0]?.id;

    // 3 ─ Create swimmer profile (if not same as applicant)
    let swimmerProfileId = parentId;
    if (!swimmerSameAsApplicant) {
      const { data: swimmerProfileData, error: swimmerProfileErr } = await supabase
        .from('profiles')
        .insert({
          first_name: swimmerFirstName,
          last_name: swimmerLastName,
          location,
          phone,
          stripe_customer_id: customerId,
          parent: parentId,
        })
        .select();

      if (swimmerProfileErr)
        return res.status(500).json({ error: swimmerProfileErr.message });

      swimmerProfileId = swimmerProfileData?.[0]?.id;
    }

    // 4 ─ Create subscription
    const { data: subscriptionData, error: subscriptionErr } = await supabase
      .from('subscriptions')
      .insert({
        profile_id: swimmerProfileId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        plan: priceName,
        status: 'active',
        price,
        start_date: new Date(),
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        instructor: 'a6fe7526-92b1-4e34-9740-747bf4e421b4',
      })
      .select();

    if (subscriptionErr)
      return res.status(500).json({ error: subscriptionErr.message });

    const subscriptionIdFinal = subscriptionData?.[0]?.id;

    // 5 ─ Create classes
    const { data: classesData, error: classesErr } = await supabase
      .from('classes')
      .insert(
        formattedClasses.map((entry) => ({
          title: 'Swim Lesson',
          subscription_id: subscriptionIdFinal,
          teacher_profile_id: 'a6fe7526-92b1-4e34-9740-747bf4e421b4',
          start_time: entry.startTime,
          end_time: entry.endTime,
          attendance_status: 'future',
          stripe_customer_id: customerId,
        }))
      )
      .select();

    if (classesErr) {
      console.error('Class creation failed:', classesErr);
      return res.status(500).json({ error: 'Class creation failed' });
    }

    return res.json({
      user: createData.user,
      created: true,
      profile: profileData[0],
      classesCreated: classesData?.length || 0,
    });
  } catch (err) {
    console.error('[create-customer error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}