-- A Sevak (or Captain) can read the name of the Captain of THEIR OWN organisation only.
-- (profiles RLS hides other people's rows from Sevaks, and the get-org-admins function is Super-Admin-only,
-- so the Sevak dashboard lost its "Captain: ..." line.) Already applied to the live project.
CREATE OR REPLACE FUNCTION public.get_my_org_captain()
RETURNS TABLE(full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT c.full_name
  FROM public.profiles me
  JOIN public.profiles c ON c.organization_id = me.organization_id AND c.role = 'admin'
  WHERE me.id = auth.uid()
  ORDER BY c.created_at ASC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_org_captain() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_org_captain() TO authenticated, service_role;
