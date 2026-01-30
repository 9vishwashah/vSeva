-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- Check if metadata contains org_name (meaning it's an Admin Signup)
  if new.raw_user_meta_data->>'org_name' is not null then
    
    -- 1. Create Organization
    insert into public.organizations (name, city, created_by)
    values (
      new.raw_user_meta_data->>'org_name',
      new.raw_user_meta_data->>'city',
      new.id
    )
    returning id into new_org_id;

    -- 2. Create Profile for Admin
    insert into public.profiles (id, organization_id, role, full_name, username, mobile)
    values (
      new.id,
      new_org_id,
      'admin',
      new.raw_user_meta_data->>'full_name',
      new.email, -- Use email as username initially, can be changed later if needed
      new.raw_user_meta_data->>'mobile'
    );

  end if;
  return new;
end;
$$;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
