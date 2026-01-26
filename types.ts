export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  SEVAK = 'SEVAK'
}

export interface Organization {
  id: string;
  name: string;
  code: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  username: string; // generated email
  organization_id: string;
  mobile?: string;
  gender?: 'Male' | 'Female';
  age?: number;
  behavior?: string;
}

// Matching the SQL Schema exactly
export interface ViharEntry {
  id: number;
  vihar_date: string; // date string YYYY-MM-DD
  group_sadhu: boolean;
  group_sadhvi: boolean;
  no_sadhubhagwan?: number;
  no_sadhvijibhagwan?: number;
  vihar_from: string;
  vihar_to: string;
  sevaks: string[]; // text[] in SQL
  notes?: string;
  created_at?: string;
  wheelchair: boolean;
  samuday?: string;
  distance_km?: number;
  haversine_km?: number;
  vihar_type: 'Morning' | 'Evening';
  // SaaS Extension: In reality, we filter by organization via the user who created it, 
  // or a join on profiles, but for the frontend state we might attach it.
  organization_id?: string; 
}

export interface AreaRoute {
  id: number;
  from_name: string;
  to_name: string;
  distance_km: number;
}

export interface StatSummary {
  totalVihars: number;
  totalKm: number;
  totalSadhu: number;
  totalSadhvi: number;
  longestVihar: number;
  streak: number;
}