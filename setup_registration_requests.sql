-- Create registration_requests table
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_name text NOT NULL,
    city text NOT NULL,
    full_name text NOT NULL,
    mobile text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated) to insert requests
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.registration_requests;
CREATE POLICY "Enable insert for everyone" ON public.registration_requests
FOR INSERT
WITH CHECK (true);

-- Allow admins to view requests
DROP POLICY IF EXISTS "Enable select for admins" ON public.registration_requests;
CREATE POLICY "Enable select for admins" ON public.registration_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
