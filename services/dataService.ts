import { MOCK_ENTRIES, MOCK_ROUTES, MOCK_USERS } from '../constants';
import { UserProfile, ViharEntry, StatSummary } from '../types';

// In a real app, these functions would call Supabase
// const { data } = await supabase.from('vihar_entries').select('*')...

export const dataService = {
  getRoutes: () => MOCK_ROUTES,

  getSevaks: (orgId: string) => 
    MOCK_USERS.filter(u => u.organization_id === orgId && u.role === 'SEVAK'),

  getEntriesForOrg: (orgId: string) => 
    MOCK_ENTRIES.filter(e => e.organization_id === orgId),

  getEntriesForSevak: (sevakName: string) => 
    MOCK_ENTRIES.filter(e => e.sevaks.includes(sevakName)),

  calculateStats: (entries: ViharEntry[]): StatSummary => {
    let totalKm = 0;
    let totalSadhu = 0;
    let totalSadhvi = 0;
    let longestVihar = 0;

    entries.forEach(e => {
      const km = Number(e.distance_km || 0);
      totalKm += km;
      totalSadhu += e.no_sadhubhagwan || 0;
      totalSadhvi += e.no_sadhvijibhagwan || 0;
      if (km > longestVihar) longestVihar = km;
    });

    // Simple streak calculation (mock logic)
    // Sort by date desc
    const sorted = [...entries].sort((a,b) => new Date(b.vihar_date).getTime() - new Date(a.vihar_date).getTime());
    let streak = 0;
    if(sorted.length > 0) {
        streak = 1; 
        // Logic to check consecutive days would go here
    }

    return {
      totalVihars: entries.length,
      totalKm: parseFloat(totalKm.toFixed(2)),
      totalSadhu,
      totalSadhvi,
      longestVihar,
      streak
    };
  }
};