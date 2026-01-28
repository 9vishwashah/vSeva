
export enum UserRole {
  ORG_ADMIN = 'admin',
  SEVAK = 'sevak'
}

export interface Organization {
  id: string; // uuid
  name: string;
  city?: string;
  created_by?: string;
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
  is_active: boolean;
}

export interface AreaRoute {
  id: number;
  from_name: string;
  to_name: string;
  distance_km: number;
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
  samuday?: string;
  distance_km?: number;
  haversine_km?: number;
  vihar_type: 'morning' | 'evening';
  created_at?: string;
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
}
