# vSeva & SSG — Engineering Audit, Phase 1 (Discovery, Security, Baseline)

Date: 15 Oct 2026 · Scope: this repository (vSeva and SSG, one codebase, brand chosen at build time with `VITE_BRAND`),
the shared Supabase project, Netlify functions, and the production build. Android not exercised in this phase.

Status labels: **PASS** verified · **FAIL** defect remains · **BLOCKED** needs access or approval · **NOT TESTED**.

## A. Executive summary

- **Most serious finding (Critical, fixed in code, not yet deployed):** seven Netlify functions used the database
  service-role key, accepted any `orgId`, and did no login check. The worst, `get-org-sevak-contacts`, returns every
  member's **name and mobile number** for any organization. Confirmed on production: each returned HTTP 200 to an
  unauthenticated request (tested only with a fake organization ID, so no real data was retrieved). Organization IDs
  are obtainable without login through the public ID-card lookup.
- **Second (High, applied to the live database on 15 Oct with owner approval):** Community Directory moderation
  RPCs trusted a caller-supplied admin ID; leaderboard / rank / Sevak-count RPCs answered for any organization;
  `upcoming_vihars` (including emergency contact phone numbers) and `push_subscriptions` were readable by anyone.
- **Largest performance bottleneck (fixed):** the 413 KB PDF library loaded on every app start. Startup JavaScript +
  CSS fell from **1,126 KB → 784 KB raw (−30%)**, **279 KB → 179 KB Brotli (−36%)**, measured on the same build.
- **Residual risk:** High until the database migration and the code are deployed. Several items below are NOT TESTED
  (Android, load testing, logged-in function paths) and are listed honestly as such.

## B. Inventory (summary)

| Layer | What exists |
|---|---|
| Client | React 18 + TS + Vite 6, custom `currentPage` navigation in `App.tsx`, `services/dataService.ts` (request cache `getCached`), `services/apiBase.ts` (`callFn` with timeout + opt-in retry) |
| Brands | `brands/vseva`, `brands/ssg`; `.env.ssg` (non-secret) ; separate Netlify sites (vseva.vjas.in, ssg.vjas.in) |
| Functions (19) | Super-admin family (`super-admin`, `approve-org`, `get-org-admins`) verify a Bearer token + email allow-list. User functions (`create-user`, `delete-user`, `update-user-phone`, `update-org-leadership`) verify the token. **Seven org-data functions had no auth** (fixed). Public by design: `nearby`, `resolve-location`, `directory-sitemap`, `sevak-login-lookup`. `send-push` is webhook-driven. |
| Database | Supabase Postgres, RLS on all public tables; 50 SECURITY DEFINER functions; 2 pg_cron jobs (run as `postgres`) |
| Storage | `avatars`, `vihar-photos`, `directory-photos`, `incident-reports` (all public-read buckets) |
| Android | Capacitor 8, flavors vseva/ssg, native OneSignal plugin, custom AppSharePlugin |

## C. Defect register

