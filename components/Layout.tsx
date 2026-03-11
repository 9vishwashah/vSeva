import React from 'react';
import { UserRole } from '../types';
import { LogOut, Home, UserPlus, FilePlus, BarChart2, Table2, Map, Footprints, PhoneCall } from 'lucide-react';


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

  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [currentPage]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src={vSevaLogo} alt="vSeva" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-sm" />
            <div>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">vSeva</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">by Vishwa Alpesh Shah</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {role === UserRole.ORG_ADMIN && (
            <>
              <NavItem page="dashboard" icon={BarChart2} label="Dashboard" />
              <NavItem page="view-entries" icon={Table2} label="View Entries" />
              <NavItem page="manage-routes" icon={Map} label="Manage Routes" />
              <NavItem page="new-entry" icon={FilePlus} label="New Entry" />
              <NavItem page="add-sevak" icon={UserPlus} label="Add Sevaks" />
              <NavItem page="contacts" icon={PhoneCall} label="Contacts" />
            </>
          )}

          {role === UserRole.SEVAK && (
            <>
              <NavItem page="profile" icon={Home} label="My Profile" />
              <NavItem page="analytics" icon={BarChart2} label="Analytics" />
              <NavItem page="my-vihars" icon={Footprints} label="My Vihars" />
              <NavItem page="contacts" icon={PhoneCall} label="Contacts" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
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

      {/* Mobile layout: flex-col with fixed navbars and scrollable middle */}
      <div className="flex-1 flex flex-col md:contents min-w-0">

        {/* Mobile Top Header — fixed within the flex column */}
        <header className="md:hidden flex-shrink-0 bg-white border-b border-gray-200 px-4 flex justify-between items-center z-20" style={{ height: '56px' }}>
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
            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden">
                  <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</p>
                    <p className="text-sm font-medium text-gray-700 capitalize truncate">{role.replace('_', ' ').toLowerCase()}</p>
                  </div>
                  {role === UserRole.ORG_ADMIN && (
                    <button
                      onClick={() => { setCurrentPage('contacts'); setIsProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-saffron-50 text-saffron-600 flex items-center gap-2 text-sm font-medium transition-colors border-b border-gray-50"
                    >
                      <PhoneCall size={16} />
                      <span>Contacts</span>
                    </button>
                  )}
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
        </header>

        {/* Main Content — fills remaining height, scrolls independently */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav — floating pill */}
        <nav
          className="md:hidden flex-shrink-0 z-20 px-4 pb-3 pt-1"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <div
            className="bg-orange-50 border border-orange-200 rounded-3xl flex justify-around items-center px-3 shadow-md shadow-orange-100"
            style={{ minHeight: '62px' }}
          >
            {role === UserRole.ORG_ADMIN && (() => {
              const items = [
                { page: 'dashboard', icon: <BarChart2 size={20} />, label: 'Stats' },
                { page: 'view-entries', icon: <Table2 size={20} />, label: 'Entries' },
                { page: 'new-entry', icon: <FilePlus size={22} />, label: 'Add', isCta: true },
                { page: 'manage-routes', icon: <Map size={20} />, label: 'Routes' },
                { page: 'add-sevak', icon: <UserPlus size={20} />, label: 'Sevaks' },
              ];
              return items.map(item => (
                  <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex flex-col items-center py-2 px-2 w-16 active:scale-95 transition-transform">
                    <div className={`px-3 py-2 rounded-2xl transition-all flex flex-col items-center gap-0.5 ${currentPage === item.page ? 'bg-saffron-500 shadow-md shadow-saffron-200' : ''}`}>
                      <span className={currentPage === item.page ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                      <span className={`text-[9px] font-semibold leading-none ${currentPage === item.page ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                    </div>
                  </button>
              ));
            })()}

            {role === UserRole.SEVAK && (() => {
              const items = [
                { page: 'profile', icon: <Home size={20} />, label: 'Home' },
                { page: 'analytics', icon: <BarChart2 size={20} />, label: 'Stats' },
                { page: 'my-vihars', icon: <Footprints size={20} />, label: 'My Vihars' },
                { page: 'contacts', icon: <PhoneCall size={20} />, label: 'Contacts' },
              ];
              return items.map(item => (
                <button key={item.page} onClick={() => setCurrentPage(item.page)} className="flex flex-col items-center py-2 px-2 active:scale-95 transition-transform">
                  <div className={`px-3 py-2 rounded-2xl transition-all flex flex-col items-center gap-0.5 ${currentPage === item.page ? 'bg-saffron-500 shadow-md shadow-saffron-200' : ''}`}>
                    <span className={currentPage === item.page ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                    <span className={`text-[9px] font-semibold leading-none ${currentPage === item.page ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                  </div>
                </button>
              ));
            })()}
          </div>
        </nav>

      </div>
    </div>
  );
};

export default Layout;