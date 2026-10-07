// Accounts that carry a public title + verified tick on their profile. Usernames are unique across the
// platform, so this is a plain lookup — it grants no permissions, it is only a label.
export interface AccountBadge {
  title: string;
}

const SPECIAL_ACCOUNTS: Record<string, AccountBadge> = {
  'vishwashah@vsevak.in': { title: 'Developer' },
  'aagamjain': { title: 'Team vSeva' },
  'alpeshshah@vsevak.in': { title: 'Team vSeva' },
  'namyamehta@vsevak.in': { title: 'Team vSeva' },
};

export function getAccountBadge(username?: string | null): AccountBadge | null {
  return (username && SPECIAL_ACCOUNTS[username.trim().toLowerCase()]) || null;
}
