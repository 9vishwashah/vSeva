import React, { useState } from 'react';
import {
  BarChart2, Table2, FilePlus, MoreHorizontal, Bell, Languages, MapPin, Download, Footprints, Users, Activity,
  Target, Trophy, Flame, Inbox, Check, Clock, X, Plus,
} from 'lucide-react';
import { BRAND as VSEVA } from '../../brands/vseva';
import { BRAND as SSG } from '../../brands/ssg';
import {
  Button, IconButton, Field, Input, Select, SearchField, Textarea, Card, PageHeader, SectionTitle, StatBlock,
  StatBlockSkeleton, StatusBadge, Chip, ProgressBar, EmptyState, CoreSkeleton, AppHeader, ProfileButton, BottomNav,
  Segmented, ChipTabs, CoreSheet, ToastView, FormFooter, brandIdentity, CORE_COLORS,
} from './index';

// Isolated preview of the vSeva Design Core (served only by design-core.html in dev; not part of the app).
// Every number and name below is sample data.

const BRANDS = { vseva: brandIdentity(VSEVA), ssg: brandIdentity(SSG) };

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="flex flex-col gap-4">
    <div>
      <SectionTitle>{title}</SectionTitle>
      {note && <p className="mt-1 max-w-[68ch] text-sm text-ink-2">{note}</p>}
    </div>
    {children}
  </section>
);

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Statistics screen in the same order as pages/Dashboard.tsx today, restyled only
const StatisticsPhone: React.FC<{ brand: keyof typeof BRANDS; loading: boolean }> = ({ brand, loading }) => {
  const id = BRANDS[brand];
  const [page, setPage] = useState('dashboard');
  return (
    <div className="relative mx-auto h-[760px] w-[390px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-ink bg-canvas">
      <div className="h-full overflow-y-auto pb-28 [scrollbar-width:none]">
        <AppHeader
          logo={id.logo}
          name={id.name}
          logoPadded={id.logoPadded}
          className="sticky top-0 z-10"
          right={
            <>
              <IconButton label="Language"><Languages size={18} /></IconButton>
              <IconButton label="Notifications"><Bell size={18} /></IconButton>
              <ProfileButton name="Vijay Mehta" onClick={() => setPage('profile')} active={page === 'profile'} />
            </>
          }
        />
        <div className="flex flex-col gap-4 px-4 pt-2">
          {loading ? (
            <>
              <CoreSkeleton className="h-4 w-44 rounded-full" />
              <div className="flex gap-2"><CoreSkeleton className="h-8 w-40 rounded-full" /><CoreSkeleton className="h-8 w-36 rounded-full" /></div>
              <div className="flex gap-2"><CoreSkeleton className="h-12 flex-1 rounded-full" /><CoreSkeleton className="h-12 flex-1 rounded-full" /></div>
              <CoreSkeleton className="h-[132px] rounded-tile" />
              <CoreSkeleton className="h-6 w-32 rounded-lg" />
              <div className="grid grid-cols-2 gap-3"><StatBlockSkeleton /><StatBlockSkeleton /><StatBlockSkeleton /><StatBlockSkeleton /></div>
              <CoreSkeleton className="h-28 rounded-card" />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-ink-2">Vihar Seva Group · Vashi, Navi Mumbai</div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="ink">Captain · Vijay Mehta</Chip>
                  <Chip>Vice Captain · Mukesh Duggad</Chip>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1"><MapPin size={18} /> Alert Vihar</Button>
                <Button variant="secondary" className="flex-1"><Download size={18} /> Export</Button>
              </div>
              <div className="rounded-tile bg-block-lavender p-4 text-ink">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink/70">Group Sankalp · VY 2026-27</span>
                  <Target size={18} className="text-ink/70" aria-hidden="true" />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="display num text-[2.6rem] font-extrabold">5</span>
                  <span className="display num text-2xl font-bold opacity-55">/ 200</span>
                </div>
                <ProgressBar value={5} max={200} className="mt-2" />
                <div className="mt-1.5 text-xs font-medium text-ink/70">3% complete · 195 Vihars remaining this Vihar Year</div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="display text-2xl font-bold">Org Stats</span>
                <div className="flex gap-1.5">
                  <Chip tone="saffron">Motivate</Chip>
                  <Chip>VY 2026-27</Chip>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBlock tone="mustard" label="Total KM" value="19.4" unit="km" icon={<Footprints />} />
                <StatBlock tone="sky" label="Vihars" value="5" icon={<MapPin />} />
                <StatBlock tone="pink" label="Sadhu / Sadhvi" value="12" of="3" icon={<Users />} />
                <StatBlock tone="tea" label="Total Sevaks" value="68" sub="37 M / 31 F" icon={<Users />} />
                <StatBlock tone="plain" label="Group rank" value="#4" icon={<Trophy />} />
                <StatBlock tone="plain" label="Streak" value="3" unit="days" icon={<Flame />} />
              </div>
              <StatBlock tone="ink" label="Active Sevaks this week" value="4" onClick={() => undefined} />
              <Card>
                <div className="text-[15px] font-semibold">Consistency · This week</div>
                <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
                  {DAYS.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-medium text-ink-3">{d}</span>
                      <span className={`h-9 w-9 rounded-full ${[0, 2, 3].includes(i) ? 'bg-block-tea' : 'bg-sunken'}`} />
                    </div>
                  ))}
                </div>
              </Card>
              <SectionTitle>Recent activity</SectionTitle>
              <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between"><Chip tone="sky">Internal · Morning</Chip><StatusBadge kind="pending" icon={<Clock size={12} />}>Pending</StatusBadge></div>
                <div className="display text-[1.4rem] font-bold">Vashi <span className="opacity-45">→</span> Sanpada</div>
                <div className="text-[13px] text-ink-2">18 Nov · 4.2 km · 3 Sadhu, 2 Sadhvi</div>
              </Card>
            </>
          )}
        </div>
      </div>
      <BottomNav
        className="absolute inset-x-0 bottom-0"
        items={[
          { key: 'dashboard', label: 'Statistics', icon: <BarChart2 /> },
          { key: 'view-entries', label: 'View Entries', icon: <Table2 /> },
          { key: 'new-entry', label: 'New Entry', icon: <FilePlus /> },
          { key: '__more', label: 'More', icon: <MoreHorizontal /> },
        ]}
        activeKey={page}
        actionKey="new-entry"
        onSelect={setPage}
      />
    </div>
  );
};

