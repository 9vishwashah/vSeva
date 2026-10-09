import { BRAND } from '@brand';
import type { UserProfile } from '../types';

// The fields a Sevak fills in from Profile & Settings, used for the completion ring, the Captain's
// "Still to fill" list and the completion percentage. Occupation "Other" also needs its details.
// Brands with sevakViharPreferences (Shraman Seva Group) also ask Vihar Type and Seva preferences.
type Fillable = Pick<UserProfile, 'age' | 'blood_group' | 'emergency_number' | 'emergency_contact_name' | 'occupation' | 'occupation_details' | 'address' | 'vihar_scope' | 'seva_preferences'>;

const filled = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';

export function getMissingProfileFields(p: Fillable): string[] {
  const missing: string[] = [];
  if (!filled(p.age)) missing.push('Age');
  if (!filled(p.blood_group)) missing.push('Blood group');
  if (!filled(p.emergency_number)) missing.push('Family emergency number');
  if (!filled(p.emergency_contact_name)) missing.push('Emergency contact name');
  if (!filled(p.occupation) || (p.occupation === 'Other' && !filled(p.occupation_details))) missing.push('Occupation');
  if (!filled(p.address)) missing.push('Address');
  if (BRAND.sevakViharPreferences) {
    if (!filled(p.vihar_scope)) missing.push('Vihar type');
    if (!p.seva_preferences || p.seva_preferences.length === 0) missing.push('Seva preferences');
  }
  return missing;
}

export const PROFILE_FIELD_COUNT = BRAND.sevakViharPreferences ? 8 : 6;

export const getProfileCompletion = (p: Fillable): number =>
  Math.round(((PROFILE_FIELD_COUNT - getMissingProfileFields(p).length) / PROFILE_FIELD_COUNT) * 100);
