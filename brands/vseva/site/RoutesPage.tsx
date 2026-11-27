import React, { useMemo } from 'react';
import { PageIntro, Section, SiteShell } from './ui';
import { PAGE_META } from './seo';
import { ROUTE_FAQ } from './content';
import RouteFinder, { useDirectory, type Directory } from './RouteDirectory';

// /vihar-routes: the public route directory (search, filters, every route, Captain contacts), then every route as a
// plain list by city and the common questions. The build writes the directory into this page (siteData.ts), so the
// whole list is in the HTML that search engines and AI assistants read.

const fmtKm = (k: number) => (k % 1 ? k.toFixed(1) : String(k));

// Routes by the city of the group that shared them, biggest cities first
const byCity = (dir: Directory) => {
  const cities = new Map<string, { from: string; to: string; km: number; via: string | null }[]>();
  for (const [from, to, km, groups, via] of dir.routes) {
    const city = dir.groups[groups[0]]?.c || 'Other places';
    if (!cities.has(city)) cities.set(city, []);
    cities.get(city)!.push({ from, to, km, via });
  }
  return [...cities.entries()]
    .map(([city, routes]) => ({ city, routes: routes.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)) }))
    .sort((a, b) => b.routes.length - a.routes.length || a.city.localeCompare(b.city));
};

const AllRoutes: React.FC = () => {
  const { dir } = useDirectory();
  const cities = useMemo(() => (dir ? byCity(dir) : []), [dir]);
  if (!dir || cities.length === 0) return null;
  return (
    <Section className="border-t border-[color:var(--line)] py-16 md:py-20" labelledBy="all-routes-title">
      <p className="vs-eyebrow">Every route</p>
      <h2 id="all-routes-title" className="vs-h2 mt-4 max-w-[22ch]">All {dir.stats.routes} Vihar routes, by city.</h2>
      <p className="vs-lede mt-4 max-w-[62ch]">
        Every Vihar route shared by {dir.stats.groups} Vihar Seva groups on vSeva, with its distance. Search above for walking
        directions and the Captain to contact.
      </p>
      <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {cities.map(({ city, routes }) => (
          <section key={city} aria-labelledby={`city-${city}`} className="min-w-0">
            <h3 id={`city-${city}`} className="flex items-baseline justify-between gap-3 border-b border-[color:var(--line)] pb-2 font-[family-name:var(--display)] text-[1.25rem] font-extrabold tracking-[-0.015em]">
              Vihar routes in {city}
              <span className="text-[0.8rem] font-semibold text-[color:var(--muted)]">{routes.length}</span>
            </h3>
            <ul className="mt-2 divide-y divide-[color:var(--line)]/70">
              {routes.map((r, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-1.5 text-[0.92rem]">
                  <span className="min-w-0 text-[color:var(--ink-2)]">
                    {r.from} <span aria-hidden>→</span><span className="sr-only">to</span> {r.to}
                    {r.via && <span className="text-[color:var(--muted)]"> (via {r.via})</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[color:var(--ink)]">{fmtKm(r.km)} km</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
};

const RouteFaq: React.FC = () => (
  <Section className="border-t border-[color:var(--line)] py-16 md:py-20" labelledBy="route-faq-title">
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="vs-eyebrow">Questions</p>
        <h2 id="route-faq-title" className="vs-h2 mt-4">About Vihar routes.</h2>
      </div>
      <div className="lg:col-span-8">
        {ROUTE_FAQ.map(f => (
          <details key={f.q} className="group border-b border-[color:var(--line)] py-1" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-[family-name:var(--display)] text-[1.15rem] font-bold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-[color:var(--saffron-deep)] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-[color:var(--ink-2)]">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </Section>
);

const RoutesPage: React.FC = () => {
  const meta = PAGE_META['/vihar-routes'];
  return (
    <SiteShell page="routes" title={meta.title} description={meta.description}>
      <PageIntro
        crumb="Vihar routes"
        eyebrow="Vihar route directory"
        title={<>Find a Vihar route<span className="vs-accent">.</span></>}
        lede="Jain Vihar routes shared by Vihar Seva groups on vSeva, with distances, walking directions and the Captain to contact. Search from and to, or browse every route by city below."
      />
      <Section className="pb-20 md:pb-28">
        <RouteFinder />
      </Section>
      <AllRoutes />
      <RouteFaq />
    </SiteShell>
  );
};

export default RoutesPage;
