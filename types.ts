
export enum UserRole {
  ORG_ADMIN = 'admin',
  SEVAK = 'sevak'
}

export interface Organization {
  id: string; // uuid
  name: string;
  city?: string;
  town?: string;
  created_by?: string;
  vice_captain_name?: string | null;
}

export interface UserProfile {
  id: string; // uuid
  organization_id: string;
  role: UserRole;
  full_name: string;
  username: string;
  mobile: string;
  gender?: string;
  age?: number;
  blood_group?: string;
  emergency_number?: string;
  address?: string;
  is_active: boolean;
  last_login_at?: string; // ISO timestamp, updated on each login
  yearly_goal?: number; // Sankalp: target number of Vihars this calendar year
  avatar_url?: string | null;
}

export interface AreaRoute {
  id: number;
  organization_id: string;
  from_name: string;
  to_name: string;
  distance_km: number;
  note?: string;
}

// Matching public.vihar_entries
export interface ViharEntry {
  id?: number; // bigint, optional for insert
  organization_id: string;
  created_by: string; // uuid
  vihar_date: string; // YYYY-MM-DD
  group_sadhu: boolean;
  group_sadhvi: boolean;
  no_sadhubhagwan?: number;
  no_sadhvijibhagwan?: number;
  vihar_from: string;
  vihar_to: string;
  sevaks: string[]; // text[] of usernames
  notes?: string;
  wheelchair: boolean;
  wheelchair_sevaks?: string[];
  car_seva?: boolean;
  car_seva_sevaks?: string[];
  samuday?: string;
  distance_km?: number;
  haversine_km?: number;
  vihar_type: 'morning' | 'evening';
  created_at?: string;
  // Sevak-submitted approval workflow. Defaults to 'approved' at the DB level so
  // existing rows and Captain-created entries remain official with no code change.
  status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string; // uuid of the Captain/admin who approved or rejected
  reviewed_at?: string; // ISO timestamp
}

export interface StatSummary {
  totalVihars: number;
  totalKm: number;
  totalSadhu: number;
  totalSadhvi: number;
  longestVihar: number;
  streak: number;
  vSynergy?: string;
  vRank?: number | string;
  totalOrgSevaks?: number;
  activeSevaks?: number;
  totalMale?: number;
  totalFemale?: number;
  activeMale?: number;
  activeFemale?: number;
}

export interface UserNotification {
  id: string;
  user_id: string;
  organization_id?: string;
  type: 'password_reset' | 'info' | 'alert' | 'alert_upcoming' | 'inactivity';
  title: string;
  message: string;
  payload?: any;
  is_read: boolean;
  created_at: string;
}


export interface UpcomingVihar {
  id: string;
  organization_id: string;
  created_by: string;
  vihar_date: string;
  vihar_time?: string;
  from_location: string;
  to_location: string;
  vihar_type: 'morning' | 'evening';
  sadhu_count: number;
  sadhvi_count: number;
  created_at: string;
}

// Matching public.vihar_interests — a sevak's "I'm Interested" response to an UpcomingVihar
export interface ViharInterest {
  id: string;
  vihar_id: string;
  user_id: string;
  created_at: string;
}

export interface ContactNumber {
  id: number;
  organization_id: string;
  label: string;  // Contact name / role
  phone: string;  // digits only
  description?: string; // optional note / reason about the contact
  created_at?: string;
}

export interface IncidentReport {
  id?: string;
  organization_id: string;
  created_by: string;
  report_date: string; // YYYY-MM-DD
  report_time: string; // HH:MM
  vihar_from: string;
  vihar_to: string;
  sadhu_count: number;
  sadhvi_count: number;
  involved_sevaks: string[];
  description: string;
  proof_media_url?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Public Community Directory
// ---------------------------------------------------------------------------

// A listing is one universal card, not a single category — it can carry a
// main place (temple), a Vihar Group, and any combination of Upashray/
// Bhojanshala/Library all at once. What a listing "is" is derived from which
// of those fields are actually filled in, not a picked-once label. This kind
// only describes an individual MAP PIN (a listing can produce several).
export type DirectoryPinKind = 'main' | 'upashray' | 'bhojanshala' | 'library';

export interface DirectoryTrustee {
  name: string;
  mobile?: string;
}

export interface DirectoryMemberContact {
  name: string;
  role?: string;
  mobile?: string;
}

export interface DirectoryRoute {
  from: string;
  to: string;
  distance_km?: number;
  notes?: string;
}

export interface DirectoryFacility {
  name: string;
  google_maps_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  contact_name?: string;
  contact_phone?: string;
}

export interface DirectoryPhoto {
  url: string;
  is_cover?: boolean;
}

export interface DirectoryTimings {
  morning?: string;
  evening?: string;
}

// The shared field set both a pending submission and an approved listing
// carry — one "Community Directory Card" worth of data.
export interface DirectoryCardFields {
  name: string;
  mulnayak?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pincode?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  full_address?: string | null;
  trustees: DirectoryTrustee[];
  vihar_group_name?: string | null;
  captain_name?: string | null;
  captain_mobile?: string | null;
  vice_captain_name?: string | null;
  vice_captain_mobile?: string | null;
  member_contacts: DirectoryMemberContact[];
  upashray?: DirectoryFacility | null;
  bhojanshala?: DirectoryFacility | null;
  library?: DirectoryFacility | null;
  routes: DirectoryRoute[];
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_phone_public: boolean;
  website?: string | null;
  timings?: DirectoryTimings | null;
  photos: DirectoryPhoto[];
  notes?: string | null;
}

export interface DirectoryListing extends DirectoryCardFields {
  id: string;
  slug: string;
  status: 'approved' | 'archived';
  last_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectorySubmission extends DirectoryCardFields {
  id: string;
  contributor_name: string;
  contributor_mobile?: string | null;
  possible_duplicate_of?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_listing_id?: string | null;
  rejection_reason?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface DirectoryChangeRequest {
  id: string;
  listing_id: string;
  proposed_fields: Partial<DirectoryCardFields>;
  current_snapshot?: Partial<DirectoryCardFields> | null;
  contributor_name: string;
  contributor_mobile?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  formatted_address?: string;
  pincode?: string;
  area?: string;
  city?: string;
  state?: string;
  resolved: boolean;
}

// One map marker — a listing can produce several (its own main pin plus one
// per attached facility that has its own location), all pointing back at the
// same listing/slug so clicking any of them opens the same card.
export interface DirectoryPin {
  key: string;
  listingId: string;
  slug: string;
  kind: DirectoryPinKind;
  label: string;
  tagLabel: string;
  latitude: number;
  longitude: number;
}
