import { supabase } from './supabase';
import type { UserNotification } from '../types';

// One shared copy of the signed-in person's notifications for every bell on the page (the phone header and
// the desktop sidebar both render one). Before, each bell fetched on its own every 30 seconds: two requests
// every 30 s for as long as the app was open. Now there is one fetch, every 3 minutes while the app is on
// screen, plus right away when the app comes back to the screen (at most every 15 s) and when a push
// notification arrives while it is open (PUSH_RECEIVED_EVENT, services/oneSignalService.ts).

export const PUSH_RECEIVED_EVENT = 'vseva:push-received';

export interface NotificationsState {
  notifications: UserNotification[];
  unreadCount: number;
}

const POLL_MS = 3 * 60_000;
const MIN_GAP_MS = 15_000;

const listeners = new Set<(s: NotificationsState) => void>();
let state: NotificationsState = { notifications: [], unreadCount: 0 };
let userId: string | null = null;
let lastRun = 0;
let inflight: Promise<void> | null = null;
let poll: number | undefined;

// Expired "upcoming Vihar" alerts are hidden. The badge counts unread notifications plus every upcoming Vihar
// alert that is still ahead (those stay marked until their date and time arrive).
function derive(list: UserNotification[]): NotificationsState {
  const now = new Date();
  const notifications = list.filter(n => {
    if (n.type === 'alert_upcoming' && n.payload?.date && n.payload?.time) {
      return new Date(`${n.payload.date}T${n.payload.time}`) > now;
    }
    return true;
  });
  const unreadCount = notifications.reduce((acc, n) => acc + (n.type === 'alert_upcoming' ? 1 : n.is_read ? 0 : 1), 0);
  return { notifications, unreadCount };
}

function emit(): void {
  listeners.forEach(fn => fn(state));
}

export function refreshNotifications(force = false): Promise<void> {
  if (!userId) return Promise.resolve();
  if (inflight) return inflight;
  if (!force && Date.now() - lastRun < MIN_GAP_MS) return Promise.resolve();
  lastRun = Date.now();
  const forUser = userId;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', forUser)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      if (forUser !== userId) return;
      state = derive((data || []) as UserNotification[]);
      emit();
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Local change (e.g. marked as read) without a refetch.
export function updateNotifications(change: (list: UserNotification[]) => UserNotification[]): void {
  state = derive(change(state.notifications));
  emit();
}

const onVisible = () => { if (document.visibilityState === 'visible') void refreshNotifications(); };
const onPush = () => { void refreshNotifications(true); };

function start(nextUserId: string): void {
  stop();
  userId = nextUserId;
  state = { notifications: [], unreadCount: 0 };
  lastRun = 0;
  void refreshNotifications(true);
  poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshNotifications(); }, POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener(PUSH_RECEIVED_EVENT, onPush);
}

function stop(): void {
  if (poll !== undefined) window.clearInterval(poll);
  poll = undefined;
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener(PUSH_RECEIVED_EVENT, onPush);
  userId = null;
}

// Each bell subscribes; the first one starts the shared fetching, the last one to leave stops it.
export function subscribeNotifications(forUserId: string, fn: (s: NotificationsState) => void): () => void {
  if (userId !== forUserId) start(forUserId);
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stop();
  };
}
