-- Run once in the Supabase SQL editor.
-- Adds a per-sevak configurable yearly Vihar goal ("Sankalp"), used by the
-- Dashboard's Sankalp progress ring.

alter table public.profiles
  add column if not exists yearly_goal integer not null default 25;

do $$
begin
  alter table public.profiles
    add constraint yearly_goal_positive check (yearly_goal > 0);
exception when duplicate_object then
  null;
end $$;
