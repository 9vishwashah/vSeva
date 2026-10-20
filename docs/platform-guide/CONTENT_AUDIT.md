# Content audit: vSeva Platform Guide (17 Oct 2026)

Every feature in the guide was checked against the app's code and, where possible, against the running app (Android emulator, Captain and Sevak accounts of one group). Only features that exist end to end are described.

## Included, verified

| Feature | Who | Where in the app | Evidence |
|---|---|---|---|
| Sign in, Forgot Password (Sevak: Captain resets; Captain: email link) | Both | Sign-in screen | `pages/Login.tsx`, `pages/ForgotPassword.tsx`, screenshot |
| Create Captain Account, reviewed before creation; Captain signs in with email + mobile | Captain | Sign-in screen | `pages/RegisterAdmin.tsx`, `netlify/functions/approve-org.js` |
| Add Sevaks (name, mobile, alias, gender), credentials shown and shareable on WhatsApp | Captain | More → Add Sevaks | `pages/AddSevak.tsx` |
| Record a Vihar, 4 steps; required fields | Both | New Entry / Add Vihar | `pages/NewEntry.tsx` (`stepError`), screenshots |
| Sevak submission → pending → Approve / Edit / Reject | Both | My Vihars, Pending Approvals | `submitViharEntry`, `approve_vihar_entry`, `reject_vihar_entry` (notifies submitter) |
| Captain entries count immediately and notify participants | Captain | New Entry | `createViharEntry` → `notify_vihar_participants` |
| Statistics tiles and Group Analytics | Both | Statistics / Home, More → Group Analytics | `pages/Dashboard.tsx`, `pages/Statistics.tsx` |
| Vihar Year 14 Oct – 13 Jul | Both | VY menu | `services/viharYear.ts`, Profile shows the range |
| My Sankalp (default 5), Group Sankalp, Sevak lock | Both | Profile & Settings | `SankalpSettingsCard`, `sankalpService.ts` |
| Manage Routes | Captain | More → Manage Routes | `pages/ManageRoutes.tsx` |
| Alert Vihar (Upcoming Vihar), I'm Interested, WhatsApp share | Both | Statistics → Alert Vihar; Notifications | `create_upcoming_alert`, `ViharAlertCard.tsx` |
| Export PDF / Excel (date range, report type, columns); member export | Captain | Statistics → Export; Add Sevaks | `pages/Dashboard.tsx`, `pages/AddSevak.tsx` |
| Incidents (Sevak reports with photo/video; Captain updates status) | Both | More → Incidents | `pages/SubmitReport.tsx`, `pages/ViewReports.tsx` |
| Contacts (Captain-managed emergency list; Sevak directory with Call/WhatsApp) | Both | More → Contacts | `pages/Contacts*`, screenshots |
| Notifications (bell, Notifications page, push settings) | Both | Header bell; More → Notifications; Profile | `NotificationBell.tsx`, `pages/Notifications.tsx`, `ProfileSection.tsx` |
| VChat: own chat, posting permission, Captain follows groups, 30-day retention | Both | More → VChat | `pages/Channel*.tsx`, `can_read_channel`, `channel_follows` policy, cleanup cron |
| Vihar cards: Save / WhatsApp; Seva achievement cards (Story/Square) | Both | View Entries / My Vihars; Share button | `EntryCard.tsx`, `ShareAchievementSheet` |
| Complete your profile: prompt once per visit until complete; ring % around the photo; six details (blood group, age, family emergency name and number, occupation, address); Captain sees "Still to fill" | Sevak | Home prompt, Profile & Settings → Your Details, Add Sevaks | `services/profileCompletion.ts`, `ProfileSection.tsx`, `pages/Dashboard.tsx`, `pages/AddSevak.tsx` |
| Vihar Seva ID Card with QR → public verify page | Both | Profile → Vihar Seva ID Card | `IDCardBadge.tsx`, `PublicSevakProfile.tsx` |
| Community Directory (public, Add a Listing without login, reviewed) | Everyone | More → Community Directory, /directory | `pages/Directory*.tsx`, screenshot |
| Find Derasar (up to 100 km, Google Maps directions) | Everyone | Sign-in screen | `pages/NearbyDerasar.tsx`, screenshot |
| Languages: English, Gujarati, Hindi | Both | EN menu | `i18n/translations.ts` |
| Support contacts, email, website, Instagram | — | App brand settings, shown in the app | `brands/vseva/meta.ts` (`supportContacts`, `contact`, `instagram`) |

## Corrections to the brief

- **Vice Captain is not a separate role.** The app has two account types, Captain and Sevak. The Vice Captain is a name in the group details and contacts, and the guide says so.
- **Approving a Sevak's entry does not send a notification** to the participants. Only a Captain's own entry sends "Your Vihar has been recorded". The guide reflects this.
- **Rejection reason:** the database can store one, but the Captain's Reject button doesn't ask for it, so the guide only says the submitter is notified.

## Left out on purpose

- The platform-admin interface: an internal tool, as the brief requires. It is not mentioned anywhere, including in captions, metadata and screenshots.
- SOS and emergency button: the Safety entry point is hidden in the current app. SOS notifications appear in one screenshot of the notification panel, but SOS is not described as a feature.
- Shraman Seva Group (SSG) brand features (Mumukshu, Internal/Highway, Vihar photo): not part of vSeva.
- iPhone app: none exists. The guide only covers installing the website on an iPhone through Safari.

## Privacy

- Screenshots: member names, phone numbers and emails were replaced on screen before capture, and profile photos and the ID-card QR were blurred. The names of Alpesh Shah and Vishwa Shah were kept, because the app already shows them publicly as support contacts and in the app's design credit.
- The registration screenshot shows the app's own example placeholders (the Captain and Vice Captain example names and the support email/number), exactly as the app displays them.
- The guide contains no credentials, test passwords or internal URLs.

## Checks run

- Rendered all 18 pages and inspected each one; fixed text running under a phone on the cover, a broken QR image, a cramped VChat column, a misplaced phone on page 13, and a note colliding with the footer.
- Layout v2 (17 Oct), from the owner's mobile reference: phone-shaped 135 × 240 mm pages, one idea per page, larger type, slim Android frames. 20 pages, about 3 MB, 18 working links (15 contents entries, plus email, website and Instagram).
- v3 (17 Oct): added page 9 "Complete your profile to 100%" (now 21 pages, 16 contents entries). Retook the ID card screenshot after the partner logo was removed from the card. The prompt image is the owner's own screenshot (no personal data); the profile screens had the username, age, emergency contact, occupation and address replaced on screen before capture.
- Retitled sections: "FAQ's" (was "When something isn't right") and "Seamless Contact" (was "Staying in touch on the road"). The separate quick-reference page became the Captain table (page 7) and the Sevak table (page 9).
- Instagram QR (owner's image) decoded to https://www.instagram.com/the.vseva.
- QR code decoded (with jsQR) to `https://vseva.vjas.in`.
- Text check: no admin-console, database or hosting terms in the guide.

## Open points

- **Support details:** the guide uses the support contacts already shown in the app (Alpesh Shah for guides and demos; Vishwa Shah for technical support, by WhatsApp; the support email; the website; Instagram). Change them in `guide.html` if they should differ.
- **Play Store link:** not included, because no public listing URL is stored in the repository. Add it to the support page once you have it.
- **Gujarati / Hindi editions:** the guide is English only. The app's own Gujarati and Hindi translations could be the base for translated editions.
