import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';
import { Loader2, Instagram, MapPin, User, Lock, Eye, EyeOff, UserPlus, Phone, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageDropdown from '../components/LanguageDropdown';
import { brandAccessError } from '../services/brandAccess';
import { callFn } from '../services/apiBase';
import { BRAND } from '@brand';

// Shared look of the sign-in / sign-up / forgot-password screens: one modal card centred in the
// viewport. Content taller than the screen scrolls INSIDE the card, so the page itself never scrolls.
// vSeva Design Core (docs/design-core.md): warm canvas, surface card, pill buttons, 16px inputs.
const authInputClass =
  'h-12 w-full rounded-field bg-white text-[16px] text-ink placeholder:text-ink-3/70 ring-1 ring-inset ring-line outline-none transition focus:ring-2 focus:ring-ink';

const AuthShell: React.FC<{ children: React.ReactNode; maxWidth?: string; topLeft?: React.ReactNode }> = ({ children, maxWidth = 'max-w-[26rem]', topLeft }) => (
  <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-canvas font-sans text-ink">
    <div className="relative z-30 flex shrink-0 items-center justify-between gap-2 px-4 sm:px-6" style={{ minHeight: 'calc(64px + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="min-w-0">{topLeft}</div>
      <LanguageDropdown />
    </div>
    <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 sm:px-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className={`w-full ${maxWidth} max-h-full overflow-y-auto rounded-[32px] bg-surface p-6 ring-1 ring-inset ring-line/80 shadow-[0_24px_64px_-28px_rgba(29,29,27,0.25)] sm:p-8 [@media(max-height:700px)]:p-5`}>
        {children}
      </div>
    </main>
  </div>
);

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
  // Only on /super-admin: a login with no Captain/Sevak profile is let in when the server confirms it is a Super Admin.
  onAdminLogin?: (account: { id: string; email: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onAdminLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // A session restored from an earlier visit may have been refused (see App.tsx) — say why.
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    try {
      const msg = sessionStorage.getItem('brandBlock');
      if (msg) sessionStorage.removeItem('brandBlock');
      return msg;
    } catch { return null; }
  });
  // /login?register=1 (used by the brand landing pages) opens the Captain registration form directly.
  const [isRegistering, setIsRegistering] = useState(() => new URLSearchParams(window.location.search).get('register') === '1');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  // No answer in 20 s (a dead or stalled connection, common on the road): stop the spinner and say so.
  const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("No internet connection. Please check your network and try again.")), 20000))]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const safeInput = email.trim().toLowerCase();
    // Sevak usernames are generated at creation time by stripping everything
    // except letters/digits from their full name (see dataService.createSevak),
    // so "Vishwa Shah", "vishwa shah", and "vishwashah" are all meant to be the
    // same account — normalize the login input the same way before building
    // the candidate email, so a Sevak doesn't need to remember the exact
    // stripped-down username. Admin/captain logins (which use a real email
    // address, matched by the '@') are left completely untouched.
    const normalizedUsername = safeInput.replace(/[^a-z0-9]/g, '');

    try {
      // Build a list of email formats to try (new format first, then legacy)
      const emailCandidates = safeInput.includes('@')
        ? [safeInput] // admin/captain accounts or old-format users who typed full address
        : [
            `${normalizedUsername}@vsevak.in`, // new sevak format
            `${normalizedUsername}@vsevak`,    // legacy format (old sevaks)
            safeInput,                          // raw fallback, just in case
          ];

      let authData: any = null;
      let authError: any = null;
      for (const candidate of emailCandidates) {
        const result = await withTimeout(supabase.auth.signInWithPassword({ email: candidate, password }));
        if (!result.error && result.data.user) {
          authData = result.data;
          break;
        }
        authError = result.error;
      }

      // Sevaks may type just the start of their name ("alpesh" for "Alpesh Shah"): if the full-name
      // attempts failed and the password looks like a mobile number, ask the server which Sevak has that
      // name prefix AND that mobile number, then sign in with the normal password check.
      if (!authData?.user && !safeInput.includes('@') && normalizedUsername.length >= 3 && password.replace(/\D/g, '').length >= 10) {
        try {
          const lookup = await callFn<{ emails?: string[]; ambiguous?: boolean }>('sevak-login-lookup', {
            body: { name: normalizedUsername, mobile: password },
            retry: true,
          });
          if (lookup?.ambiguous) throw new Error('More than one Sevak matches that name and number. Please type your full name.');
          for (const candidate of lookup?.emails ?? []) {
            const result = await withTimeout(supabase.auth.signInWithPassword({ email: candidate, password }));
            if (!result.error && result.data.user) { authData = result.data; break; }
          }
        } catch (lookupErr: any) {
          if (lookupErr?.message?.startsWith('More than one')) throw lookupErr;
          // lookup unavailable: fall through to the normal "invalid credentials" error
        }
      }

      if (!authData?.user) throw authError ?? new Error('Invalid credentials.');

      // 2. Fetch Profile to get Role
      const profile = await withTimeout(dataService.getProfile(authData.user.id));

      if (!profile) {
        if (onAdminLogin) {
          try {
            await withTimeout(dataService.getSuperAdminScope()); // the server decides; throws if not a Super Admin
            showToast('Welcome, Super Admin', 'success');
            onAdminLogin({ id: authData.user.id, email: authData.user.email || '' });
            return;
          } catch {
            await supabase.auth.signOut();
            throw new Error('This account is not authorised for Super Admin access.');
          }
        }
        // Signed in on the normal login page with a Super Admin account (no Captain/Sevak profile): take them to
        // the Super Admin dashboard instead of turning them away. The server decides who is a Super Admin.
        try {
          await withTimeout(dataService.getSuperAdminScope());
          window.location.href = '/super-admin';
          return;
        } catch {
          await supabase.auth.signOut();
        }
        throw new Error("Profile not found. Contact your Captain.");
      }

      if (!profile.is_active) {
        throw new Error("Account is inactive.");
      }

      // This site only admits its own platform's accounts (see services/brandAccess.ts)
      const blocked = await withTimeout(brandAccessError(profile.organization_id));
      if (blocked && onAdminLogin) {
        // On /super-admin, a Captain of the other platform may still be a Super Admin (the server decides)
        try {
          await withTimeout(dataService.getSuperAdminScope());
          showToast('Welcome, Super Admin', 'success');
          onAdminLogin({ id: authData.user.id, email: authData.user.email || '' });
          return;
        } catch {
          await supabase.auth.signOut();
          throw new Error(blocked);
        }
      }
      if (blocked) {
        await supabase.auth.signOut();
        throw new Error(blocked);
      }

      // Track last login time (fire-and-forget, don't block login on failure)
      supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(({ error }) => {
          if (error) console.warn('Could not update last_login_at:', error.message);
        });

      showToast(`Welcome back, ${profile.full_name}!`, 'success');
      onLoginSuccess(profile);

    } catch (err: any) {
      console.error(err);
      const msg = /failed to fetch|network|load failed/i.test(err?.message || '')
        ? 'No internet connection. Please check your network and try again.'
        : err.message || "Login failed. Please check credentials.";
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Back to the website's home page. Not inside the installed app (Android app or home-screen web app),
  // where "/" is the app itself and would just bring the user back here.
  const inBrowser = !(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true || !!(window as any).Capacitor?.isNativePlatform?.());

  const topLinks = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {inBrowser && (
        <a
          href="/"
          className="inline-flex shrink-0 items-center gap-1 h-10 px-3 sm:px-4 rounded-full bg-surface text-ink text-[13px] sm:text-sm font-semibold ring-1 ring-inset ring-line hover:bg-white transition-colors no-underline"
        >
          <ArrowLeft size={15} /> <span>Home</span>
        </a>
      )}
      <button
        type="button"
        onClick={() => { window.location.href = '/nearby-derasar'; }}
        className="inline-flex shrink-0 items-center gap-1 h-10 px-3 sm:px-4 rounded-full bg-surface text-ink text-[13px] sm:text-sm font-semibold ring-1 ring-inset ring-line hover:bg-white transition-colors"
      >
        <MapPin size={15} /> <span>Find Derasar</span>
      </button>
    </div>
  );

  if (isRegistering) {
    return (
      <AuthShell maxWidth="max-w-2xl">
        <React.Suspense fallback={<BrandSplash inline />}>
          <RegisterAdminView onBack={() => setIsRegistering(false)} onSuccess={() => setIsRegistering(false)} />
        </React.Suspense>
      </AuthShell>
    );
  }

  if (isForgotPassword) {
    return (
      <AuthShell>
        <React.Suspense fallback={<BrandSplash inline />}>
          <ForgotPasswordView onBack={() => setIsForgotPassword(false)} />
        </React.Suspense>
      </AuthShell>
    );
  }

  return (
    <AuthShell topLeft={topLinks}>
      <div className="flex flex-col items-center text-center">
        <div className="h-[72px] w-[72px] [@media(max-height:700px)]:h-14 [@media(max-height:700px)]:w-14 rounded-[22px] bg-white ring-1 ring-inset ring-line flex items-center justify-center overflow-hidden">
          <img src={BRAND.logo} alt={BRAND.name} className={`h-full w-full object-contain ${BRAND.logoPadded ? 'scale-[1.45]' : 'p-1'}`} />
        </div>
        <h1 className={`display mt-4 font-extrabold text-brand ${BRAND.name.length > 10 ? 'text-[1.75rem] sm:text-[2rem]' : 'text-[2.6rem]'}`}>{BRAND.name}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{t('login.subtitle')}</p>
        <p className="mt-3 [@media(max-height:700px)]:hidden rounded-2xl bg-brand-50 px-3.5 py-2 text-[13px] font-medium leading-snug text-brand-700">
          Please enter the username and password given by your Captain.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">{t('login.username')}</span>
          <span className="relative block">
            <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              required
              autoComplete="username"
              className={authInputClass + ' pl-11 pr-4'}
              placeholder={BRAND.examples.username}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </span>
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium text-ink-2">{t('login.password')}</label>
            <button type="button" onClick={() => setIsForgotPassword(true)} className="shrink-0 text-[13px] font-semibold text-brand-700 hover:underline">
              {t('login.forgotPassword')}
            </button>
          </div>
          <span className="relative block">
            <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className={authInputClass + ' pl-11 pr-11'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-sunken hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-[16px] font-semibold text-ink transition hover:bg-brand-600 active:translate-y-px disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : t('login.signIn')}
        </button>

        {errorMsg && (
          <div role="alert" className="rounded-2xl bg-err-soft px-4 py-3 text-sm font-medium text-err">
            {errorMsg}
          </div>
        )}
      </form>

      <div className="mt-5 flex items-center gap-3 text-[13px] text-ink-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-center">{t('login.noAccount')}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={() => setIsRegistering(true)}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface text-[15px] font-semibold text-ink ring-1 ring-inset ring-line transition hover:bg-white"
      >
        <UserPlus size={17} /> {t(BRAND.registerLabelKey)}
      </button>

      <div className="mt-5 flex flex-col items-center gap-1.5 text-center text-[12px] text-ink-3">
        <span>{BRAND.byline}</span>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a href="/contact" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Phone size={12} /> Contact</a>
          <span aria-hidden="true">·</span>
          <a href={`${BRAND.siteUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href={`${BRAND.siteUrl}/delete-account`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">Delete account</a>
          {BRAND.instagram && (
            <>
              <span aria-hidden="true">·</span>
              <a href={BRAND.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex items-center text-ink-3 hover:text-ink">
                <Instagram size={14} />
              </a>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
};

// Import at the top usually, but for this edit I'll add the components.
// Accessing RegisterAdmin via import
import RegisterAdminView from './RegisterAdmin';
import ForgotPasswordView from './ForgotPassword';
import BrandSplash from '../components/BrandSplash';

export default Login;