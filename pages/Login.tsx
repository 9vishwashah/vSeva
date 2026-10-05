import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';
import { Loader2, Instagram, ArrowLeft, MapPin, User, Lock, Eye, EyeOff, UserPlus, Phone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageDropdown from '../components/LanguageDropdown';
import { brandAccessError } from '../services/brandAccess';
import { callFn } from '../services/apiBase';
import { BRAND } from '@brand';

// Shared look of the sign-in / sign-up / forgot-password screens: one modal card centred in the
// viewport. Content taller than the screen scrolls INSIDE the card, so the page itself never scrolls.
const authInputClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100';

const AuthShell: React.FC<{ children: React.ReactNode; maxWidth?: string; topLeft?: React.ReactNode }> = ({ children, maxWidth = 'max-w-[26rem]', topLeft }) => (
  <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-saffron-50 via-white to-orange-50">
    <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-saffron-200/40 blur-3xl" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-orange-200/40 blur-3xl" />
    <div className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 px-3 sm:px-6">
      <div className="min-w-0">{topLeft}</div>
      <LanguageDropdown />
    </div>
    <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-3 pb-4 sm:px-4">
      <div className={`w-full ${maxWidth} max-h-full overflow-y-auto rounded-3xl bg-white/90 p-6 shadow-[0_24px_60px_-18px_rgba(222,107,56,0.4)] ring-1 ring-black/5 backdrop-blur sm:p-8 [@media(max-height:700px)]:p-5`}>
        {children}
      </div>
    </main>
  </div>
);

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
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
        const result = await supabase.auth.signInWithPassword({ email: candidate, password });
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
            const result = await supabase.auth.signInWithPassword({ email: candidate, password });
            if (!result.error && result.data.user) { authData = result.data; break; }
          }
        } catch (lookupErr: any) {
          if (lookupErr?.message?.startsWith('More than one')) throw lookupErr;
          // lookup unavailable: fall through to the normal "invalid credentials" error
        }
      }

      if (!authData?.user) throw authError ?? new Error('Invalid credentials.');

      // 2. Fetch Profile to get Role
      const profile = await dataService.getProfile(authData.user.id);

      if (!profile) {
        throw new Error("Profile not found. Contact your Captain.");
      }

      if (!profile.is_active) {
        throw new Error("Account is inactive.");
      }

      // This site only admits its own platform's accounts (see services/brandAccess.ts)
      const blocked = await brandAccessError(profile.organization_id);
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
      const msg = err.message || "Login failed. Please check credentials.";
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const topLinks = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (window.matchMedia('(display-mode: standalone)').matches) {
            window.open(window.location.origin, '_blank');
          } else {
            window.location.href = '/';
          }
        }}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/90 text-saffron-700 text-xs sm:text-sm font-bold shadow-sm ring-1 ring-saffron-100 hover:bg-saffron-50 transition-colors"
      >
        <ArrowLeft size={15} /> <span>View More</span>
      </button>
      <button
        type="button"
        onClick={() => { window.location.href = '/nearby-derasar'; }}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/90 text-saffron-700 text-xs sm:text-sm font-bold shadow-sm ring-1 ring-saffron-100 hover:bg-saffron-50 transition-colors"
      >
        <MapPin size={15} /> <span>Find Derasar</span>
      </button>
    </div>
  );

  if (isRegistering) {
    return (
      <AuthShell maxWidth="max-w-2xl">
        <React.Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-saffron-600" /></div>}>
          <RegisterAdminView onBack={() => setIsRegistering(false)} onSuccess={() => setIsRegistering(false)} />
        </React.Suspense>
      </AuthShell>
    );
  }

  if (isForgotPassword) {
    return (
      <AuthShell>
        <React.Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-saffron-600" /></div>}>
          <ForgotPasswordView onBack={() => setIsForgotPassword(false)} />
        </React.Suspense>
      </AuthShell>
    );
  }

  return (
    <AuthShell topLeft={topLinks}>
      <div className="flex flex-col items-center text-center">
        <div className="h-16 w-16 [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12 rounded-2xl bg-white shadow-md ring-1 ring-saffron-100 flex items-center justify-center overflow-hidden">
          <img src={BRAND.logo} alt={BRAND.name} className={`h-full w-full object-contain ${BRAND.logoPadded ? 'scale-[1.45]' : 'p-1'}`} />
        </div>
        <h1 className={`mt-3 font-serif font-bold leading-tight text-gray-900 ${BRAND.name.length > 10 ? 'text-xl sm:text-2xl' : 'text-3xl'}`}>{BRAND.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>
        <p className="mt-3 [@media(max-height:700px)]:hidden rounded-lg bg-saffron-50 px-3 py-1.5 text-xs font-medium text-saffron-700">
          Please enter the username and password given by your Captain.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">{t('login.username')}</span>
          <span className="relative block">
            <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              autoComplete="username"
              className={authInputClass + ' pl-11 pr-3'}
              placeholder={BRAND.examples.username}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </span>
        </label>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-xs font-semibold text-gray-600">{t('login.password')}</label>
            <button type="button" onClick={() => setIsForgotPassword(true)} className="shrink-0 text-xs font-semibold text-saffron-600 hover:underline">
              {t('login.forgotPassword')}
            </button>
          </div>
          <span className="relative block">
            <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
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
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-base font-semibold text-white shadow-lg shadow-saffron-300/50 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : t('login.signIn')}
        </button>

        {errorMsg && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
      </form>

      <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-center">{t('login.noAccount')}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        type="button"
        onClick={() => setIsRegistering(true)}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-saffron-200 bg-white text-sm font-semibold text-saffron-700 transition hover:bg-saffron-50"
      >
        <UserPlus size={17} /> {t(BRAND.registerLabelKey)}
      </button>

      <div className="mt-4 flex flex-col items-center gap-1.5 text-center text-[11px] text-gray-400">
        <span>{BRAND.byline}</span>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a href="/contact" className="inline-flex items-center gap-1 font-semibold text-saffron-700 hover:underline"><Phone size={12} /> Contact</a>
          <span aria-hidden="true">·</span>
          <a href={`${BRAND.siteUrl}/privacy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href={`${BRAND.siteUrl}/delete-account`} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Delete account</a>
          {BRAND.instagram && (
            <>
              <span aria-hidden="true">·</span>
              <a href={BRAND.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex items-center text-gray-400 hover:text-pink-600">
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

export default Login;