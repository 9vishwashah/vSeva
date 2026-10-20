import React from 'react';
import DocumentationPage from './site/DocumentationPage';
import ContactPage from './site/ContactPage';
import SupportPage from './site/SupportPage';

// The public website's inner pages (see ./publicPaths.ts). Loaded on demand by App.tsx.
const PublicRoutes: React.FC<{ path: string }> = ({ path }) => {
  if (path === '/documentation') return <DocumentationPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/support-us') return <SupportPage />;
  return null;
};

export default PublicRoutes;
