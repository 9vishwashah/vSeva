-- Create a view or RPC for getting organization activity stats
-- This aggregates data from organizations, profiles (sevaks), and vihar_entries

CREATE OR REPLACE FUNCTION public.get_org_activity_stats()
RETURNS TABLE (
    org_id uuid,
    org_name text,
    city text,
    created_at timestamp with time zone,
    total_sevaks bigint,
    total_entries bigint,
    last_updated timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        o.id as org_id,
        o.name as org_name,
        o.city,
        o.created_at,
        COUNT(DISTINCT p.id) as total_sevaks,
        COUNT(DISTINCT v.id) as total_entries,
        MAX(v.created_at) as last_updated
    FROM 
        public.organizations o
    LEFT JOIN 
        public.profiles p ON o.id = p.organization_id AND p.role = 'sevak' AND p.is_active = true
    LEFT JOIN 
        public.vihar_entries v ON o.id = v.organization_id
    GROUP BY 
        o.id, o.name, o.city, o.created_at
    ORDER BY 
        o.created_at DESC;
$$;
