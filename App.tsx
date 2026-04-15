import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { UserRole, UserProfile, ViharEntry } from './types';
import { dataService } from './services/dataService';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewEntry from './pages/NewEntry';
import AddSevak from './pages/AddSevak';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import PublicSevakProfile from './pages/PublicSevakProfile';

import ManageRoutes from './pages/ManageRoutes';
import ViewEntries from './pages/ViewEntries';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ProfileSection from './components/ProfileSection';
import Contacts from './pages/Contacts';
import AdminContacts from './pages/AdminContacts';
import ViewReports from './pages/ViewReports';
import SubmitReport from './pages/SubmitReport';
import { initOneSignal, loginToOneSignal, logoutFromOneSignal } from './services/oneSignalService';
import NearbyDerasar from './pages/NearbyDerasar';


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
  // Show landing page only if NOT in standalone mode (PWA) and not on /login
  const isLoginRoute = window.location.pathname === '/login';
  const [showLanding, setShowLanding] = useState(!isStandalone && !isLoginRoute);

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
    return <PublicSevakProfile />;
  }
  if (path === '/nearby-derasar') {
    return <NearbyDerasar />;
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
      // Dismiss the HTML splash screen with animation
      if (typeof (window as any).hideSplash === 'function') {
        (window as any).hideSplash();
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = async (profile: UserProfile) => {
    setUser(profile);
    setShowLanding(false);
    loginToOneSignal(profile.username);
    setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
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

  // While loading, let the HTML splash screen show — return null to avoid flicker
  if (loading) return null;

  // Route: Super Admin (Protected)
  if (isSuperAdmin) {
    if (!user && !loading) return <Login onLoginSuccess={handleLoginSuccess} />;
    if (user && user.role !== UserRole.ORG_ADMIN) {
      // Not an admin? Send them to their default dashboard
      setCurrentPage(user.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
      window.location.href = '/'; 
      return null;
    }
    return <SuperAdminDashboard />;
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
    <>
    <Layout
      role={user.role}
      userInitials={getInitials(user.full_name)}
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
    </>
  );
};

export default App;