-- Migration: Create incident-reports storage bucket
-- Description: Set up storage bucket for incident report photos with public access.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('incident-reports', 'incident-reports', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to view files in this bucket (Public)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'incident-reports');

-- 3. Allow authenticated users to upload files to this bucket
CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'incident-reports');

-- 4. Allow users to delete their own files
CREATE POLICY "Users can delete their own photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'incident-reports' AND auth.uid() = owner);
