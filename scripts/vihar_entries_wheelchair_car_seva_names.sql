-- Who did Wheelchair Seva / Car Seva on a Vihar. (Only the wheelchair yes/no flag existed before; the names and
-- the car-seva fields were dropped by the app because the columns were missing.) Already applied to the live project.
ALTER TABLE public.vihar_entries
  ADD COLUMN IF NOT EXISTS wheelchair_sevaks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS car_seva boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS car_seva_sevaks text[] NOT NULL DEFAULT '{}';
