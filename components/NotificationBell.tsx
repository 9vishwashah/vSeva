
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Bell, Check, MapPin, X, Users, Clock } from 'lucide-react';
import { UserNotification } from '../types';
import { useToast } from '../context/ToastContext';

const NotificationBell: React.FC<{ userId?: string }> = ({ userId }) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const now = new Date();

      // Filter out EXPIRED upcoming alerts
      const validNotifications = (data || []).filter(n => {
        if (n.type === 'alert_upcoming' && n.payload?.date && n.payload?.time) {
          const alertDate = new Date(`${n.payload.date}T${n.payload.time}`);
          return alertDate > now; // Only show if future
        }
        return true; // Keep other notifications
      });

      setNotifications(validNotifications);

      // Calculate Badge Count
      // Rule: "1 mark will not go until that day time arrives"
      // Count = Standard Unread + Active Upcoming Alerts (regardless of read status)
      // Actually, if we want them to stay "new", we just count all active upcoming as +1?
      // Or maybe just sum up unread normal + all active upcoming?
      // Let's assume user wants 'badge' to persist.

      const count = validNotifications.reduce((acc, n) => {
        if (n.type === 'alert_upcoming') return acc + 1; // Always count active alerts
        return acc + (n.is_read ? 0 : 1);
      }, 0);

      setUnreadCount(count);

    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Re-calculate unread count (simplified)
      // If it triggers a refetch, that's fine, but let's do optimistic update logic if complex
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-saffron-600 transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 top-20 bottom-auto md:absolute md:inset-auto md:left-full md:bottom-[-10px] md:ml-6 w-auto md:w-96 max-h-[80vh] md:max-h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden z-[100] border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-200">

          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center sticky top-0 bg-gray-50 z-10">
            <div>
              <h3 className="font-semibold text-gray-700">Notifications</h3>
              <span className="text-xs text-gray-500">{unreadCount > 0 ? `${unreadCount} active` : 'All caught up'}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-gray-400">
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map(notif => {
                const isUpcoming = notif.type === 'alert_upcoming';
                const payload = notif.payload || {};

                return (
                  <div
                    key={notif.id}
                    className={`p-4 border-b last:border-b-0 transition-colors 
                       ${!notif.is_read ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
                       ${isUpcoming ? 'border-l-4 border-l-saffron-500 bg-orange-50/40' : ''}
                     `}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isUpcoming && <MapPin size={14} className="text-saffron-600" />}
                          <p className={`font-medium text-sm ${isUpcoming ? 'text-saffron-800' : 'text-gray-800'}`}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{notif.message}</p>

                        {isUpcoming && (
                          <div className="mt-2 text-xs bg-white/60 p-2 rounded border border-orange-200/50 grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-saffron-600" />
                              <span className="font-semibold text-gray-700">{payload.time ? payload.time.slice(0, 5) : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize px-1.5 py-0.5 bg-orange-100 rounded text-[10px] text-orange-700 font-bold">{payload.type}</span>
                            </div>
                            {(payload.sadhu_count > 0 || payload.sadhvi_count > 0) && (
                              <div className="col-span-2 border-t border-orange-100 pt-1 mt-1 flex gap-3">
                                {payload.sadhu_count > 0 && (
                                  <div className="flex items-center gap-1 text-gray-600" title="Sadhu Bhagwan">
                                    <Users size={12} className="text-saffron-500" />
                                    <span className="font-bold">{payload.sadhu_count}</span>
                                  </div>
                                )}
                                {payload.sadhvi_count > 0 && (
                                  <div className="flex items-center gap-1 text-gray-600" title="Sadhviji Bhagwan">
                                    <Users size={12} className="text-pink-500" />
                                    <span className="font-bold">{payload.sadhvi_count}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-gray-400 mt-2">
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
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100/50 transition-colors"
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
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
