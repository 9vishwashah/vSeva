# SSG Android app: push notifications (same setup as vSeva)

vSeva's Android app gets push through **OneSignal**, which delivers through **Firebase Cloud Messaging (FCM)**.
The SSG app (`in.vjas.ssg`) uses the same code. Only these are missing: a Firebase entry for the SSG app, the
Firebase key inside SSG's OneSignal app, and a few settings. Nothing in the app code needs to change.

What is already done in the code:
- SSG has its own OneSignal App ID in `.env.ssg` (used by `npm run android:ssg`).
- `android/app/build.gradle` uses `android/app/src/ssg/google-services.json` automatically once it exists
  (until then the SSG build simply skips Firebase).
- SSG has its own notification icon (`android/app/src/ssg/res/drawable/ic_stat_onesignal_default.png`).
- `netlify/functions/send-push.js` (runs on the vSeva site for every brand) sends SSG group notifications through
  SSG's own OneSignal app, with SSG's orange accent and pictures from ssg.vjas.in. It never uses vSeva's app.

## Step 1. Add the SSG app to Firebase

1. Open https://console.firebase.google.com and the **same project vSeva uses** (simplest: one project, two apps).
2. Project overview > **Add app** > Android.
3. Android package name: `in.vjas.ssg` (must be exactly this). App nickname: `Shraman Seva Group`. SHA-1: leave empty.
4. **Register app** > **Download google-services.json**. Skip the "Add Firebase SDK" steps (Capacitor and OneSignal
   already include it).
5. Save the file as `android/app/src/ssg/google-services.json`.
   - Do not replace `android/app/google-services.json` (that one is vSeva's).
   - Both files are git-ignored on purpose; keep a copy somewhere safe.
   - Check: open it and confirm `"package_name": "in.vjas.ssg"`.

## Step 2. Give SSG's OneSignal app the Firebase key

1. Firebase > Project settings (gear) > **Service accounts** > **Generate new private key** > downloads a JSON file.
   (If vSeva's OneSignal already has this project's key, you can reuse that same JSON file.)
   Keep this file private: never commit it, never send it in chat.
2. https://dashboard.onesignal.com > open the **Shraman Seva Group** app (the App ID in `.env.ssg`).
3. Settings > **Push & In-App** > **Google Android (FCM)** > upload the service account JSON > Save.

## Step 3. Server settings (Netlify)

**vSeva Netlify site** (send-push runs here for every brand), Site configuration > Environment variables:

| Variable | Value |
| --- | --- |
| `ONESIGNAL_APP_ID_SSG` | SSG OneSignal App ID (OneSignal > Settings > Keys & IDs) |
| `ONESIGNAL_API_KEY_SSG` | SSG OneSignal REST API key (secret) |
| `ONESIGNAL_SOS_ANDROID_CHANNEL_ID_SSG` | optional: SSG's "SOS" notification category id (see Step 5) |

**SSG Netlify site**:

| Variable | Value |
| --- | --- |
| `VITE_ONESIGNAL_APP_ID` | the same SSG OneSignal App ID |

Important: the SSG site builds the live updates for the installed SSG app. Without `VITE_ONESIGNAL_APP_ID` there,
the build turns push off (it refuses to borrow vSeva's id), and the next live update would install a version
with push switched off.

After adding variables, redeploy both sites (or wait for your next push).

## Step 4. Build and release the SSG app (a Play Store update is needed)

The Firebase file is part of the native app, so this can't arrive through a live update.

1. In `android/app/build.gradle`, in the `ssg` flavor, raise `versionCode` (3 → 4) and `versionName` (1.2 → 1.3).
2. From the project root: `npm run android:ssg`
3. Android Studio > Build > Select Build Variant > `ssgDebug` > Run on your phone to test first (Step 6).
4. Then `ssgRelease` > Build > Generate Signed App Bundle > upload the `.aab` in the SSG Play Console listing.

## Step 5. Optional: SOS sound, like vSeva

In the SSG OneSignal app: Settings > Push & In-App > Android Notification Channels > **Add group/category** named
`SOS`, importance **Urgent**, sound on. Copy its channel id into `ONESIGNAL_SOS_ANDROID_CHANNEL_ID_SSG` (Step 3).

## Step 6. Test

1. Install `ssgDebug` on a phone, sign in as an SSG Sevak, tap **Allow** for notifications.
2. OneSignal (SSG app) > Audience > Subscriptions: the phone should appear, with the Sevak's username as External ID.
3. OneSignal > Messages > New Push > send a test to that subscription: it should arrive with the SSG icon.
4. Real check: an SSG Captain creates an **Alert Vihar**; the Sevak's phone gets the push and tapping it opens the app.

## If it doesn't work

| What you see | Likely cause |
| --- | --- |
| Phone never appears in OneSignal Subscriptions | `src/ssg/google-services.json` missing or wrong package name; app built before the file was added; notifications not allowed |
| Appears, but test push never arrives | Firebase key not uploaded to the SSG OneSignal app (Step 2) |
| Test works, Alert Vihar push doesn't | `ONESIGNAL_APP_ID_SSG` / `ONESIGNAL_API_KEY_SSG` missing on the vSeva site. Netlify > Logs > Functions > send-push shows "no OneSignal app configured for brand SSG" |
| Works, then stops after a live update | `VITE_ONESIGNAL_APP_ID` missing on the SSG Netlify site (Step 3) |
| Late or missing when the phone is idle | phone battery saver; ask the Sevak to set the SSG app to "Unrestricted" battery use |
