import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UpcomingVihar, UserProfile } from '../types';
import { ArrowRight } from 'lucide-react';
import ViharAlertCard from './ViharAlertCard';

interface UpcomingViharCardProps {
  currentUser: UserProfile;
  onViewAll?: () => void;
}

// Dashboard teaser: shows only the single soonest upcoming Vihar.
// The full list (every alert, past and upcoming) lives on the Notifications page.
const UpcomingViharCard: React.FC<UpcomingViharCardProps> = ({ currentUser, onViewAll }) => {
  const [vihar, setVihar] = useState<UpcomingVihar | null>(null);
  const [contacts, setContacts] = useState<Record<string, { full_name: string; mobile: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [viharsRes, contactsMap] = await Promise.all([
        supabase
          .from('upcoming_vihars')
          .select('*')
          .eq('organization_id', currentUser.organization_id)
          .order('vihar_date', { ascending: true })
          .order('vihar_time', { ascending: true }),
        dataService.getOrgSevakContacts(currentUser.organization_id),
      ]);

      setContacts(contactsMap);

      const { data, error } = viharsRes;
      if (!error && data) {
        const now = new Date();
        const next = (data as UpcomingVihar[]).find(v => {
          const when = new Date(`${v.vihar_date}T${v.vihar_time || '00:00:00'}`);
          return when > now;
        });
        setVihar(next || null);
      }
      setLoading(false);
    };

    load();
  }, [currentUser.organization_id]);

  if (loading || !vihar) return null;

  return (
    <div className="space-y-2">
      <ViharAlertCard vihar={vihar} currentUser={currentUser} contacts={contacts} />
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-saffron-600 hover:text-saffron-700 py-2 transition-colors"
        >
          View all Vihar alerts <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
};

export default UpcomingViharCard;
