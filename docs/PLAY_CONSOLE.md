# vSeva — Google Play Console submission pack

Everything here is derived from the actual code and database (audited 2 Oct 2026).
Items marked **JUDGEMENT** are interpretation calls — confirm them yourself.
No real accounts, passwords, or personal data belong in this file.

## 0. Before you start

| Item | Value |
|---|---|
| Package name | `in.vjas.vseva` (cannot change after first upload) |
| Min / target SDK | 24 / 36 (meets the Aug-2026 target-API rule) |
| Upload artifact | `android/app/build/outputs/bundle/release/app-release.aab` (signed) |
| Upload-key SHA-256 | `4A:20:7A:53:C3:AA:F0:C0:A4:E8:92:1F:1B:3C:FB:8B:7D:9A:DF:79:75:65:5C:E0:6C:DB:18:B7:6B:20:19:E2` |
| Privacy policy URL | `https://vseva.vjas.in/privacy` |
| Account-deletion URL | `https://vseva.vjas.in/delete-account` |
| Support contact | WhatsApp +91 95945 03214 — **Play Console also requires a developer email; add one to the policy page too** |

**Account type matters for the timeline.** Personal developer accounts created after
Nov 2023 must run a *closed test with at least 12 opted-in testers for 14 continuous
days* before they can apply for production access. Organization accounts (need a
D-U-N-S number) are exempt. Verify the current rule in the console — Google changes it.

**Use Play App Signing** (the default). The keystore you hold is the *upload* key;
Google keeps the real signing key. Back the keystore up anyway.

## 1. Store listing

- **App name (≤30):** `vSeva - Vihar Seva Tracker`
- **Short description (≤80):** `Log Vihar seva, coordinate Sevaks and stay safe with SOS alerts.`
- **Category:** Lifestyle (alternative: Productivity). **Tags:** Lifestyle, Community.
- **Full description (≤4000):**

```
vSeva helps Jain Vihar Seva groups record every Vihar, coordinate their Sevaks, and look after each other on the road.

RECORD VIHARS
• Log each Vihar with date, route, distance, Sadhu/Sadhvi count and the Sevaks who took part
• Sevaks can submit entries; the Captain reviews and approves them
• Automatic distance from your saved routes

SEE THE PICTURE
• Organisation stats by Vihar Year: total km, Vihars, Sevaks, consistency this week
• Leaderboards and rankings, yearly Sankalp goal
• Export reports as PDF or Excel

STAY SAFE
• SOS: one tap alerts your Captain with your location
• Emergency ID card with a QR code that shows your emergency details
• Push notifications for Vihar alerts, approvals and messages

STAY CONNECTED
• Channel: post updates to your group and to groups that follow you
• Jain Directory and a nearby-Derasar finder
• Available in English, ગુજરાતી and हिंदी

Accounts are created by your group's Captain — there is no open sign-up.
vSeva is free and contains no ads.
```

