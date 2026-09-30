import { supabase } from './supabase';
import {
  ChannelOrgSummary,
  ChannelOrgProfile,
  ChannelRecentVihar,
  ChannelPost,
  ChannelPostingPermission,
} from '../types';

const MESSAGE_PAGE_SIZE = 30;

export const channelService = {
  // --- Discover / Following ---

  async searchOrganizations(query: string): Promise<ChannelOrgSummary[]> {
    const { data, error } = await supabase.rpc('search_channel_organizations', { p_query: query || '' });
    if (error) throw error;
    return (data || []) as ChannelOrgSummary[];
  },

  async getFollowing(): Promise<ChannelOrgSummary[]> {
    // channel_follows only carries the followed org's id; join to the same
    // narrow profile RPC used everywhere else in Channel for display fields,
    // rather than adding a second cross-org read path.
    const { data: follows, error } = await supabase
      .from('channel_follows')
      .select('followed_organization_id')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const ids = (follows || []).map(f => f.followed_organization_id);
    if (ids.length === 0) return [];

    const results = await Promise.all(ids.map(id => supabase.rpc('get_channel_org_profile', { p_organization_id: id })));
    return results
      .map(r => (r.data && r.data[0]) || null)
      .filter((o): o is ChannelOrgProfile => !!o)
      .map(o => ({ id: o.id, name: o.name, city: o.city, town: o.town }));
  },

  async isFollowing(organizationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('channel_follows')
      .select('id')
      .eq('followed_organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  // myOrgId is supplied by the caller (already on the logged-in profile,
  // e.g. currentUser.organization_id) rather than re-queried here — RLS
  // (channel_follows_insert_captain_only) is the actual security boundary
  // and independently re-checks both the org and the Captain role server-side.
  async follow(myOrgId: string, organizationId: string): Promise<void> {
    const { error } = await supabase.from('channel_follows').insert({
      follower_organization_id: myOrgId,
      followed_organization_id: organizationId,
    });
    if (error) throw error;
  },

  async unfollow(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('channel_follows')
      .delete()
      .eq('followed_organization_id', organizationId);
    if (error) throw error;
  },

  // --- Organization profile / recent Vihars ---

  async getOrgProfile(organizationId: string): Promise<ChannelOrgProfile | null> {
    const { data, error } = await supabase.rpc('get_channel_org_profile', { p_organization_id: organizationId });
    if (error) throw error;
    return (data && data[0]) || null;
  },

  async getRecentVihars(organizationId: string, limit = 5): Promise<ChannelRecentVihar[]> {
    const { data, error } = await supabase.rpc('get_channel_recent_vihars', { p_organization_id: organizationId, p_limit: limit });
    if (error) throw error;
    return (data || []) as ChannelRecentVihar[];
  },

  // --- Settings ---

  async getSettings(organizationId: string): Promise<ChannelPostingPermission> {
    const { data, error } = await supabase
      .from('channel_settings')
      .select('posting_permission')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    return (data?.posting_permission as ChannelPostingPermission) || 'captain_only';
  },

  async updateSettings(organizationId: string, permission: ChannelPostingPermission): Promise<void> {
    const { error } = await supabase
      .from('channel_settings')
      .upsert({ organization_id: organizationId, posting_permission: permission, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  // --- Messages ---

  // Goes through get_channel_posts (not a direct table select) specifically
  // to get author_name — channel_posts itself only stores author_user_id,
  // and other organizations' profiles aren't readable via profiles' own RLS
  // (scoped to your own org), so this RPC joins it server-side, narrowly
  // (full_name only), same pattern as Channel's other cross-org reads.
  async getPosts(organizationId: string, beforeCreatedAt?: string): Promise<ChannelPost[]> {
    const { data, error } = await supabase.rpc('get_channel_posts', {
      p_organization_id: organizationId,
      p_before: beforeCreatedAt || null,
      p_limit: MESSAGE_PAGE_SIZE,
    });
    if (error) throw error;
    return (data || []) as ChannelPost[];
  },

  // authorName/authorAvatarUrl/authorRole are the caller's own already-known
  // profile fields (it's always the current user posting) — attached
  // client-side rather than re-fetched, since the plain insert's response
  // has no columns for them to return.
  async sendPost(
    organizationId: string,
    authorUserId: string,
    authorName: string,
    message: string,
    authorAvatarUrl?: string | null,
    authorRole?: string | null
  ): Promise<ChannelPost> {
    const { data, error } = await supabase
      .from('channel_posts')
      .insert({ organization_id: organizationId, author_user_id: authorUserId, message: message.slice(0, 4000) })
      .select('id, organization_id, author_user_id, message, created_at')
      .single();
    if (error) throw error;
    return { ...(data as any), author_name: authorName, author_avatar_url: authorAvatarUrl, author_role: authorRole } as ChannelPost;
  },

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase.from('channel_posts').delete().eq('id', postId);
    if (error) throw error;
  },

  // --- Realtime ---
  // One `.channel()` per open organization screen — Supabase multiplexes
  // every subscription over a single underlying WebSocket connection, so
  // this does not open one connection per organization. Subscribe only
  // while a Channel screen for that org is open; unsubscribe on unmount
  // (see pages/ChannelOrganization.tsx).
  subscribeToOrgPosts(organizationId: string, onInsert: (post: ChannelPost) => void) {
    const channel = supabase
      .channel(`channel:org:${organizationId}`, { config: { private: true } })
      .on('broadcast', { event: 'INSERT' }, (payload: any) => {
        // realtime.send() delivers the payload flat (not nested under
        // .record — that nesting is specific to broadcast_changes()).
        const post = payload?.payload;
        if (post?.id) onInsert(post as ChannelPost);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
