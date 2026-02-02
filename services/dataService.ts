import { supabase } from './supabase';
import { UserProfile, ViharEntry, AreaRoute, UserRole, StatSummary, Organization } from '../types';

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

  async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      console.warn("Could not fetch org details:", error.message);
      return null;
    }
    return data as Organization;
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
    // 1. Generate Username
    const cleanName = sevakData.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const username = `${cleanName}@vsevak.in`;
    const password = sevakData.mobile;

    // 2. Get Admin Session (REQUIRED)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Admin session not found. Please login again.');
    }

    // 3. Create Auth User via Netlify Function (ADMIN ONLY)
    const response = await fetch('/.netlify/functions/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`, // ✅ REQUIRED
      },
      body: JSON.stringify({
        email: username,
        password: password,
        user_metadata: { // Added this back to ensure metadata is passed as per previous logic for profile creation consistency if needed by function, though function handles creation.
          full_name: sevakData.fullName,
          role: UserRole.SEVAK,
          organization_id: adminOrgId
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to create auth user via Netlify Function:', errorData);

      if (
        errorData.error &&
        errorData.error.toLowerCase().includes('already')
      ) {
        throw new Error(
          `Username ${username} already exists. Please modify the name slightly.`
        );
      }

      throw new Error(errorData.error || 'Could not create login credentials.');
    }

    const { user_id: newUserId } = await response.json();

    if (!newUserId) {
      throw new Error('No User ID returned from auth creation');
    }

    // 4. Create Profile (RLS-protected, admin allowed)
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
        is_active: true,
      });

    if (profileError) throw profileError;

    // 5. Create Sevak Record
    const { error: sevakError } = await supabase
      .from('sevaks')
      .insert({
        id: newUserId,
        organization_id: adminOrgId,
      });

    if (sevakError) throw sevakError;

    return { username, password };
  },

  async deleteSevak(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();

    // Call Netlify function to delete from Auth (service role required)
    const response = await fetch('/.netlify/functions/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({ user_id: userId })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to delete user");
    }

    // Optionally delete from public profiles if cascade isn't set up
    // We attempt it, but ignore 404s or permissions issues if auth delete succeeded
    await supabase.from('profiles').delete().eq('id', userId);

    return true;
  },

  async approveOrgAdmin(request: {
    id: string;
    org_name: string;
    city: string;
    full_name: string;
    email: string;
    mobile: string;
    password?: string;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Admin session required");

    const passwordToUse = request.password || request.mobile;

    // Call Secure Netlify Function
    const response = await fetch('/.netlify/functions/approve-org', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        requestId: request.id,
        orgName: request.org_name,
        city: request.city,
        fullName: request.full_name,
        email: request.email,
        mobile: request.mobile,
        password: passwordToUse
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to approve organization");
    }

    return true;
  },

  // --- Routes & Areas ---

  async getRoutes(orgId?: string): Promise<AreaRoute[]> {
    let query = supabase.from('area_routes').select('*');
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getDistance(from: string, to: string, orgId?: string): Promise<number> {
    let query = supabase
      .from('area_routes')
      .select('distance_km')
      .eq('from_name', from)
      .eq('to_name', to);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data, error } = await query.single(); // Might error if multiple found and no orgId provided, but existing behavior was single() anyway.

    return data ? data.distance_km : 0;
  },

  async addRoute(route: Omit<AreaRoute, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('area_routes')
      .insert(route)
      .select()
      .single();

    if (error) {
      // Handle unique violation gracefully if needed, or let UI handle it
      throw error;
    }
    return data;
  },

  async deleteRoute(routeId: number) {
    const { error } = await supabase
      .from('area_routes')
      .delete()
      .eq('id', routeId);

    if (error) throw error;
    return true;
  },

  async updateRoute(id: number, updates: Partial<AreaRoute>) {
    const { data, error } = await supabase
      .from('area_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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

  async deleteViharEntry(entryId: number) {
    const { error } = await supabase
      .from('vihar_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
    return true;
  },

  // --- Analytics ---

  calculateStats: (entries: ViharEntry[], currentUsername?: string, nameMap?: Record<string, string>): StatSummary => {
    let totalKm = 0;
    let totalSadhu = 0;
    let totalSadhvi = 0;
    let longestVihar = 0;
    const synergyMap: Record<string, number> = {};

    entries.forEach(e => {
      const km = Number(e.distance_km || 0);
      totalKm += km;
      totalSadhu += e.no_sadhubhagwan || 0;
      totalSadhvi += e.no_sadhvijibhagwan || 0;
      if (km > longestVihar) longestVihar = km;

      // Synergy Calculation
      if (currentUsername && e.sevaks) {
        e.sevaks.forEach(sevak => {
          if (sevak !== currentUsername) {
            synergyMap[sevak] = (synergyMap[sevak] || 0) + 1;
          }
        });
      }
    });

    // Find highest synergy
    let vSynergy = "N/A";
    if (currentUsername) {
      let maxCount = 0;
      let topSevaks: string[] = [];

      Object.entries(synergyMap).forEach(([sevak, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topSevaks = [sevak];
        } else if (count === maxCount) {
          topSevaks.push(sevak);
        }
      });

      if (topSevaks.length > 0) {
        // Map usernames to full names if map provided
        vSynergy = topSevaks.map(u => nameMap ? (nameMap[u] || u.split('@')[0]) : u.split('@')[0]).join(', ');
      }
    }

    // Simple streak logic
    let streak = 0;
    if (entries.length > 0) {
      // Assuming entries are sorted desc
      streak = 1;
      for (let i = 0; i < entries.length - 1; i++) {
        const curr = new Date(entries[i].vihar_date);
        const prev = new Date(entries[i + 1].vihar_date);
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
      streak,
      vSynergy,
      vRank: "N/A" // Populated separately
    };
  },

  calculateRank: (allEntries: ViharEntry[], currentUsername: string): number | string => {
    const sevakStats: Record<string, { count: number; km: number }> = {};

    // 1. Aggregate stats per sevak
    allEntries.forEach(entry => {
      (entry.sevaks || []).forEach(sevak => {
        if (!sevakStats[sevak]) {
          sevakStats[sevak] = { count: 0, km: 0 };
        }
        sevakStats[sevak].count += 1;
        sevakStats[sevak].km += Number(entry.distance_km || 0);
      });
    });

    // 2. Convert to array
    const leaderboard = Object.entries(sevakStats).map(([username, stats]) => ({
      username,
      count: stats.count,
      km: stats.km
    }));

    if (leaderboard.length === 0) return "N/A";

    // 3. Sort: Desc Vihar count, Desc KM
    leaderboard.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.km - a.km;
    });

    // 4. Assign ranks
    let rank = 1;
    let lastCount = leaderboard[0].count;
    let lastKm = leaderboard[0].km;

    for (let i = 0; i < leaderboard.length; i++) {
      if (
        leaderboard[i].count !== lastCount ||
        leaderboard[i].km !== lastKm
      ) {
        rank = i + 1;
        lastCount = leaderboard[i].count;
        lastKm = leaderboard[i].km;
      }

      if (leaderboard[i].username === currentUsername) {
        return rank;
      }
    }

    return "N/A";
  },

  async getSevakRank(orgId: string, username: string): Promise<number | string> {
    const { data, error } = await supabase.rpc('get_sevak_rank', {
      org_id: orgId,
      sevak_username: username
    });

    if (error) {
      console.error("Error fetching rank:", error);
      // Fallback to "N/A" instead of breaking
      return "N/A";
    }
    return data || "N/A";
  },

  async getTopSevaks(orgId: string, limit: number = 10) {
    // 1. Fetch all Organisation Sevaks (to get Gender)
    const sevaks = await this.getOrgSevaks(orgId);
    if (!sevaks || sevaks.length === 0) return { male: [], female: [] };

    // 2. Fetch all Entries
    const entries = await this.getEntries(orgId);

    // 3. Aggregate Stats
    const statsMap: Record<string, { count: number; km: number; name: string; gender: string }> = {};

    // Initialize map with all sevaks (so even those with 0 vihars appear if needed, though usually we only want active ones. 
    // Requirement says "Top 10", implies performance. Let's include everyone but sort 0s to bottom, or just active.
    // Let's stick to active (those who did vihars) or map everyone?
    // User wants "Top 10 Sevaks". Usually implies activity.
    // However, getting gender requires looking up the profile.

    sevaks.forEach(s => {
      statsMap[s.username] = {
        count: 0,
        km: 0,
        name: s.full_name,
        gender: s.gender || 'Male' // Default to Male if undefined, or handle 'Female'
      };
    });

    entries.forEach(e => {
      if (e.sevaks) {
        e.sevaks.forEach(username => {
          if (statsMap[username]) {
            statsMap[username].count += 1;
            statsMap[username].km += Number(e.distance_km || 0);
          }
        });
      }
    });

    // 4. Convert to Array and Sort
    const allStats = Object.entries(statsMap).map(([username, data]) => ({
      username,
      ...data
    }));

    // Sort by Count (Desc) -> Km (Desc)
    const sorter = (a: any, b: any) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.km - a.km;
    };

    const maleSevaks = allStats
      .filter(s => s.gender.toLowerCase() === 'male')
      .sort(sorter)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1, km: parseFloat(s.km.toFixed(2)) }));

    const femaleSevaks = allStats
      .filter(s => s.gender.toLowerCase() === 'female')
      .sort(sorter)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1, km: parseFloat(s.km.toFixed(2)) }));

    return { male: maleSevaks, female: femaleSevaks };
  }

};