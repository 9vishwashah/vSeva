import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, UserRole, ChannelOrgProfile, ChannelRecentVihar, ChannelPost, ChannelPostingPermission } from '../types';
import { channelService } from '../services/channelService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import BottomSheet from '../components/BottomSheet';
import ChannelMessageRow from '../components/ChannelMessageRow';
import { Loader2, Send, Settings, X, Reply, Copy, Trash2 } from 'lucide-react';

const roleLabel = (role?: string | null): string => (role === UserRole.ORG_ADMIN ? 'Captain / Organization Head' : 'Vihar Sevak');

interface ChannelOrganizationProps {
  currentUser: UserProfile;
  organizationId: string;
  onBack: () => void;
}

const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const ChannelOrganization: React.FC<ChannelOrganizationProps> = ({ currentUser, organizationId, onBack }) => {
  const { showToast } = useToast();
  const isOwnOrg = organizationId === currentUser.organization_id;

  const [profile, setProfile] = useState<ChannelOrgProfile | null>(null);
  const [recentVihars, setRecentVihars] = useState<ChannelRecentVihar[]>([]);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [postingPermission, setPostingPermission] = useState<ChannelPostingPermission>('captain_only');
  const [profilePost, setProfilePost] = useState<ChannelPost | null>(null);
  // Reply: the message being answered (shown above the box), the long-press menu target, and the message
  // briefly highlighted after jumping to it from a quote.
  const [replyTo, setReplyTo] = useState<ChannelPost | null>(null);
  const [actionPost, setActionPost] = useState<ChannelPost | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenPostIds = useRef(new Set<string>());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);

  // `posts` is kept oldest-first (ascending) so it renders top-to-bottom
  // like a normal chat, with new messages appended at the end — not the
  // reverse-chronological feed order used elsewhere in the app.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, viharsData, postsDataDesc, followingOrgs, permission] = await Promise.all([
        channelService.getOrgProfile(organizationId),
        channelService.getRecentVihars(organizationId, 5),
        channelService.getPosts(organizationId),
        isOwnOrg ? Promise.resolve([]) : channelService.isFollowing(organizationId).then(v => (v ? [organizationId] : [])),
        channelService.getSettings(organizationId),
      ]);
      const postsData = postsDataDesc.slice().reverse();
      setProfile(profileData);
      setRecentVihars(viharsData);
      setPosts(postsData);
      seenPostIds.current = new Set(postsData.map(p => p.id));
      setHasMore(postsDataDesc.length >= 30);
      setIsFollowing(isOwnOrg || followingOrgs.length > 0);
      setPostingPermission(permission);
      setCanPost(
        isOwnOrg &&
        (currentUser.role === UserRole.ORG_ADMIN || permission === 'all_members')
      );
    } catch (e: any) {
      showToast(e?.message || 'Failed to load VChat', 'error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, isOwnOrg, currentUser.role, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setReplyTo(null); setActionPost(null); }, [organizationId]);

  // Scroll to the newest message on first load and whenever one is appended
  // — but not right after "Load earlier" prepends older ones above. Sets
  // scrollTop directly on the messages container itself (not
  // scrollIntoView, which walks every scrollable ancestor — including the
  // whole page's own <main> scroller — and was dragging the entire page
  // down every time a message arrived instead of just this one box).
  useEffect(() => {
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [posts.length]);

  // Realtime: only while this screen is open, only for this one organization.
  useEffect(() => {
    const unsubscribe = channelService.subscribeToOrgPosts(organizationId, (post) => {
      if (seenPostIds.current.has(post.id)) return; // dedupe vs. optimistic insert
      seenPostIds.current.add(post.id);
      setPosts(prev => [...prev, post]);
    });
    return unsubscribe;
  }, [organizationId]);

  const loadMore = async () => {
    if (posts.length === 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const older = await channelService.getPosts(organizationId, posts[0].created_at);
      older.forEach(p => seenPostIds.current.add(p.id));
      skipAutoScrollRef.current = true;
      const el = messagesContainerRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      setPosts(prev => [...older.slice().reverse(), ...prev]);
      setHasMore(older.length >= 30);
      // Keep the user's visual position instead of jumping to the top once
      // the older messages are prepended above what they were looking at.
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch (e) {
      console.error('Failed to load earlier Channel messages', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollow = async () => {
    setFollowBusy(true);
    try {
      await channelService.follow(currentUser.organization_id, organizationId);
      setIsFollowing(true);
    } catch (e: any) {
      showToast(e?.message || 'Could not follow organization', 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowBusy(true);
    try {
      await channelService.unfollow(organizationId);
      setIsFollowing(false);
      setConfirmUnfollow(false);
    } catch (e: any) {
      showToast(e?.message || 'Could not unfollow organization', 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending) return;
    if (!navigator.onLine) {
      showToast("You're offline.", 'error');
      return;
    }
    setSending(true);
    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const replyingTo = replyTo; // keep it so a failed send can put it back
    const optimisticPost: ChannelPost = {
      id: optimisticId,
      organization_id: organizationId,
      author_user_id: currentUser.id,
      author_name: currentUser.full_name,
      author_avatar_url: currentUser.avatar_url,
      author_role: currentUser.role,
      message,
      created_at: new Date().toISOString(),
      reply_to_id: replyingTo?.id ?? null,
      reply_to_author: replyingTo?.author_name ?? null,
      reply_to_excerpt: replyingTo ? replyingTo.message.slice(0, 140) : null,
    };
    setPosts(prev => [...prev, optimisticPost]);
    setDraft('');
    setReplyTo(null);
    try {
      const saved = await channelService.sendPost(organizationId, currentUser.id, currentUser.full_name, message, currentUser.avatar_url, currentUser.role, replyingTo?.id ?? null);
      seenPostIds.current.add(saved.id);
      setPosts(prev => {
        // The realtime broadcast for this same post can arrive before this
        // insert's own response does — if so it's already in the list under
        // its real id, so just drop the optimistic placeholder instead of
        // also swapping it in (that would double it).
        if (prev.some(p => p.id === saved.id)) {
          return prev.filter(p => p.id !== optimisticId);
        }
        return prev.map(p => (p.id === optimisticId ? saved : p));
      });
    } catch (e: any) {
      setPosts(prev => prev.filter(p => p.id !== optimisticId));
      setDraft(message);
      setReplyTo(replyingTo);
      showToast(e?.message || 'Message failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  // Start a reply to a message: it appears above the box, and the box takes focus.
  const handleReply = (post: ChannelPost) => {
    if (!canPost || post.id.startsWith('optimistic-')) return;
    setActionPost(null);
    setReplyTo(post);
    window.setTimeout(() => inputRef.current?.focus(), 60);
  };

  const copyMessage = async (post: ChannelPost) => {
    setActionPost(null);
    try {
      await navigator.clipboard.writeText(post.message);
      showToast('Message copied', 'success');
    } catch {
      showToast('Could not copy this message', 'error');
    }
  };

  // Tap a quote -> scroll to the original (loading older messages if it isn't on screen yet) and flash it.
  const jumpTo = async (postId: string) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!document.getElementById(`chat-post-${postId}`)) {
      let cursor = posts[0]?.created_at;
      let more = hasMore;
      let found = false;
      const extra: ChannelPost[] = []; // newest-first, as returned
      for (let i = 0; i < 5 && more && cursor; i++) {
        const older = await channelService.getPosts(organizationId, cursor);
        older.forEach(o => seenPostIds.current.add(o.id));
        extra.push(...older);
        more = older.length >= 30;
        cursor = older[older.length - 1]?.created_at;
        if (older.some(o => o.id === postId)) { found = true; break; }
      }
      if (!found) {
        showToast('That message is too old to show here.', 'info');
        return;
      }
      skipAutoScrollRef.current = true;
      setPosts(prev => [...extra.slice().reverse(), ...prev]);
      setHasMore(more);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    const el = document.getElementById(`chat-post-${postId}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    setHighlightId(postId);
    window.setTimeout(() => setHighlightId(h => (h === postId ? null : h)), 1600);
  };

  const handleDelete = async (postId: string) => {
    const prevPosts = posts;
    setPosts(prev => prev.filter(p => p.id !== postId));
    try {
      await channelService.deletePost(postId);
    } catch (e: any) {
      setPosts(prevPosts);
      showToast(e?.message || 'Could not delete message', 'error');
    }
  };

  const handlePermissionChange = async (permission: ChannelPostingPermission) => {
    setPostingPermission(permission);
    try {
      await channelService.updateSettings(organizationId, permission);
      setCanPost(currentUser.role === UserRole.ORG_ADMIN || permission === 'all_members');
    } catch (e: any) {
      showToast(e?.message || 'Could not update settings', 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-saffron-600" size={24} /></div>;
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <p className="text-sm text-[#8A6A57]">Organization not found.</p>
        <button onClick={onBack} className="mt-3 text-sm font-bold text-saffron-600">Back to VChat</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-[#241C17] truncate">{profile.name}</h1>
          {isOwnOrg ? (
            <p className="text-xs font-bold text-saffron-600">My Vihar Group Chat</p>
          ) : (profile.town || profile.city) && (
            <p className="text-xs text-[#8A6A57]">{[profile.town, profile.city].filter(Boolean).join(', ')}</p>
          )}
        </div>
        {isOwnOrg && currentUser.role === UserRole.ORG_ADMIN ? (
          <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
            <Settings size={16} className="text-[#241C17]" />
          </button>
        ) : !isOwnOrg && currentUser.role === UserRole.ORG_ADMIN ? (
          <button
            onClick={() => (isFollowing ? setConfirmUnfollow(true) : handleFollow())}
            disabled={followBusy}
            className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-colors ${
              isFollowing ? 'bg-gray-100 text-gray-500' : 'bg-saffron-600 text-white hover:bg-saffron-700'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : (
          !isOwnOrg && isFollowing && (
            <span className="shrink-0 text-xs font-bold px-4 py-2 rounded-full bg-gray-100 text-gray-500">Following</span>
          )
        )}
      </div>

      {/* Chat first — the primary reason to be on this screen — then Recent
          Vihars below it, not competing for the initial scroll position. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col h-[65dvh]">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] mb-3 shrink-0">VChat</h2>

        {/* Only this box scrolls as messages grow — not the whole page.
            overscroll-contain stops the scroll gesture from "chaining" up to
            the page once you hit the top/bottom of this list, which is what
            made the whole page drag along with it. */}
        <div ref={messagesContainerRef} className="chat-wallpaper flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl px-3 py-3 ring-1 ring-inset ring-[#EADBC8]">
          {posts.length === 0 ? (
            <p className="text-sm text-[#8A6A57] py-4">No messages yet.</p>
          ) : (
            <>
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-center text-xs font-bold text-saffron-600 py-2 shrink-0"
                >
                  {loadingMore ? 'Loading...' : 'Load earlier'}
                </button>
              )}
              <div className="space-y-3">
                {posts.map(post => (
                  <ChannelMessageRow
                    key={post.id}
                    post={post}
                    isMine={post.author_user_id === currentUser.id}
                    canReply={canPost}
                    highlighted={highlightId === post.id}
                    formatTime={formatRelativeTime}
                    onReply={handleReply}
                    onOpenActions={setActionPost}
                    onOpenProfile={setProfilePost}
                    onJumpTo={jumpTo}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {canPost && (
          <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
            {replyTo && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-saffron-500 bg-[#F7F4F0] px-3 py-2">
                <Reply size={15} className="mt-0.5 shrink-0 text-saffron-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-extrabold text-saffron-700">
                    Replying to {replyTo.author_user_id === currentUser.id ? 'yourself' : replyTo.author_name}
                  </p>
                  <p className="truncate text-xs text-[#6B5B50]">{replyTo.message}</p>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-black/5 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSend();
                  else if (e.key === 'Escape' && replyTo) { e.stopPropagation(); setReplyTo(null); }
                }}
                maxLength={4000}
                placeholder={replyTo ? 'Write your reply...' : 'Write a message...'}
                className="flex-1 px-3.5 py-2.5 rounded-full bg-[#F9FAFB] border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                className="w-10 h-10 rounded-full bg-saffron-600 hover:bg-saffron-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {recentVihars.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] mb-3">Recent Vihars</h2>
          <div className="space-y-2.5">
            {recentVihars.map((v, i) => (
              <div key={i} className="text-sm">
                <p className="font-bold text-[#241C17]">{v.vihar_from} → {v.vihar_to}</p>
                <p className="text-xs text-[#8A6A57]">
                  {new Date(v.vihar_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' · '}{v.vihar_type === 'morning' ? 'Morning' : 'Evening'}
                  {' · '}{v.sevak_count} {v.sevak_count === 1 ? 'Sevak' : 'Sevaks'}
                  {v.distance_km != null && ` · ${v.distance_km} km`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={confirmUnfollow} onClose={() => setConfirmUnfollow(false)} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="text-base font-bold text-[#241C17]">Unfollow {profile.name}?</h3>
          <p className="text-sm text-[#8A6A57] mt-1.5">Your organization will no longer receive their VChat updates.</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setConfirmUnfollow(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-bold text-[#241C17]">Cancel</button>
            <button onClick={handleUnfollow} disabled={followBusy} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white disabled:opacity-50">Unfollow</button>
          </div>
        </div>
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} maxWidth="max-w-sm">
        <div className="p-6">
          <h3 className="text-base font-bold text-[#241C17]">VChat Settings</h3>
          <p className="text-sm text-[#8A6A57] mt-1">Who can send messages?</p>
          <div className="mt-4 space-y-2">
            {(['captain_only', 'all_members'] as ChannelPostingPermission[]).map(option => (
              <label key={option} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="posting_permission"
                  checked={postingPermission === option}
                  onChange={() => handlePermissionChange(option)}
                  className="accent-saffron-600"
                />
                <span className="text-sm font-semibold text-[#241C17]">
                  {option === 'captain_only' ? 'Captain / Organization Head only' : 'Captain + Sevaks'}
                </span>
              </label>
            ))}
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full mt-5 py-2.5 rounded-xl bg-saffron-600 text-sm font-bold text-white">Done</button>
        </div>
      </Modal>

      {/* Long-press / right-click menu for a message */}
      <BottomSheet open={!!actionPost} onClose={() => setActionPost(null)}>
        {actionPost && (
          <div className="px-4 pb-4 pt-3">
            <div className="mb-3 rounded-xl border-l-4 border-saffron-500 bg-[#F7F4F0] px-3 py-2">
              <p className="truncate text-[11px] font-extrabold text-saffron-700">
                {actionPost.author_user_id === currentUser.id ? 'You' : actionPost.author_name}
              </p>
              <p
                className="text-xs text-[#6B5B50] whitespace-pre-wrap"
                style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {actionPost.message}
              </p>
            </div>
            <div className="space-y-1">
              {canPost && (
                <button onClick={() => handleReply(actionPost)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-sm font-bold text-[#241C17] transition-colors active:scale-[0.98] hover:bg-gray-50">
                  <Reply size={18} className="text-saffron-600" /> Reply
                </button>
              )}
              <button onClick={() => copyMessage(actionPost)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-sm font-bold text-[#241C17] transition-colors active:scale-[0.98] hover:bg-gray-50">
                <Copy size={18} className="text-[#8A6A57]" /> Copy
              </button>
              {actionPost.author_user_id === currentUser.id && (
                <button
                  onClick={() => { const id = actionPost.id; setActionPost(null); handleDelete(id); }}
                  className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-sm font-bold text-red-600 transition-colors active:scale-[0.98] hover:bg-red-50"
                >
                  <Trash2 size={18} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Mini sender profile — "who sent this", nothing more. Every sender in
          this list belongs to this same organization (posting is scoped to
          organizationId), so org name/city come straight from `profile`
          already loaded above rather than a further query. */}
      <Modal open={!!profilePost} onClose={() => setProfilePost(null)} maxWidth="max-w-xs">
        {profilePost && (
          <div className="p-6 flex flex-col items-center text-center">
            <Avatar name={profilePost.author_name} url={profilePost.author_avatar_url} size={64} />
            <p className="mt-3 text-base font-extrabold text-[#241C17]">{profilePost.author_name}</p>
            <p className="text-xs font-bold text-saffron-600 mt-0.5">{roleLabel(profilePost.author_role)}</p>
            <div className="w-full mt-4 pt-4 border-t border-gray-100 space-y-1">
              <p className="text-sm font-semibold text-[#241C17]">{profile.name}</p>
              {(profile.town || profile.city) && (
                <p className="text-xs text-[#8A6A57]">{[profile.town, profile.city].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <button onClick={() => setProfilePost(null)} className="w-full mt-5 py-2.5 rounded-xl bg-gray-100 text-sm font-bold text-[#241C17]">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChannelOrganization;
