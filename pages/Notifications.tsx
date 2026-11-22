import { updateNotifications } from '../services/notificationsStore';
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UpcomingVihar, UserProfile, UserNotification } from '../types';
import ViharAlertCard from '../components/ViharAlertCard';
import { Bell, MapPin, ChevronDown, ChevronRight, Check, Users, KeyRound } from 'lucide-react';
import { getNotificationTarget } from '../services/notificationRouting';
import ResetSevakPasswordModal from '../components/ResetSevakPasswordModal';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import StatusScreen from '../components/StatusScreen';

interface NotificationsProps {
  currentUser: UserProfile;
  // Set when arriving via a shared WhatsApp deep link (?vihar=<id>) — scrolls
  // to and highlights that specific Vihar's card so "I'm Interested" is one tap away.
  highlightViharId?: string | null;
  // Tapping a card: go to the screen it is about (VChat for a chat message, Pending Approvals for a submission…).
  onOpenNotification?: (n: UserNotification) => void;
}

const relativeDaysAway = (v: UpcomingVihar): number => {
  const when = new Date(`${v.vihar_date}T${v.vihar_time || '00:00:00'}`);
  const now = new Date();
  return Math.ceil((when.getTime() - now.getTime()) / 86400000);
};

const bucketByDay = (rows: UserNotification[]) => {
  const today: UserNotification[] = [];
  const yesterday: UserNotification[] = [];
  const earlier: UserNotification[] = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  rows.forEach(n => {
    const d = new Date(n.created_at);
    const diffDays = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
    if (diffDays <= 0) today.push(n);
    else if (diffDays === 1) yesterday.push(n);
    else earlier.push(n);
  });
  return { today, yesterday, earlier };
};

