import React from 'react';
import { UserRole } from '../types';
import { LogOut, Home, UserPlus, FilePlus, BarChart2, Table2, Map, Footprints, PhoneCall, ShieldAlert, Bell, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

import NotificationBell from './NotificationBell';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userInitials: string;
  userId?: string;
  onLogout: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, role, userInitials, userId, onLogout, currentPage, setCurrentPage
}) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('vseva_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('vseva_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // ignore — purely a per-device convenience, not required to persist
      }
      return next;
    });
  };

  // Bottom-nav regrouping — page keys unchanged, just reorganized into
  // primary pill items + a "More" sheet, per the Bottom Nav redesign.
  const primaryItems = role === UserRole.ORG_ADMIN
    ? [
      { page: 'dashboard', icon: <BarChart2 size={21} />, label: 'Stats' },
      { page: 'view-entries', icon: <Table2 size={21} />, label: 'Entries' },
      { page: 'new-entry', icon: <FilePlus size={23} />, label: 'Add' },
    ]
    : [
      // 'Home' shows the Dashboard/stats page (was wrongly wired to Profile & Settings —
      // the avatar button below is the only path to Profile & Settings now).
      { page: 'analytics', icon: <Home size={21} />, label: 'Home' },
      { page: 'my-vihars', icon: <Footprints size={21} />, label: 'My Vihars' },
    ];

  const moreItems = role === UserRole.ORG_ADMIN
    ? [
      { page: 'statistics', icon: <BarChart2 size={18} />, label: 'Statistics' },
      { page: 'manage-routes', icon: <Map size={18} />, label: 'Manage Routes' },
      { page: 'add-sevak', icon: <UserPlus size={18} />, label: 'Add Sevaks' },
      { page: 'contacts', icon: <PhoneCall size={18} />, label: 'Contacts' },
      { page: 'reports', icon: <ShieldAlert size={18} />, label: 'Reports' },
    ]
    : [
      { page: 'statistics', icon: <BarChart2 size={18} />, label: 'Statistics' },
      { page: 'contacts', icon: <PhoneCall size={18} />, label: 'Contacts' },
      { page: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
      { page: 'reports', icon: <ShieldAlert size={18} />, label: 'Reports' },
    ];

  const moreActive = moreItems.some(i => i.page === currentPage);

  const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      title={sidebarCollapsed ? label : undefined}
      className={`flex items-center w-full py-2 px-2.5 rounded-lg text-sm transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2.5'} ${currentPage === page
        ? 'bg-saffron-100 text-saffron-700 font-medium'
        : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      <Icon size={17} className="shrink-0" />
      {!sidebarCollapsed && <span>{label}</span>}
    </button>
  );

  const mainRef = React.useRef<HTMLElement>(null);
  const [headerVisible, setHeaderVisible] = React.useState(true);
  const lastScrollY = React.useRef(0);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop;
    if (y < 10) {
      setHeaderVisible(true);
    } else if (y > lastScrollY.current + 5) {
      setHeaderVisible(false); // scrolling down — hide
    } else if (y < lastScrollY.current - 5) {
      setHeaderVisible(true); // scrolling up — reveal
    }
    lastScrollY.current = y;
  };

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-full flex-shrink-0 relative transition-[width] duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        {/* Collapse/expand toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-saffron-600 hover:border-saffron-200 transition-colors z-10"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-4 border-b border-gray-100 ${sidebarCollapsed ? 'px-3' : ''}`}>
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <img src={vSevaLogo} alt="vSeva" className="h-9 w-9 object-contain drop-shadow-sm shrink-0" />
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg leading-tight font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">vSeva</h1>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">by VJAS</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {role === UserRole.ORG_ADMIN && (
            <>
              <NavItem page="dashboard" icon={BarChart2} label="Dashboard" />
              <NavItem page="statistics" icon={BarChart2} label="Statistics" />
              <NavItem page="view-entries" icon={Table2} label="View Entries" />
              <NavItem page="manage-routes" icon={Map} label="Manage Routes" />
              <NavItem page="new-entry" icon={FilePlus} label="New Entry" />
              <NavItem page="add-sevak" icon={UserPlus} label="Add Sevaks" />
              <NavItem page="notifications" icon={Bell} label="Notifications" />
              <NavItem page="contacts" icon={PhoneCall} label="Contacts" />
              <NavItem page="reports" icon={ShieldAlert} label="Reports" />
            </>
          )}

          {role === UserRole.SEVAK && (
            <>
              <NavItem page="profile" icon={Home} label="My Profile" />
              <NavItem page="analytics" icon={BarChart2} label="Analytics" />
              <NavItem page="statistics" icon={BarChart2} label="Statistics" />
              <NavItem page="my-vihars" icon={Footprints} label="My Vihars" />
              <NavItem page="notifications" icon={Bell} label="Notifications" />
              <NavItem page="contacts" icon={PhoneCall} label="Contacts" />
              <NavItem page="reports" icon={ShieldAlert} label="Reports" />
            </>
          )}
        </nav>

        <div className={`p-3 border-t border-gray-100 flex-shrink-0 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center mb-2.5 px-1 ${sidebarCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-1' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-saffron-100 text-saffron-600 flex items-center justify-center font-bold text-xs shrink-0">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="ml-2.5">
                  <p className="text-xs font-medium text-gray-700 leading-tight">Account</p>
                  <p className="text-[11px] text-gray-400 capitalize leading-tight">{role.replace('_', ' ').toLowerCase()}</p>
                </div>
              )}
            </div>
            <NotificationBell userId={userId} onViewAll={() => setCurrentPage('notifications')} />
          </div>
          <button
            onClick={onLogout}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center text-gray-500 hover:text-red-500 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2'}`}
          >
            <LogOut size={16} className="shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
          {/* Creator Credit - Desktop */}
          {!sidebarCollapsed && (
            <p className="text-center text-[8px] text-gray-300 mt-2 leading-tight select-none">
              Designed by{' '}
              <span className="font-semibold text-gray-400">Vishwa Alpesh Shah</span>
              {' '}(VJAS)
            </p>
          )}
        </div>
      </aside>

      {/* Mobile layout: flex-col with fixed navbars and scrollable middle */}
      <div className="flex-1 flex flex-col md:contents min-w-0">

        {/* Mobile Top Header — floating, hides on scroll-down, reveals on scroll-up */}
        <header
          className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 flex justify-between items-center z-20 transition-transform duration-300 ease-in-out"
          style={{ height: '56px', transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)' }}
        >
          <div className="flex items-center gap-2">
            <img src={vSevaLogo} alt="vSeva" className="h-8 w-8 object-contain drop-shadow-sm shrink-0" />
            <h1 className="text-lg font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">vSeva</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={userId} onViewAll={() => setCurrentPage('notifications')} />
          </div>
        </header>

        {/* Main Content — fills remaining height, scrolls independently */}
        <main
          ref={mainRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="max-w-7xl mx-auto px-4 pt-[72px] pb-28 md:p-8">
            {children}
          </div>
        </main>

        {/* Creator Credit - Mobile (above nav pill) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 83px)' }}>
          <p className="text-[8px] text-gray-400/60 select-none tracking-wide">
            Designed by <span className="font-medium">Vishwa Alpesh Shah</span> (VJAS)
          </p>
        </div>

        {/* Mobile Bottom Nav — expanding pill + More sheet + avatar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-2 sm:px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
        >
          <div
            className="flex items-center px-2 py-2 rounded-full shadow-[0_14px_30px_-10px_rgba(36,28,23,0.45)]"
            style={{ minHeight: '52px', background: '#241C17' }}
          >
            {primaryItems.map(item => {
              const active = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => setCurrentPage(item.page)}
                  className="flex items-center justify-center min-w-0 active:scale-95 transition-[flex-grow] duration-300 ease-out"
                  style={{ flex: `${active ? 1.7 : 1} 1 0%` }}
                >
                  <div
                    className="w-fit mx-auto flex items-center justify-center gap-1.5 p-3 rounded-full transition-colors duration-300"
                    style={active ? { background: 'linear-gradient(150deg,#FF9947,#DE6B38)' } : undefined}
                  >
                    <span style={{ color: active ? '#241C17' : '#B8A798' }}>{item.icon}</span>
                    {active && <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: '#241C17' }}>{item.label}</span>}
                  </div>
                </button>
              );
            })}

            {/* More */}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex items-center justify-center min-w-0 active:scale-95 transition-[flex-grow] duration-300 ease-out"
              style={{ flex: `${moreActive ? 1.7 : 1} 1 0%` }}
            >
              <div
                className="w-fit mx-auto flex items-center justify-center gap-1.5 p-3 rounded-full transition-colors duration-300"
                style={moreActive ? { background: 'linear-gradient(150deg,#FF9947,#DE6B38)' } : undefined}
              >
                <MoreHorizontal size={21} style={{ color: moreActive ? '#241C17' : '#B8A798' }} />
                {moreActive && <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: '#241C17' }}>More</span>}
              </div>
            </button>

            {/* Avatar — always visible, both roles, always goes to Profile & Settings.
                Merged into the same dark bar (not a separate floating circle) per the mock. */}
            <button
              onClick={() => setCurrentPage('profile')}
              className="shrink-0 flex items-center justify-center active:scale-95 transition-all duration-200"
            >
              <div
                className="rounded-full flex items-center justify-center font-bold text-[13px] text-white"
                style={{ width: 34, height: 34, background: 'linear-gradient(150deg,#FF9947,#DE6B38)' }}
              >
                {userInitials}
              </div>
            </button>
          </div>
        </nav>

        {/* More sheet */}
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex items-end justify-center" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full max-w-md bg-white rounded-t-[28px] p-4 shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-9 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
              <div className="space-y-1">
                {moreItems.map(item => {
                  const active = currentPage === item.page;
                  return (
                    <button
                      key={item.page}
                      onClick={() => { setCurrentPage(item.page); setMoreOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors active:scale-[0.98] ${active ? 'bg-saffron-50 text-saffron-700' : 'text-[#241C17] hover:bg-gray-50'}`}
                    >
                      <span className={active ? 'text-saffron-600' : 'text-[#8A6A57]'}>{item.icon}</span>
                      <span className="text-sm font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Layout;