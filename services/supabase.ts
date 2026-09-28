import { createClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";

// Vite environment variables
// Fix: Cast import.meta to any to resolve TS error "Property 'env' does not exist on type 'ImportMeta'"
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
  );
}

const isNativePlatform = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

// supabase-js defaults to a lock built on the browser's Web Locks API
// (navigator.locks) to serialize session-refresh across tabs. Observed on
// Android inside the Capacitor WebView: that lock can be acquired but the
// operation it guards (refreshing a stored, expired session) then hangs
// forever with no error and no timeout, permanently stuck on the app's
// loading screen. A Capacitor WebView is a single execution context — there
// is no other "tab" to race against — so swap in supabase-js's own
// processLock (a plain in-memory mutex, no browser API involved) on native
// only. Web keeps the default navigator-lock behavior unchanged.
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  isNativePlatform() ? { auth: { lock: processLock } } : undefined
);