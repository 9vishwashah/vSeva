-- Captains can delete incident reports of their own group (Incidents page delete button, pages/ViewReports.tsx).
-- Same rule as the existing view/update policies on this table. Additive: nothing else changes.
drop policy if exists "Admins can delete incident reports in their organization" on public.incident_reports;
create policy "Admins can delete incident reports in their organization"
  on public.incident_reports for delete
  using (exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.organization_id = incident_reports.organization_id
      and profiles.role = 'admin'
  ));
