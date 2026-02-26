import React from 'react';
import { UserRole } from '../types';
import { LogOut, Home, UserPlus, FilePlus, BarChart2, Table2, Map, Footprints } from 'lucide-react';

import NotificationBell from './NotificationBell';
import { supabase } from '../services/supabase';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
// InstallPWA global import removed

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userInitials: string;
  onLogout: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, role, userInitials, onLogout, currentPage, setCurrentPage
}) => {
  const [currentUserId, setCurrentUserId] = React.useState<string | undefined>(undefined);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });
  }, []);

  const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${currentPage === page
        ? 'bg-saffron-100 text-saffron-700 font-medium'
        : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src={vSevaLogo} alt="vSeva" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-sm" />
            <div>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">vSeva</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">by Vishwa Alpesh Shah</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {role === UserRole.ORG_ADMIN && (
            <>
              <NavItem page="dashboard" icon={BarChart2} label="Dashboard" />
              <NavItem page="view-entries" icon={Table2} label="View Entries" />
              <NavItem page="manage-routes" icon={Map} label="Manage Routes" />
              <NavItem page="new-entry" icon={FilePlus} label="New Entry" />
              <NavItem page="add-sevak" icon={UserPlus} label="Add Sevaks" />
            </>
          )}

          {role === UserRole.SEVAK && (
            <>
              <NavItem page="profile" icon={Home} label="My Profile" />
              <NavItem page="analytics" icon={BarChart2} label="Analytics" />
              <NavItem page="my-vihars" icon={Footprints} label="My Vihars" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center mb-4 px-2 justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-600 flex items-center justify-center font-bold text-sm">
                {userInitials}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Account</p>
                <p className="text-xs text-gray-400 capitalize">{role.replace('_', ' ').toLowerCase()}</p>
              </div>
            </div>
            <NotificationBell userId={currentUserId} />
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 text-gray-500 hover:text-red-500 w-full px-2 py-2 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Bottom Nav */}
      <div className="md:hidden fixed top-0 w-full bg-white z-20 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={vSevaLogo} alt="vSeva" className="h-10 w-10 object-contain drop-shadow-sm scale-150 origin-left ml-2" />
          <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">vSeva</h1>
        </div>
        <div className="flex items-center gap-3 relative">
          <NotificationBell userId={currentUserId} />

          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-600 flex items-center justify-center font-bold text-sm border border-saffron-200"
          >
            {userInitials}
          </button>

          {/* Profile Dropdown */}
          {isProfileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</p>
                  <p className="text-sm font-medium text-gray-700 capitalize truncate">{role.replace('_', ' ').toLowerCase()}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-500 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 w-full bg-white z-20 border-t border-gray-200 flex justify-around py-3 pb-safe">
        {role === UserRole.ORG_ADMIN && (
          <>
            <button onClick={() => setCurrentPage('dashboard')} className={`flex flex-col items-center ${currentPage === 'dashboard' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <BarChart2 size={24} />
              <span className="text-[10px] mt-1">Stats</span>
            </button>
            <button onClick={() => setCurrentPage('view-entries')} className={`flex flex-col items-center ${currentPage === 'view-entries' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <Table2 size={24} />
              <span className="text-[10px] mt-1">Entries</span>
            </button>
            <button onClick={() => setCurrentPage('new-entry')} className={`flex flex-col items-center ${currentPage === 'new-entry' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <div className="bg-saffron-500 text-white p-3 rounded-full -mt-8 shadow-lg border-4 border-white">
                <FilePlus size={24} />
              </div>
              <span className="text-[10px] mt-1 font-semibold text-saffron-600">Add</span>
            </button>
            <button onClick={() => setCurrentPage('manage-routes')} className={`flex flex-col items-center ${currentPage === 'manage-routes' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <Map size={24} />
              <span className="text-[10px] mt-1">Routes</span>
            </button>
            <button onClick={() => setCurrentPage('add-sevak')} className={`flex flex-col items-center ${currentPage === 'add-sevak' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <UserPlus size={24} />
              <span className="text-[10px] mt-1">Sevaks</span>
            </button>
          </>
        )}
        {role === UserRole.SEVAK && (
          <>
            <button onClick={() => setCurrentPage('profile')} className={`flex flex-col items-center ${currentPage === 'profile' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <Home size={24} />
              <span className="text-[10px] mt-1">Home</span>
            </button>
            <button onClick={() => setCurrentPage('analytics')} className={`flex flex-col items-center ${currentPage === 'analytics' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <BarChart2 size={24} />
              <span className="text-[10px] mt-1">Stats</span>
            </button>
            <button onClick={() => setCurrentPage('my-vihars')} className={`flex flex-col items-center ${currentPage === 'my-vihars' ? 'text-saffron-600' : 'text-gray-400'}`}>
              <Footprints size={24} />
              <span className="text-[10px] mt-1">My Vihars</span>
            </button>
          </>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-0 pb-20 md:pb-0 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;