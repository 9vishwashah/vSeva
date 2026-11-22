import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserRole } from '../types';
import { BRAND } from '@brand';
import { MIN_PASSWORD_LENGTH } from '../components/ChangePasswordCard';

// Landing page of the "reset your password" email sent from Forgot Password (Captains only —
// Sevaks ask their Captain, who resets it for them). supabase-js turns the link into a
// temporary session on load; this page then lets that session set a new password.
type Stage = 'checking' | 'form' | 'invalid' | 'notCaptain' | 'done';

const UpdatePassword: React.FC = () => {
    const [stage, setStage] = useState<Stage>('checking');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let settled = false;

        const accept = async (userId: string) => {
            if (settled || cancelled) return;
            settled = true;
            const profile = await dataService.getProfile(userId);
            if (cancelled) return;
            if (profile && profile.role === UserRole.ORG_ADMIN) {
                setStage('form');
            } else {
                await supabase.auth.signOut();
                setStage('notCaptain');
            }
        };

        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) accept(session.user.id);
        });
        supabase.auth.getSession().then(({ data }) => { if (data.session?.user) accept(data.session.user.id); });
        // No session after a few seconds: the link is expired or was already used.
        const timer = window.setTimeout(() => { if (!settled && !cancelled) { settled = true; setStage('invalid'); } }, 5000);

        return () => { cancelled = true; sub.subscription.unsubscribe(); window.clearTimeout(timer); };
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (next.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        if (next !== confirm) return setError('The two passwords do not match.');
        setBusy(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: next });
            if (updateError) throw updateError;
            await supabase.auth.signOut(); // sign in fresh with the new password
            setStage('done');
        } catch (err: any) {
            setError(err?.message || 'Could not update the password. The link may have expired.');
        } finally {
            setBusy(false);
        }
    };

    const card = 'max-w-md w-full bg-surface rounded-[32px] ring-1 ring-inset ring-line/80 shadow-[0_24px_64px_-28px_rgba(29,29,27,0.25)] p-6 sm:p-8 space-y-5';
    const input = 'h-12 w-full rounded-field bg-white text-[16px] text-ink placeholder:text-ink-3/70 ring-1 ring-inset ring-line outline-none transition focus:ring-2 focus:ring-ink px-4';

    return (
        <div className="min-h-screen bg-canvas font-sans text-ink flex items-center justify-center p-4">
            <div className={card}>
                <div className="flex items-center gap-3">
                    <img src={BRAND.logo} alt={BRAND.name} className="h-10 w-10 object-contain" />
                    <h1 className="display text-[1.9rem] font-extrabold text-ink">Set a new password</h1>
                </div>

                {stage === 'checking' && (
                    <div className="flex items-center gap-3 text-ink-2"><Loader2 className="animate-spin" size={20} /> Checking your reset link…</div>
                )}

                {stage === 'invalid' && (
                    <div className="space-y-4">
                        <p className="text-[15px] text-ink-2">This reset link is invalid or has expired. Reset links work once and for a short time.</p>
                        <a href="/login" className="inline-flex items-center justify-center px-6 h-12 rounded-full bg-brand text-ink font-semibold">Back to login</a>
                        <p className="text-sm text-ink-3">On the login page choose “Forgot password” to get a new link.</p>
                    </div>
                )}

                {stage === 'notCaptain' && (
                    <div className="space-y-4">
                        <p className="text-[15px] text-ink-2">Password reset by email is only for Captain accounts. If you are a Sevak, ask your Captain to reset your password.</p>
                        <a href="/login" className="inline-flex items-center justify-center px-6 h-12 rounded-full bg-brand text-ink font-semibold">Back to login</a>
                    </div>
                )}

                {stage === 'form' && (
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-ink-2" htmlFor="up-new">New password</label>
                            <input id="up-new" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={input} value={next} onChange={e => setNext(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-ink-2" htmlFor="up-confirm">Confirm new password</label>
                            <input id="up-confirm" type="password" autoComplete="new-password" required className={input} value={confirm} onChange={e => setConfirm(e.target.value)} />
                        </div>
                        {error && <p role="alert" className="px-4 py-3 bg-err-soft text-err text-sm font-medium rounded-2xl">{error}</p>}
                        <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-[16px] font-semibold text-ink transition hover:bg-brand-600 active:translate-y-px disabled:opacity-60">
                            {busy ? <Loader2 className="animate-spin" size={20} /> : 'Save new password'}
                        </button>
                    </form>
                )}

                {stage === 'done' && (
                    <div className="space-y-4">
                        <p className="text-[15px] text-ink-2">Your password has been changed. Please sign in with the new password.</p>
                        <a href="/login" className="inline-flex items-center justify-center px-6 h-12 rounded-full bg-brand text-ink font-semibold">Go to login</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpdatePassword;
