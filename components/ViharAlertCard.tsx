import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { UpcomingVihar, UserProfile } from '../types';
import { MapPin, Clock, Users, Check, Phone, Share2, Accessibility, Car, ShieldCheck, UserRound } from 'lucide-react';

interface InterestedSevak {
  user_id: string;
  full_name: string;
  mobile: string;
}

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface ViharAlertCardProps {
  vihar: UpcomingVihar;
  currentUser: UserProfile;
  contacts: Record<string, { full_name: string; mobile: string }>;
  isPast?: boolean;
  highlighted?: boolean;
}

// Builds the WhatsApp share text: the Vihar's details plus a deep link that
// opens straight to this card on the Notifications page (see App.tsx's
// `?vihar=` handling) so whoever taps it can immediately tap "I'm Interested".
const buildShareMessage = (v: UpcomingVihar): string => {
  const dateStr = new Date(`${v.vihar_date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = v.vihar_time ? v.vihar_time.slice(0, 5) : '';
  const lines = [
    '🚶 *Upcoming Vihar Alert*',
    '',
    `📍 ${v.from_location} → ${v.to_location}`,
    `📅 ${dateStr}${timeStr ? ` at ${timeStr}` : ''}`,
    `🌗 ${v.vihar_type === 'morning' ? 'Morning' : 'Evening'} Vihar`,
  ];
  if (v.sadhu_count > 0 || v.sadhvi_count > 0) {
    const parts: string[] = [];
    if (v.sadhu_count > 0) parts.push(`${v.sadhu_count} Sadhu`);
    if (v.sadhvi_count > 0) parts.push(`${v.sadhvi_count} Sadhviji`);
    lines.push(`🙏 ${parts.join(' / ')}`);
  }
  if (v.sadhu_sadhvi_names) lines.push(`*Sadhu / Sadhvi:* ${v.sadhu_sadhvi_names}`);
  if (v.samuday) lines.push(`*Samuday:* ${v.samuday}`);
  if (v.wheelchair_required) lines.push(`*Wheelchair:* Required (${v.wheelchair_count || 1})`);
  if (v.car_seva_required) lines.push('*Car Seva:* Required');
  if (v.police_security) lines.push('*Police security:* Opted');
  if (v.emergency_contact_name || v.emergency_contact_phone) {
    lines.push(`*Emergency contact:* ${[v.emergency_contact_name, v.emergency_contact_phone].filter(Boolean).join(', ')}`);
  }
  lines.push('', "Tap below to open it and mark yourself as I'm Interested:");
  lines.push(`${window.location.origin}/?vihar=${v.id}`);
  return lines.join('\n');
};

// A single Vihar alert with its own independent "I'm Interested" state —
// used standalone (list on the Notifications page) or embedded (Dashboard teaser).
const ViharAlertCard: React.FC<ViharAlertCardProps> = ({ vihar, currentUser, contacts, isPast = false, highlighted = false }) => {
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const isInterested = interestedIds.includes(currentUser.id);

  const loadInterests = useCallback(async () => {
    const { data, error } = await supabase
      .from('vihar_interests')
      .select('user_id')
      .eq('vihar_id', vihar.id);

    if (!error && data) {
      setInterestedIds(data.map((row: any) => row.user_id));
    }
    setLoading(false);
  }, [vihar.id]);

  useEffect(() => {
    loadInterests();

    const channel = supabase
      .channel(`vihar_interests_${vihar.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vihar_interests', filter: `vihar_id=eq.${vihar.id}` },
        () => loadInterests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vihar.id, loadInterests]);

  const toggleInterest = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (isInterested) {
        await supabase.from('vihar_interests').delete().eq('vihar_id', vihar.id).eq('user_id', currentUser.id);
      } else {
        await supabase.from('vihar_interests').insert({ vihar_id: vihar.id, user_id: currentUser.id });
      }
      await loadInterests();
    } catch (err) {
      console.error('Failed to update interest', err);
    } finally {
      setToggling(false);
    }
  };

  const interested: InterestedSevak[] = interestedIds.map(id => ({
    user_id: id,
    full_name: contacts[id]?.full_name || 'Sevak',
    mobile: contacts[id]?.mobile || '',
  }));

  return (
    <div
      id={`vihar-${vihar.id}`}
      className={`rounded-2xl bg-white border shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 space-y-4 transition-shadow ${isPast ? 'border-gray-100' : 'border-saffron-100'} ${highlighted ? 'ring-2 ring-saffron-500 ring-offset-2' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 font-bold ${isPast ? 'text-gray-500' : 'text-saffron-700'}`}>
          <MapPin size={18} />
          <span>{isPast ? 'Past Vihar' : 'Upcoming Vihar'}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-saffron-100 text-saffron-700'}`}>
          {vihar.vihar_type}
        </span>
      </div>

      <div className="text-sm text-gray-700">
        <div className="font-semibold">{vihar.from_location} → {vihar.to_location}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {new Date(`${vihar.vihar_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {vihar.vihar_time ? `, ${vihar.vihar_time.slice(0, 5)}` : ''}
          </span>
          {(vihar.sadhu_count > 0 || vihar.sadhvi_count > 0) && (
            <span className="flex items-center gap-1">
              <Users size={14} />
              {vihar.sadhu_count > 0 && `${vihar.sadhu_count} Sadhu`}
              {vihar.sadhu_count > 0 && vihar.sadhvi_count > 0 && ' / '}
              {vihar.sadhvi_count > 0 && `${vihar.sadhvi_count} Sadhviji`}
            </span>
          )}
        </div>
      </div>

      <ViharAlertDetails vihar={vihar} />

      {!isPast && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleInterest}
            disabled={toggling || loading}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 ${
              isInterested ? 'bg-green-600 text-white' : 'bg-saffron-600 hover:bg-saffron-700 text-white'
            }`}
          >
            <Check size={18} />
            {isInterested ? "You're Interested" : "I'm Interested"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(buildShareMessage(vihar))}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Share to Vihar Group on WhatsApp"
            className="shrink-0 w-[46px] h-[46px] rounded-xl bg-[#e8fdf0] hover:bg-[#25D366] text-[#25D366] hover:text-white transition-colors flex items-center justify-center active:scale-95"
          >
            <WhatsAppIcon size={20} />
          </a>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
          {loading ? 'Loading…' : `${interested.length} Interested`}
        </div>
        {!loading && (
          interested.length === 0 ? (
            <div className="text-sm text-gray-400">No one has responded yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interested.map(i => {
                const isSelf = i.user_id === currentUser.id;
                const phoneHref = i.mobile ? `tel:+91${i.mobile}` : undefined;
                const waHref = i.mobile ? `https://wa.me/91${i.mobile}` : undefined;

                return (
                  <div
                    key={i.user_id}
                    className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border text-xs font-medium ${
                      isSelf ? 'bg-green-50 text-green-800 border-green-200' : 'bg-saffron-50 text-saffron-800 border-saffron-100'
                    }`}
                  >
                    <span className="truncate max-w-[9rem]">{i.full_name}</span>
                    {!isSelf && phoneHref && (
                      <a
                        href={phoneHref}
                        title={`Call ${i.full_name}`}
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 hover:bg-green-500 text-green-700 hover:text-white transition-colors"
                      >
                        <Phone size={11} strokeWidth={2.5} />
                      </a>
                    )}
                    {!isSelf && waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`WhatsApp ${i.full_name}`}
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e8fdf0] hover:bg-[#25D366] text-[#25D366] hover:text-white transition-colors"
                      >
                        <WhatsAppIcon size={11} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// The optional details the Captain added when announcing the Vihar (only what was filled in).
const ViharAlertDetails: React.FC<{ vihar: UpcomingVihar }> = ({ vihar: v }) => {
  const chips: { icon: React.ReactNode; label: string }[] = [];
  if (v.wheelchair_required) chips.push({ icon: <Accessibility size={13} />, label: `Wheelchair x${v.wheelchair_count || 1}` });
  if (v.car_seva_required) chips.push({ icon: <Car size={13} />, label: 'Car Seva' });
  if (v.police_security) chips.push({ icon: <ShieldCheck size={13} />, label: 'Police security' });
  const hasText = v.sadhu_sadhvi_names || v.samuday || v.emergency_contact_name || v.emergency_contact_phone;
  if (!hasText && chips.length === 0) return null;
  return (
    <div className="rounded-xl bg-[#FFF8F1] px-3.5 py-3 space-y-2 text-sm">
      {v.sadhu_sadhvi_names && (
        <p className="m-0 text-[#241C17]"><span className="text-[#8A6A57] font-semibold">Sadhu / Sadhvi: </span><span className="font-semibold whitespace-pre-wrap">{v.sadhu_sadhvi_names}</span></p>
      )}
      {v.samuday && (
        <p className="m-0 text-[#241C17]"><span className="text-[#8A6A57] font-semibold">Samuday: </span><span className="font-semibold">{v.samuday}</span></p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <span key={c.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-saffron-100 text-xs font-bold text-saffron-700">{c.icon}{c.label}</span>
          ))}
        </div>
      )}
      {(v.emergency_contact_name || v.emergency_contact_phone) && (
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 flex items-center gap-1.5 text-[#241C17] min-w-0">
            <UserRound size={14} className="text-[#8A6A57] shrink-0" />
            <span className="text-[#8A6A57] font-semibold shrink-0">Emergency:</span>
            <span className="font-semibold truncate">{[v.emergency_contact_name, v.emergency_contact_phone].filter(Boolean).join(', ')}</span>
          </p>
          {v.emergency_contact_phone && (
            <a href={`tel:+91${v.emergency_contact_phone}`} aria-label={`Call ${v.emergency_contact_name || 'emergency contact'}`} className="shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center active:scale-95">
              <Phone size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ViharAlertCard;
