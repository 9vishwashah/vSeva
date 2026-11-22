import React, { useState } from 'react';
import { Footprints, MapPin, Users } from 'lucide-react';
import Layout from '../Layout';
import Dashboard from '../../pages/Dashboard';
import NewEntry from '../../pages/NewEntry';
import OnboardingWalkthrough from '../OnboardingWalkthrough';
import Notifications from '../../pages/Notifications';
import Statistics from '../../pages/Statistics';
import ViewEntries from '../../pages/ViewEntries';
import ProfileSection from '../ProfileSection';
import AdminContacts from '../../pages/AdminContacts';
import Contacts from '../../pages/Contacts';
import ViewReports from '../../pages/ViewReports';
import SubmitReport from '../../pages/SubmitReport';
import Channel from '../../pages/Channel';
import PendingApprovals from '../../pages/PendingApprovals';
import ManageRoutes from '../../pages/ManageRoutes';
import AddSevak from '../../pages/AddSevak';
import { ViharYearProvider } from '../../context/ViharYearContext';
import { UserRole, type UserProfile } from '../../types';
import { StatBlock, PageHeader, Card } from './index';

// Dev-only: the REAL app frame (components/Layout.tsx), so the restyled header, bottom nav and More sheet can be
// checked without signing in. design-core.html#shell-captain / #shell-sevak show sample content;
// #dashboard-captain / #dashboard-sevak mount the real Dashboard with a sample user (signed out, so it only
// shows its loading / empty states). Nothing here reads real data.

const SAMPLE_ID = '00000000-0000-0000-0000-000000000000';

const ShellHarness: React.FC<{ role: UserRole; dashboard?: boolean; screen?: 'entry' | 'onboarding' | 'app' }> = ({ role, dashboard, screen }) => {
  const [tour, setTour] = useState(screen === 'onboarding');
  const [page, setPage] = useState(role === UserRole.ORG_ADMIN ? 'dashboard' : 'analytics');
  const user: UserProfile = {
    id: SAMPLE_ID,
    organization_id: SAMPLE_ID,
    role,
    full_name: 'Vijay Mehta',
    username: 'sample',
    mobile: '0000000000',
    is_active: true,
    avatar_url: null,
  };
  return (
    <ViharYearProvider>
      <Layout
        role={role}
        userInitials="VM"
        userName="Vijay Mehta"
        avatarUrl={null}
        userId={SAMPLE_ID}
        onLogout={() => undefined}
        currentPage={page}
        setCurrentPage={setPage}
      >
        {tour && <OnboardingWalkthrough role={role} onDone={() => setTour(false)} />}
        {screen === 'app' ? (
          // every page the app routes to, same props as App.tsx (sample user, signed out: empty states only)
          page === 'dashboard' || page === 'analytics' ? <Dashboard currentUser={user} onAddVihar={() => setPage('new-entry')} navigateToEntries={() => setPage('view-entries')} navigateToProfile={() => setPage('profile')} />
          : page === 'new-entry' ? <NewEntry currentUser={user} onSubmit={() => setPage('dashboard')} onCancel={() => setPage('dashboard')} />
          : page === 'notifications' ? <Notifications currentUser={user} />
          : page === 'statistics' ? <Statistics currentUser={user} />
          : page === 'view-entries' || page === 'my-vihars' ? <ViewEntries currentUser={user} />
          : page === 'profile' ? <ProfileSection user={user} onProfileUpdated={async () => undefined} onLogout={() => undefined} onOpenSos={() => undefined} />
          : page === 'contacts' ? (role === UserRole.ORG_ADMIN ? <AdminContacts currentUser={user} /> : <Contacts currentUser={user} />)
          : page === 'reports' ? (role === UserRole.ORG_ADMIN ? <ViewReports currentUser={user} /> : <SubmitReport currentUser={user} />)
          : page === 'channel' ? <Channel currentUser={user} onOpenOrganization={() => undefined} />
          : page === 'pending-approvals' ? <PendingApprovals currentUser={user} />
          : page === 'manage-routes' ? <ManageRoutes currentUser={user} />
          : page === 'add-sevak' ? <AddSevak currentUser={user} />
          : <PageHeader title={page} />
        ) : screen === 'entry' ? (
          <NewEntry currentUser={user} onSubmit={() => setPage('dashboard')} onCancel={() => setPage('dashboard')} />
        ) : dashboard || screen === 'onboarding' ? (
          <Dashboard
            currentUser={user}
            orgDetails={{ id: SAMPLE_ID, name: 'Vihar Seva Group', city: 'Vashi, Navi Mumbai', vice_captain_name: 'Mukesh Duggad' } as any}
            onAddVihar={() => setPage('new-entry')}
            navigateToEntries={() => setPage('view-entries')}
          />
        ) : (
          <>
            <PageHeader kicker="Sample page · real app frame" title={page === 'profile' ? 'Profile' : 'Statistics'} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatBlock tone="mustard" label="Total KM" value="19.4" unit="km" icon={<Footprints />} />
              <StatBlock tone="sky" label="Vihars" value="5" icon={<MapPin />} />
              <StatBlock tone="pink" label="Sadhu / Sadhvi" value="12" of="3" icon={<Users />} />
              <StatBlock tone="tea" label="Total Sevaks" value="68" sub="37 M / 31 F" icon={<Users />} />
            </div>
            <Card className="mt-4">
              <p className="text-[15px] text-ink-2">Current page key: <b className="text-ink">{page}</b>. Tap the bottom bar, More, or the profile button to check navigation.</p>
            </Card>
            <div className="h-[900px]" aria-hidden="true" />
          </>
        )}
      </Layout>
    </ViharYearProvider>
  );
};

export default ShellHarness;
