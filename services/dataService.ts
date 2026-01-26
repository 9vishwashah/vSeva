import { supabase } from './supabase';
import { UserProfile, ViharEntry, AreaRoute, UserRole, StatSummary } from '../types';

export const dataService = {
  
  // --- Profiles & Sevaks ---

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Fallback: If RLS fails significantly, we might want to return null rather than crashing
      // but usually we want to see the error.
      return null;
    }
    return data as UserProfile;
  },

  async getOrgSevaks(orgId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', orgId)
      .eq('role', 'sevak')
      .eq('is_active', true);

    if (error) throw error;
    return data as UserProfile[];
  },

  async createSevak(
    adminOrgId: string, 
    sevakData: { fullName: string; mobile: string; gender: string; age: number }
  ) {
    // 1. Generate Username (simple logic)
    const cleanName = sevakData.fullName.toLowerCase().replace(/\s+/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000);
    const username = `${cleanName}${randomSuffix}@vsevak.in`;
    const password = sevakData.mobile;

    // 2. Create Auth User via Netlify Function
    // Replaced Supabase Edge Function with Netlify Function call
    
    const response = await fetch('/.netlify/functions/create-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: username,
            password: password,
            user_metadata: { 
                full_name: sevakData.fullName,
                role: UserRole.SEVAK, 
                organization_id: adminOrgId
            }
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Failed to create auth user via Netlify Function:", errorData);
        throw new Error(errorData.error || "Could not create login credentials.");
    }

    const { user_id } = await response.json();
    const newUserId = user_id;

    if (!newUserId) throw new Error("No User ID returned from auth creation");

    // 3. Create Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        organization_id: adminOrgId,
        role: UserRole.SEVAK,
        full_name: sevakData.fullName,
        username: username,
        mobile: sevakData.mobile,
        gender: sevakData.gender,
        age: sevakData.age,
        is_active: true
      });

    if (profileError) throw profileError;

    // 4. Create Sevak Record
    const { error: sevakError } = await supabase
      .from('sevaks')
      .insert({
        id: newUserId,
        organization_id: adminOrgId
      });
      
    if (sevakError) throw sevakError;

    return { username, password };
  },

  // --- Routes & Areas ---

  async getRoutes(): Promise<AreaRoute[]> {
    const { data, error } = await supabase
      .from('area_routes')
      .select('*');
    if (error) throw error;
    return data || [];
  },

  async getDistance(from: string, to: string): Promise<number> {
    const { data, error } = await supabase
      .from('area_routes')
      .select('distance_km')
      .eq('from_name', from)
      .eq('to_name', to)
      .single();
    
    return data ? data.distance_km : 0;
  },

  // --- Vihar Entries ---

  async createViharEntry(entry: ViharEntry) {
    const { data, error } = await supabase
      .from('vihar_entries')
      .insert(entry)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async getEntries(orgId: string): Promise<ViharEntry[]> {
    const { data, error } = await supabase
      .from('vihar_entries')
      .select('*')
      .eq('organization_id', orgId)
      .order('vihar_date', { ascending: false });
    
    if (error) throw error;
    return data as ViharEntry[];
  },
  
  async getSevakEntries(username: string): Promise<ViharEntry[]> {
    // We filter where the username is in the text[] array 'sevaks'
    const { data, error } = await supabase
      .from('vihar_entries')
      .select('*')
      .contains('sevaks', [username])
      .order('vihar_date', { ascending: false });

    if (error) throw error;
    return data as ViharEntry[];
  },

  // --- Analytics ---

  calculateStats: (entries: ViharEntry[]): StatSummary => {
    let totalKm = 0;
    let totalSadhu = 0;
    let totalSadhvi = 0;
    let longestVihar = 0;

    entries.forEach(e => {
      const km = Number(e.distance_km || 0);
      totalKm += km;
      totalSadhu += e.no_sadhubhagwan || 0;
      totalSadhvi += e.no_sadhvijibhagwan || 0;
      if (km > longestVihar) longestVihar = km;
    });

    // Simple streak logic
    let streak = 0;
    if (entries.length > 0) {
      // Assuming entries are sorted desc
      streak = 1;
      for (let i = 0; i < entries.length - 1; i++) {
        const curr = new Date(entries[i].vihar_date);
        const prev = new Date(entries[i+1].vihar_date);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          streak++;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    return {
      totalVihars: entries.length,
      totalKm: parseFloat(totalKm.toFixed(2)),
      totalSadhu,
      totalSadhvi,
      longestVihar,
      streak
    };
  }
};