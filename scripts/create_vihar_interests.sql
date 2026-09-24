-- Run once in the Supabase SQL editor.
-- Adds the "I'm Interested" RSVP layer on top of the existing upcoming_vihars /
-- create_upcoming_alert broadcast mechanism (unchanged).

create table if not exists public.vihar_interests (
  id uuid primary key default gen_random_uuid(),
  vihar_id uuid not null references public.upcoming_vihars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vihar_id, user_id)
);

create index if not exists vihar_interests_vihar_id_idx on public.vihar_interests(vihar_id);

alter table public.vihar_interests enable row level security;

drop policy if exists "vihar_interests_select_same_org" on public.vihar_interests;
create policy "vihar_interests_select_same_org"
on public.vihar_interests for select
using (
  exists (
    select 1 from public.upcoming_vihars v
    join public.profiles p on p.organization_id = v.organization_id
    where v.id = vihar_interests.vihar_id
      and p.id = auth.uid()
  )
);

drop policy if exists "vihar_interests_insert_self" on public.vihar_interests;
create policy "vihar_interests_insert_self"
on public.vihar_interests for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.upcoming_vihars v
    join public.profiles p on p.organization_id = v.organization_id
    where v.id = vihar_interests.vihar_id
      and p.id = auth.uid()
  )
);

drop policy if exists "vihar_interests_delete_self" on public.vihar_interests;
create policy "vihar_interests_delete_self"
on public.vihar_interests for delete
using (user_id = auth.uid());

-- Realtime, so the "who's interested" list updates live for everyone viewing the card.
do $$
begin
  alter publication supabase_realtime add table public.vihar_interests;
exception when duplicate_object then
  null;
end $$;
