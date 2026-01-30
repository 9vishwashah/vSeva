-- 1. Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type text not null, -- 'password_reset', 'info', 'alert'
  title text not null,
  message text not null,
  payload jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.notifications enable row level security;

-- 3. Policies
-- Users can see their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- 4. Function: request_sevak_reset
-- Logic: Find Sevak -> Get Org -> Find all Admins -> Insert Notifications
create or replace function public.request_sevak_reset(username_input text)
returns json
language plpgsql
security definer 
as $$
declare
  sevak_record record;
  admin_record record;
  admin_count int := 0;
begin
  -- Find the sevak profile
  select * into sevak_record
  from public.profiles
  where username = username_input
  and role = 'sevak';

  if sevak_record is null then
    return json_build_object('success', false, 'message', 'Sevak not found');
  end if;

  -- Loop through all admins of that organization
  for admin_record in 
    select id 
    from public.profiles 
    where organization_id = sevak_record.organization_id 
    and role = 'admin'
  loop
    insert into public.notifications (user_id, organization_id, type, title, message, payload)
    values (
      admin_record.id,
      sevak_record.organization_id,
      'password_reset',
      'Password Reset Requested',
      'Sevak ' || sevak_record.full_name || ' (' || sevak_record.username || ') has requested a password reset.',
      json_build_object('sevak_id', sevak_record.id, 'sevak_name', sevak_record.full_name)
    );
    admin_count := admin_count + 1;
  end loop;

  return json_build_object('success', true, 'admins_notified', admin_count);
end;
$$;
