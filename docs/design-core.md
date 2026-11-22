# vSeva Design Core

The visual system for the vSeva app (both the vSeva and SSG builds), adapted from Lekha's design language.
It changes how the app looks, never how it works.

- Preview (dev only): `npm run dev`, then open `http://localhost:3000/design-core.html`
- Tokens: `tailwind.config.js` (Tailwind names), `styles/design-core.css` (CSS variables), `components/core/theme.ts` (JS values)
- Primitives: `components/core/` (`buttons`, `fields`, `surfaces`, `navigation`, `overlays`, `theme`)

Status:
- **Phase 1 (done):** tokens, primitives, preview.
- **Phase 2 (done, not deployed):** app frame and login pages. App fonts are Geist / Bricolage (Tailwind `sans` / `serif`)
  with the Noto fallbacks; the frame sits on `canvas`; the profile button moved from the bottom bar to the top-right of
  the mobile header; the bottom bar is the ink pill with New Entry as the saffron action; the More sheet, desktop
  sidebar, language button and bell are restyled; Login, Create Captain Account, Forgot Password and Update Password use
  the Design Core look. Check the real frame without signing in at `design-core.html#shell-captain` / `#shell-sevak`.
- Pages inside the frame (Dashboard, Add Vihar, lists) are unchanged until Phases 3 to 6.

## 1. Principles

1. Warm seashell canvas, ink text, solid colour blocks. No gradients, glows or glass.
2. Saffron is the main action colour. It is never used as a page background.
3. Each block colour has one meaning everywhere (section 3).
4. Big, heavy numbers so older Sevaks and Captains read stats at a glance.
5. Loading placeholders have the shape of the content they replace.
6. Presentation only: primitives pass every prop and handler through unchanged.
7. Owner revisions (21 Nov 2026): selected states are saffron (not ink); Sadhu selection is sky blue, Sadhvi pink; every pop-up uses the same header (display title, icon tile, round close) and pill buttons; Add Vihar shows a tick animation after a successful save.

## 2. Colour tokens

| Token (Tailwind) | Hex | Use |
| --- | --- | --- |
| `canvas` | `#F2EEE7` | page background |
| `surface` | `#FBFAF7` | cards, sheets; fields sit on `white` |
| `sunken` | `#E9E3D8` | segmented tracks, quiet chips, **skeletons** |
| `line` | `#DDD5C7` | 1px inset rings, dividers |
| `ink` / `ink-2` / `ink-3` | `#1D1D1B` / `#57534B` / `#6F6A60` | text, primary dark surfaces; secondary; tertiary |
| `brand` | `#E8730C` (pressed `brand-600` `#CF6409`) | main actions, New Entry button, focus accents |
| `brand-50` / `brand-100` / `brand-700` | `#FFF4EA` / `#FCE2CC` / `#A44E07` | soft saffron surfaces and their text |
| `block-sky` | `#9ED6DF` | Vihars count, Internal Vihar |
| `block-mustard` | `#EAC119` | distance, Highway Vihar |
| `block-pink` | `#EAA7C7` | Sadhu / Sadhvi |
| `block-tea` | `#245E55` | Sevaks, approved, switches on (text `block-seashell`) |
| `block-lavender` | `#808BC5` | Sankalp, reminders |
| `ok` / `ok-soft` | `#1F6B5F` / `#D9EAE5` | approved, success |
| `warn` / `warn-soft` | `#6B5409` / `#F7E9B8` | pending, warning |
| `err` / `err-soft` / `err-solid` | `#B33A39` / `#F6DCDA` / `#C63F3E` | rejected, errors, destructive buttons |
| `info` / `info-soft` | `#1E5A66` / `#DCEFF2` | information |

Text on blocks is fixed for contrast (`TONE` in `components/core/surfaces.tsx`): ink on saffron, sky, mustard, pink and
lavender; seashell on tea and ink. White text on saffron fails contrast for body text, so saffron buttons use ink text.

The existing `saffron-*` scale stays in place so today's screens keep working. It is retired screen by screen in
Phases 3 to 6 as each screen moves to `brand` and the neutrals above.

## 3. Colour meaning

