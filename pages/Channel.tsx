import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ChannelOrgSummary, UserRole } from '../types';
import { channelService } from '../services/channelService';
import { useToast } from '../context/ToastContext';
import { Search, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';

interface ChannelProps {
  currentUser: UserProfile;
  onOpenOrganization: (organizationId: string) => void;
}

// A div (not a <button>) wrapping the row's own onClick — the trailing slot
// holds a real <button> (Follow/Unfollow) alongside it, and buttons cannot
// be nested inside one another in valid HTML.
const OrgRow: React.FC<{ org: ChannelOrgSummary; trailing: React.ReactNode; onClick: () => void }> = ({ org, trailing, onClick }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-left hover:border-saffron-200 transition-colors cursor-pointer"
  >
    <div className="min-w-0">
      <p className="text-sm font-bold text-[#241C17] truncate">{org.name}</p>
      {(org.town || org.city) && (
        <p className="text-xs text-[#8A6A57] truncate">{[org.town, org.city].filter(Boolean).join(', ')}</p>
      )}
    </div>
    {trailing}
  </div>
);

const Channel: React.FC<ChannelProps> = ({ currentUser, onOpenOrganization }) => {
  const { showToast } = useToast();
  const isAdmin = currentUser.role === UserRole.ORG_ADMIN;
  const [following, setFollowing] = useState<ChannelOrgSummary[]>([]);
  const [results, setResults] = useState<ChannelOrgSummary[]>([]);
  const [myOrgName, setMyOrgName] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const followingIds = new Set(following.map(o => o.id));

  const loadFollowing = useCallback(async () => {
    try {
      const [data, myProfile] = await Promise.all([
        channelService.getFollowing(),
        channelService.getOrgProfile(currentUser.organization_id),
      ]);
      setFollowing(data);
      setMyOrgName(myProfile?.name ?? null);
    } catch (e) {
      console.error('Failed to load followed Channels', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser.organization_id]);

  useEffect(() => { loadFollowing(); }, [loadFollowing]);

  useEffect(() => {
    // Discover (and the org search behind it) is a Captain-only action —
    // only Captains can follow a new org, so a Sevak has nothing to do here.
    if (!isAdmin) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await channelService.searchOrganizations(query);
        setResults(data);
      } catch (e) {
        console.error('Channel org search failed', e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, isAdmin]);

  const toggleFollow = async (org: ChannelOrgSummary) => {
    const alreadyFollowing = followingIds.has(org.id);
    try {
      if (alreadyFollowing) {
        await channelService.unfollow(org.id);
        setFollowing(prev => prev.filter(o => o.id !== org.id));
      } else {
        await channelService.follow(currentUser.organization_id, org.id);
        setFollowing(prev => [org, ...prev]);
      }
    } catch (e: any) {
      showToast(e?.message || 'Could not update follow status', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] flex items-center gap-2">
          <MessageSquare size={20} className="text-saffron-600" />
          VChat
        </h1>
        <p className="text-xs text-[#8A6A57]">Updates from Vihar organizations</p>
      </div>

      {isAdmin && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </div>
      )}

      {!query && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] px-1">My VChat</h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenOrganization(currentUser.organization_id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpenOrganization(currentUser.organization_id); }}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-saffron-50 rounded-2xl border border-saffron-100 cursor-pointer hover:border-saffron-300 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#241C17] truncate">{myOrgName || 'Your Organization'}</p>
              <p className="text-xs text-[#8A6A57]">My Vihar Group Chat</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-saffron-600">
              Open <ChevronRight size={16} />
            </span>
          </div>
        </div>
      )}

      {!query && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] px-1">Following</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-saffron-600" size={22} /></div>
          ) : following.length === 0 ? (
            <p className="text-sm text-[#8A6A57] px-1 py-4">Not following any organizations yet — search below to find one.</p>
          ) : (
            following.map(org => (
              <OrgRow
                key={org.id}
                org={org}
                onClick={() => onOpenOrganization(org.id)}
                trailing={<ChevronRight size={16} className="text-gray-300 shrink-0" />}
              />
            ))
          )}
        </div>
      )}

      {isAdmin && (
      <div className="space-y-2.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] px-1">Discover</h2>
        {searching ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-saffron-600" size={22} /></div>
        ) : results.length === 0 ? (
          <p className="text-sm text-[#8A6A57] px-1 py-4">{query ? 'No organizations found.' : 'Search by name, city, or area to discover organizations.'}</p>
        ) : (
          results.map(org => {
            const isFollowingOrg = followingIds.has(org.id);
            return (
              <OrgRow
                key={org.id}
                org={org}
                onClick={() => onOpenOrganization(org.id)}
                trailing={
                  currentUser.role === UserRole.ORG_ADMIN ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFollow(org); }}
                      className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors ${
                        isFollowingOrg
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-saffron-600 text-white hover:bg-saffron-700'
                      }`}
                    >
                      {isFollowingOrg ? 'Following' : 'Follow'}
                    </button>
                  ) : (
                    isFollowingOrg && <span className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-500">Following</span>
                  )
                }
              />
            );
          })
        )}
      </div>
      )}
    </div>
  );
};

export default Channel;
