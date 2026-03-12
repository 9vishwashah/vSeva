-- Run this in your Supabase SQL Editor

-- 1. Create Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions" 
ON public.push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow service role (Netlify Function) to read all subscriptions
CREATE POLICY "Service role can read all subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (true); -- This assumes your Netlify function uses the SERVICE_ROLE key

/* 
=========================================
2. HTTP Request (Webhook) to Netlify Function
=========================================

To trigger the `send-push` Netlify function when a new notification is inserted, configure a Database Webhook in Supabase:

1. Go to Supabase Dashboard -> Database -> Webhooks.
2. Click "Create Webhook".
3. Name: `Send Web Push Notification`
4. Table: `notifications`
5. Events: Check `Insert`
6. Type: `HTTP Request`
7. HTTP Request Method: `POST`
8. HTTP Request URL: `https://your-domain.netlify.app/.netlify/functions/send-push` 
   (If local testing, use your ngrok or local dev server URL, e.g., `http://localhost:9999/.netlify/functions/send-push`)
9. HTTP Headers: 
   - Add Header: `Content-type: application/json`
   - (Optional but recommended) Add an `Authorization` header with a secret token to verify the request in your Netlify function. e.g. `Bearer YOUR_SUPABASE_WEBHOOK_SECRET`
*/
