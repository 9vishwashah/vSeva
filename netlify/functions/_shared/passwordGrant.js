// Server code that changes a Sevak's password (only update-user-phone today) must first record
// a short-lived "grant" for that user. The database trigger on auth.users refuses password changes
// for Sevak accounts that have no grant, which is what stops a Sevak changing their own password
// from the browser (see scripts/sevak_password_guard_*.sql).
//
// Tolerant of the guard not being installed yet: if the grants table doesn't exist the call is a
// no-op, so deploying this code before the SQL (or rolling the SQL back) never breaks anything.
export async function grantPasswordChange(supabaseAdmin, userId) {
    const { error } = await supabaseAdmin
        .from('password_change_grants')
        .upsert({ user_id: userId, expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString() });
    if (!error) return;
    const missingTable = error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '');
    if (!missingTable) throw error;
}
