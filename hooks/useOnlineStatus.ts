import { useState, useEffect } from 'react';

// Tracks real browser connectivity (not a specific fetch's success/failure) so
// a global banner and per-page error screens can agree on whether a failure
// was "no internet" vs. a genuine server/app error.
export const useOnlineStatus = (): boolean => {
    const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    return isOnline;
};