| ID | Sev | Where | Evidence | Fix | Verification | Status |
|---|---|---|---|---|---|---|
| SEC-01 | **Critical** | `netlify/functions/get-org-sevak-contacts, get-org-roster, get-dashboard-stats, get-sevak-names, get-sevak-avatars, get-top-sevaks, check-inactivity` | Production returned 200 with no token (fake orgId) | New `_shared/orgAuth.js` `requireOrgMember`: verifies Bearer token, requires caller's own org; `check-inactivity` also limits a Sevak to themselves. Client `callFn` now sends the session token on every call. | Local handler test: all 7 → **401** without token; OPTIONS preflight → 204 (6/7, see LOW-03). Logged-in path NOT TESTED. | Fixed in code, **not deployed** |
| SEC-02 | High | RPC `admin_*/approve_*/reject_directory_*` | Body checks `p_admin_id` is an admin but never that it is the caller; callable by `anon` | Require `auth.uid() = p_admin_id` | Callers pass `currentUser.id` (verified in code) | **PASS** — applied 15 Oct (migration security_rpc_hardening); 6/6 functions carry the caller check |
| SEC-03 | High | RPC `get_top_sevaks_leaderboard`, `get_sevak_rank`, `get_total_org_sevaks` | Take any `org_id`, no caller check, callable by `anon` | Answer only for `get_my_org_id()` | App calls them for own org only | **PASS** — applied 15 Oct; signed-out API calls verified refused / empty |
| SEC-04 | High | `upcoming_vihars` RLS | Two SELECT policies `USING (true)` for every role | One policy: own organization, authenticated | Both app reads filter own org | **PASS** — applied 15 Oct; signed-out API calls verified refused / empty |
| SEC-05 | Medium | `push_subscriptions` RLS | SELECT `true` for every role (table currently empty) | Drop policy (service role bypasses RLS) | — | **PASS** — applied 15 Oct; signed-out API calls verified refused / empty |
| SEC-06 | Medium | `organizations` RLS | Any signed-in user may INSERT | Drop policy; orgs are created by service role / trigger | No client insert found | **PASS** — applied 15 Oct; signed-out API calls verified refused / empty |
| SEC-07 | Low | Cron + trigger functions | Callable over `/rest/v1/rpc` by anon | Revoke EXECUTE from API roles | Cron runs as `postgres` (checked) | **PASS** — applied 15 Oct; signed-out API calls verified refused / empty |
| SEC-08 | **High (needs product decision)** | RPC `get_public_sevak_profile` (QR ID card page) | Anyone with a username gets mobile, home address, emergency contact, blood group, org id. Usernames are name-based and guessable. | Not changed — it is the documented purpose of the ID card. Options: show emergency fields only, hide address, or require a per-card token in the QR URL. | — | **Accepted by owner** (15 Oct) — kept as is |
| SEC-09 | Medium | Missing security headers | Live site sent only HSTS | Added `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `frame-ancestors`, `Permissions-Policy` in `netlify.toml`. No script CSP yet (needs a tested allow-list). | Not yet live | Fixed in code |
| SEC-10 | Medium | Dependencies | `npm audit`: maplibre-gl **critical** (XSS sanitizer bypass, fix = v6 major), xlsx **high** (prototype pollution / ReDoS, no fix on npm) | Not upgraded in this phase (major / no fix) | — | **FAIL** |
| SEC-11 | Medium | Storage | `incident-reports` and `avatars` have no size / MIME limits; `directory-photos` allows anonymous upload | avatars: 5 MB, image/*; incident-reports: 20 MB, image/* + video/* (applied 15 Oct, owner-approved). directory-photos already limited; anonymous upload there is by design | Existing files fit (max 123 KB / 4 MB) | **PASS** |
| SEC-12 | Low | Supabase Auth | Leaked-password protection disabled | Enable in Supabase dashboard (Auth → Passwords) | — | **BLOCKED** (dashboard) |
| SEC-13 | Info | Sevak sign-in | Sevak password is their mobile number; `sevak-login-lookup` confirms name-prefix + mobile pairs | Design risk, not changed | — | Noted |
| PERF-01 | High | `vite.config.ts` manualChunks | Vite's preload helper was bundled into `vendor-pdf`, so startup fetched the whole PDF library | Function-form `manualChunks`, helper in its own chunk | Browser test: startup loads 3 JS files, no vendor-pdf; on-demand PDF + autoTable generated (4,088 bytes), no errors | **PASS** |
| REL-01 | Medium | `index.tsx` | Service-worker update forced a reload ~1 min after opening, returning users to Home | Reload deferred to when app is backgrounded; current page restored; `vite:preloadError` → reload | Not verified live | Fixed in code |
| LOW-03 | Low | `get-top-sevaks` | Not referenced by the app since 28 Sep; no CORS wrapper | Auth added; candidate for removal | — | Noted |

## D. Security report (status)

- RLS enabled on all public tables: **PASS** (advisor). Two tables (`password_change_grants`, `password_change_log`) have RLS with no policies — intended deny-all.
- Cross-organization isolation: database side **PASS** (applied, signed-out calls verified); Netlify side pending deploy of SEC-01.
- Secrets: no service-role / OneSignal REST keys in `dist`, no source maps, no keystores or `google-services.json` tracked; the only tracked env file (`.env.ssg`) holds a public OneSignal app id: **PASS** (pattern scan, not a full history scan).
- CORS: allow-listed origins (`vseva.vjas.in`, `https://localhost`, `VITE_SITE_URL`), OPTIONS answered with 204: **PASS** (local).

## E. Performance report

| Metric (same build, same method) | Before | After | Change |
|---|---|---|---|
| Startup JS+CSS, raw | 1,126.2 KB | 783.9 KB | −30.4% |
| Startup JS+CSS, gzip | 331.8 KB | 219.0 KB | −34.0% |
| Startup JS+CSS, Brotli | 279.3 KB | 178.9 KB | −35.9% |
| Startup files | 4 (incl. vendor-pdf) | 4 (preload-helper 1.1 KB instead) | — |

Method: sizes of files referenced by `dist/index.html`, compressed with Node zlib (gzip / Brotli default levels).
Network timings, dashboard request counts and KPI latency: **NOT TESTED** in this phase.

## F–G. Scalability, Android

**NOT TESTED.** No staging database exists (the Supabase project is production), so load testing needs a separate
project or branch first. Android export/notification/back-button retests need an emulator session.

## I. Release checklist

