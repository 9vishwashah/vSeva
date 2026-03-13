-- Migration: Create incident_reports table
-- Description: Table to store incident reports submitted by Sevaks.

CREATE TABLE IF NOT EXISTS public.incident_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    report_time TIME NOT NULL,
    vihar_from TEXT NOT NULL,
    vihar_to TEXT NOT NULL,
    sadhu_count INTEGER DEFAULT 0,
    sadhvi_count INTEGER DEFAULT 0,
    involved_sevaks TEXT[], -- Array of usernames or names
    description TEXT NOT NULL,
    proof_media_url TEXT, -- URL to uploaded media (optional)
    status TEXT DEFAULT 'pending', -- pending, reviewed, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Sevaks can insert their own reports
CREATE POLICY "Sevaks can submit incident reports" 
ON public.incident_reports 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- 2. Sevaks can view their own reports
CREATE POLICY "Sevaks can view their own incident reports" 
ON public.incident_reports 
FOR SELECT 
USING (auth.uid() = created_by);

-- 3. Admins can view all reports in their organization
CREATE POLICY "Admins can view all incident reports in their organization" 
ON public.incident_reports 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.organization_id = incident_reports.organization_id
        AND profiles.role = 'admin'
    )
);

-- 4. Admins can update reports in their organization (e.g., change status)
CREATE POLICY "Admins can update incident reports in their organization" 
ON public.incident_reports 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.organization_id = incident_reports.organization_id
        AND profiles.role = 'admin'
    )
);
