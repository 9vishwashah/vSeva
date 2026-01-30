-- Function to calculate vRank for a specific sevak in an organization
-- Logic: 
-- 1. Aggregate stats (count, km) for all sevaks in the org.
-- 2. Rank them (Dense Rank or Rank) by Count DESC, then KM DESC.
-- 3. Return the rank of the requested username.

create or replace function public.get_sevak_rank(org_id uuid, sevak_username text)
returns integer
language plpgsql
security definer -- Runs with privileges of creator (bypass RLS)
as $$
declare
  v_rank integer;
begin
  with stats as (
    select
      unnest(sevaks) as username,
      count(*) as total_vihars,
      coalesce(sum(distance_km), 0) as total_km
    from public.vihar_entries
    where organization_id = org_id
    group by username
  ),
  ranking as (
    select
      username,
      rank() over (order by total_vihars desc, total_km desc) as rnk
    from stats
  )
  select rnk into v_rank
  from ranking
  where username = sevak_username;

  return coalesce(v_rank, 0); -- Return 0 if not ranked/found
end;
$$;
