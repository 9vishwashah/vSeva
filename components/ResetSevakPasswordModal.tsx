import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { dataService } from '../services/dataService';

interface ResetSevakPasswordModalProps {
    open: boolean;
    sevakId: string | null;
    sevakName: string;
    onClose: () => void;
    // Called after the password (and contact number) were changed.
    onDone: (newMobile: string) => void;
}

// A Sevak's password IS their mobile number. So resetting it means the Captain enters the Sevak's
// new mobile number: it becomes both their contact number and their new password (done through the
// same Captain-only path as editing a Sevak's number).
const ResetSevakPasswordModal: React.FC<ResetSevakPasswordModalProps> = ({ open, sevakId, sevakName, onClose, onDone }) => {
    const [mobile, setMobile] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (open) { setMobile(''); setError(null); setBusy(false); } }, [open, sevakId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sevakId) return;
        if (!/^[0-9]{10}$/.test(mobile)) { setError('Enter a 10-digit mobile number.'); return; }
        setBusy(true);
        setError(null);
        try {
            await dataService.updateSevakDetails(sevakId, { mobile });
            onDone(mobile);
        } catch (err: any) {
            setError(err?.message || 'Could not reset the password.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={() => !busy && onClose()} maxWidth="max-w-sm" closeOnBackdrop={!busy}>
            <form onSubmit={submit} className="p-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-warn-soft text-warn">
                    <KeyRound size={26} />
                </div>
                <h3 className="display text-center text-[1.75rem] font-bold text-ink">Reset password</h3>
                <p className="mt-1 text-center text-sm text-ink-2">
                    Set <strong className="text-ink">{sevakName}</strong>'s new mobile number. It becomes their contact number
                    and their new password.
                </p>

                <label className="mt-4 block text-sm font-medium text-ink-2" htmlFor="reset-mobile">New mobile number</label>
                <input
                    id="reset-mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="num mt-1.5 h-12 w-full rounded-field bg-white ring-1 ring-inset ring-line px-4 text-[16px] font-semibold tracking-wide text-ink outline-none transition focus:ring-2 focus:ring-ink"
                />
                {error && <p role="alert" className="mt-3 rounded-2xl bg-err-soft px-4 py-3 text-sm font-medium text-err">{error}</p>}

                <div className="mt-5 flex gap-3">
                    <button type="button" onClick={onClose} disabled={busy} className="flex-1 h-12 rounded-full text-[15px] font-semibold bg-surface ring-1 ring-inset ring-line text-ink disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 h-12 rounded-full text-[15px] font-semibold bg-brand text-ink hover:bg-brand-600 disabled:opacity-60">
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        Reset password
                    </button>
                </div>
                <p className="mt-3 text-center text-xs text-ink-2">Tell the Sevak to sign in with this new number.</p>
            </form>
        </Modal>
    );
};

export default ResetSevakPasswordModal;