// Every Vihar alert (upcoming and past) plus general notifications, in one place.
// Nothing here ever disappears when a new alert is created — each is its own card.
const Notifications: React.FC<NotificationsProps> = ({ currentUser, highlightViharId, onOpenNotification }) => {
  const { showToast } = useToast();
  const [resetTarget, setResetTarget] = useState<UserNotification | null>(null);
  const [resetDone, setResetDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingVihar[]>([]);
  const [past, setPast] = useState<UpcomingVihar[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [contacts, setContacts] = useState<Record<string, { full_name: string; mobile: string }>>({});
  const [general, setGeneral] = useState<UserNotification[]>([]);

  const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [viharsRes, contactsMap, notifRes] = await Promise.all([
          dataService.getUpcomingVihars(currentUser.organization_id).then(data => ({ data, error: null }), error => ({ data: null, error })),
          dataService.getOrgSevakContacts(currentUser.organization_id),
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (viharsRes.error) throw viharsRes.error;

        setContacts(contactsMap);

        const now = new Date();
        const all = (viharsRes.data || []) as UpcomingVihar[];
        const upcomingList: UpcomingVihar[] = [];
        const pastList: UpcomingVihar[] = [];
        all.forEach(v => {
          const when = new Date(`${v.vihar_date}T${v.vihar_time || '00:00:00'}`);
          (when > now ? upcomingList : pastList).push(v);
        });
        pastList.reverse(); // most recently-past first
        setUpcoming(upcomingList);
        setPast(pastList);

        if (!notifRes.error) {
          // The rich Vihar cards above already cover 'alert_upcoming' — avoid showing it twice.
          setGeneral(((notifRes.data || []) as UserNotification[]).filter(n => n.type !== 'alert_upcoming'));
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
        setLoadError(navigator.onLine ? 'error' : 'offline');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    load();
  }, [currentUser.organization_id, currentUser.id]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setGeneral(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
      updateNotifications(list => list.map(n => (n.id === id ? { ...n, is_read: true } : n))); // the bell's badge too
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllRead = async () => {
    const unreadIds = general.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      setGeneral(prev => prev.map(n => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
      updateNotifications(list => list.map(n => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const featured = upcoming[0];
  // Every upcoming Vihar gets its own actionable card (Interested + Share),
  // including the soonest one — the gradient banner above is decorative only,
  // so a deep-linked card is always reachable regardless of which Vihar it is.
  const restUpcoming = upcoming;
  const { today, yesterday, earlier } = bucketByDay(general);
  const hasUnread = general.some(n => !n.is_read);

  // Arrived via a shared WhatsApp link (?vihar=<id>) — scroll to that card and
  // expand the past section too in case it's already happened.
  useEffect(() => {
    if (!highlightViharId || loading) return;
    if (past.some(v => v.id === highlightViharId)) setShowPast(true);
    const t = setTimeout(() => {
      document.getElementById(`vihar-${highlightViharId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(t);
  }, [highlightViharId, loading, past]);

  // A Sevak asked for a password reset (Forgot password): the Captain sets the Sevak's new mobile number
  // (their password) in a small dialog.
  const NotificationRow: React.FC<{ n: UserNotification }> = ({ n }) => {
    // Where this card leads (null = it is just information, so it isn't clickable)
    const target = onOpenNotification ? getNotificationTarget(n, currentUser.role) : null;
    const open = () => {
      if (!target || !onOpenNotification) return;
      if (!n.is_read) markAsRead(n.id);
      onOpenNotification(n);
    };
    return (
    <div
      role={target ? 'button' : undefined}
      tabIndex={target ? 0 : undefined}
      onClick={target ? open : undefined}
      onKeyDown={target ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }) : undefined}
      className={`bg-surface rounded-[18px] p-4 flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${!n.is_read ? '' : 'opacity-80'} ${target ? 'cursor-pointer transition-transform active:scale-[0.99] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand' : ''}`}
    >
      <div className="shrink-0 w-[38px] h-[38px] rounded-xl flex items-center justify-center" style={{ background: '#FFF0E5' }}>
        <Bell size={17} style={{ color: '#DE6B38' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13.5px] font-bold text-ink">{n.title}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-2 whitespace-pre-wrap">{n.message}</p>
        {n.type === 'password_reset' && n.payload?.sevak_id && (
          resetDone.has(n.id) ? (
            <p className="mt-2 text-[12px] font-bold text-ok">Password reset — new number set</p>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setResetTarget(n); }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-ink hover:bg-brand-600"
            >
              <KeyRound size={13} />
              Reset password
            </button>
          )
        )}
        {target && <p className="mt-1.5 text-[12px] font-bold text-brand-700">{target.label} →</p>}
        <p className="mt-1.5 text-[11px] font-semibold text-ink-3">{new Date(n.created_at).toLocaleString()}</p>
      </div>
      {!n.is_read ? (
        <button
          onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
          title="Mark as read"
          className="shrink-0 mt-0.5 p-1 rounded-full text-brand-700 hover:bg-brand-50 transition-colors"
        >
          <Check size={16} />
        </button>
      ) : target ? (
        <ChevronRight size={16} className="shrink-0 mt-1 text-ink-3" />
      ) : (
        <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-transparent" />
      )}
    </div>
    );
  };

  const resetModal = (
    <ResetSevakPasswordModal
      open={!!resetTarget}
      sevakId={resetTarget?.payload?.sevak_id ?? null}
      sevakName={resetTarget?.payload?.sevak_name || 'this Sevak'}
      onClose={() => setResetTarget(null)}
      onDone={() => {
        if (resetTarget) {
          setResetDone(prev => new Set(prev).add(resetTarget.id));
          markAsRead(resetTarget.id);
        }
        showToast('Password reset. Please tell the Sevak to sign in with the new number.', 'success');
        setResetTarget(null);
      }}
    />
  );

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {resetModal}
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink">Notifications</h1>
        </div>
        {hasUnread && (
          <button onClick={markAllRead} className="text-[12.5px] font-bold text-brand-700 hover:text-brand-700">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          <Skeleton className="h-[160px] w-full rounded-[22px]" />
          <div className="space-y-2.5">
            <Skeleton className="h-[70px] w-full rounded-[18px]" />
            <Skeleton className="h-[70px] w-full rounded-[18px]" />
            <Skeleton className="h-[70px] w-full rounded-[18px]" />
          </div>
        </div>
      ) : loadError ? (
        <StatusScreen variant={loadError} onRetry={load} />
      ) : (
        <>
          {/* Featured Upcoming Vihar — gradient hero, same pattern as the Dashboard Sankalp card */}
          {featured && (
            <div
              className="rounded-tile p-5 text-ink space-y-3.5 bg-brand"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink/75">Upcoming Vihar</span>
                {relativeDaysAway(featured) >= 0 && (
                  <span className="text-[12px] font-semibold bg-ink/10 px-2.5 h-6 inline-flex items-center rounded-full">
                    {relativeDaysAway(featured) === 0 ? 'TODAY' : `IN ${relativeDaysAway(featured)} DAY${relativeDaysAway(featured) === 1 ? '' : 'S'}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="display m-0 text-[1.5rem] font-extrabold">{featured.from_location}</p>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(29,29,27,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                <p className="display m-0 text-[1.5rem] font-extrabold">{featured.to_location}</p>
              </div>
              <p className="m-0 text-[14px] font-medium text-ink/75">
                {new Date(`${featured.vihar_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                {featured.vihar_time ? ` · ${featured.vihar_time.slice(0, 5)}` : ''}
              </p>
              {(featured.sadhu_count > 0 || featured.sadhvi_count > 0) && (
                <div className="flex items-center gap-2.5 bg-ink/10 rounded-2xl px-3.5 py-3">
                  <Users size={16} />
                  <p className="m-0 text-[14px] font-semibold">
                    {featured.sadhu_count > 0 && `${featured.sadhu_count} Sadhu`}
                    {featured.sadhu_count > 0 && featured.sadhvi_count > 0 && ' · '}
                    {featured.sadhvi_count > 0 && `${featured.sadhvi_count} Sadhvi`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Every upcoming Vihar as an actionable card */}
          {restUpcoming.length > 0 && (
            <div className="space-y-3">
              {restUpcoming.map(v => (
                <ViharAlertCard key={v.id} vihar={v} currentUser={currentUser} contacts={contacts} highlighted={v.id === highlightViharId} />
              ))}
            </div>
          )}

          {!featured && (
            <div className="text-center py-8 bg-surface rounded-[22px] border border-dashed border-line text-ink-3 text-sm">
              No upcoming Vihar alerts right now.
            </div>
          )}

          {/* Past Vihars — collapsed by default */}
          {past.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowPast(s => !s)}
                className="w-full flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-ink-2 py-1"
              >
                <span>Past Alerts ({past.length})</span>
                <ChevronDown size={16} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
              </button>
              {showPast && (
                <div className="space-y-3">
                  {past.map(v => (
                    <ViharAlertCard key={v.id} vihar={v} currentUser={currentUser} contacts={contacts} isPast highlighted={v.id === highlightViharId} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* General Notifications — grouped by day */}
          {general.length === 0 ? (
            <div className="text-center py-8 bg-surface rounded-[22px] border border-dashed border-line text-ink-3 text-sm">
              Nothing here yet.
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-ink-2">Today</p>
                  {today.map(n => <NotificationRow key={n.id} n={n} />)}
                </div>
              )}
              {yesterday.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-ink-2">Yesterday</p>
                  {yesterday.map(n => <NotificationRow key={n.id} n={n} />)}
                </div>
              )}
              {earlier.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-ink-2">Earlier</p>
                  {earlier.map(n => <NotificationRow key={n.id} n={n} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
