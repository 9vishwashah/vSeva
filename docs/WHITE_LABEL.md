# White-label deployments (vSeva + Shraman Seva Group)

One codebase, one Supabase project, several differently-branded sites. A build is
one brand, chosen by `VITE_BRAND` (`vseva` is the default, `ssg` is Shraman Seva Group).

```
brands/
  types.ts          Brand / BrandMeta — every per-brand value (name, logo, contact, copy, meta tags …)
  build.ts          build-time helpers: index.html tokens, public/ overlay, robots/sitemap/finder manifest
  vseva/            meta.ts (strings) · index.ts (BRAND + logo import) · Landing.tsx (existing landing page)
  ssg/              meta.ts · index.ts · Landing.tsx · assets/ (logo, emblem, guru photo) · public/ (icons, OG card)
```

`vite.config.ts` aliases `@brand` to `brands/<VITE_BRAND>/`, so app code does
`import { BRAND } from '@brand'` and a build never contains another brand's artwork or copy.
`index.html` uses `{{TOKEN}}` placeholders that `brands/build.ts` fills from the same meta,
so the page title, link previews, installed-app name and in-app text can't disagree.

## Local work

```bash
npm run dev:ssg        # SSG dev server (vite --mode ssg, reads .env.ssg)
npm run build:ssg      # SSG production build into dist/
npm run check:brand    # fails if the SSG build in dist/ still contains any vSeva / VJAS identity
npm run build          # vSeva — unchanged
```

`.env.ssg.local` (gitignored) is the place for local SSG overrides.
If you change `SSG/SSG LOGO.png` or `SSG/guru.png`, run `node scripts/prepare_ssg_assets.mjs` and commit the outputs.

## Setting up the SSG site on Netlify

Create a **second Netlify site from the same repo** (same `netlify.toml`, same build command).
Environment variables on that site:

| Variable | Value |
|---|---|
| `VITE_BRAND` | `ssg` — **required** (the build and the edge function both read it) |
| `VITE_SITE_URL` | the SSG site's origin, e.g. `https://ssg.example.org` — canonical, link previews, sitemap, CORS |
| `VITE_CONTACT_WHATSAPP` | digits with country code — landing button, registration & deletion requests. *Falls back to the vSeva operator's number if unset* |
| `VITE_CONTACT_EMAIL` | support email shown in the privacy policy. *Falls back to the vSeva operator's email* |
| `VITE_INSTAGRAM_URL` | optional; the Instagram buttons are hidden when unset |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | same as the vSeva site |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | same as the vSeva site (functions) |
| `VITE_ONESIGNAL_APP_ID` | the **SSG** OneSignal web app (see below) |
| `BRAND_ADMIN_EMAILS_SSG` | comma-separated login emails of the SSG super-admin(s) |

## Super Admin — who can see what

The `/super-admin` PIN in the page is only a convenience. Real authorisation is server-side
(`netlify/functions/_shared/adminAuth.js`): every Super Admin call carries the user's Supabase
token, which is verified, and the email is matched against allow-lists in the Netlify environment:

* `SUPER_ADMIN_EMAILS` (vSeva site) — platform owner; sees **all** brands, Directory moderation included.
* `BRAND_ADMIN_EMAILS_SSG` (SSG site) — sees only organisations / pending requests tagged `ssg`,
  and can only approve/reject those. Scoping is applied in the function, not the browser.

Anyone not on a list gets "Access not available". **Set `SUPER_ADMIN_EMAILS` on the vSeva site
before deploying, or nobody can open Super Admin there.** Both accounts must be ordinary
Captain (admin) logins.

## Database — apply in this order

1. `scripts/brand_stage1_additive.sql` — adds nullable `organizations.brand` / `registration_requests.brand`
   (NULL = vSeva), brand-segregates **Channel** (discovery, following, posts, realtime — enforced in
   RLS/RPCs), and titles SOS alerts with the brand. Behaviour-neutral while every org is NULL.
   Rollback: `scripts/brand_rollback_stage1.sql`.
2. Deploy both sites; set the env variables above.
3. `scripts/brand_stage2_lockdown.sql` — revokes the public/anonymous access to the old Super Admin RPCs,
   removes the over-broad `registration_requests` policies. Applying it before step 2 breaks the old Super Admin page.

The Directory is intentionally not brand-scoped (shared by all brands).

## Push notifications

Web push is bound to a site's origin, so the SSG site needs its **own OneSignal web app**.
The database trigger always calls one webhook (the vSeva site's `send-push`), which now picks the
OneSignal app by the user's organisation brand. On the **vSeva** site add:

`ONESIGNAL_APP_ID_SSG`, `ONESIGNAL_API_KEY_SSG`, `SITE_URL_SSG`

Without them SSG users fall back to the vSeva OneSignal app and will not receive pushes.

## Not done / decisions for the owner

* **Android app for SSG** — would need its own `applicationId`, Play listing, `capacitor.config.ts`, icons and signing key. The web site/PWA works today.
* **Privacy policy / deletion pages** are brand-driven but SSG's text names "Shraman Seva Group" as operator and uses
  the contact details above — have SSG confirm and, ideally, have the policy reviewed.
* **Gujarati/Hindi landing copy** was written for this page — please have a native speaker proofread it.
* An SSG Captain can also sign in at the vSeva site (accounts are shared); data scoping still holds, only the chrome differs.
* The Super Admin PIN (`2424`) is still in the client bundle; it isn't a security control.
