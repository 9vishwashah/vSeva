import { UserRole } from '../types';

// Where tapping a notification should take the user. One rule-set shared by the Notifications page, the bell
// dropdown, and the native push-tap handler in App.tsx, so a card, a bell item and a lock-screen push all land
// on the same screen.
//
// Works off the notification's `payload.kind` (set by the database functions that create it) and, for older
// kinds, its `type`. Returns null when there is nowhere sensible to go (the card then isn't clickable).
export interface NotificationTarget {
  page: string;
  /** Short hint shown on the card, e.g. "Open VChat". */
  label: string;
  channelOrgId?: string;
  sosId?: string;
}

export function getNotificationTarget(
  n: { type?: string | null; payload?: any } | null | undefined,
  role?: UserRole,
): NotificationTarget | null {
  if (!n) return null;
  const p = n.payload || {};
  const isCaptain = role === UserRole.ORG_ADMIN;

  switch (p.kind) {
    case 'channel_post':
      if (p.organization_id) return { page: 'channel', label: 'Open VChat', channelOrgId: p.organization_id };
      break;
    case 'sos':
      // Not trusted on its own — the SOS screen re-fetches the alert and re-checks access by id.
      if (p.sos_id) return { page: 'sos-detail', label: 'View SOS', sosId: p.sos_id };
      break;
    case 'vihar_submission':
      if (isCaptain) return { page: 'pending-approvals', label: 'Review submission' };
      break;
    case 'vihar_recorded':
    case 'vihar_rejected':
      return isCaptain
        ? { page: 'view-entries', label: 'Open Vihar entries' }
        : { page: 'my-vihars', label: 'Open My Vihars' };
  }

  switch (n.type) {
    case 'inactivity':
      return { page: isCaptain ? 'dashboard' : 'analytics', label: 'Open Home' };
    case 'password_reset':
      if (isCaptain) return { page: 'add-sevak', label: 'Open Manage Sevaks' };
      break;
    case 'alert_upcoming':
      return { page: 'notifications', label: 'View alert' };
  }
  return null;
}
