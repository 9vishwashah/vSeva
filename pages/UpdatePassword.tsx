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

    const card = 'max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-5';
    const input = 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none';

    return (
        <div className="min-h-screen bg-saffron-50 flex items-center justify-center p-4">
            <div className={card}>
                <div className="flex items-center gap-3">
                    <img src={BRAND.logo} alt={BRAND.name} className="h-10 w-10 object-contain" />
                    <h1 className="text-2xl font-serif font-bold text-gray-800">Set a new password</h1>
                </div>

                {stage === 'checking' && (
                    <div className="flex items-center gap-3 text-gray-600"><Loader2 className="animate-spin" size={20} /> Checking your reset link…</div>
                )}

                {stage === 'invalid' && (
                    <div className="space-y-4">
                        <p className="text-gray-700">This reset link is invalid or has expired. Reset links work once and for a short time.</p>
                        <a href="/login" className="inline-block px-5 py-2.5 rounded-lg bg-saffron-600 text-white font-medium">Back to login</a>
                        <p className="text-sm text-gray-500">On the login page choose “Forgot password” to get a new link.</p>
                    </div>
                )}

                {stage === 'notCaptain' && (
                    <div className="space-y-4">
                        <p className="text-gray-700">Password reset by email is only for Captain accounts. If you are a Sevak, ask your Captain to reset your password.</p>
                        <a href="/login" className="inline-block px-5 py-2.5 rounded-lg bg-saffron-600 text-white font-medium">Back to login</a>
                    </div>
                )}

                {stage === 'form' && (
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="up-new">New password</label>
                            <input id="up-new" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={input} value={next} onChange={e => setNext(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="up-confirm">Confirm new password</label>
                            <input id="up-confirm" type="password" autoComplete="new-password" required className={input} value={confirm} onChange={e => setConfirm(e.target.value)} />
                        </div>
                        {error && <p role="alert" className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">{error}</p>}
                        <button type="submit" disabled={busy} className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium flex justify-center items-center disabled:opacity-60">
                            {busy ? <Loader2 className="animate-spin" size={20} /> : 'Save new password'}
                        </button>
                    </form>
                )}

                {stage === 'done' && (
                    <div className="space-y-4">
                        <p className="text-gray-700">Your password has been changed. Please sign in with the new password.</p>
                        <a href="/login" className="inline-block px-5 py-2.5 rounded-lg bg-saffron-600 text-white font-medium">Go to login</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpdatePassword;
