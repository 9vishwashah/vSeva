import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export type StatusScreenVariant = 'offline' | 'error';

interface StatusScreenProps {
    variant: StatusScreenVariant;
    title?: string;
    message?: string;
    onRetry?: () => void;
    retrying?: boolean;
    // Use for a small section/card (e.g. one widget failed) instead of a
    // whole-page takeover.
    compact?: boolean;
    // Drops the white/border/shadow card wrapper — for slotting inside a
    // surface that already has its own container, e.g. a <td> in a table.
    bare?: boolean;
    className?: string;
}

// One consistent "can't show you real data" screen for every page — used
// instead of silently rendering zeroed/empty state when a fetch fails, so
// users never mistake "the network dropped" for "there's genuinely nothing here."
const StatusScreen: React.FC<StatusScreenProps> = ({
    variant, title, message, onRetry, retrying = false, compact = false, bare = false, className = ''
}) => {
    const isOffline = variant === 'offline';
    const Icon = isOffline ? WifiOff : AlertTriangle;
    const resolvedTitle = title || (isOffline ? "You're Offline" : 'Something Went Wrong');
    const resolvedMessage = message || (isOffline
        ? 'Kindly connect to the internet and try again.'
        : "We couldn't load this page. Please try again in a moment.");

    return (
        <div
            className={`flex flex-col items-center justify-center text-center ${bare ? '' : 'bg-white rounded-2xl border border-gray-100 shadow-sm'} ${compact ? 'py-10 px-6' : 'py-16 px-6 min-h-[45vh]'} ${className}`}
        >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isOffline ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                <Icon size={26} />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">{resolvedTitle}</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-5">{resolvedMessage}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    disabled={retrying}
                    className="flex items-center gap-2 px-5 py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-sm disabled:opacity-60"
                >
                    <RefreshCw size={15} className={retrying ? 'animate-spin' : ''} />
                    {retrying ? 'Retrying...' : 'Retry'}
                </button>
            )}
        </div>
    );
};

export default StatusScreen;
