import React from 'react';
import { UserRole, UserNotification } from '../types';
import { LogOut, Home, UserPlus, FilePlus, BarChart2, Table2, Map, Footprints, PhoneCall, ShieldAlert, Bell, MoreHorizontal, ChevronLeft, ChevronRight, ClipboardCheck, WifiOff, Compass, MessageSquare } from 'lucide-react';

import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import LanguageDropdown from './LanguageDropdown';
import Avatar from './Avatar';
import { BRAND } from '@brand';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';
import { useLanguage } from '../context/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userInitials: string;
  userName?: string;
  avatarUrl?: string | null;
  userId?: string;
  onLogout: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  /** Tapping a notification in the bell: open the screen it is about. */
  onOpenNotification?: (n: UserNotification) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children, role, userInitials, userName, avatarUrl, userId, onLogout, currentPage, setCurrentPage, onOpenNotification
}) => {
  const isOnline = useOnlineStatus();
  const { t } = useLanguage();
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
      { page: 'dashboard', icon: <BarChart2 size={21} />, label: t('nav.statistics') },
      { page: 'view-entries', icon: <Table2 size={21} />, label: t('nav.viewEntries') },
      { page: 'new-entry', icon: <FilePlus size={23} />, label: t('nav.newEntry') },
    ]
    : [
      // 'Home' shows the Dashboard/stats page (was wrongly wired to Profile & Settings —
      // the avatar button below is the only path to Profile & Settings now).
      { page: 'analytics', icon: <Home size={21} />, label: t('nav.home') },
      { page: 'my-vihars', icon: <Footprints size={21} />, label: t('nav.myVihars') },
    ];

  const moreItems = role === UserRole.ORG_ADMIN
    ? [
      { page: 'statistics', icon: <BarChart2 size={18} />, label: t('nav.groupAnalytics') },
      { page: 'pending-approvals', icon: <ClipboardCheck size={18} />, label: t('nav.pendingApprovals') },
      { page: 'manage-routes', icon: <Map size={18} />, label: t('nav.manageRoutes') },
      { page: 'add-sevak', icon: <UserPlus size={18} />, label: t('nav.addSevaks') },
      { page: 'channel', icon: <MessageSquare size={18} />, label: t('nav.vchat') },
      { page: 'contacts', icon: <PhoneCall size={18} />, label: t('nav.contacts') },
      { page: 'reports', icon: <ShieldAlert size={18} />, label: t('nav.reports') },
    ]
    : [
      { page: 'new-entry', icon: <FilePlus size={18} />, label: t('nav.addVihar') },
      { page: 'statistics', icon: <BarChart2 size={18} />, label: t('nav.groupAnalytics') },
      { page: 'channel', icon: <MessageSquare size={18} />, label: t('nav.vchat') },
      { page: 'contacts', icon: <PhoneCall size={18} />, label: t('nav.contacts') },
      { page: 'notifications', icon: <Bell size={18} />, label: t('nav.notifications') },
      { page: 'reports', icon: <ShieldAlert size={18} />, label: t('nav.reports') },
    ];

  const moreActive = moreItems.some(i => i.page === currentPage);

  const NavItem = ({ page, icon: Icon, label, tone }: { page: string, icon: any, label: string, tone?: 'purple' }) => (
    <button
      onClick={() => setCurrentPage(page)}
      title={sidebarCollapsed ? label : undefined}
      className={`flex items-center w-full py-2 px-2.5 rounded-lg text-sm transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2.5'} ${currentPage === page
        ? (tone === 'purple' ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-saffron-100 text-saffron-700 font-medium')
        : (tone === 'purple' ? 'text-purple-700 hover:bg-purple-50' : 'text-gray-600 hover:bg-gray-50')
        }`}
    >
      <Icon size={17} className={`shrink-0 ${tone === 'purple' ? 'text-purple-600' : ''}`} />
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

  // A tiny haptic tick on tab changes, like native apps (ignored where unsupported).
  const tick = () => { try { (navigator as any).vibrate?.(8); } catch { /* ignore */ } };

  // "More" sheet: glides up, drag down (or tap outside / back button) to glide away.
  const sheet = useSwipeDismiss(() => setMoreOpen(false), { enabled: moreOpen });

  // Swipe left/right between the main tabs, like WhatsApp's Chats / Status / Calls. Forms and detail
  // pages are left out on purpose so a sideways drag never costs anyone their input.
  const swipeOrder = role === UserRole.ORG_ADMIN
    ? ['dashboard', 'view-entries', 'statistics', 'pending-approvals']
    : ['analytics', 'my-vihars', 'statistics'];

  const prevPageRef = React.useRef(currentPage);
  const slideDirRef = React.useRef<'next' | 'prev' | null>(null);
  if (prevPageRef.current !== currentPage) {
    const a = swipeOrder.indexOf(prevPageRef.current);
    const b = swipeOrder.indexOf(currentPage);
    slideDirRef.current = a >= 0 && b >= 0 ? (b > a ? 'next' : 'prev') : null;
    prevPageRef.current = currentPage;
  }

  const latest = React.useRef({ currentPage, swipeOrder, moreOpen, setCurrentPage });
  latest.current = { currentPage, swipeOrder, moreOpen, setCurrentPage };
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const g = { x0: 0, y0: 0, t0: 0, dx: 0, active: false, horizontal: false };

    // Don't hijack gestures that belong to something else: inputs, maps, and anything that scrolls sideways.
    const shouldSkip = (target: EventTarget | null) => {
      let n = target as HTMLElement | null;
      while (n && n !== el) {
        if (n.matches?.('input, textarea, select, canvas, iframe, [data-no-swipe], .leaflet-container')) return true;
        if (n.scrollWidth > n.clientWidth + 2) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        n = n.parentElement;
      }
      return false;
    };
    const neighbour = (dir: 1 | -1): string | null => {
      const { swipeOrder: order, currentPage: cur } = latest.current;
      const i = order.indexOf(cur);
      return i < 0 ? null : (order[i + dir] ?? null);
    };

    const onStart = (e: TouchEvent) => {
      const L = latest.current;
      if (window.innerWidth >= 768 || L.moreOpen || e.touches.length !== 1) return;
      if (L.swipeOrder.indexOf(L.currentPage) < 0) return;
      const t = e.touches[0];
      if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return; // leave the system's edge gestures alone
      if (shouldSkip(e.target)) return;
      g.x0 = t.clientX; g.y0 = t.clientY; g.t0 = Date.now(); g.dx = 0; g.active = true; g.horizontal = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!g.active) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x0;
      const dy = t.clientY - g.y0;
      if (!g.horizontal) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g.active = false; return; } // it's a scroll
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        g.horizontal = true;
      }
      g.dx = dx;
      const c = contentRef.current;
      if (!c) return;
      // follow the finger (half speed); at the first/last tab it resists
      const shift = neighbour(dx < 0 ? 1 : -1) ? dx * 0.5 : dx * 0.12;
      c.style.transition = 'none';
      c.style.transform = `translateX(${shift}px)`;
      c.style.opacity = String(1 - Math.min(Math.abs(shift) / 420, 0.35));
    };
    const onEnd = () => {
      if (!g.active) return;
      g.active = false;
      if (!g.horizontal) return;
      const c = contentRef.current;
      const dx = g.dx;
      const velocity = Math.abs(dx) / Math.max(1, Date.now() - g.t0);
      const target = neighbour(dx < 0 ? 1 : -1);
      if (target && (Math.abs(dx) > 70 || (velocity > 0.45 && Math.abs(dx) > 30))) {
        if (c) { c.style.transition = ''; c.style.transform = ''; c.style.opacity = ''; }
        tick();
        latest.current.setCurrentPage(target);
      } else if (c) {
        c.style.transition = 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 220ms ease-out';
        c.style.transform = '';
        c.style.opacity = '';
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 font-sans">
      {/* Global offline notice — appears the instant the browser loses its
          connection, regardless of which page is open or whether that page's
          own fetch has failed yet. Auto-hides the moment 'online' fires. */}
      {!isOnline && (
        <div className="fixed top-2 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-amber-600 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-lg app-modal-backdrop">
            <WifiOff size={15} className="shrink-0" />
            <span>{t('nav.offline')}</span>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-full flex-shrink-0 relative transition-[width] duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        {/* Collapse/expand toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-saffron-600 hover:border-saffron-200 transition-colors z-10"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-4 border-b border-gray-100 ${sidebarCollapsed ? 'px-3' : ''}`}>
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-9 object-contain drop-shadow-sm shrink-0" />
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg leading-tight font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">{BRAND.shortName}</h1>
                {(BRAND.cardCredit ?? (BRAND.shortName !== BRAND.name ? BRAND.name : null)) && (
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide">{BRAND.cardCredit ?? BRAND.name}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {role === UserRole.ORG_ADMIN && (
            <>
              <NavItem page="dashboard" icon={BarChart2} label={t('nav.dashboard')} />
              <NavItem page="statistics" icon={BarChart2} label={t('nav.groupAnalytics')} />
              <NavItem page="view-entries" icon={Table2} label={t('nav.viewEntries')} />
              <NavItem page="pending-approvals" icon={ClipboardCheck} label={t('nav.pendingApprovals')} />
              <NavItem page="manage-routes" icon={Map} label={t('nav.manageRoutes')} />
              <NavItem page="new-entry" icon={FilePlus} label={t('nav.newEntry')} />
              <NavItem page="add-sevak" icon={UserPlus} label={t('nav.addSevaks')} />
              <NavItem page="channel" icon={MessageSquare} label={t('nav.vchat')} />
              <NavItem page="notifications" icon={Bell} label={t('nav.notifications')} />
              <NavItem page="contacts" icon={PhoneCall} label={t('nav.contacts')} />
              <NavItem page="reports" icon={ShieldAlert} label={t('nav.reports')} />
              <a
                href="/directory"
                target="_blank"
                rel="noopener noreferrer"
                title={sidebarCollapsed ? t('nav.communityDirectory') : undefined}
                className={`flex items-center w-full py-2 px-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}
              >
                <Compass size={17} className="shrink-0" />
                {!sidebarCollapsed && <span>{t('nav.communityDirectory')}</span>}
              </a>
            </>
          )}

          {role === UserRole.SEVAK && (
            <>
              <NavItem page="analytics" icon={BarChart2} label={t('nav.myDashboard')} />
              <NavItem page="statistics" icon={BarChart2} label={t('nav.groupAnalytics')} />
              <NavItem page="my-vihars" icon={Footprints} label={t('nav.myVihars')} />
              <NavItem page="new-entry" icon={FilePlus} label={t('nav.addVihar')} />
              <NavItem page="channel" icon={MessageSquare} label={t('nav.vchat')} />
              <NavItem page="notifications" icon={Bell} label={t('nav.notifications')} />
              <NavItem page="contacts" icon={PhoneCall} label={t('nav.contacts')} />
              <NavItem page="reports" icon={ShieldAlert} label={t('nav.reports')} />
              <a
                href="/directory"
                target="_blank"
                rel="noopener noreferrer"
                title={sidebarCollapsed ? t('nav.communityDirectory') : undefined}
                className={`flex items-center w-full py-2 px-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2.5'}`}
              >
                <Compass size={17} className="shrink-0" />
                {!sidebarCollapsed && <span>{t('nav.communityDirectory')}</span>}
              </a>
            </>
          )}
        </nav>

        <div className={`p-3 border-t border-gray-100 flex-shrink-0 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center mb-2.5 px-1 ${sidebarCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            <button
              onClick={() => setCurrentPage('profile')}
              title={t('nav.myProfile')}
              className={`flex items-center rounded-lg transition-colors -ml-1 px-1 py-1 ${currentPage === 'profile' ? 'bg-saffron-50' : 'hover:bg-gray-50'} ${sidebarCollapsed ? 'flex-col gap-1' : ''}`}
            >
              <Avatar name={userName || userInitials} url={avatarUrl} size={28} className="text-xs" />
              {!sidebarCollapsed && (
                <div className="ml-2.5 text-left">
                  <p className={`text-xs font-medium leading-tight ${currentPage === 'profile' ? 'text-saffron-700' : 'text-gray-700'}`}>{t('nav.account')}</p>
                  <p className="text-[11px] text-gray-400 capitalize leading-tight">{role === UserRole.ORG_ADMIN ? t('nav.captain') : t('nav.sevak')}</p>
                </div>
              )}
            </button>
            <NotificationBell userId={userId} role={role} onOpenNotification={onOpenNotification} onViewAll={() => setCurrentPage('notifications')} />
          </div>
          {/* Language: one compact dropdown instead of three pills squeezed beside the account name */}
          {!sidebarCollapsed && <LanguageDropdown placement="top" block className="mb-2.5" />}
          <button
            onClick={onLogout}
            title={sidebarCollapsed ? t('nav.signOut') : undefined}
            className={`flex items-center text-gray-500 hover:text-red-500 w-full px-2 py-1.5 text-sm rounded-lg hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'justify-center' : 'space-x-2'}`}
          >
            <LogOut size={16} className="shrink-0" />
            {!sidebarCollapsed && <span>{t('nav.signOut')}</span>}
          </button>
          {/* Creator Credit - Desktop */}
          {!sidebarCollapsed && BRAND.designer && (
            <p className="text-center text-[8px] text-gray-300 mt-2 leading-tight select-none">
              Designed by{' '}
              <span className="font-semibold text-gray-400">{BRAND.designer.name}</span>
              {' '}({BRAND.designer.org})
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
            <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-8 object-contain drop-shadow-sm shrink-0" />
            <h1 className="text-lg font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent">{BRAND.shortName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <NotificationBell userId={userId} role={role} onOpenNotification={onOpenNotification} onViewAll={() => setCurrentPage('notifications')} />
          </div>
        </header>

        {/* Main Content — fills remaining height, scrolls independently */}
        <main
          ref={mainRef}
          onScroll={handleMainScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' } as React.CSSProperties}
        >
          <div className="max-w-7xl mx-auto px-4 pt-[72px] pb-28 md:p-8">
            <div key={currentPage} ref={contentRef} className={slideDirRef.current ? `app-slide-${slideDirRef.current}` : undefined}>
              {children}
            </div>
          </div>
        </main>

        {/* Creator Credit - Mobile (above nav pill) */}
        {BRAND.designer && <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex justify-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 83px)' }}>
          <p className="text-[8px] text-gray-400/60 select-none tracking-wide">
            Designed by <span className="font-medium">{BRAND.designer.name}</span> ({BRAND.designer.org})
          </p>
        </div>}

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
                  onClick={() => { tick(); setCurrentPage(item.page); }}
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
              onClick={() => { tick(); setMoreOpen(true); }}
              className="flex items-center justify-center min-w-0 active:scale-95 transition-[flex-grow] duration-300 ease-out"
              style={{ flex: `${moreActive ? 1.7 : 1} 1 0%` }}
            >
              <div
                className="w-fit mx-auto flex items-center justify-center gap-1.5 p-3 rounded-full transition-colors duration-300"
                style={moreActive ? { background: 'linear-gradient(150deg,#FF9947,#DE6B38)' } : undefined}
              >
                <MoreHorizontal size={21} style={{ color: moreActive ? '#241C17' : '#B8A798' }} />
                {moreActive && <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: '#241C17' }}>{t('nav.more')}</span>}
              </div>
            </button>

            {/* Avatar — always visible, both roles, always goes to Profile & Settings.
                Merged into the same dark bar (not a separate floating circle) per the mock. */}
            <button
              onClick={() => setCurrentPage('profile')}
              className="shrink-0 flex items-center justify-center active:scale-95 transition-all duration-200"
            >
              <Avatar name={userName || userInitials} url={avatarUrl} size={34} variant="gradient" className="text-[13px]" />
            </button>
          </div>
        </nav>

        {/* More sheet */}
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex items-end justify-center" onClick={sheet.close}>
            <div ref={sheet.backdropRef} className="absolute inset-0 bg-black/40 app-modal-backdrop" />
            <div
              ref={sheet.sheetRef}
              {...sheet.handlers}
              className="relative w-full max-w-md bg-white rounded-t-[28px] p-4 shadow-2xl app-sheet-up"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', overscrollBehavior: 'contain' }}
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
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors active:scale-[0.98] ${active ? ((item as any).tone === 'purple' ? 'bg-purple-50 text-purple-700' : 'bg-saffron-50 text-saffron-700') : 'text-[#241C17] hover:bg-gray-50'}`}
                    >
                      <span className={(item as any).tone === 'purple' ? 'text-purple-600' : active ? 'text-saffron-600' : 'text-[#8A6A57]'}>{item.icon}</span>
                      <span className="text-sm font-bold">{item.label}</span>
                    </button>
                  );
                })}
                <a
                  href="/directory"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreOpen(false)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors active:scale-[0.98] text-[#241C17] hover:bg-gray-50"
                >
                  <span className="text-[#8A6A57]"><Compass size={18} /></span>
                  <span className="text-sm font-bold">{t('nav.communityDirectory')}</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Layout;