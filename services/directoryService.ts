import { supabase } from './supabase';
import { fnUrl } from './apiBase';
import {
  DirectoryListing,
  DirectorySubmission,
  DirectoryChangeRequest,
  DirectoryCardFields,
  ResolvedLocation,
} from '../types';

const LISTING_COLUMNS = '*';

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const directoryService = {
  // --- Public read path — only ever touches approved rows, enforced by RLS.
  // Search/category/facility filters all happen client-side in Directory.tsx
  // against this one fetch — the directory isn't at a scale yet where
  // pushing each filter down to its own query is worth the complexity. ---

  async getApprovedListings(): Promise<DirectoryListing[]> {
    const { data, error } = await supabase
      .from('directory_listings')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('Failed to load directory listings', error);
      throw error;
    }
    return (data || []) as DirectoryListing[];
  },

  async getListingBySlug(slug: string): Promise<DirectoryListing | null> {
    const { data, error } = await supabase
      .from('directory_listings')
      .select(LISTING_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Failed to load listing', error);
      throw error;
    }
    return data as DirectoryListing | null;
  },

  // A lightweight, non-AI duplicate check: same-ish name nearby. Only ever
  // reads already-public (approved) rows, so it needs no special access.
  async findPossibleDuplicates(name: string, city: string | null | undefined, lat: number, lng: number): Promise<DirectoryListing[]> {
    const nameFragment = name.trim().split(/\s+/).slice(0, 2).join(' ');
    if (!nameFragment) return [];

    let query = supabase.from('directory_listings').select('id, slug, name, city, area, latitude, longitude').ilike('name', `%${nameFragment}%`);
    if (city) query = query.ilike('city', `%${city}%`);

    const { data, error } = await query.limit(10);
    if (error || !data) return [];

    return (data as DirectoryListing[]).filter((l) => {
      if (l.latitude == null || l.longitude == null) return true; // name+city matched, no coords to rule it out
      return haversineKm(lat, lng, l.latitude, l.longitude) <= 1;
    });
  },

  // --- Location resolution (server-side; extracts coords from the URL, then
  // reverse-geocodes via free/keyless Nominatim — see resolve-location.js) ---

  async resolveGoogleMapsLink(url: string): Promise<ResolvedLocation> {
    const res = await fetch(fnUrl('resolve-location'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      throw new Error('Could not resolve location');
    }
    return res.json();
  },

  // --- Photo uploads — public bucket, same shape as avatars/incident-reports ---

  async uploadDirectoryPhoto(file: File, folderKey: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${folderKey}/${Date.now()}_${Math.round(Math.random() * 1e6)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('directory-photos')
      .upload(filePath, file, { cacheControl: '3600', contentType: file.type });
    if (error) throw error;

    const { data } = supabase.storage.from('directory-photos').getPublicUrl(filePath);
    return data.publicUrl;
  },

  // --- Public write path — anonymous, no session at all ---

  async submitListing(fields: DirectoryCardFields, contributorName: string, contributorMobile: string | undefined, possibleDuplicateOf?: string): Promise<void> {
    const { error } = await supabase.from('directory_submissions').insert({
      ...fields,
      contributor_name: contributorName,
      contributor_mobile: contributorMobile || null,
      possible_duplicate_of: possibleDuplicateOf || null,
      status: 'pending',
    });
    if (error) throw error;
  },

  async submitChangeRequest(
    listingId: string,
    proposedFields: Partial<DirectoryCardFields>,
    currentSnapshot: Partial<DirectoryCardFields>,
    contributorName: string,
    contributorMobile: string | undefined
  ): Promise<void> {
    const { error } = await supabase.from('directory_change_requests').insert({
      listing_id: listingId,
      proposed_fields: proposedFields,
      current_snapshot: currentSnapshot,
      contributor_name: contributorName,
      contributor_mobile: contributorMobile || null,
      status: 'pending',
    });
    if (error) throw error;
  },

  // --- Super Admin review — SECURITY DEFINER RPCs, gated on profiles.role = 'admin' ---

  async getPendingSubmissions(): Promise<DirectorySubmission[]> {
    const { data, error } = await supabase.rpc('get_pending_directory_submissions');
    if (error) throw error;
    return (data || []) as DirectorySubmission[];
  },

  async getPendingChangeRequests(): Promise<DirectoryChangeRequest[]> {
    const { data, error } = await supabase.rpc('get_pending_directory_change_requests');
    if (error) throw error;
    return (data || []) as DirectoryChangeRequest[];
  },

  async getCounts(): Promise<{ pending_listings: number; pending_edits: number; approved_listings: number; rejected_listings: number }> {
    const { data, error } = await supabase.rpc('get_directory_counts');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row || { pending_listings: 0, pending_edits: 0, approved_listings: 0, rejected_listings: 0 };
  },

  async approveSubmission(submissionId: string, adminId: string, adminName: string, overrides: Partial<DirectoryCardFields> = {}): Promise<DirectoryListing> {
    const { data, error } = await supabase.rpc('approve_directory_submission', {
      p_submission_id: submissionId,
      p_admin_id: adminId,
      p_admin_name: adminName,
      p_overrides: overrides,
    });
    if (error) throw error;
    return data as DirectoryListing;
  },

  async rejectSubmission(submissionId: string, adminId: string, adminName: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('reject_directory_submission', {
      p_submission_id: submissionId,
      p_admin_id: adminId,
      p_admin_name: adminName,
      p_reason: reason || null,
    });
    if (error) throw error;
  },

  async approveChangeRequest(requestId: string, adminId: string, adminName: string, overrides: Partial<DirectoryCardFields> = {}): Promise<DirectoryListing> {
    const { data, error } = await supabase.rpc('approve_directory_change_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
      p_admin_name: adminName,
      p_overrides: overrides,
    });
    if (error) throw error;
    return data as DirectoryListing;
  },

  async rejectChangeRequest(requestId: string, adminId: string, adminName: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('reject_directory_change_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
      p_admin_name: adminName,
      p_reason: reason || null,
    });
    if (error) throw error;
  },
};
