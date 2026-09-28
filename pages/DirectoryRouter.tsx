import React, { useEffect, useState } from 'react';
import Directory from './Directory';
import DirectoryListingDetail from './DirectoryListingDetail';
import AddDirectoryListing from './AddDirectoryListing';

// A tiny router scoped only to /directory* — this app has no React Router
// anywhere (App.tsx is pure currentPage-string state), and pulling in a full
// routing library for three public routes would be a bigger dependency than
// the problem warrants. pushState/popstate is all that's actually needed for
// a real, bookmarkable, back-button-correct URL.
const DirectoryRouter: React.FC = () => {
  const [path, setPath] = useState(window.location.pathname);

  const navigate = (to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
    }
    setPath(to);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const segments = normalized.split('/').filter(Boolean); // ['directory', ...rest]
  const sub = segments[1];

  if (sub === 'add') return <AddDirectoryListing onNavigate={navigate} />;
  if (sub) return <DirectoryListingDetail slug={sub} onNavigate={navigate} />;
  return <Directory onNavigate={navigate} />;
};

export default DirectoryRouter;
