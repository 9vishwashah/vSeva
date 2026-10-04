import { supabase } from './supabase';
import { callFn } from './apiBase';
import { getCached, invalidate, clearAll } from './requestCache';
import { UserProfile, ViharEntry, AreaRoute, UserRole, StatSummary, Organization, ContactNumber, IncidentReport } from '../types';

// Super Admin calls are server-authorised and brand-scoped (netlify/functions/super-admin.js).
async function superAdminCall<T = any>(action: string, extra: Record<string, unknown> = {}, retry = false): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again.');
  return callFn<T>('super-admin', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { action, ...extra },
    retry,
  });
}

export const dataService = {

  // --- Profiles & Sevaks ---

  async getProfile(userId: string): Promise<UserProfile | null> {
    return getCached(`profile:${userId}`, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, username, mobile, gender, age, blood_group, emergency_number, emergency_contact_name, occupation, occupation_details, address, is_active, last_login_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    }, 30_000);
  },

  // Fetched separately from getProfile (not on the login-critical path) since it
  // needs scripts/add_yearly_goal.sql run first. Falls back to 25 if that
  // migration hasn't been applied yet, or on any other error.
  async getYearlyGoal(userId: string): Promise<number> {
    return getCached(`yearlyGoal:${userId}`, async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('yearly_goal')
          .eq('id', userId)
          .single();
        if (!error && data && typeof (data as any).yearly_goal === 'number') {
          return (data as any).yearly_goal;
        }
      } catch {
        // ignore — column likely doesn't exist yet
      }
      return 25;
    }, 60_000);
  },

  // Same defensive pattern as getYearlyGoal — fetched separately from
  // getProfile so a missing scripts/add_avatar_url.sql migration can never
  // break login. Returns null (→ initials fallback) on any error.
  async getAvatarUrl(userId: string): Promise<string | null> {
    return getCached(`avatarUrl:${userId}`, async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();
        if (!error && data && typeof (data as any).avatar_url === 'string') {
          return (data as any).avatar_url;
        }
      } catch {
        // ignore — column/bucket likely doesn't exist yet
      }
      return null;
    }, 60_000);
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600' });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);
    if (updateError) throw updateError;

    invalidate(userId);
    return publicUrl;
  },

  async getPublicProfile(username: string): Promise<Partial<UserProfile> | null> {
    return getCached(`publicProfile:${username}`, async () => {
      // 1. Attempt RPC first (bypasses RLS for unauthenticated QR code scans)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_sevak_profile', { p_username: username });

      if (!rpcError && rpcData && rpcData.length > 0) {
         return rpcData[0];
      }

      // 2. Fallback if RPC isn't deployed yet (works if logged in, but fails for public scans due to RLS)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, organization_id, is_active, blood_group, mobile, emergency_number, emergency_contact_name, address, gender, role')
        .eq('username', username)
        .single();

      if (error) {
        console.warn("Could not fetch public profile:", error.message);
        return null;
      }
      return data;
    }, 30_000);
  },

  async getOrganization(orgId: string): Promise<Organization | null> {
    return getCached(`org:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, city, town, created_by, vice_captain_name')
        .eq('id', orgId)
        .single();

      if (!error) return data as Organization;

      // town/vice_captain_name need scripts/add_vice_captain_name.sql run first —
      // fall back to the original narrow select rather than breaking org name/city
      // everywhere until the migration runs.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('organizations')
        .select('id, name, city, created_by')
        .eq('id', orgId)
        .single();

      if (fallbackError) {
        console.warn("Could not fetch org details:", fallbackError.message);
        return null;
      }
      return fallbackData as Organization;
    }, 60_000);
  },

  async updateOrgLeadership(updates: { captainName?: string; viceCaptainName?: string }): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Admin session required. Please login again.');

    try {
      await callFn('update-org-leadership', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: updates,
      });
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to update organization details.');
    }
    clearAll(); // no orgId in scope here — this is a rare admin action, a full clear is cheap
  },

  // Fire-and-forget: scans for sevaks with no Vihar in 5/7/15+ days and creates
  // a "No Vihar Since..." notification for them (deduped per tier). Pass
  // `username` to check just one sevak (their own dashboard), omit it to scan
  // the whole org (the Captain's dashboard).
  checkInactivity(orgId: string, username?: string): void {
    callFn('check-inactivity', { body: { orgId, username } })
      .catch(e => console.warn('Inactivity check failed:', e));
  },

  async getOrgSevaks(orgId: string): Promise<UserProfile[]> {
    return getCached(`orgSevaks:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, username, mobile, gender, age, blood_group, emergency_number, emergency_contact_name, occupation, occupation_details, address, is_active, last_login_at, avatar_url')
        .eq('organization_id', orgId)
        .eq('role', 'sevak')
        .eq('is_active', true);

      if (!error) return data as UserProfile[];

      // avatar_url needs scripts/add_avatar_url.sql run first — fall back to the
      // original select rather than breaking the whole Organization Members list.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, username, mobile, gender, age, blood_group, emergency_number, address, is_active, last_login_at')
        .eq('organization_id', orgId)
        .eq('role', 'sevak')
        .eq('is_active', true);

      if (fallbackError) throw fallbackError;
      return fallbackData as UserProfile[];
    }, 30_000);
  },

  async getAllOrgUsers(orgId: string, includeInactive: boolean = false): Promise<UserProfile[]> {
    return getCached(`allOrgUsers:${orgId}:${includeInactive}`, async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', orgId);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserProfile[];
    }, 30_000);
  },

  // --- Super Admin ---

  async getSuperAdminScope(): Promise<{ email: string; all: boolean; brands: string[] }> {
    return superAdminCall('whoami', {}, true);
  },

  async getPendingRegistrationRequests(): Promise<any[]> {
    return superAdminCall<any[]>('pending', {}, true);
  },

  async rejectRegistrationRequest(id: string): Promise<void> {
    await superAdminCall('reject', { id });
  },

  async getOrgActivityStats(): Promise<{ org_id: string; org_name: string; city: string; created_at: string; total_sevaks: number; total_entries: number; last_updated: string | null; brand?: string }[]> {
    return getCached('orgActivityStats', async () => {
      try {
        return (await superAdminCall<any[]>('stats', {}, true)) || [];
      } catch (error) {
        console.error("Error fetching org activity stats:", error);
        throw error;
      }
    }, 30_000);
  },

  async getOrgAdmins(orgIds: string[]): Promise<Record<string, { full_name: string; mobile: string; town: string; state: string; yearly_goal?: number }>> {
    const map: Record<string, { full_name: string; mobile: string; town: string; state: string; yearly_goal?: number }> = {};
    if (!orgIds || orgIds.length === 0) return map;

    const cacheKey = `orgAdmins:${[...orgIds].sort().join(',')}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again.');
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const data = await getCached(cacheKey, () => callFn<any[]>('get-org-admins', { headers, body: { orgIds }, retry: true }), 30_000);
      (data || []).forEach((p: any) => {
        map[p.organization_id] = {
          full_name: p.full_name,
          mobile: p.mobile,
          town: p.town || '',
          state: p.state || '',
          yearly_goal: typeof p.yearly_goal === 'number' ? p.yearly_goal : undefined
        };
      });
    } catch (e) {
      console.error("Error fetching org admins:", e);
    }
    return map;
  },

  async getDashboardStats(orgId: string) {
    return getCached(`dashboardStats:${orgId}`, async () => {
      try {
        return await callFn('get-dashboard-stats', { body: { orgId }, retry: true });
      } catch (e: any) {
        throw new Error(e?.message || "Failed to fetch dashboard stats");
      }
    }, 20_000);
  },

  async getSevakNameMap(orgId: string): Promise<Record<string, string>> {
    return getCached(`sevakNameMap:${orgId}`, async () => {
      try {
        return await callFn<Record<string, string>>('get-sevak-names', { body: { orgId }, retry: true });
      } catch (e) {
        console.warn("Failed to fetch secure sevak name config via serverless");
        return {};
      }
    }, 60_000);
  },

  // Username -> avatar_url, same shape/scope as getSevakNameMap. Kept separate
  // so callers of getSevakNameMap (which expect plain string values) are
  // never affected by adding this.
  async getSevakAvatarMap(orgId: string): Promise<Record<string, string>> {
    return getCached(`sevakAvatarMap:${orgId}`, async () => {
      try {
        return await callFn<Record<string, string>>('get-sevak-avatars', { body: { orgId }, retry: true });
      } catch (e) {
        console.warn("Failed to fetch secure sevak avatar map via serverless");
        return {};
      }
    }, 60_000);
  },

  async getOrgSevakContacts(orgId: string): Promise<Record<string, { full_name: string; mobile: string; avatar_url?: string | null; role?: string; is_active?: boolean }>> {
    return getCached(`orgSevakContacts:${orgId}`, async () => {
      try {
        return await callFn<Record<string, any>>('get-org-sevak-contacts', { body: { orgId }, retry: true });
      } catch (e) {
        console.warn("Failed to fetch secure sevak contacts via serverless");
        return {};
      }
    }, 30_000);
  },

  // profiles has no "same org" SELECT policy — a Sevak's session can only read
  // their own row. Used by the Vihar Sevak picker so a Sevak submitting an entry
  // can still search/select org-mates by name; returns only username/full_name/
  // gender (never mobile/blood group/emergency contact/address).
  async getOrgRoster(orgId: string, includeInactive: boolean = false): Promise<Pick<UserProfile, 'username' | 'full_name' | 'gender' | 'avatar_url'>[]> {
    return getCached(`orgRoster:${orgId}:${includeInactive}`, async () => {
      try {
        return await callFn<any[]>('get-org-roster', { body: { orgId, includeInactive }, retry: true });
      } catch (e) {
        console.warn("Failed to fetch org roster via serverless");
        return [];
      }
    }, 30_000);
  },

  // Same data as getOrgRoster (username/full_name/gender), via a plain
  // Postgres RPC instead of the Netlify function — used specifically where
  // that data feeds a leaderboard/participation split that would otherwise
  // silently render "empty" (rather than visibly error) if the serverless
  // fetch ever failed for infra reasons (deployment, env vars, CORS on
  // native). Throws on failure instead of swallowing it, so callers surface
  // a real error rather than a quietly-wrong empty leaderboard.
  async getOrgRosterForStats(orgId: string, includeInactive: boolean = false): Promise<{ username: string; full_name: string; gender: string | null }[]> {
    return getCached(`orgRosterForStats:${orgId}:${includeInactive}`, async () => {
      const { data, error } = await supabase.rpc('get_org_roster_for_stats', {
        p_organization_id: orgId,
        p_include_inactive: includeInactive,
      });
      if (error) throw error;
      return (data || []) as { username: string; full_name: string; gender: string | null }[];
    }, 30_000);
  },

  async createSevak(
    adminOrgId: string,
    sevakData: { fullName: string; mobile: string; gender: string; age: number; bloodGroup?: string; emergencyNumber?: string; address?: string }
  ) {
    // 1. Generate Username & Auth Email
    const cleanName = sevakData.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    // username stored in profiles (display username, no domain suffix)
    const username = cleanName;
    // email used internally for Supabase auth only
    const authEmail = `${cleanName}@vsevak.in`;
    const password = sevakData.mobile;

    // 2. Get Admin Session (REQUIRED)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('Admin session not found. Please login again.');
    }

    // 3. Create Auth User via Netlify Function (ADMIN ONLY). Never retried —
    // a retry after an ambiguous timeout could create two auth users for one
    // Sevak.
    let newUserId: string | undefined;
    try {
      const result = await callFn<{ user_id?: string }>('create-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          email: authEmail,
          password: password,
          user_metadata: {
            full_name: sevakData.fullName,
            role: UserRole.SEVAK,
            organization_id: adminOrgId
          }
        },
      });
      newUserId = result.user_id;
    } catch (e: any) {
      let errorMessage = e?.message || 'Could not create login credentials.';
      if (errorMessage.toLowerCase().includes('already')) {
        errorMessage = `Username ${username} already exists. Please modify the name slightly.`;
      }
      throw new Error(errorMessage);
    }

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
        blood_group: sevakData.bloodGroup,
        emergency_number: sevakData.emergencyNumber,
        address: sevakData.address,
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

    invalidate(adminOrgId);
    return { username, password };
  },

  async deleteSevak(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();

    // Call Netlify function to delete from Auth (service role required).
    // Never retried — delete is not safely repeatable.
    try {
      await callFn('delete-user', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        body: { user_id: userId },
      });
    } catch (e: any) {
      throw new Error(e?.message || "Failed to delete user");
    }

    // Optionally delete from public profiles if cascade isn't set up
    // We attempt it, but ignore 404s or permissions issues if auth delete succeeded
    await supabase.from('profiles').delete().eq('id', userId);

    clearAll(); // no orgId in scope here — rare admin action, a full clear is cheap
    return true;
  },

  async updateSevakDetails(userId: string, updates: { mobile?: string; age?: number; bloodGroup?: string; emergencyNumber?: string; emergencyContactName?: string; address?: string; gender?: string; occupation?: string; occupationDetails?: string }) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Admin session not found. Please login again.');
    }

    // 1. Call Netlify function to update Auth password if mobile changed.
    // Never retried — not safely repeatable.
    if (updates.mobile) {
      try {
        await callFn('update-user-phone', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { user_id: userId, new_mobile: updates.mobile },
        });
      } catch (e: any) {
        throw new Error(e?.message || 'Could not update contact number in Auth.');
      }
    }

    // 2. Update Profile table using secure RPC
    const { error: rpcError } = await supabase.rpc('update_sevak_profile_by_admin', {
      p_target_user_id: userId,
      p_mobile: updates.mobile !== undefined ? updates.mobile : null,
      p_age: updates.age !== undefined && updates.age !== null && !isNaN(updates.age as number) ? updates.age : null,
      p_blood_group: updates.bloodGroup !== undefined ? updates.bloodGroup : null,
      p_emergency_number: updates.emergencyNumber !== undefined ? updates.emergencyNumber : null,
      p_address: updates.address !== undefined ? updates.address : null,
      p_gender: updates.gender !== undefined ? updates.gender : null,
      p_emergency_contact_name: updates.emergencyContactName !== undefined ? updates.emergencyContactName : null,
      p_occupation: updates.occupation !== undefined ? updates.occupation : null,
      p_occupation_details: updates.occupationDetails !== undefined ? updates.occupationDetails : null
    });

    if (rpcError) {
      console.error("RPC Error:", rpcError);

      // Fallback: direct table update when RPC signature mismatch (PGRST202) or missing
      if (rpcError.code === 'PGRST202' || (rpcError.message && rpcError.message.includes('Could not find the function'))) {
        console.warn("RPC signature mismatch — falling back to direct profile update. Run scripts/fix_update_sevak_rpc.sql in Supabase SQL Editor to fix permanently.");

        const directUpdates: Record<string, any> = {};
        if (updates.mobile !== undefined)          directUpdates.mobile           = updates.mobile;
        if (updates.age !== undefined)             directUpdates.age              = updates.age;
        if (updates.bloodGroup !== undefined)      directUpdates.blood_group      = updates.bloodGroup;
        if (updates.emergencyNumber !== undefined) directUpdates.emergency_number = updates.emergencyNumber;
        if (updates.address !== undefined)         directUpdates.address          = updates.address;
        if (updates.gender !== undefined)          directUpdates.gender           = updates.gender;
        if (updates.emergencyContactName !== undefined) directUpdates.emergency_contact_name = updates.emergencyContactName || null;
        if (updates.occupation !== undefined)      directUpdates.occupation       = updates.occupation || null;
        if (updates.occupationDetails !== undefined) directUpdates.occupation_details = updates.occupationDetails || null;

        const { error: directError } = await supabase
          .from('profiles')
          .update(directUpdates)
          .eq('id', userId);

        if (directError) {
          console.error("Direct update also failed:", directError);
          throw new Error("Could not update profile. Please contact your administrator.");
        }

        invalidate(userId);
        return true;
      }

      throw rpcError;
    }

    invalidate(userId);
    return true;
  },

  async updateOwnProfile(updates: { age?: number; bloodGroup?: string; emergencyNumber?: string; emergencyContactName?: string; address?: string; occupation?: string; occupationDetails?: string; yearlyGoal?: number }) {
    const { data: { session } } = await supabase.auth.getSession();
    const selfId = session?.user?.id;

    // Update age directly (not covered by the existing RPC)
    if (updates.age !== undefined && selfId) {
      const { error: ageError } = await supabase
        .from('profiles')
        .update({ age: updates.age })
        .eq('id', selfId);
      if (ageError) {
        console.error('updateOwnProfile age error:', ageError);
        throw ageError;
      }
    }

    // yearly_goal is a separate call: needs scripts/add_yearly_goal.sql run first,
    // and its failure (column not yet migrated) must not block age/blood group/etc.
    if (updates.yearlyGoal !== undefined && selfId) {
      const { error: goalError } = await supabase
        .from('profiles')
        .update({ yearly_goal: updates.yearlyGoal })
        .eq('id', selfId);
      if (goalError) {
        console.warn('updateOwnProfile yearly_goal error (has scripts/add_yearly_goal.sql been run?):', goalError);
      }
    }

    const { error } = await supabase.rpc('update_own_profile', {
      p_blood_group:      updates.bloodGroup      ?? '',
      p_emergency_number: updates.emergencyNumber ?? '',
      p_address:          updates.address         ?? '',
      // new fields: undefined/null = leave as is, '' = clear
      p_emergency_contact_name: updates.emergencyContactName ?? null,
      p_occupation:             updates.occupation ?? null,
      p_occupation_details:     updates.occupationDetails ?? null,
    });
    if (error) {
      console.error('updateOwnProfile RPC error:', error);
      throw error;
    }
    if (selfId) invalidate(selfId);
    return true;
  },

  // The server builds the org + Captain from the stored request (and checks the
  // caller's brand scope), so only the request id is sent.
  async approveOrgAdmin(requestId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Admin session required");

    // Call Secure Netlify Function. Never retried — would create a second org/admin.
    try {
      await callFn('approve-org', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { requestId },
      });
    } catch (e: any) {
      throw new Error(e?.message || "Failed to approve organization");
    }

    clearAll(); // creates a brand new org — nothing scoped to invalidate against
    return true;
  },

  // --- Routes & Areas ---

  async getRoutes(orgId?: string): Promise<AreaRoute[]> {
    return getCached(`routes:${orgId || 'all'}`, async () => {
      let query = supabase.from('area_routes').select('*');
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 60_000);
  },

  async getDistance(from: string, to: string, orgId?: string): Promise<number> {
    return getCached(`distance:${from}:${to}:${orgId || ''}`, async () => {
      let query = supabase
        .from('area_routes')
        .select('distance_km')
        .eq('from_name', from)
        .eq('to_name', to);

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data } = await query.single(); // Might error if multiple found and no orgId provided, but existing behavior was single() anyway.

      return data ? data.distance_km : 0;
    }, 60_000);
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

    // Auto-update any existing Vihar Entries that have these locations but 0 km (or any km really)
    if (data && data.organization_id) {
      await supabase
        .from('vihar_entries')
        .update({ distance_km: route.distance_km })
        .eq('organization_id', data.organization_id)
        .eq('vihar_from', route.from_name)
        .eq('vihar_to', route.to_name);

      // Optionally update the reverse direction too if needed, but strict matching is better
      await supabase
        .from('vihar_entries')
        .update({ distance_km: route.distance_km })
        .eq('organization_id', data.organization_id)
        .eq('vihar_from', route.to_name)
        .eq('vihar_to', route.from_name);

      invalidate(data.organization_id);
    }

    return data;
  },

  async deleteRoute(routeId: number) {
    const { error } = await supabase
      .from('area_routes')
      .delete()
      .eq('id', routeId);

    if (error) throw error;
    clearAll(); // no orgId in scope here — rare action, a full clear is cheap
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

    // Auto-update existing Vihar Entries if distance has changed
    if (data && data.organization_id && updates.distance_km !== undefined) {
      await supabase
        .from('vihar_entries')
        .update({ distance_km: updates.distance_km })
        .eq('organization_id', data.organization_id)
        .eq('vihar_from', data.from_name)
        .eq('vihar_to', data.to_name);

      await supabase
        .from('vihar_entries')
        .update({ distance_km: updates.distance_km })
        .eq('organization_id', data.organization_id)
        .eq('vihar_from', data.to_name)
        .eq('vihar_to', data.from_name);
    }

    if (data && data.organization_id) invalidate(data.organization_id);
    return data;
  },

  // --- Vihar Entries ---

  async createViharEntry(entry: ViharEntry) {
    // Strip fields that don't yet exist in the DB schema
    const { car_seva, car_seva_sevaks, wheelchair_sevaks, ...safeEntry } = entry as any;
    // No status set here — the DB column defaults to 'approved', so a Captain's
    // direct entry becomes official immediately, exactly as it did before this feature.
    const { data, error } = await supabase
      .from('vihar_entries')
      .insert(safeEntry)
      .select()
      .single();

    if (error) throw error;

    // Best-effort: notify the selected Vihar Sevaks that their Vihar was recorded.
    // Fire-and-forget so a notification hiccup never blocks the Captain's save.
    supabase.rpc('notify_vihar_participants', { p_entry_id: data.id }).then(({ error: notifyErr }) => {
      if (notifyErr) console.warn('Failed to notify Vihar participants:', notifyErr.message);
    });

    if (data?.organization_id) invalidate(data.organization_id);
    return data;
  },

  // Sevak-submitted Vihar entry. Always lands as 'pending' — only a Captain's
  // approve_vihar_entry RPC can turn it into an official record.
  async submitViharEntry(entry: ViharEntry) {
    const { car_seva, car_seva_sevaks, wheelchair_sevaks, ...safeEntry } = entry as any;
    const payload = { ...safeEntry, status: 'pending' };
    const { data, error } = await supabase
      .from('vihar_entries')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Best-effort: let the org's Captains know a submission is awaiting review.
    supabase.rpc('notify_captains_new_vihar_submission', { p_entry_id: data.id }).then(({ error: notifyErr }) => {
      if (notifyErr) console.warn('Failed to notify Captains of new submission:', notifyErr.message);
    });

    if (data?.organization_id) invalidate(data.organization_id);
    return data;
  },

  async getEntries(orgId: string): Promise<ViharEntry[]> {
    return getCached(`entries:${orgId}`, async () => {
      // Only official (approved) Vihars feed stats, KPIs, leaderboard and exports.
      const { data, error } = await supabase
        .from('vihar_entries')
        .select('id, organization_id, created_by, vihar_date, group_sadhu, group_sadhvi, no_sadhubhagwan, no_sadhvijibhagwan, vihar_from, vihar_to, sevaks, notes, wheelchair, distance_km, haversine_km, vihar_type, samuday, created_at, status, reviewed_by, reviewed_at')
        .eq('organization_id', orgId)
        .eq('status', 'approved')
        .order('vihar_date', { ascending: false });

      if (error) throw error;
      return data as ViharEntry[];
    }, 20_000);
  },

  // Org-wide (vihar_date, distance_km, sevaks) only — for rank/leaderboard
  // computation. getEntries() above is RLS-limited for a Sevak caller to
  // just their own participation rows (sevak_can_read_own_entries), which
  // silently breaks any client-side ranking built on top of it — every
  // Sevak's "whole org" would really just be themselves. This goes through
  // a narrow SECURITY DEFINER RPC scoped to the caller's own org instead.
  async getOrgEntriesForRanking(orgId: string): Promise<ViharEntry[]> {
    return getCached(`entriesForRanking:${orgId}`, async () => {
      const { data, error } = await supabase.rpc('get_org_entries_for_ranking', {
        p_organization_id: orgId,
        p_from: null,
        p_to: null,
      });
      if (error) throw error;
      return (data || []) as ViharEntry[];
    }, 20_000);
  },

  async getSevakEntries(username: string): Promise<ViharEntry[]> {
    return getCached(`sevakEntries:${username}`, async () => {
      // We filter where the username is in the text[] array 'sevaks'
      const { data, error } = await supabase
        .from('vihar_entries')
        .select('*')
        .eq('status', 'approved')
        .contains('sevaks', [username])
        .order('vihar_date', { ascending: false });

      if (error) throw error;
      return data as ViharEntry[];
    }, 20_000);
  },

  // A Sevak's own Vihar history: their own submissions (any status — pending/approved/
  // rejected) plus any already-approved entry a Captain added them to. Used by the
  // Sevak-facing "My Vihars" screen so a pending submission is still visible to its
  // submitter even though getEntries() above excludes it from official stats.
  async getMyViharEntries(orgId: string, userId: string, username: string): Promise<ViharEntry[]> {
    return getCached(`myViharEntries:${orgId}:${userId}`, async () => {
      const [ownSubmissions, participantEntries] = await Promise.all([
        supabase.from('vihar_entries').select('*').eq('organization_id', orgId).eq('created_by', userId),
        supabase.from('vihar_entries').select('*').eq('organization_id', orgId).eq('status', 'approved').contains('sevaks', [username]),
      ]);

      if (ownSubmissions.error) throw ownSubmissions.error;
      if (participantEntries.error) throw participantEntries.error;

      const byId = new Map<number, ViharEntry>();
      [...(ownSubmissions.data || []), ...(participantEntries.data || [])].forEach((e: any) => byId.set(e.id, e));

      return Array.from(byId.values()).sort((a, b) => (a.vihar_date < b.vihar_date ? 1 : -1));
    }, 20_000);
  },

  // --- Vihar Approval Workflow (Captain review) ---

  async getPendingViharEntries(orgId: string): Promise<ViharEntry[]> {
    return getCached(`pendingViharEntries:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('vihar_entries')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ViharEntry[];
    }, 15_000);
  },

  async approveViharEntry(entryId: number): Promise<ViharEntry> {
    const { data, error } = await supabase.rpc('approve_vihar_entry', { p_entry_id: entryId });
    if (error) throw error;
    if ((data as any)?.organization_id) invalidate((data as any).organization_id);
    return data as ViharEntry;
  },

  async rejectViharEntry(entryId: number, reason?: string): Promise<ViharEntry> {
    const { data, error } = await supabase.rpc('reject_vihar_entry', { p_entry_id: entryId, p_reason: reason || null });
    if (error) throw error;
    if ((data as any)?.organization_id) invalidate((data as any).organization_id);
    return data as ViharEntry;
  },

  async deleteViharEntry(entryId: number) {
    const { error } = await supabase
      .from('vihar_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
    clearAll(); // no orgId in scope here — a full clear is cheap for this rare action
    return true;
  },

  async updateViharEntry(entryId: number, updates: Partial<ViharEntry>) {
    // Strip fields that don't yet exist in the DB schema
    const { car_seva, car_seva_sevaks, wheelchair_sevaks, ...safeUpdates } = updates as any;
    const { data, error } = await supabase
      .from('vihar_entries')
      .update(safeUpdates)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    if (data?.organization_id) invalidate(data.organization_id);
    return data;
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

  // Client-side equivalent of the get_top_sevaks_leaderboard RPC, but over
  // whatever entries the caller passes in (e.g. a Vihar-Year-filtered subset)
  // instead of always the full org history — same {male, female, overall}
  // shape LeaderboardCard already expects.
  getTopSevaksLeaderboard(
    entries: ViharEntry[],
    nameMap: Record<string, string>,
    genderMap: Record<string, string>
  ): { male: any[]; female: any[]; overall: any[] } {
    const statsByUser: Record<string, { km: number; count: number }> = {};
    entries.forEach(e => {
      (e.sevaks || []).forEach(u => {
        if (!statsByUser[u]) statsByUser[u] = { km: 0, count: 0 };
        statsByUser[u].km += Number(e.distance_km || 0);
        statsByUser[u].count += 1;
      });
    });

    const all = Object.entries(statsByUser).map(([username, s]) => ({
      username,
      name: nameMap[username] || username.split('@')[0],
      km: parseFloat(s.km.toFixed(2)),
      count: s.count,
      gender: (genderMap[username] || '').toLowerCase(),
    }));

    const sortFn = (a: { count: number; km: number }, b: { count: number; km: number }) =>
      (b.count - a.count) || (b.km - a.km);

    const withRank = (list: typeof all) => [...list].sort(sortFn).map((s, i) => ({ ...s, rank: i + 1 }));

    return {
      male: withRank(all.filter(s => s.gender === 'male')),
      female: withRank(all.filter(s => s.gender === 'female')),
      overall: withRank(all),
    };
  },

  // Every sevak's current "consecutive calendar days with a Vihar" streak,
  // sorted highest first — for the Captain's "Highest Streaks" leaderboard.
  getStreakLeaderboard(entries: ViharEntry[], nameMap: Record<string, string>): { username: string; name: string; streak: number }[] {
    const datesByUser: Record<string, string[]> = {};
    entries.forEach(e => {
      (e.sevaks || []).forEach(u => {
        if (!datesByUser[u]) datesByUser[u] = [];
        datesByUser[u].push(e.vihar_date);
      });
    });

    return Object.entries(datesByUser)
      .map(([username, dates]) => {
        const uniqueDatesDesc = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
        let streak = uniqueDatesDesc.length > 0 ? 1 : 0;
        for (let i = 0; i < uniqueDatesDesc.length - 1; i++) {
          const curr = new Date(uniqueDatesDesc[i]);
          const prev = new Date(uniqueDatesDesc[i + 1]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) streak++;
          else break;
        }
        return { username, name: nameMap[username] || username.split('@')[0], streak };
      })
      .filter(s => s.streak > 0)
      .sort((a, b) => b.streak - a.streak);
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
    return getCached(`sevakRank:${orgId}:${username}`, async () => {
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
    }, 20_000);
  },

  async getTotalOrgSevaks(orgId: string): Promise<number | null> {
    return getCached(`totalOrgSevaks:${orgId}`, async () => {
      const { data, error } = await supabase.rpc('get_total_org_sevaks', {
        org_id: orgId
      });

      if (error) {
        console.error("Error fetching total org sevaks:", error);
        return null;
      }
      return data as number;
    }, 30_000);
  },

  async getTopSevaks(orgId: string, limit: number = 1000) {
    return getCached(`topSevaks:${orgId}:${limit}`, async () => {
      try {
        // Use RPC to bypass RLS and get all org stats
        const { data, error } = await supabase.rpc('get_top_sevaks_leaderboard', {
          org_id: orgId,
          limit_val: limit
        });

        if (error) {
          throw new Error("RPC failed: " + error.message);
        }

        // The RPC returns { male: [], female: [], overall: [] } JSON
        // Remap SQL column names (full_name, gender_rank) to what LeaderboardCard expects (name, rank)
        if (data) {
          const remap = (arr: any[], useGenderRank = false) =>
            (arr || []).map((s: any) => ({
              username: s.username,
              name: s.full_name,
              km: parseFloat(parseFloat(s.km || 0).toFixed(2)),
              count: Number(s.count || 0),
              gender: s.gender,
              rank: useGenderRank ? Number(s.gender_rank) : Number(s.overall_rank)
            }));

          return {
            male: remap(data.male, true),
            female: remap(data.female, true),
            overall: remap(data.overall, false)
          };
        }

        return { male: [], female: [], overall: [] };
      } catch (err) {
        console.error(err);
        return { male: [], female: [], overall: [] };
      }
    }, 20_000);
  },

  // --- Contact Numbers ---

  async getContactNumbers(orgId: string): Promise<ContactNumber[]> {
    return getCached(`contactNumbers:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('contact_numbers')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ContactNumber[];
    }, 60_000);
  },

  async addContactNumber(contact: { organization_id: string; label: string; phone: string; description?: string }): Promise<ContactNumber> {
    const { data, error } = await supabase
      .from('contact_numbers')
      .insert(contact)
      .select()
      .single();
    if (error) throw error;
    invalidate(contact.organization_id);
    return data as ContactNumber;
  },

  async deleteContactNumber(id: number): Promise<void> {
    const { error } = await supabase
      .from('contact_numbers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    clearAll(); // no orgId in scope here — rare action, a full clear is cheap
  },

  // --- Incident Reports ---

  async createIncidentReport(report: IncidentReport) {
    const { data, error } = await supabase
      .from('incident_reports')
      .insert(report)
      .select()
      .single();

    if (error) throw error;
    if (data?.organization_id) invalidate(data.organization_id);
    return data as IncidentReport;
  },

  async getIncidentReports(orgId: string): Promise<IncidentReport[]> {
    return getCached(`incidentReports:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as IncidentReport[];
    }, 30_000);
  },

  async updateIncidentReportStatus(reportId: string, status: IncidentReport['status']) {
    const { data, error } = await supabase
      .from('incident_reports')
      .update({ status })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    if (data?.organization_id) invalidate(data.organization_id);
    return data as IncidentReport;
  },

};
