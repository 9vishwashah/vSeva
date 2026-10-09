import { useEffect, useRef } from 'react';
import { CACHE_REFRESHED_EVENT } from '../services/requestCache';

// Runs `reload` whenever fresh data arrives in the background for something the screen already showed from
// the on-device cache (see services/requestCache.ts). Calls are batched, since several requests usually finish together.
export function useCacheRefresh(reload: () => void): void {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    let timer: number | undefined;
    const onRefreshed = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ref.current(), 150);
    };
    window.addEventListener(CACHE_REFRESHED_EVENT, onRefreshed);
    return () => { window.removeEventListener(CACHE_REFRESHED_EVENT, onRefreshed); window.clearTimeout(timer); };
  }, []);
}
