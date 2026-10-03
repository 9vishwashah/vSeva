import { supabase } from './supabase';
import { dataService } from './dataService';
import { BRAND } from '@brand';

// Each white-label site only admits its own accounts: an SSG site refuses a vSeva login and the
// vSeva site refuses an SSG login. Accounts live in one Supabase project, so this is where the
// separation is enforced for sign-in (the data itself is separated by organisations.brand).
//
// Exception: a platform owner / brand admin listed in the Netlify allow-lists (the same lists that
// protect /super-admin, checked server-side) may sign in anywhere their scope covers.
//
// Returns null when allowed, otherwise a message to show the user.
const BLOCKED = 'This account belongs to a different platform. Please sign in with the username and password given by your Captain.';

export async function brandAccessError(organizationId: string | null | undefined): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('org_brand', { p_org: organizationId });
    if (error) throw error;
    if (data === BRAND.id) return null;
  } catch (err) {
    // Can't tell which platform the account belongs to. Never lock existing vSeva users out
    // over a lookup failure; a branded site stays closed rather than risk admitting the wrong account.
    console.warn('Brand check failed:', err);
    if (BRAND.id === 'vseva') return null;
    return 'Could not verify your account right now. Please try again.';
  }

  // Different platform: only allow-listed admins whose scope covers this site get through.
  try {
    const scope = await dataService.getSuperAdminScope();
    if (scope.all || scope.brands.includes(BRAND.id)) return null;
  } catch {
    // not an admin
  }
  return BLOCKED;
}
