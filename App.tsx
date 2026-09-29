import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabase';
import { UserRole, UserProfile, ViharEntry, Organization } from './types';
import { dataService } from './services/dataService';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import OnboardingWalkthrough from './components/OnboardingWalkthrough';
import { initOneSignal, loginToOneSignal, logoutFromOneSignal, onNotificationClick } from './services/oneSignalService';
import vSevaLogo from './assets/vseva-logo-removebg-preview.png';
import StatusScreen from './components/StatusScreen';

// Lazy load the inner components to reduce initial JS bundle size
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const NewEntry = React.lazy(() => import('./pages/NewEntry'));
const AddSevak = React.lazy(() => import('./pages/AddSevak'));
const PublicSevakProfile = React.lazy(() => import('./pages/PublicSevakProfile'));
const ManageRoutes = React.lazy(() => import('./pages/ManageRoutes'));
const ViewEntries = React.lazy(() => import('./pages/ViewEntries'));
const SuperAdminDashboard = React.lazy(() => import('./pages/SuperAdminDashboard'));
const ProfileSection = React.lazy(() => import('./components/ProfileSection'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const AdminContacts = React.lazy(() => import('./pages/AdminContacts'));
const ViewReports = React.lazy(() => import('./pages/ViewReports'));
const SubmitReport = React.lazy(() => import('./pages/SubmitReport'));
const NearbyDerasar = React.lazy(() => import('./pages/NearbyDerasar'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Statistics = React.lazy(() => import('./pages/Statistics'));
const PendingApprovals = React.lazy(() => import('./pages/PendingApprovals'));
const DirectoryRouter = React.lazy(() => import('./pages/DirectoryRouter'));


// Suppress XAxis/YAxis defaultProps warning from Recharts in React 18+
// This is a known issue with the library and safe to ignore until they release a fix.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalConsoleError(...args);
};

const App: React.FC = () => {
  // Check PWA standalone mode. The Capacitor Android WebView never matches
  // `display-mode: standalone` (it isn't a browser-installed PWA), so treat
  // native the same way — an installed app has no reason to show the
  // marketing landing page, that's a website-only concern.
  const isNativeApp = (() => {
    const capacitor = (globalThis as any).Capacitor;
    return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
  })();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || isNativeApp;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<'offline' | 'error' | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [editingEntry, setEditingEntry] = useState<ViharEntry | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Captured once from a shared WhatsApp Vihar link (?vihar=<id>) — routes
  // straight to that Vihar's card on Notifications once logged in.
  const [pendingViharId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('vihar'));
  // Show landing page only if NOT in standalone mode (PWA) and not on /login
  const isLoginRoute = window.location.pathname === '/login';
  const [showLanding, setShowLanding] = useState(!isStandalone && !isLoginRoute && !pendingViharId);

  // Check if onboarding should be shown for a given role
  const shouldShowOnboarding = (role: UserRole): boolean => {
    const key = `vseva_onboarding_done_${role}`;
    return !localStorage.getItem(key);
  };

  const markOnboardingDone = (role: UserRole) => {
    localStorage.setItem(`vseva_onboarding_done_${role}`, '1');
    setShowOnboarding(false);
  };

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    if (pendingViharId) {
      // Clean the URL so a refresh or back-navigation doesn't keep re-triggering this.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [pendingViharId]);

  const handleEditEntry = (entry: ViharEntry) => {
    setEditingEntry(entry);
    setCurrentPage('new-entry');
  };

  // Wrap setCurrentPage so navigating away from new-entry always clears the editing state
  const handleSetCurrentPage = (page: string) => {
    if (page !== 'new-entry') {
      setEditingEntry(null);
    }
    if (page !== currentPage) pageHistoryRef.current.push(currentPage);
    setCurrentPage(page);
  };

  // In-memory back-stack for the Android hardware/gesture back button. The
  // app's main navigation (currentPage above) never touches browser history —
  // only DirectoryRouter's own pushState/popstate does, scoped to /directory/*
  // — so this is a separate, additive mechanism rather than a rewrite of it.
  const pageHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    const capacitor = (globalThis as any).Capacitor;
    if (!capacitor || typeof capacitor.isNativePlatform !== 'function' || !capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => void } | undefined;
    let cancelled = false;

    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      if (cancelled) return;
      CapacitorApp.addListener('backButton', () => {
        // 1. /directory/* has its own working pushState/popstate router
        // (DirectoryRouter.tsx) that already responds to real browser back
        // navigation. Registering this listener replaces Capacitor's default
        // WebView back behavior app-wide, so delegate explicitly here rather
        // than let the currentPage stack below (which knows nothing about
        // that router) intercept it.
        if (window.location.pathname.startsWith('/directory')) {
          window.history.back();
          return;
        }
        // 2. An open Modal (every pop-up in the app shares this component and
        // only renders .vseva-modal-backdrop while open) already closes on
        // Escape — reuse that instead of duplicating each page's close logic.
        if (document.querySelector('.vseva-modal-backdrop')) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          return;
        }
        // 3. Step back to the previous in-app page, if any.
        const previous = pageHistoryRef.current.pop();
        if (previous) {
          if (previous !== 'new-entry') setEditingEntry(null);
          setCurrentPage(previous);
          return;
        }
        // 4. Nothing left to go back to — let the app exit, same as pressing
        // Back on any Android app's home/root screen.
        CapacitorApp.exitApp();
      }).then(handle => { listenerHandle = handle; });
    });

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

  // Tapping a native push notification should land on the relevant page
  // in-app, not just open to whatever's already on screen. Stores the raw
  // click data (not a resolved page — resolving needs the user's role,
  // which isn't known yet on a cold start) for checkSession's post-login
  // logic below to consume once; the listener itself also covers the app
  // already being open in the foreground.
  const pendingNotificationDataRef = useRef<any>(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Pure by design (role passed in, not read off a ref) — the caller right
  // after setUser(profile) in checkSession below needs the just-fetched
  // profile's role, which userRef won't reflect until the next render.
  const resolveNotificationTargetPage = (data: any, role: UserRole | undefined): string => {
    // Same `payload.kind` send-push.js already attaches (see
    // scripts/vihar_approval_workflow.sql's notify_captains_new_vihar_submission) —
    // only Captains/admins have a Pending Approvals page to land on.
    if (data?.payload?.kind === 'vihar_submission' && role === UserRole.ORG_ADMIN) {
      return 'pending-approvals';
    }
    return 'notifications';
  };

  useEffect(() => {
    onNotificationClick((data) => {
      if (userRef.current) {
        handleSetCurrentPage(resolveNotificationTargetPage(data, userRef.current.role));
      } else {
        pendingNotificationDataRef.current = data;
      }
    });
  }, []);

  // Check for public routes
  const path = window.location.pathname;
  
  if (path.startsWith('/verify/')) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse font-bold text-saffron-600">Loading Profile...</div></div>}>
        <PublicSevakProfile />
      </React.Suspense>
    );
  }
  
  const seoDerasarRoutes = [
    '/nearby-derasar',
    '/jain-temple-navi-mumbai',
    '/jain-temple-mumbai',
    '/jain-temple-gujarat',
    '/derasar-near-me',
    '/jain-temple-india'
  ];
  
  const normalizedPath = (path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path).toLowerCase();
  
  if (seoDerasarRoutes.includes(normalizedPath)) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="animate-pulse text-saffron-600 font-bold">Loading Finder...</div></div>}>
        <NearbyDerasar />
      </React.Suspense>
    );
  }

  // Fully public — no login, no PIN gate, reachable by anyone including a
  // crawler or a WhatsApp-shared link. Checked before the auth gate below.
  if (normalizedPath === '/directory' || normalizedPath.startsWith('/directory/')) {
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="animate-pulse text-saffron-600 font-bold">Loading Directory...</div></div>}>
        <DirectoryRouter />
      </React.Suspense>
    );
  }

  const isSuperAdmin = path === '/super-admin';

  const checkSession = async () => {
      setLoading(true);
      setSessionError(null);
      try {
        // Safety net: session restore should resolve or reject in a few
        // seconds. If it ever hangs indefinitely for any reason, don't leave
        // the user stuck on the loading screen forever — surface the
        // existing offline/error retry screen instead, same as any other
        // failure caught below.
        const sessionTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session restore timed out')), 15000);
        });
        const { data: { session } } = await Promise.race([supabase.auth.getSession(), sessionTimeout]);
        if (session?.user) {
          const profile = await dataService.getProfile(session.user.id);
          if (profile) {
            setUser(profile);
            // Fetched separately (not on the login-critical path) — see
            // dataService.getAvatarUrl for why.
            dataService.getAvatarUrl(profile.id).then(url => {
              if (url) setUser(prev => (prev ? { ...prev, avatar_url: url } : prev));
            });
            const org = await dataService.getOrganization(profile.organization_id);
            if (org) setOrgDetails(org);
            // Link to OneSignal
            loginToOneSignal(profile.username);
            // Redirect based on role if at root — unless a shared Vihar link,
            // or a tapped native notification (cold start), brought them here
            if (pendingNotificationDataRef.current) {
              setCurrentPage(resolveNotificationTargetPage(pendingNotificationDataRef.current, profile.role));
              pendingNotificationDataRef.current = null;
            } else {
              setCurrentPage(pendingViharId ? 'notifications' : (profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard'));
            }
            // Show onboarding walkthrough on first-ever session resume too
            if (shouldShowOnboarding(profile.role)) setShowOnboarding(true);
            // Track app open time (fire-and-forget)
            supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', session.user.id)
              .then(({ error }) => {
                if (error) console.warn('Could not update last_login_at:', error.message);
              });
          }
        }
      } catch (e) {
        // A network hiccup here used to force a sign-out, silently logging out
        // anyone who opened the app with a flaky connection. Now it's shown as
        // a recoverable "offline"/"error" screen with Retry instead — the
        // session itself is left untouched.
        console.error("Session restore failed", e);
        setSessionError(navigator.onLine ? 'error' : 'offline');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = async (profile: UserProfile) => {
    setUser(profile);
    dataService.getAvatarUrl(profile.id).then(url => {
      if (url) setUser(prev => (prev ? { ...prev, avatar_url: url } : prev));
    });
    setShowLanding(false);
    loginToOneSignal(profile.username);
    setCurrentPage(pendingViharId ? 'notifications' : (profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard'));
    // Show onboarding walkthrough on first login
    if (shouldShowOnboarding(profile.role)) setShowOnboarding(true);
    // Also fetch org details so they appear correctly in profile page & dashboard
    try {
      const org = await dataService.getOrganization(profile.organization_id);
      if (org) setOrgDetails(org);
    } catch (e) {
      console.warn('Could not fetch org details:', e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logoutFromOneSignal();
    setUser(null);
    setOrgDetails(null);
    sessionStorage.removeItem('hasSeenCompletenessPrompt');
    // Sign-out should return to the login screen, not the marketing landing page.
    setShowLanding(false);
  };

  // While loading, show a white splash screen with the logo
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <img src={vSevaLogo} alt="vSeva" style={{ width: 96, height: 96, objectFit: 'contain', animation: 'vseva-splash-logo-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both' }} />
      <div style={{ marginTop: 20, width: 36, height: 36, borderRadius: '50%', border: '3px solid #f97316', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite, vseva-splash-fade-in 300ms ease-out 350ms both' }} />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes vseva-splash-logo-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes vseva-splash-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );

  // Couldn't even restore the session — show a full-screen retry instead of
  // silently dropping to the login page (which used to happen on any network hiccup).
  if (sessionError) return (
    <div style={{ position: 'fixed', inset: 0, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <StatusScreen variant={sessionError} onRetry={checkSession} />
      </div>
    </div>
  );

  // Route: Super Admin (Protected)
  if (isSuperAdmin) {
    if (!user && !loading) return <Login onLoginSuccess={handleLoginSuccess} />;
    if (user && user.role !== UserRole.ORG_ADMIN) {
      // Not an admin? Send them to their default dashboard
      setCurrentPage(user.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
      window.location.href = '/'; 
      return null;
    }
    return (
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saffron-600"></div></div>}>
        <SuperAdminDashboard currentUser={user} />
      </React.Suspense>
    );
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => { window.location.href = '/login'; }} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const getInitials = (name: string) => {
    if (!name) return 'VS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <React.Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #f97316', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /></div>}>
      {showOnboarding && user && (
        <OnboardingWalkthrough
          role={user.role}
          onDone={() => markOnboardingDone(user.role)}
        />
      )}
      <Layout
        role={user.role}
        userInitials={getInitials(user.full_name)}
        userName={user.full_name}
        avatarUrl={user.avatar_url}
        userId={user.id}
        onLogout={handleLogout}
        currentPage={currentPage}
        setCurrentPage={handleSetCurrentPage}
      >
        {/* Admin Routes */}
        {currentPage === 'dashboard' && user.role === UserRole.ORG_ADMIN && (
          <Dashboard
            currentUser={user}
            navigateToProfile={() => handleSetCurrentPage('profile')}
            navigateToNotifications={() => handleSetCurrentPage('notifications')}
            onAddVihar={() => handleSetCurrentPage('new-entry')}
            orgDetails={orgDetails}
          />
        )}

        {currentPage === 'new-entry' && (
          <NewEntry
            currentUser={user}
            entry={editingEntry || undefined}
            onCancel={() => {
              // A Captain correcting a pending/rejected submission returns to the
              // review queue; every other case returns where it did before.
              const isReviewingPending = !!editingEntry && editingEntry.status && editingEntry.status !== 'approved';
              const backTo = isReviewingPending
                ? 'pending-approvals'
                : editingEntry
                  ? 'view-entries'
                  : (user.role === UserRole.SEVAK ? 'my-vihars' : 'dashboard');
              setEditingEntry(null);
              setCurrentPage(backTo);
            }}
            onSubmit={() => {
              const isReviewingPending = !!editingEntry && editingEntry.status && editingEntry.status !== 'approved';
              const backTo = isReviewingPending
                ? 'pending-approvals'
                : (user.role === UserRole.SEVAK ? 'my-vihars' : 'dashboard');
              setEditingEntry(null);
              setCurrentPage(backTo);
            }}
          />
        )}

        {currentPage === 'pending-approvals' && user.role === UserRole.ORG_ADMIN && (
          <PendingApprovals currentUser={user} onEdit={handleEditEntry} />
        )}

        {currentPage === 'manage-routes' && user.role === UserRole.ORG_ADMIN && (
          <ManageRoutes currentUser={user} />
        )}

        {currentPage === 'add-sevak' && user.role === UserRole.ORG_ADMIN && (
          <AddSevak currentUser={user} />
        )}

        {/* Sevak Routes */}
        {currentPage === 'analytics' && (
          <Dashboard
            currentUser={user}
            navigateToProfile={() => handleSetCurrentPage('profile')}
            navigateToNotifications={() => handleSetCurrentPage('notifications')}
            onAddVihar={() => handleSetCurrentPage('new-entry')}
            orgDetails={orgDetails}
          />
        )}

        {currentPage === 'notifications' && (
          <Notifications currentUser={user} highlightViharId={pendingViharId} />
        )}

        {currentPage === 'statistics' && (
          <Statistics currentUser={user} />
        )}
        {currentPage === 'view-entries' && user.role === UserRole.ORG_ADMIN && (
          <ViewEntries currentUser={user} onEdit={handleEditEntry} />
        )}

        {currentPage === 'profile' && (
          <ProfileSection
            user={user}
            orgDetails={orgDetails}
            onProfileUpdated={async () => {
              try {
                const [updated, avatarUrl, org] = await Promise.all([
                  dataService.getProfile(user.id),
                  dataService.getAvatarUrl(user.id),
                  dataService.getOrganization(user.organization_id),
                ]);
                if (updated) setUser({ ...updated, avatar_url: avatarUrl });
                if (org) setOrgDetails(org);
              } catch (e) {
                console.warn('Could not refresh profile after update:', e);
              }
            }}
            onLogout={handleLogout}
          />
        )}

        {currentPage === 'my-vihars' && (
          <ViewEntries currentUser={user} onEdit={user.role === UserRole.ORG_ADMIN ? handleEditEntry : undefined} />
        )}

        {currentPage === 'contacts' && user.role === UserRole.ORG_ADMIN && (
          <AdminContacts currentUser={user} />
        )}

        {currentPage === 'contacts' && user.role === UserRole.SEVAK && (
          <Contacts currentUser={user} />
        )}

        {currentPage === 'reports' && user.role === UserRole.ORG_ADMIN && (
          <ViewReports currentUser={user} />
        )}

        {currentPage === 'reports' && user.role === UserRole.SEVAK && (
          <SubmitReport currentUser={user} />
        )}
      </Layout>
    </React.Suspense>
  );
};

export default App;