- **Graphics (you must supply):** icon 512×512 PNG (start from `public/pwa-512x512.png`),
  feature graphic 1024×500, 2–8 phone screenshots.
  **Screenshot rule:** the long side may be at most 2× the short side. The emulator
  produces 1080×2400 (2.22×) — crop to ≤1080×2160.
  **Take screenshots from a demo organisation, not a real one** (real members' names appear on screen).

## 2. App content

| Declaration | Answer |
|---|---|
| Privacy policy | URL above |
| App access | **Restricted — login required.** Provide demo credentials (see §6) |
| Ads | No |
| Advertising ID | **No** — verified: the merged manifest contains no `AD_ID` permission |
| Target audience | 18 and over; not designed for children |
| News app / Government / Financial / Health features | No to all |
| Account deletion | Yes — URL above (see §6 caveat) |
| Foreground service permissions | None declared (only the generic `FOREGROUND_SERVICE` merged from OneSignal) |
| Sensitive permissions (SMS, call log, background location, all-files) | None used |

**Permissions in the final merged manifest that matter:** `INTERNET`, `POST_NOTIFICATIONS`,
`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` (foreground only — used by SOS and
nearby-temple search). The rest are push-library plumbing (`WAKE_LOCK`, `VIBRATE`,
`RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE`, FCM `C2D_MESSAGE/RECEIVE`, launcher badges).

### Content rating (IARC questionnaire)

- Violence, sexual content, profanity, controlled substances, gambling: **No**
- Users can interact or exchange content (Channel posts): **Yes**
- App shares the user's physical location with other users (SOS → Captains): **Yes**
- Digital purchases / unrestricted web access: **No**
- Expect: Everyone, with "Users Interact" and "Shares Location" notices.

## 3. Data safety form

For every row: **encrypted in transit = Yes** (HTTPS). **Users can request deletion = Yes** (§6).
No data is sold. No advertising. No analytics/crash-reporting SDK is bundled.

| Play category → type | Collected? | Purpose | Required / optional | Notes |
|---|---|---|---|---|
| Location → Approximate | Yes | App functionality | Optional | SOS and nearby search only, foreground only |
| Location → Precise | Yes | App functionality | Optional | Stored with an SOS alert |
| Personal info → Name | Yes | App functionality, Account management | Required | |
| Personal info → Email address | Yes | Account management | Required | Captain registration; login IDs are `name@vsevak.in` |
| Personal info → User IDs | Yes | Account management | Required | Username |
| Personal info → Phone number | Yes | App functionality, Account management | Required | |
| Personal info → Address | Yes | App functionality | Optional | |
| Personal info → Other info | Yes | App functionality | Optional | Gender, age |
| Health and fitness → Health info | Yes | App functionality | Optional | Blood group, for the emergency ID card |
| Health and fitness → Fitness info | Yes | App functionality | Required | **JUDGEMENT** — Vihar distance walked. Over-declaring is safer than under-declaring |
| Photos and videos → Photos | Yes | App functionality | Optional | Profile, directory and incident photos |
| Messages → Other in-app messages | Yes | App functionality | Optional | Channel posts |
| App activity → Other user-generated content | Yes | App functionality | Required | Vihar entries, notes, incident reports |
| Device or other IDs | Yes | App functionality | Required | OneSignal subscription ID, FCM token |

**Shared with third parties:** answer **No** for all rows. Supabase, Netlify, OneSignal,
Firebase Cloud Messaging and Google Places act as service providers processing data on
vSeva's behalf, which Google exempts from "sharing". **JUDGEMENT** — if you prefer to be
conservative, mark Device IDs and Location as shared with OneSignal/Google.
Also check OneSignal's and Firebase's own published Play data-safety guidance and make
sure nothing they collect is missing above.

**Important — publicly visible data:** the emergency-ID QR page (`/verify/<username>`) shows
name, gender, blood group, **mobile number, emergency number and address** to anyone with the
link, no login. The policy discloses this. Google treats public exposure as something to
disclose clearly, so keep the policy wording and make sure your Data safety answers are not
inconsistent with it.

## 4. Pre-launch checklist

- [ ] Developer account verified; developer email set
- [ ] Demo organisation + demo Captain/Sevak created (§6) — **do not give reviewers real accounts**
- [ ] Policy page shows a contact email, and both URLs load while logged out
- [ ] Deletion migration decision made (§6) before you publish `/delete-account`
- [ ] Screenshots captured from the demo org, cropped to ≤2:1
- [ ] Keystore + password backed up outside this machine
- [ ] `versionCode` bumped for every upload (currently 1)

## 5. Release path

1. **Internal testing** — upload the AAB, add your own Google account, install via the opt-in link. Do the real two-device push test here.
2. **Closed testing** — 12+ testers for 14 days if you have a personal account.
3. **Production** — staged rollout (10% → 50% → 100%).

## 6. Open issues that need your decision

**A. Account deletion is currently broken for most real users.** Deleting a user is blocked by
foreign keys with no cascade rule on `vihar_entries.created_by`, `sos_alerts.*`, and a few
audit columns, so a Captain's "Delete Sevak" fails for anyone who has ever submitted a Vihar.
The fix is written in `scripts/account_deletion_fk_fixes.sql` but **not applied** — it changes
how deletion works on production (entries are kept but detached; a person's own SOS alerts,
which hold a location, are deleted with them). Apply it before publishing `/delete-account`.
Also: deleting the *Captain who created a group* cascades and deletes the group
(`organizations.created_by ON DELETE CASCADE`) — that is why Captain deletions are manual.
Uploaded avatar files are not removed automatically; the deletion page promises removal "on request".

**B. Sevak default password = their mobile number** (`createSevak` sets it), and the public
QR page displays that same mobile number and name. Login IDs are derived from the name. Anyone
who scans an ID card can derive the login and the default password of any Sevak who never
changed it. Recommended: remove the mobile number from the public QR page and force a
password change on first login.

**C. Reviewer access.** Create a dedicated demo organisation with one demo Captain and one demo
Sevak (fake names, fake numbers) and put those in "App access". Never use real members' accounts.

**D. Policy review.** The policy and these answers describe current behaviour accurately to the
best of an engineering audit, but have not been reviewed by a lawyer. India's DPDP Act 2023
applies to the personal data of your volunteers; consider a quick legal read.