| Colour | Always means |
| --- | --- |
| Saffron | main action: Alert Vihar, New Entry, primary buttons |
| Sky | Vihars, Internal Vihar |
| Mustard | distance, Highway Vihar |
| Pink | Sadhu / Sadhvi |
| Tea | Sevaks, approved, on |
| Lavender | Active Sevaks, reminders |
| Saffron | also the **selected** state: selected page, tab, toggle, chip (owner's choice, 21 Nov) |
| Ink | the bottom bar and dark text only |

Colour is never the only signal: status badges carry their word, tiles carry their label.

## 4. Typography

| Role | Face | Size (phone / desktop) |
| --- | --- | --- |
| Page title | Bricolage Grotesque 800, `.display` | 34 / 48 |
| Section title | Bricolage Grotesque 700 | 24 / 28 |
| KPI value | Bricolage Grotesque 800, tabular | 34 (lg 42) |
| Card title | Geist 600 | 17 |
| Body | Geist 400 | 16 |
| Label | Geist 500 | 14 |
| Meta | Geist 400 | 13 (minimum anywhere) |
| Button | Geist 500 | 14 / 15 / 16 |
| Inputs | Geist | 16 (prevents iOS zoom) |

`font-display` and `font-body` in Tailwind include **Noto Sans Gujarati** and **Noto Sans Devanagari**, because
Bricolage and Geist have no Gujarati or Hindi letters. Fonts load from Google Fonts (`CORE_FONTS_HREF` in `theme.ts`),
added to each brand's `fontsHref` in Phase 2. `.display` sets tracking −0.035em and line-height 0.95.

## 5. Spacing, shape and depth

- Gutter 16px on phones, 24px tablet, 40px desktop. Content max width stays as today.
- Radius: `rounded-card` 24px, `rounded-tile` 22px (KPI blocks), `rounded-field` 16px, `rounded-sheet` 28px, pills `rounded-full`.
- Heights: buttons 40 / 48 / 56, icon buttons 44 (touch target), inputs 48, nav items 52.
- Depth: flat. Only the floating nav (`shadow-nav`) and sheets (`shadow-sheet`) cast a shadow. Cards use a 1px inset `line` ring.

## 6. Motion

`animate-core-rise` (360ms page enter), `animate-core-sheet` (280ms), `animate-core-pulse` (1.6s skeleton), 150ms press
(`active:translate-y-px` / `active:scale-95`). Transform and opacity only. `prefers-reduced-motion` turns it all off.

## 7. Components

| Primitive | File | Notes |
| --- | --- | --- |
| `Button` (primary, secondary, dark, soft, ghost, danger; sm/md/lg) | `buttons.tsx` | pill; primary = saffron with ink text |
| `IconButton` | `buttons.tsx` | 44px circle, `label` required |
| `Field`, `Input`, `Textarea`, `Select`, `SearchField` | `fields.tsx` | label above, hint or error below, invalid = red ring |
| `Card`, `PageHeader`, `SectionTitle` | `surfaces.tsx` | |
| `StatBlock` (+ `StatBlockSkeleton`) | `surfaces.tsx` | KPI tile; `tone` picks the meaning colour; `onClick` adds the arrow badge |
| `StatusBadge`, `Chip`, `ProgressBar`, `EmptyState` | `surfaces.tsx` | |
| `CoreSkeleton` | `surfaces.tsx` | warm sunken pulse |
| `AppHeader`, `ProfileButton` | `navigation.tsx` | safe-area top; profile top right |
| `BottomNav` | `navigation.tsx` | floating ink pill; active tab shows its label; action key gets the saffron circle |
| `Segmented`, `ChipTabs` | `navigation.tsx` | radio / tab semantics |
| `CoreSheet` | `overlays.tsx` | bottom sheet on phones, centred on desktop |
| `ToastView` | `overlays.tsx` | look only; `ToastContext` keeps deciding when toasts show |
| `FormFooter` | `overlays.tsx` | sticky footer for multi-step forms, holds the existing buttons |

## 8. Brand

One palette for both apps. Only the identity comes from the existing `BRAND` object (`@brand`, chosen by `VITE_BRAND`):
`brandIdentity(BRAND)` returns the header name, logo, whether the logo needs padding, and the status-bar colour.
There is no new brand switch.

## 9. Migration map (Phases 2 to 6)

| Existing piece | Becomes | Phase |
| --- | --- | --- |
| `components/Layout.tsx` mobile header | `AppHeader` + `ProfileButton` (avatar moves from the bottom bar to top right) | 2 |
| `components/ui/bottom-nav-bar.tsx` | `BottomNav` look (same items, order, labels, handlers; New Entry gets the saffron circle) | 2 |
| More sheet in `Layout.tsx` | `CoreSheet` look | 2 |
| `index.css` body, fonts in `brands/*/meta.ts` | canvas + `font-body`, `CORE_FONTS_HREF` | 2 |
| `components/Skeleton.tsx`, `EntriesSkeleton.tsx` | `CoreSkeleton` look (same call sites) | 3 |
| `components/Modal.tsx`, `BottomSheet.tsx` | `CoreSheet` look | 3 |
| `ThemedSelect`, buttons and inputs across forms | `Select`, `Button`, `Input` classes | 3 |
| `StatCard.tsx`, `EntryCard.tsx`, badges | `StatBlock`, `Card`, `StatusBadge` | 3 |
| Toasts (`context/ToastContext`) | `ToastView` look | 3 |
| `pages/Dashboard.tsx` (Captain Statistics, Sevak Home) | `StatBlock` tones, `Card`, `ProgressBar`; same order and data | 4 |
| `pages/NewEntry.tsx` (4 steps) | `Field`, `Segmented`, `FormFooter`; same steps, fields, validation and buttons | 5 |
| View Entries, Pending Approvals, Profile, Contacts, Notifications, VChat, Incidents, Directory, Super Admin | primitives above, one module at a time | 6 |

Share cards and the ID badge render images people send on WhatsApp; they change only if you ask.

## 10. Do and don't

- Do use the tokens and primitives; don't type hex colours into screens.
- Do keep one meaning per block colour; don't pick a colour because it looks nice next to another.
- Do shape skeletons like their content; don't use spinners for page loads.
- Do keep labels visible on the active tab; don't hide navigation text from older users.
- Don't change a handler, prop, query or step order to get a look. Stop and ask instead.
