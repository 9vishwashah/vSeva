import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Setup Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:vishwa@example.com', // Best practice is to provide a contact email
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Setup Admin Supabase Client (Service Role Bypass RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Parse the Webhook payload from Supabase
    // Supabase webhook shape for INSERT looks like { type: 'INSERT', table: '...', record: { ... } }
    const payloadStr = event.body;
    const data = JSON.parse(payloadStr);

    const notification = data.record;
    if (!notification || !notification.user_id) {
       return { statusCode: 400, body: 'Missing notification record' };
    }

    // 2. Query push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notification.user_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      // User has no subscriptions, gracefully exit
      return { statusCode: 200, body: JSON.stringify({ message: "No subscriptions found for user" }) };
    }

    // 3. Construct the Push Payload
    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      data: {
        url: '/', // or any specific path based on notification.type
        type: notification.type,
        payload: notification.payload
      }
    });

    // 4. Send parallel push notifications to all user sub endpoints
    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log('Subscription expired. Deleting...', sub.endpoint);
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        } else {
          console.error('Push error for one subscription:', err);
        }
      }
    });

    await Promise.all(pushPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Push notifications dispatched successfully' })
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
