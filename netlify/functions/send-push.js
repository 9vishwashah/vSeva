import { createClient } from '@supabase/supabase-js';

// Setup Admin Supabase Client (Service Role Bypass RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }
  if (event.httpMethod === 'GET') {
    return { 
        statusCode: 200, 
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "active", message: "vSeva Push Notification Webhook Service is running successfully. This endpoint accepts POST requests from Supabase." })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 1. Parse the Webhook payload from Supabase
    const payloadStr = event.body;
    console.log('Incoming notification payload:', payloadStr);
    
    const data = JSON.parse(payloadStr);
    const notification = data.record;

    if (!notification || !notification.user_id) {
       console.error('Invalid notification record:', notification);
       return { statusCode: 400, body: 'Missing notification record' };
    }

    // 2. Resolve User ID to Username (OneSignal external_id)
    console.log(`Resolving username for user: ${notification.user_id}`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', notification.user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error resolving profile:', profileError);
      return { statusCode: 404, body: 'User profile not found' };
    }

    const targetUsername = profile.username;
    console.log(`Targeting OneSignal user: ${targetUsername}`);

    const isSos = notification.type === 'sos';

    const requestBody = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_external_user_ids: [targetUsername],
      headings: { en: notification.title },
      contents: { en: notification.message },
      data: {
        url: '/', // or any specific path based on notification.type
        type: notification.type,
        payload: notification.payload
      },
      // Platform-specific launch URL (not the single global `url`, which
      // OneSignal's Android SDK opens externally in a browser on tap):
      // web_url only applies to web push subscribers, unchanged from
      // before. Deliberately no app_url — leaving mobile with no launch
      // URL at all means tapping just opens/focuses the app with no
      // external navigation, so the existing native
      // OneSignal.Notifications 'click' listener (services/oneSignalService.ts,
      // wired in App.tsx) does the in-app routing instead.
      web_url: 'https://vseva.vjas.in' // Open app on click (web only)
    };

    if (isSos) {
      // Best-effort urgent delivery within what OneSignal's REST API exposes
      // directly (no dashboard step needed for these): max FCM priority and
      // lock-screen visible on Android, high-priority APNs on iOS.
      requestBody.priority = 10;
      requestBody.android_visibility = 1; // public — show full content on the lock screen
      requestBody.ios_interruption_level = 'time-sensitive';
      // A dedicated loud/vibrating Android channel (see
      // android/app/src/main/java/in/vjas/vseva/VSevaApplication.java for the
      // native channel itself) requires a matching "Notification Category"
      // created in the OneSignal dashboard — that's a manual one-time setup
      // step this backend code can't perform. Once created, set its id here
      // via env var; until then SOS pushes still deliver (priority 10 above),
      // just on OneSignal's default channel rather than the custom one.
      if (process.env.ONESIGNAL_SOS_ANDROID_CHANNEL_ID) {
        requestBody.android_channel_id = process.env.ONESIGNAL_SOS_ANDROID_CHANNEL_ID;
      }
    }

    // 3. Send via OneSignal REST API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await oneSignalResponse.json();
    console.log('OneSignal API result:', result);

    if (!oneSignalResponse.ok) {
      console.error('OneSignal API error details:', result);
      return { 
        statusCode: oneSignalResponse.status, 
        body: JSON.stringify({ error: "OneSignal API failure", details: result }) 
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Push notification sent via OneSignal", result })
    };
  } catch (error) {
    console.error('Error in send-push handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
}
