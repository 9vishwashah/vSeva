# vSeva / SSG performance and cost plan (22 Nov 2026)

## Status (22 Nov 2026)

Done locally (not deployed until "push"); database part is live (additive, safe for the current app).

| Item | Result |
| --- | --- |
| Database: read functions + change versions (`scripts/perf_read_rpcs_and_versions.sql`) | **Applied to Supabase.** Tested as a member (same counts) and as an outsider (refused). Change tracking tested (sign-in alone does not count as a change). |
| Group reads via Supabase instead of Netlify Functions (`services/dataService.ts` `groupRead`) | Netlify Function kept as automatic fallback |
| Data kept on the device until it changes (`services/dataSync.ts`, `services/requestCache.ts`) | One ~200-byte check on open / return / page move / every 2 min; unchanged data is used with no request |
| Keep times | members, routes, contacts, settings 30 min; entries, stats, pending, incidents 10 min (fallback only) |
| Notification bell (`services/notificationsStore.ts`) | one shared fetch every 3 min (was 2 bells x every 30 s); refresh on push arrival |
| Upcoming Vihar alerts, brand check | cached (alerts shared by Dashboard + Notifications; brand check once a day per device) |
| Icons | favicon 286 KB -> 10 KB; in-app logo 90 KB -> 14 KB |
| Guide PDFs | ~half size (`scripts/compress_guides.py`, run again after regenerating guides) |
| Cache headers, scanner 404s, robots.txt AI rules | `netlify.toml`, `public/_redirects`, `public/robots.txt` |
| Service worker install download | 6.4 MB -> 1.9 MB (heavy parts cached on first use) |
| Android live update | 2.9 MB -> 2.1 MB, and only republished when the app itself changed (content fingerprint) |
| Netlify build skip | pushes that only touch docs / android / SQL / reports don't build |

Still to do in dashboards (not code): set Netlify Functions region next to Supabase (Singapore/Mumbai) if your plan
offers it; check the production deploy count on the Netlify usage page.

Goal: keep Netlify credit use flat as groups grow in December, and stop the app fetching the same data twice.
Applies to both brands (one codebase) and all three ways in: website, web app / PWA, Android app.

## What Netlify charges for (Pro, credit-based, rates as of Apr 2026)

| Meter | Rate | Last 7 days | Approx. credits / month today |
| --- | --- | --- | --- |
| Bandwidth | 20 credits / GB | 364.8 MB | ~30 |
| Web requests | 2 credits / 10,000 | 5,301 | ~5 |
| Function compute | 10 credits / GB-hour | ~300 calls x ~2.2 s | ~8 |
| Production deploy | 15 credits each | not visible in screenshots | **15 per deploy, x2 if both sites build** |

Today's traffic is small. The risk is how each item **multiplies with users** in December, and deploys.

## Findings (from the code, the Netlify screenshots and supabase_logs.csv)

