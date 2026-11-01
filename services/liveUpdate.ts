import { BRAND } from '@brand';

// Two kinds of update for the installed Android app.
//
// 1. Live updates (like Instagram): every website deploy also publishes the app's screens as a bundle
//    (scripts/app-update-bundle.mjs → /app-update/<brand>.json + zip). The app checks on start and whenever it
//    comes back to the foreground, downloads a newer bundle quietly, and switches to it the next time it has
//    been in the background for 10 minutes or is reopened, so nobody loses a half-filled form. A bundle that
//    fails to start is rolled back automatically by the updater (notifyAppReady below never arrives).
//    Uses @capgo/capacitor-updater in self-hosted manual mode: no Capgo account, nothing is sent to Capgo.
//
// 2. Store updates: changes to the native app itself (new plugin, permissions, Android settings) still need a
//    Play Store release. When one is out, checkStoreUpdate() reports it and the app shows a pop-up whose button
//    opens the Play Store page (components/StoreUpdatePrompt.tsx).

const isNative = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

const MANIFEST_URL = `${BRAND.siteUrl}/app-update/${BRAND.id}.json`;
const CHECK_EVERY_MS = 30 * 60 * 1000;
let lastCheck = 0;
let checking = false;

interface Manifest { build: string; url: string; checksum?: string; minNative?: number }

async function checkLiveUpdate(): Promise<void> {
  if (checking || Date.now() - lastCheck < CHECK_EVERY_MS) return;
  checking = true;
  lastCheck = Date.now();
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const m = (await res.json()) as Manifest;
    // builds are UTC yyyymmddhhmm stamps: only ever move forward
    if (!m?.build || !/^\d{12}$/.test(m.build) || m.build <= __APP_BUILD__) return;

    const [{ CapacitorUpdater }, { App }] = await Promise.all([import('@capgo/capacitor-updater'), import('@capacitor/app')]);
    const info = await App.getInfo();
    if (m.minNative && Number(info.build) < m.minNative) return; // needs a Play Store update first

    const { bundles } = await CapacitorUpdater.list();
    let bundle = bundles.find(b => b.version === m.build && b.status === 'success');
    if (!bundle) {
      bundle = await CapacitorUpdater.download({ url: new URL(m.url, BRAND.siteUrl).href, version: m.build, checksum: m.checksum });
    }
    // switch on the next restart, or after 10 minutes in the background (never mid-task)
    await CapacitorUpdater.setMultiDelay({ delayConditions: [{ kind: 'background', value: String(10 * 60 * 1000) }] });
    await CapacitorUpdater.next({ id: bundle.id });
  } catch (err) {
    console.warn('[live-update] check failed', err); // offline or server hiccup: try again next time
  } finally {
    checking = false;
  }
}

// Call once, as early as possible after the app has started.
export async function initLiveUpdates(): Promise<void> {
  if (!isNative()) return;
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    // "this bundle started fine": without it the updater rolls back to the previous one
    await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    console.warn('[live-update] updater not available', err);
    return;
  }
  // The web app's service worker would keep serving the old cached screens inside the app, defeating updates.
  // The Android app has its screens on the phone, so it has no use for one; remove any left by older versions.
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    regs?.forEach(r => r.unregister());
  } catch { /* none */ }

  checkLiveUpdate();
  const { App } = await import('@capacitor/app');
  App.addListener('appStateChange', ({ isActive }) => { if (isActive) checkLiveUpdate(); });
}

// Is a newer version of the app on the Play Store? (Android, installed from Play)
export async function checkStoreUpdate(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { AppUpdate, AppUpdateAvailability } = await import('@capawesome/capacitor-app-update');
    const info = await AppUpdate.getAppUpdateInfo();
    return info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE;
  } catch {
    return false; // not installed from Play (debug build, sideloaded APK) or Play unavailable
  }
}

export async function openStoreListing(): Promise<void> {
  try {
    const { AppUpdate } = await import('@capawesome/capacitor-app-update');
    await AppUpdate.openAppStore();
  } catch (err) {
    console.warn('[store-update] could not open the Play Store', err);
  }
}
