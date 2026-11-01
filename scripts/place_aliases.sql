-- Place aliases: a short form a group gives a long place name ("SP" for "SHREE PARSHWANATH ROAD"), so the
-- From / To pickers can be searched by it. One alias per place per organisation. Additive: nothing existing changes.
-- Used by dataService.getPlaceAliases / setPlaceAlias and Manage Routes → Short Forms.

create table if not exists public.place_aliases (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  place_name text not null,
  alias text not null check (char_length(alias) between 1 and 12),
  created_at timestamptz not null default now(),
  unique (organization_id, place_name)
);

alter table public.place_aliases enable row level security;

-- Everyone in the group can read their group's aliases; only that group's Captain can change them
-- (same rules as area_routes).
create policy "Place aliases: org read" on public.place_aliases
  for select to authenticated using (organization_id = get_my_org_id());
create policy "Place aliases: admin insert" on public.place_aliases
  for insert to authenticated with check (is_org_admin() and organization_id = get_my_org_id());
create policy "Place aliases: admin update" on public.place_aliases
  for update to authenticated using (is_org_admin() and organization_id = get_my_org_id())
  with check (is_org_admin() and organization_id = get_my_org_id());
create policy "Place aliases: admin delete" on public.place_aliases
  for delete to authenticated using (is_org_admin() and organization_id = get_my_org_id());
