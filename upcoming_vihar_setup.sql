-- 1. Explicitly drop the OLD function signature to avoid ambiguity
drop function if exists public.create_upcoming_alert(date, text, text, text, int, int);

-- 2. Add vihar_time column safely
alter table public.upcoming_vihars
add column if not exists vihar_time time without time zone;

-- 3. Create OR Replace the NEW function
create or replace function public.create_upcoming_alert(
  vihar_date_input date,
  vihar_time_input time,
  from_loc text,
  to_loc text,
  v_type text,
  s_count int,
  sv_count int
)
returns json
language plpgsql
security definer
as $$
declare
  new_vihar_id uuid;
  org_id uuid;
  member_record record;
  count_notified int := 0;
  creator_name text;
  formatted_message text;
begin
  -- Get Creator's Org ID
  select organization_id, full_name into org_id, creator_name
  from public.profiles 
  where id = auth.uid();

  if org_id is null then
    return json_build_object('success', false, 'message', 'User not in organization');
  end if;

  -- Default time if null
  if vihar_time_input is null then
     vihar_time_input := '06:00'::time;
  end if;

  -- 1. Insert into upcoming_vihars
  insert into public.upcoming_vihars (
    organization_id, created_by, vihar_date, vihar_time, from_location, to_location, vihar_type, sadhu_count, sadhvi_count
  )
  values (
    org_id, auth.uid(), vihar_date_input, vihar_time_input, from_loc, to_loc, v_type, s_count, sv_count
  )
  returning id into new_vihar_id;

  -- Prepare Message
  formatted_message := 'Date: ' || to_char(vihar_date_input, 'DD Mon YYYY');
  if vihar_time_input is not null then
    formatted_message := formatted_message || E'\nTime: ' || to_char(vihar_time_input, 'HH:MI AM');
  end if;

  -- 2. Notify ALL members
  for member_record in 
    select id 
    from public.profiles 
    where organization_id = org_id
    and is_active = true
  loop
    insert into public.notifications (user_id, organization_id, type, title, message, payload)
    values (
      member_record.id,
      org_id,
      'alert_upcoming',
      '📢 Upcoming Vihar: ' || from_loc || ' ➝ ' || to_loc,
      formatted_message,
      json_build_object(
        'vihar_id', new_vihar_id, 
        'date', vihar_date_input,
        'time', vihar_time_input,
        'from', from_loc,
        'to', to_loc,
        'type', v_type,
        'sadhu_count', s_count,
        'sadhvi_count', sv_count
      )
    );
    count_notified := count_notified + 1;
  end loop;

  return json_build_object('success', true, 'notified_count', count_notified);
end;
$$;
