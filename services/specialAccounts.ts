import { BRAND } from '@brand';

// Accounts that carry a public title + verified tick on their profile. Which accounts, and what title, is part
// of each brand's settings (brands/<id>/meta.ts -> accountBadges), so one brand's names never ship in another's app.
// Usernames are unique, so this is a plain lookup — it grants no permissions, it is only a label.
export interface AccountBadge {
  title: string;
}

export function getAccountBadge(username?: string | null): AccountBadge | null {
  const title = username ? BRAND.accountBadges[username.trim().toLowerCase()] : undefined;
  return title ? { title } : null;
}