const Swatch: React.FC<{ name: string; hex: string; dark?: boolean }> = ({ name, hex, dark }) => (
  <div className="flex min-h-[84px] flex-col justify-between rounded-2xl p-3 text-xs ring-1 ring-inset ring-black/5" style={{ background: hex, color: dark ? CORE_COLORS.seashell : CORE_COLORS.ink }}>
    <span className="font-semibold">{name}</span>
    <span className="font-core-mono">{hex}</span>
  </div>
);

const DesignCorePlayground: React.FC = () => {
  const [brand, setBrand] = useState<keyof typeof BRANDS>('vseva');
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [type, setType] = useState<'internal' | 'highway' | 'car'>('internal');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  return (
    <div className="vs-core min-h-screen">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          kicker="Phase 1 · Isolated preview · Sample data"
          title="vSeva Design Core"
          actions={
            <>
              <Segmented label="Brand" value={brand} onChange={setBrand} options={[{ value: 'vseva', label: 'vSeva' }, { value: 'ssg', label: 'SSG' }]} />
              <Button variant={loading ? 'dark' : 'secondary'} size="sm" onClick={() => setLoading(l => !l)}>{loading ? 'Show content' : 'Show loading'}</Button>
            </>
          }
        >
          <p className="mt-2 max-w-[68ch] text-[15px] text-ink-2">Lekha's design language adapted to vSeva. Both apps share this palette; only the logo, name and status-bar colour change with the brand.</p>
        </PageHeader>

        <div className="grid items-start gap-10 lg:grid-cols-[390px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <StatisticsPhone brand={brand} loading={loading} />
            <p className="text-sm text-ink-2">Captain Statistics, same order as today · profile moved top right</p>
          </div>

          <div className="flex min-w-0 flex-col gap-12">
            <Section title="Colour" note="Saffron is the main action. Each block colour keeps one meaning across every screen.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Swatch name="Canvas" hex={CORE_COLORS.canvas} />
                <Swatch name="Surface" hex={CORE_COLORS.surface} />
                <Swatch name="Sunken · skeleton" hex={CORE_COLORS.sunken} />
                <Swatch name="Ink" hex={CORE_COLORS.ink} dark />
                <Swatch name="Saffron · actions" hex={CORE_COLORS.brand} />
                <Swatch name="Mustard · distance, Highway" hex={CORE_COLORS.mustard} />
                <Swatch name="Sky · Vihars, Internal" hex={CORE_COLORS.sky} />
                <Swatch name="Pink · Sadhu / Sadhvi" hex={CORE_COLORS.pink} />
                <Swatch name="Tea · Sevaks, approved" hex={CORE_COLORS.tea} dark />
                <Swatch name="Lavender · Sankalp" hex={CORE_COLORS.lavender} />
                <Swatch name="Saffron tint" hex={CORE_COLORS.brandTint} />
                <Swatch name="Line" hex={CORE_COLORS.line} />
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge kind="approved" icon={<Check size={12} />}>Approved</StatusBadge>
                <StatusBadge kind="pending" icon={<Clock size={12} />}>Pending</StatusBadge>
                <StatusBadge kind="rejected" icon={<X size={12} />}>Rejected</StatusBadge>
                <StatusBadge kind="info">Info</StatusBadge>
                <StatusBadge kind="neutral">Draft</StatusBadge>
                <StatusBadge kind="active">Active</StatusBadge>
              </div>
            </Section>

            <Section title="Type" note="Bricolage Grotesque for titles and numbers, Geist for reading. Noto Sans keeps Gujarati and Hindi in the same weight.">
              <Card className="flex flex-col gap-3">
                <div className="display text-[2.1rem] font-extrabold">Page title 34</div>
                <div className="display text-2xl font-bold">Section title 24</div>
                <div className="display num text-[2.15rem] font-extrabold">1,248 <span className="font-body text-[13px] font-semibold">km</span></div>
                <div className="text-[17px] font-semibold">Card title 17</div>
                <div className="text-base">Body 16: Vihar of P.P. Acharya Shri from Vashi Derasar to Sanpada Upashray.</div>
                <div className="text-sm font-medium text-ink-2">Label 14 · Secondary text</div>
                <div className="text-[13px] text-ink-3">Meta 13 · Updated 5 days ago</div>
                <div className="display text-2xl font-bold">વિહાર સેવા · विहार सेवा</div>
                <div className="text-base">ગુજરાતી લખાણ અહીં દેખાય છે · हिंदी पाठ यहाँ दिखता है</div>
              </Card>
            </Section>

            <Section title="Buttons">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="dark">Dark</Button>
                <Button variant="soft">Soft</Button>
                <Button variant="ghost">Text button</Button>
                <Button variant="danger">Reject</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small 40</Button>
                <Button size="md">Medium 48</Button>
                <Button size="lg">Large 56</Button>
                <IconButton label="Add"><Plus size={20} /></IconButton>
                <IconButton label="Add" tone="ink"><Plus size={20} /></IconButton>
                <IconButton label="Add" tone="brand"><Plus size={20} /></IconButton>
              </div>
            </Section>

            <Section title="Fields">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Vihar From">{a => <Input {...a} placeholder="Vashi Derasar" />}</Field>
                <Field label="Samuday">{a => <Select {...a} defaultValue="tapa"><option value="tapa">Tapagachh</option><option value="khar">Kharatargachh</option></Select>}</Field>
                <Field label="Mobile number" error="Enter a 10-digit mobile number">{a => <Input {...a} defaultValue="98201" inputMode="numeric" />}</Field>
                <Field label="Notes / Remark" optional hint="Visible to your Captain">{a => <Textarea {...a} placeholder="Road work near the bridge" />}</Field>
                <div className="sm:col-span-2"><SearchField placeholder="Search place, Sevak, Samuday" aria-label="Search entries" /></div>
              </div>
            </Section>

            <Section title="Choices" note="Segmented control for Session and Vihar type, filter chips for lists.">
              <Segmented label="Vihar session" value={session} onChange={setSession} options={[{ value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }]} />
              <Segmented label="Vihar type" size="lg" value={type} onChange={setType} options={[{ value: 'internal', label: 'Internal' }, { value: 'highway', label: 'Highway' }, { value: 'car', label: 'Car Seva' }]} />
              <ChipTabs label="Filter entries" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: 5 }, { value: 'approved', label: 'Approved', count: 4 }, { value: 'pending', label: 'Pending', count: 1 }]} />
            </Section>

            <Section title="KPI blocks" note="Same tile, one colour per meaning. Tappable tiles get the arrow badge.">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatBlock tone="saffron" label="Vihars this year" value="12" sub="Sankalp 25" icon={<Target />} />
                <StatBlock tone="sky" label="Vihars" value="5" icon={<MapPin />} />
                <StatBlock tone="tea" label="Active Sevaks" value="4" icon={<Activity />} />
                <StatBlock tone="ink" label="Pending approvals" value="2" onClick={() => undefined} />
              </div>
            </Section>

            <Section title="Loading and empty">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatBlockSkeleton /><StatBlockSkeleton /><StatBlockSkeleton /><StatBlockSkeleton /></div>
              <EmptyState icon={<Inbox size={22} />} title="No Vihars yet" body="Entries your Sevaks submit appear here for approval." action={<Button size="sm"><FilePlus size={16} /> New Entry</Button>} />
            </Section>

            <Section title="Overlays and feedback">
              <div className="flex flex-wrap gap-2">
                <ToastView kind="success" message="Vihar submitted for approval" />
                <ToastView kind="error" message="No internet connection" />
                <ToastView kind="info" message="Reminder sent at 9:00 AM" />
              </div>
              <div><Button variant="secondary" onClick={() => setSheet(true)}>Open bottom sheet</Button></div>
              <Card className="overflow-hidden p-0">
                <div className="p-4 text-sm text-ink-2">Multi-step form footer (Add Vihar keeps its 4 steps and its own Back / Next / Submit):</div>
                <FormFooter progress={{ step: 2, total: 4 }}>
                  <Button variant="secondary" className="flex-1">Back</Button>
                  <Button variant="dark" className="flex-[2]">Next</Button>
                </FormFooter>
              </Card>
            </Section>
          </div>
        </div>
      </div>

      <CoreSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="More"
        footer={<Button variant="dark" className="w-full" onClick={() => setSheet(false)}>Done</Button>}
      >
        <div className="grid grid-cols-2 gap-2">
          {['Group Analytics', 'Pending Approvals', 'Manage Routes', 'Add Sevaks', 'VChat', 'Contacts', 'Incidents'].map(l => (
            <div key={l} className="flex h-16 items-center rounded-3xl bg-white px-4 text-[15px] font-semibold ring-1 ring-inset ring-line">{l}</div>
          ))}
        </div>
      </CoreSheet>
    </div>
  );
};

export default DesignCorePlayground;
