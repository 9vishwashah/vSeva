-- Make account deletion actually work. NOT YET APPLIED — review first.
--
-- Problem: deleting a user (auth.admin.deleteUser, which is what the Captain's
-- "Delete Sevak" and a deletion request ultimately do) cascades auth.users ->
-- profiles, but is BLOCKED by these NO ACTION foreign keys, so any person who
-- ever created a Vihar entry, reviewed one, raised/handled an SOS, or reviewed
-- a Directory submission cannot be deleted:
--   vihar_entries.created_by (NOT NULL), vihar_entries.reviewed_by,
--   upcoming_vihars.created_by, sos_alerts.{triggered_by (NOT NULL),
--   acknowledged_by, resolved_by, cancelled_by},
--   directory_submissions.reviewed_by_id, directory_change_requests.reviewed_by_id
--
-- Policy chosen here:
--   * Organisation records (Vihar entries, alerts, directory reviews) are KEPT
--     but detached from the deleted person (ON DELETE SET NULL).
--   * A person's own SOS alerts (they contain a note + GPS location) are
--     DELETED with them (ON DELETE CASCADE) — personal data, not org records.
--
-- NOTE: organizations.created_by is ON DELETE CASCADE to auth.users, so deleting
-- the Captain who created a group deletes the group row. Left unchanged on
-- purpose; Captain deletions are handled manually (see /delete-account).
--
-- Rollback: re-add each constraint without the ON DELETE clause (and, for
-- vihar_entries.created_by, SET NOT NULL once no NULLs exist).

begin;

-- Vihar entries: keep the record, drop the link to the deleted user.
alter table public.vihar_entries alter column created_by drop not null;
alter table public.vihar_entries drop constraint vihar_entries_created_by_fkey;
alter table public.vihar_entries add constraint vihar_entries_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.vihar_entries drop constraint vihar_entries_reviewed_by_fkey;
alter table public.vihar_entries add constraint vihar_entries_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.upcoming_vihars drop constraint upcoming_vihars_created_by_fkey;
alter table public.upcoming_vihars add constraint upcoming_vihars_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

-- Directory review audit columns.
alter table public.directory_submissions drop constraint directory_submissions_reviewed_by_id_fkey;
alter table public.directory_submissions add constraint directory_submissions_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references public.profiles(id) on delete set null;

alter table public.directory_change_requests drop constraint directory_change_requests_reviewed_by_id_fkey;
alter table public.directory_change_requests add constraint directory_change_requests_reviewed_by_id_fkey
  foreign key (reviewed_by_id) references public.profiles(id) on delete set null;

-- SOS: handler columns detach; the triggering person's own alert is deleted with them.
alter table public.sos_alerts drop constraint sos_alerts_acknowledged_by_fkey;
alter table public.sos_alerts add constraint sos_alerts_acknowledged_by_fkey
  foreign key (acknowledged_by) references public.profiles(id) on delete set null;

alter table public.sos_alerts drop constraint sos_alerts_resolved_by_fkey;
alter table public.sos_alerts add constraint sos_alerts_resolved_by_fkey
  foreign key (resolved_by) references public.profiles(id) on delete set null;

alter table public.sos_alerts drop constraint sos_alerts_cancelled_by_fkey;
alter table public.sos_alerts add constraint sos_alerts_cancelled_by_fkey
  foreign key (cancelled_by) references public.profiles(id) on delete set null;

alter table public.sos_alerts drop constraint sos_alerts_triggered_by_fkey;
alter table public.sos_alerts add constraint sos_alerts_triggered_by_fkey
  foreign key (triggered_by) references public.profiles(id) on delete cascade;

-- reject_vihar_entry notified v_entry.created_by unconditionally; that column can
-- now be NULL (creator deleted), and notifications.user_id is NOT NULL, so skip
-- the notification in that case instead of failing the rejection.
create or replace function public.reject_vihar_entry(p_entry_id bigint, p_reason text default null)
 returns vihar_entries
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller_role text;
  v_caller_org uuid;
  v_entry public.vihar_entries;
begin
  select role, organization_id into v_caller_role, v_caller_org
  from public.profiles where id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'Unauthorized: only a Captain/Admin can reject a Vihar entry.';
  end if;

  update public.vihar_entries
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_entry_id
    and status = 'pending'
    and organization_id = v_caller_org
  returning * into v_entry;

  if v_entry is null then
    select * into v_entry from public.vihar_entries where id = p_entry_id and organization_id = v_caller_org;
    return v_entry;
  end if;

  if v_entry.created_by is not null then
    insert into public.notifications (user_id, organization_id, type, title, message, payload)
    values (
      v_entry.created_by,
      v_entry.organization_id,
      'info',
      'Vihar submission not approved',
      'Your Vihar submission for ' || to_char(v_entry.vihar_date, 'DD Mon YYYY') ||
        ' was not approved.' || case when p_reason is not null and p_reason <> '' then ' Reason: ' || p_reason else '' end,
      jsonb_build_object('kind', 'vihar_rejected', 'entry_id', v_entry.id, 'vihar_date', v_entry.vihar_date)
    );
  end if;

  return v_entry;
end;
$function$;

commit;