| # | Finding | Evidence | Grows with |
| --- | --- | --- | --- |
| 1 | Read-only Netlify Functions do 4 round trips each between Netlify (US) and Supabase (Singapore) | get-dashboard-stats p50 2.6 s, get-org-sevak-contacts 2.2 s, 160 calls/week; each call does auth check + profile + 2 queries | every dashboard open |
| 2 | Android live update: every deploy publishes a 2.9 MB zip and every active phone downloads all of it | /app-update/*.zip: 32 downloads = 90 MB in 7 days | phones x deploys |
| 3 | Service worker precaches 154 files, 6.4 MB raw, including the map (807 KB), Excel (430 KB), PDF (422 KB), Noto font (570 KB) and html2canvas chunks most people never open | dist/sw.js manifest | new devices + every deploy |
| 4 | Guide PDFs are 1.7 to 2.7 MB each and are the biggest bandwidth item | Sevak Guide 93 MB + App Guide 77 MB in 7 days | website visitors, bots |
| 5 | The site icon and Apple icon are the 286 KB vseva-logo-full.png | 174 requests = 28.5 MB | every page view |
| 6 | Notification bell is mounted twice (phone header and desktop sidebar), each polling every 30 s | 373 notification reads in 17 h, median gap 0.4 s | every open screen (Supabase load) |
| 7 | Page data cache lives 15 to 60 s, so going back to a page after a minute fetches again | services/dataService.ts TTLs | every page switch |
| 8 | Some reads skip the cache: upcoming_vihars, org_brand check, org roster RPC | supabase log | every open |
| 9 | Static files without a cache header are re-checked on every view (fonts, screens, notify art, PDFs, assetlinks.json) | Netlify default max-age=0 | every view |
| 10 | Scanner bots get the 9 KB app page with status 200 for /.env, /.git/config, /wp-content/... | Top pages list | bots |
| 11 | app.html is no-store, so it can never be answered with a cheap "not modified" | netlify.toml | every app open |

Supabase (free plan) is far from its limits: egress 0.04 GB of 5 GB, DB 38 MB of 500 MB, 18 MAU. Its main load is
finding 6. Watch the Nano instance memory (53%) and realtime connections (200 max on free) in December.

## The new theme

Not a meaningful cost. Fonts load from Google (not Netlify bandwidth) and are kept a year on the device; the app's
first load is about 235 KB compressed (JS 142 KB + React 69 KB + CSS 22 KB). Small trims: request only the font
weights actually used (Geist 700 and Noto 600 are requested but barely used).

## Plan

### Phase 1: quick wins, no change in behaviour (code only)
1. Cache headers: `/vseva-site/*`, `/notify/*`, `*.woff2`, icons and PDFs get `max-age` of 7 days to 1 year;
   `assetlinks.json` 1 day; `app.html` / `index.html` become `no-cache` (allows 304) instead of `no-store`.
2. Scanner paths (`/.env*`, `/.git/*`, `/wp-*`, `*.php`) return a tiny 404 instead of the app page.
3. Favicon / Apple icon: 32 px and 180 px versions (~10 KB) instead of the 286 KB logo.
4. Recompress the four guide PDFs (target 300 to 600 KB each) and ask AI crawlers not to fetch PDFs and screenshots (robots.txt).
5. One notification bell instance; poll every 3 minutes while visible, refetch when the app comes back to the
   foreground (throttled) and when a push arrives.

### Phase 2: "load once, don't fetch again" (code only)
1. Cache tiers in dataService: slow-changing data (org, roster, names, avatars, contacts, routes, aliases, Sankalp,
   reminder settings, brand check) 15 to 30 min and kept on the device; activity data (entries, stats, pending)
   2 to 5 min with "show last data instantly, refresh in background".
2. Every write already clears its own cache keys (invalidate), so your own changes still show at once.
3. Route the uncached reads (finding 8) through the same cache.
4. Refresh on demand: pull to refresh and a refresh when the app returns after 10+ minutes, instead of on every page switch.

### Phase 3: take reads off Netlify Functions (needs database changes, your approval)
1. Replace read-only functions (get-dashboard-stats, get-org-sevak-contacts, get-sevak-names, get-sevak-avatars,
   get-org-roster, get-top-sevaks, get-org-admins) with Supabase RPCs that check the caller's group the same way.
   Supabase does not bill API requests, the call skips the US round trip, and Netlify compute for these drops to zero.
2. Keep writes and service-role work (create-user, delete-user, approve-org, send-push, super-admin) on Netlify.
3. Interim, if Phase 3 waits: set the Functions region next to Supabase (Singapore / Mumbai) if your plan offers it.

### Phase 4: Android and PWA delivery
1. Publish a live update only when the app's own files changed (compare with the last bundle), not on every deploy,
   and leave website-only files out of the zip.
2. Optional: host the update zips on storage with free egress (for example Cloudflare R2) so they cost no Netlify bandwidth.
3. Service worker precaches only the app shell and core screens; heavy, rarely used chunks (map, Excel, PDF, fonts,
   html2canvas, India map) are cached the first time they are used.
4. Deploy hygiene: batch changes into fewer pushes; skip builds when only docs or scripts changed (Netlify
   `ignore` command) so each push does not cost 15 credits per site.

## December estimate (example: 1,000 active users, mostly Android, 8 deploys a month)

| Item | Without changes | After plan |
| --- | --- | --- |
| Read functions (2 per dashboard open, 3 opens/day) | ~1,100 credits compute + ~35 requests | ~0 (Supabase RPC) |
| Android live updates | ~460 credits (23 GB) | ~60 to 120 (only real app changes; or 0 on R2) |
| PDFs, icons, static re-checks | ~100+ credits | ~15 |
| Deploys (2 sites) | 240 credits | 120 or less with batching / ignore |

Sources: Netlify credit rates and deploy cost (docs.netlify.com billing for credit-based plans; Apr and Jul 2026
changelogs), Netlify CDN caching (Netlify-CDN-Cache-Control, durable), Capgo self-hosted feature table (delta
updates are cloud-only).
