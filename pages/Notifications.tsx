import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UpcomingVihar, UserProfile, UserNotification } from '../types';
import ViharAlertCard from '../components/ViharAlertCard';
import { Bell, MapPin, ChevronDown, ChevronLeft, Check, Users } from 'lucide-react';
import Skeleton from '../components/Skeleton';

interface NotificationsProps {
  currentUser: UserProfile;
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
const Notifications: React.FC<NotificationsProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<UpcomingVihar[]>([]);
  const [past, setPast] = useState<UpcomingVihar[]>([]);
  const [showPast, setShowPast] = useState(false);
  const [contacts, setContacts] = useState<Record<string, { full_name: string; mobile: string }>>({});
  const [general, setGeneral] = useState<UserNotification[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [viharsRes, contactsMap, notifRes] = await Promise.all([
          supabase
            .from('upcoming_vihars')
            .select('*')
            .eq('organization_id', currentUser.organization_id)
            .order('vihar_date', { ascending: true })
            .order('vihar_time', { ascending: true }),
          dataService.getOrgSevakContacts(currentUser.organization_id),
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

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
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser.organization_id, currentUser.id]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setGeneral(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
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
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const featured = upcoming[0];
  const restUpcoming = upcoming.slice(1);
  const { today, yesterday, earlier } = bucketByDay(general);
  const hasUnread = general.some(n => !n.is_read);

  const NotificationRow: React.FC<{ n: UserNotification }> = ({ n }) => (
    <div className={`bg-white rounded-[18px] p-4 flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${!n.is_read ? '' : 'opacity-80'}`}>
      <div className="shrink-0 w-[38px] h-[38px] rounded-xl flex items-center justify-center" style={{ background: '#FFF0E5' }}>
        <Bell size={17} style={{ color: '#DE6B38' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[13.5px] font-bold text-[#241C17]">{n.title}</p>
        <p className="mt-0.5 text-[12.5px] text-[#8A6A57] whitespace-pre-wrap">{n.message}</p>
        <p className="mt-1.5 text-[11px] font-semibold text-[#B7B7AF]">{new Date(n.created_at).toLocaleString()}</p>
      </div>
      {!n.is_read ? (
        <button
          onClick={() => markAsRead(n.id)}
          title="Mark as read"
          className="shrink-0 mt-0.5 p-1 rounded-full text-saffron-600 hover:bg-saffron-50 transition-colors"
        >
          <Check size={16} />
        </button>
      ) : (
        <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-transparent" />
      )}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
            <ChevronLeft size={16} className="text-[#241C17]" />
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17]">Notifications</h1>
        </div>
        {hasUnread && (
          <button onClick={markAllRead} className="text-[12.5px] font-bold text-saffron-600 hover:text-saffron-700">
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
      ) : (
        <>
          {/* Featured Upcoming Vihar — gradient hero, same pattern as the Dashboard Sankalp card */}
          {featured && (
            <div
              className="rounded-[22px] p-5 text-white space-y-3.5"
              style={{ background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)', boxShadow: '0 8px 20px -10px rgba(222,107,56,0.55)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/85">Upcoming Vihar</span>
                {relativeDaysAway(featured) >= 0 && (
                  <span className="text-[10.5px] font-extrabold bg-white/20 px-2.5 py-1 rounded-full">
                    {relativeDaysAway(featured) === 0 ? 'TODAY' : `IN ${relativeDaysAway(featured)} DAY${relativeDaysAway(featured) === 1 ? '' : 'S'}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="m-0 text-lg font-extrabold">{featured.from_location}</p>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                <p className="m-0 text-lg font-extrabold">{featured.to_location}</p>
              </div>
              <p className="m-0 text-[13px] font-semibold text-white/85">
                {new Date(`${featured.vihar_date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                {featured.vihar_time ? ` · ${featured.vihar_time.slice(0, 5)}` : ''}
              </p>
              {(featured.sadhu_count > 0 || featured.sadhvi_count > 0) && (
                <div className="flex items-center gap-2.5 bg-white/15 rounded-xl px-3.5 py-3">
                  <Users size={16} />
                  <p className="m-0 text-[12.5px] font-bold">
                    {featured.sadhu_count > 0 && `${featured.sadhu_count} Sadhu`}
                    {featured.sadhu_count > 0 && featured.sadhvi_count > 0 && ' · '}
                    {featured.sadhvi_count > 0 && `${featured.sadhvi_count} Sadhvi`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Remaining upcoming (if more than one alert is active) */}
          {restUpcoming.length > 0 && (
            <div className="space-y-3">
              {restUpcoming.map(v => (
                <ViharAlertCard key={v.id} vihar={v} currentUser={currentUser} contacts={contacts} />
              ))}
            </div>
          )}

          {!featured && (
            <div className="text-center py-8 bg-white rounded-[22px] border border-dashed border-gray-200 text-gray-400 text-sm">
              No upcoming Vihar alerts right now.
            </div>
          )}

          {/* Past Vihars — collapsed by default */}
          {past.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowPast(s => !s)}
                className="w-full flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-[#8A6A57] py-1"
              >
                <span>Past Alerts ({past.length})</span>
                <ChevronDown size={16} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
              </button>
              {showPast && (
                <div className="space-y-3">
                  {past.map(v => (
                    <ViharAlertCard key={v.id} vihar={v} currentUser={currentUser} contacts={contacts} isPast />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* General Notifications — grouped by day */}
          {general.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-[22px] border border-dashed border-gray-200 text-gray-400 text-sm">
              Nothing here yet.
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-[#8A6A57]">Today</p>
                  {today.map(n => <NotificationRow key={n.id} n={n} />)}
                </div>
              )}
              {yesterday.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-[#8A6A57]">Yesterday</p>
                  {yesterday.map(n => <NotificationRow key={n.id} n={n} />)}
                </div>
              )}
              {earlier.length > 0 && (
                <div className="space-y-2.5">
                  <p className="m-0 px-1 text-xs font-extrabold uppercase tracking-wide text-[#8A6A57]">Earlier</p>
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
