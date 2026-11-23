import React from 'react';
import { PageIntro, Section, SiteShell } from './ui';
import { PAGE_META } from './seo';
import RouteFinder from './RouteDirectory';

// /vihar-routes: the full public route directory (search, filters, every route, Captain contacts).
const RoutesPage: React.FC = () => {
  const meta = PAGE_META['/vihar-routes'];
  return (
    <SiteShell page="routes" title={meta.title} description={meta.description}>
      <PageIntro
        crumb="Vihar routes"
        eyebrow="Vihar route directory"
        title={<>Find a Vihar route<span className="vs-accent">.</span></>}
        lede="Routes shared by Vihar Seva groups on vSeva, with distances, directions and the Captain to contact. Search from and to, or browse by city."
      />
      <Section className="pb-20 md:pb-28">
        <RouteFinder />
      </Section>
    </SiteShell>
  );
};

export default RoutesPage;
