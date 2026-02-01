-- Allow authenticated users (like Super Admin) to create organizations
create policy "Enable insert for authenticated users only"
on "public"."organizations"
as permissive
for insert
to authenticated
with check (true);

-- Also ensure registration_requests allows updates properly if it doesn't already
create policy "Enable update for authenticated users only"
on "public"."registration_requests"
as permissive
for update
to authenticated
using (true)
with check (true);
