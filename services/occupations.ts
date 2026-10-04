// Occupation / Profession choices for a Sevak's profile. These exact strings are stored in
// profiles.occupation and enforced by a CHECK constraint (scripts/profile_occupation_emergency_name.sql),
// so change both together.
export const OCCUPATIONS = [
  'Student',
  'Business / Entrepreneur',
  'Salaried / Private Job',
  'Government Job',
  'Professional',
  'Teacher / Professor',
  'Doctor / Healthcare',
  'Engineer / IT',
  'CA / Finance / Accounts',
  'Lawyer / Legal',
  'Homemaker',
  'House Wife',
  'Self-Employed',
  'Other',
] as const;
