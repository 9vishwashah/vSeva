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
import { Loader2 } from 'lucide-react';
import ManageRoutes from './pages/ManageRoutes';
import ViewEntries from './pages/ViewEntries';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

import vSevaLogo from './assets/vseva-logo.png';


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
  // Show landing page only if NOT in standalone mode (PWA)
  const [showLanding, setShowLanding] = useState(!isStandalone);

  const handleEditEntry = (entry: ViharEntry) => {
    setEditingEntry(entry);
    setCurrentPage('new-entry');
  };

  // Check for public routes
  const path = window.location.pathname;
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
            // Redirect based on role if at root
            setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
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

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-saffron-50 to-orange-50">
        <div className="mb-6">
          <img src={vSevaLogo} alt="vSeva" className="h-24 w-24 object-contain animate-pulse" />
        </div>
        <Loader2 className="animate-spin text-saffron-600" size={48} />
        <p className="mt-4 text-gray-600 font-medium">Loading vSeva...</p>
      </div>
    );
  }

  // Route: Super Admin (Protected-ish)
  if (isSuperAdmin) {
    if (!user && !loading) return <Login onLoginSuccess={handleLoginSuccess} />;
    return <SuperAdminDashboard />;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => setShowLanding(false)} />;
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
    <Layout
      role={user.role}
      userInitials={getInitials(user.full_name)}
      onLogout={handleLogout}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
    >
      {/* Admin Routes */}
      {currentPage === 'dashboard' && user.role === UserRole.ORG_ADMIN && (
        <Dashboard currentUser={user} />
      )}

      {currentPage === 'new-entry' && user.role === UserRole.ORG_ADMIN && (
        <NewEntry
          currentUser={user}
          entry={editingEntry || undefined}
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
        <Dashboard currentUser={user} />
      )}
      {currentPage === 'view-entries' && user.role === UserRole.ORG_ADMIN && (
        <ViewEntries currentUser={user} onEdit={handleEditEntry} />
      )}

      {currentPage === 'profile' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-saffron-100 rounded-full flex items-center justify-center text-2xl font-bold text-saffron-600">
              {getInitials(user.full_name)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user.full_name}</h2>
              <p className="text-gray-500 uppercase text-xs tracking-wider">{user.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-gray-100 pt-6">
            <div>
              <p className="text-gray-500 mb-1">Mobile Number</p>
              <p className="font-medium text-lg">{user.mobile}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Username</p>
              <p className="font-medium text-lg">{user.username}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Organization</p>
              <p className="font-medium text-lg">{orgName || user.organization_id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">App Settings</h3>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-xs text-gray-500">Receive updates about new entries and approvals</p>
              </div>
              <button
                onClick={() => {
                  import('./services/notificationService').then(({ notificationService }) => {
                    notificationService.requestPermission().then(perm => {
                      if (perm === 'granted') alert("Notifications enabled!");
                      else alert("Notifications blocked. Please enable them in browser settings.");
                    });
                  });
                }}
                className="px-4 py-2 bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'my-vihars' && (
        <ViewEntries currentUser={user} onEdit={user.role === UserRole.ORG_ADMIN ? handleEditEntry : undefined} />
      )}
    </Layout>
  );
};

export default App;