-- Captain registration: the District (filled from the PIN code, editable). Additive, nullable.
-- Applied to the live project as migration "registration_district".
ALTER TABLE public.registration_requests ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.registration_requests DROP CONSTRAINT IF EXISTS registration_requests_district_len_check;
ALTER TABLE public.registration_requests ADD CONSTRAINT registration_requests_district_len_check CHECK (char_length(coalesce(district, '')) <= 80);