| Item | Status | Action |
|---|---|---|
| Type check | PASS | — |
| vSeva build | PASS | — |
| SSG build + brand-leak check | PASS | — |
| Functions refuse unauthenticated requests | PASS (local) | Verify logged-in Dashboard, Statistics, member list after deploy |
| DB hardening (SEC-02..07) | PASS | Applied; rollback: `scripts/security_rpc_hardening_rollback.sql`. Logged-in leaderboard / Directory moderation still to be checked on screen. |
| ID-card data exposure (SEC-08) | Accepted risk | Owner chose to keep full details public (15 Oct) |
| maplibre-gl / xlsx advisories | FAIL | Plan maplibre v6 upgrade; evaluate xlsx replacement |
| Leaked-password protection | BLOCKED | Enable in Supabase dashboard |
| Android rebuild | BLOCKED | Installed Android apps keep calling these functions without a token until rebuilt, so their Sevak picker roster, group stats and inactivity reminders will fail (roster returns empty by design; the stats screen's behaviour on failure is NOT TESTED). Rebuild versionCode 3 and ship it together with the deploy. |
| Load test | NOT TESTED | Needs staging project |

## Phase 2 (started 15 Oct) — loading screen and Dashboard requests

| ID | Change | Evidence | Status |
|---|---|---|---|
| UX-01 | Spinner screens (session restore after login, lazy-screen loading, Login sub-screens) replaced by `components/BrandSplash.tsx`: the brand's own logo with a gentle breathing animation (reduced-motion respected) | Headless Chrome with a saved session and Supabase held open: vSeva shows `vseva-logo`, SSG shows `ssg-emblem`, 0 spinners on screen | PASS |
| PERF-02 | Dashboard no longer calls `get-sevak-names` — the roster RPC fetched in the same batch already returns every name (it includes inactive members) | Code trace; −1 Netlify function call per Dashboard load | Fixed in code; request count on a logged-in session NOT TESTED |
| PERF-03 | `check-inactivity` runs at most once per 6 h per device and org/person (reminders are day-based and deduped server-side) | Code trace; previously every Dashboard open, Captain = whole-org scan | Fixed in code |
| PERF-04 | Notification bell polls every 30 s only while the app is visible, and refreshes when it becomes visible again | Code trace; previously 120 requests/hour per open tab, hidden or not | Fixed in code |

## Phase B (continued) — authenticated functions

| ID | Sev | Where | Finding | Fix | Status |
|---|---|---|---|---|---|
| SEC-14 | **Critical** | `delete-user` | Checked only that the caller is *a* Captain; any Captain (either brand) could delete any account by id, including other Captains | Target must be a Sevak of the caller's own organization and not the caller | Fixed in code, not deployed |
| SEC-15 | High | `send-push` | Public, no secret: anyone could POST any `user_id` + title + message and push arbitrary text to that person's phone | The body is treated as a pointer: the notification is re-read from the database by id and only fresh (≤10 min) stored notifications are sent | Fixed in code, not deployed. Residual: a fresh notification can be re-sent (duplicate) by someone who knows its id |
| SEC-16 | High | `create-user` + `handle_new_user` trigger | User metadata was copied from the request; an `org_name` key makes the trigger create a new organization with that account as its Captain, bypassing manual approval. The same trigger path is reachable through public sign-up if it is enabled. Never used (0 accounts carry `org_name`). | `create-user` now builds the metadata itself (name, role sevak, caller's org) | Function fixed in code. Trigger neutralised in the live DB 15 Oct (migration security_signup_storage_limits, owner-approved; rollback script next to it): **PASS** |
| OK | — | `update-user-phone`, `update-org-leadership`, `approve-org`, `super-admin`, `get-org-admins` | Verify token; check role and same organization / brand scope | — | PASS (code review) |

## Phase E — Android (15 Oct, Pixel 6 emulator, API 36)

Builds: vSeva **versionCode 3 / 1.2**, SSG **versionCode 2 / 1.1**. Release bundles signed with the upload key
(SHA-256 starts 4A:20:7A:53), copied to `release-builds/` (git-ignored): `vseva-v1.2-vc3.aab`, `ssg-v1.1-vc2.aab`.

| Check | vSeva | SSG | Notes |
|---|---|---|---|
| Install + launch, correct version | PASS | PASS | |
| Cold start (TotalTime) | 2.6 s first, ~1.7 s after | ~2.4 s | `am start -W`, emulator, not a phone |
| Warm start | 0.26 s | NOT TESTED | |
| Native notification permission prompt | PASS | (already granted) | native OneSignal plugin present, web SDK not used |
| Server calls from WebView origin `https://localhost` with Authorization header (CORS preflight) | PASS (401 for fake token, body readable) | PASS | the historical CORS / OPTIONS 405 issue does not reproduce |
| **Back button on Find Derasar** | **FAIL → fixed** | PASS after fix | Standalone pages loaded by full navigation had no in-app stack, so Back closed the app. `App.tsx` now steps back in WebView history when not on `/`. Back on Login still exits (correct). |
| File write / read in cache (export path) | PASS | — | Filesystem plugin |
| Save image to gallery (AppShare.saveToGallery) | PASS | — | file confirmed in `Pictures/vSeva/` via MediaStore, then removed |
| Share sheet with a PDF file | PASS | — | system sheet shows the file |
| Console errors | Info only | Info only | "Error injecting safe area CSS" comes from Capacitor's SystemBars before the page exists; the app uses `env(safe-area-inset-*)`, not those variables — harmless |
| Logged-in flows (Dashboard export end-to-end, notification tap routing, photo upload, session restore) | NOT TESTED | NOT TESTED | need a test account; I can't use real credentials |
