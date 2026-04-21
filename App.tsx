import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { UserRole, UserProfile, ViharEntry } from './types';
import { dataService } from './services/dataService';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import OnboardingWalkthrough from './components/OnboardingWalkthrough';
import { initOneSignal, loginToOneSignal, logoutFromOneSignal } from './services/oneSignalService';
import vSevaLogo from './assets/vseva-logo-removebg-preview.png';

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
  // Check PWA standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [editingEntry, setEditingEntry] = useState<ViharEntry | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Show landing page only if NOT in standalone mode (PWA) and not on /login
  const isLoginRoute = window.location.pathname === '/login';
  const [showLanding, setShowLanding] = useState(!isStandalone && !isLoginRoute);

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

  const handleEditEntry = (entry: ViharEntry) => {
    setEditingEntry(entry);
    setCurrentPage('new-entry');
  };

  // Wrap setCurrentPage so navigating away from new-entry always clears the editing state
  const handleSetCurrentPage = (page: string) => {
    if (page !== 'new-entry') {
      setEditingEntry(null);
    }
    setCurrentPage(page);
  };

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
  const isSuperAdmin = path === '/super-admin';

  useEffect(() => {
    // Check active session on load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const profile = await dataService.getProfile(session.user.id);
          if (profile) {
            setUser(profile);
            const org = await dataService.getOrganization(profile.organization_id);
            if (org) setOrgName(org.name);
            // Link to OneSignal
            loginToOneSignal(profile.username);
            // Redirect based on role if at root
            setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
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
        } catch (e) {
          console.error("Profile load failed", e);
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLoginSuccess = async (profile: UserProfile) => {
    setUser(profile);
    setShowLanding(false);
    loginToOneSignal(profile.username);
    setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
    // Show onboarding walkthrough on first login
    if (shouldShowOnboarding(profile.role)) setShowOnboarding(true);
    // Also fetch org name so it appears correctly in profile page
    try {
      const org = await dataService.getOrganization(profile.organization_id);
      if (org) setOrgName(org.name);
    } catch (e) {
      console.warn('Could not fetch org name:', e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logoutFromOneSignal();
    setUser(null);
    setOrgName('');
    sessionStorage.removeItem('hasSeenCompletenessPrompt');
    if (!isStandalone) setShowLanding(true);
  };

  // While loading, show a white splash screen with the logo
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <img src={vSevaLogo} alt="vSeva" style={{ width: 96, height: 96, objectFit: 'contain' }} />
      <div style={{ marginTop: 20, width: 36, height: 36, borderRadius: '50%', border: '3px solid #f97316', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        <SuperAdminDashboard />
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
        userId={user.id}
        onLogout={handleLogout}
        currentPage={currentPage}
        setCurrentPage={handleSetCurrentPage}
      >
        {/* Admin Routes */}
        {currentPage === 'dashboard' && user.role === UserRole.ORG_ADMIN && (
          <Dashboard currentUser={user} navigateToProfile={() => handleSetCurrentPage('profile')} />
        )}

        {currentPage === 'new-entry' && user.role === UserRole.ORG_ADMIN && (
          <NewEntry
            currentUser={user}
            entry={editingEntry || undefined}
            onCancel={() => {
              setEditingEntry(null);
              setCurrentPage(editingEntry ? 'view-entries' : 'dashboard');
            }}
            onSubmit={() => {
              setEditingEntry(null);
              setCurrentPage('dashboard');
            }}
          />
        )}

        {currentPage === 'manage-routes' && user.role === UserRole.ORG_ADMIN && (
          <ManageRoutes currentUser={user} />
        )}

        {currentPage === 'add-sevak' && user.role === UserRole.ORG_ADMIN && (
          <AddSevak currentUser={user} />
        )}

        {/* Sevak Routes */}
        {currentPage === 'analytics' && (
          <Dashboard currentUser={user} navigateToProfile={() => handleSetCurrentPage('profile')} />
        )}
        {currentPage === 'view-entries' && user.role === UserRole.ORG_ADMIN && (
          <ViewEntries currentUser={user} onEdit={handleEditEntry} />
        )}

        {currentPage === 'profile' && (
          <ProfileSection
            user={user}
            orgName={orgName}
            onProfileUpdated={async () => {
              try {
                const updated = await dataService.getProfile(user.id);
                if (updated) setUser(updated);
              } catch (e) {
                console.warn('Could not refresh profile after update:', e);
              }
            }}
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