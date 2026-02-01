
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

export interface UserNotification {
  id: string;
  user_id: string;
  organization_id?: string;
  type: 'password_reset' | 'info' | 'alert' | 'alert_upcoming';
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
  from_location: string;
  to_location: string;
  vihar_type: 'morning' | 'evening';
  sadhu_count: number;
  sadhvi_count: number;
  created_at: string;
}
