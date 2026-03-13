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

    // 3. Send via OneSignal REST API
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_external_user_ids: [targetUsername],
        headings: { en: notification.title },
        contents: { en: notification.message },
        data: {
          url: '/', // or any specific path based on notification.type
          type: notification.type,
          payload: notification.payload
        },
        url: 'https://vseva.netlify.app' // Open app on click
      })
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
