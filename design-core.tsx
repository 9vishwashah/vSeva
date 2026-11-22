// Entry for the isolated Design Core preview (design-core.html). Dev only: not part of the app build.
//   design-core.html               -> the Design Core playground
//   design-core.html#shell-captain -> the real app frame (Layout) as a Captain, with sample content
//   design-core.html#shell-sevak   -> the same as a Sevak
//   design-core.html#dashboard-captain / #dashboard-sevak -> the real Dashboard inside the frame (sample user, no data)
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/design-core.css';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import DesignCorePlayground from './components/core/DesignCorePlayground';
import ShellHarness from './components/core/ShellHarness';
import { UserRole } from './types';

const hash = window.location.hash;
const view = hash === '#app-captain'
  ? <ShellHarness role={UserRole.ORG_ADMIN} screen="app" />
  : hash === '#app-sevak'
  ? <ShellHarness role={UserRole.SEVAK} screen="app" />
  : hash === '#entry-captain'
  ? <ShellHarness role={UserRole.ORG_ADMIN} screen="entry" />
  : hash === '#entry-sevak'
  ? <ShellHarness role={UserRole.SEVAK} screen="entry" />
  : hash === '#tour-captain'
  ? <ShellHarness role={UserRole.ORG_ADMIN} screen="onboarding" />
  : hash === '#tour-sevak'
  ? <ShellHarness role={UserRole.SEVAK} screen="onboarding" />
  : hash === '#dashboard-captain'
  ? <ShellHarness role={UserRole.ORG_ADMIN} dashboard />
  : hash === '#dashboard-sevak'
  ? <ShellHarness role={UserRole.SEVAK} dashboard />
  : hash === '#shell-captain'
  ? <ShellHarness role={UserRole.ORG_ADMIN} />
  : hash === '#shell-sevak'
    ? <ShellHarness role={UserRole.SEVAK} />
    : <DesignCorePlayground />;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ToastProvider>{view}</ToastProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
