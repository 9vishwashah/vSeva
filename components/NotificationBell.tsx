
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Bell, Check, MapPin, X, Users, Clock } from 'lucide-react';
import { UserNotification, UserRole } from '../types';
import { getNotificationTarget } from '../services/notificationRouting';
import { useToast } from '../context/ToastContext';
import { subscribeNotifications, updateNotifications } from '../services/notificationsStore';

const NotificationBell: React.FC<{ userId?: string; role?: UserRole; onViewAll?: () => void; onOpenNotification?: (n: UserNotification) => void }> = ({ userId, role, onViewAll, onOpenNotification }) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // One shared list for every bell on the page, fetched every 3 minutes while on screen (services/notificationsStore.ts)
  useEffect(() => {
    if (!userId) return;
    return subscribeNotifications(userId, s => {
      setNotifications(s.notifications);
      setUnreadCount(s.unreadCount);
    });
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      updateNotifications(list => list.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Same Escape-closes-on-Android-back wiring Modal.tsx uses — this dropdown
  // predates Modal and never picked up the `.app-modal-backdrop` marker
  // App.tsx's hardware back-button handler looks for, so Back fell straight
  // through to "nothing open, exit app" while this was open on Android.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Opening the dropdown clears the "reminder" badge so it doesn't keep
  // nagging after the user has actually looked at it. 'alert_upcoming' is
  // deliberately excluded — its badge is meant to persist until the Vihar's
  // own date/time passes (see the count logic above), not until it's viewed.
  useEffect(() => {
    if (!isOpen) return;
    const unreadIds = notifications.filter(n => !n.is_read && n.type !== 'alert_upcoming').map(n => n.id);
    if (unreadIds.length === 0) return;
    supabase.from('notifications').update({ is_read: true }).in('id', unreadIds).then(({ error }) => {
      if (error) {
        console.error('Failed to auto mark-as-read', error);
        return;
      }
      updateNotifications(list => list.map(n => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
    });
  }, [isOpen]);

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-inset ring-line transition-colors hover:bg-surface active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[20px] h-5 items-center justify-center px-1.5 text-[11px] font-bold leading-none text-ink bg-brand rounded-full ring-2 ring-canvas">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="app-modal-backdrop fixed inset-x-4 top-20 bottom-auto md:absolute md:inset-auto md:left-full md:bottom-[-10px] md:ml-6 w-auto md:w-96 max-h-[80vh] md:max-h-[600px] bg-surface rounded-xl shadow-2xl overflow-hidden z-[100] border border-line animate-in fade-in slide-in-from-bottom-2 duration-200">

          <div className="px-4 py-3 border-b bg-sunken/60 flex justify-between items-center sticky top-0 bg-sunken/60 z-10">
            <div>
              <h3 className="font-semibold text-ink">Notifications</h3>
              <span className="text-xs text-ink-2">{unreadCount > 0 ? `${unreadCount} active` : 'All caught up'}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-ink-3">
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-ink-3 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map(notif => {
                const isUpcoming = notif.type === 'alert_upcoming';
                const payload = notif.payload || {};
                // Where tapping this one goes (null = nowhere, so it isn't clickable)
                const target = onOpenNotification ? getNotificationTarget(notif, role) : null;
                const openTarget = () => {
                  if (!target || !onOpenNotification) return;
                  if (!notif.is_read && !isUpcoming) markAsRead(notif.id);
                  setIsOpen(false);
                  onOpenNotification(notif);
                };

                return (
                  <div
                    key={notif.id}
                    onClick={target ? openTarget : undefined}
                    className={`p-4 border-b last:border-b-0 transition-colors 
                       ${!notif.is_read ? 'bg-blue-50/50' : 'hover:bg-sunken/60'}
                       ${isUpcoming ? 'border-l-4 border-l-saffron-500 bg-orange-50/40' : ''}
                       ${target ? 'cursor-pointer active:bg-sunken' : ''}
                     `}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isUpcoming && <MapPin size={14} className="text-brand-700" />}
                          <p className={`font-medium text-sm ${isUpcoming ? 'text-brand-700' : 'text-ink'}`}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">{notif.message}</p>

                        {isUpcoming && (
                          <div className="mt-2 text-xs bg-white/60 p-2 rounded border border-orange-200/50 grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-brand-700" />
                              <span className="font-semibold text-ink">{payload.time ? payload.time.slice(0, 5) : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize px-1.5 py-0.5 bg-brand-100 rounded text-[11px] text-brand-700 font-bold">{payload.type}</span>
                            </div>
                            {(payload.sadhu_count > 0 || payload.sadhvi_count > 0) && (
                              <div className="col-span-2 border-t border-brand-100 pt-1 mt-1 flex gap-3">
                                {payload.sadhu_count > 0 && (
                                  <div className="flex items-center gap-1 text-ink-2" title="Sadhu Bhagwan">
                                    <Users size={12} className="text-brand-700" />
                                    <span className="font-bold">{payload.sadhu_count}</span>
                                  </div>
                                )}
                                {payload.sadhvi_count > 0 && (
                                  <div className="flex items-center gap-1 text-ink-2" title="Sadhviji Bhagwan">
                                    <Users size={12} className="text-pink-500" />
                                    <span className="font-bold">{payload.sadhvi_count}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {target && <p className="mt-1.5 text-[11px] font-bold text-brand-700">{target.label} →</p>}
                        <p className="text-[11px] text-ink-3 mt-2">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Only allow marking as read if NOT upcoming, or logic allows it. 
                           User said "one mark will not go". 
                           We can allow "read" but the Badge will still count it. 
                           Or simply hide the button for upcoming? 
                           Let's hide the checkmark for upcoming to emphasize it sticks. 
                           Or keep it to allow visual "dimming" but badge stays. 
                           User said "will not go", usually implies badge context.
                           I'll allow marking read visually, but badge logic (above) ignores it.
                       */}
                      {!notif.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          className="text-info hover:text-info p-1 rounded-full hover:bg-blue-100/50 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {onViewAll && (
            <button
              onClick={() => { setIsOpen(false); onViewAll(); }}
              className="w-full py-3 text-center text-sm font-bold text-brand-700 hover:bg-brand-50 border-t border-line sticky bottom-0 bg-surface transition-colors"
            >
              View All Notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
