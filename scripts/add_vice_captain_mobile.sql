-- Vice Captain mobile number (22 Nov 2026). Additive: two optional columns, nothing existing changes.
--   registration_requests.vice_captain_mobile  entered on "Create Captain Account"
--   organizations.vice_captain_mobile          copied on approval (netlify/functions/approve-org.js), editable by
--                                              the Captain in Profile (update-org-leadership), shown in the Sevak
--                                              welcome WhatsApp message (pages/AddSevak.tsx)
alter table public.registration_requests add column if not exists vice_captain_mobile text;
alter table public.organizations add column if not exists vice_captain_mobile text;

alter table public.registration_requests drop constraint if exists registration_requests_vice_captain_mobile_check;
alter table public.registration_requests add constraint registration_requests_vice_captain_mobile_check
  check (vice_captain_mobile is null or vice_captain_mobile ~ '^[0-9]{10}$');
alter table public.organizations drop constraint if exists organizations_vice_captain_mobile_check;
alter table public.organizations add constraint organizations_vice_captain_mobile_check
  check (vice_captain_mobile is null or vice_captain_mobile ~ '^[0-9]{10}$');
