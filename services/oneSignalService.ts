// Track initialization state
let initPromise: Promise<void> | null = null;

const isNativePlatform = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

/**
 * Helper to wait for OneSignal internal state to be ready.
 *
 * `OneSignal.login`/`OneSignal.User` existing is not enough — the SDK keeps
 * setting up internal managers (subscription/session state) as background
 * tasks after `init()` resolves. Calling `login()` while those are still in
 * flight throws deep inside the SDK's own minified code ("Cannot read
 * properties of undefined"), which no external check can fully prevent —
 * so this also checks the deeper `PushSubscription` object as a stronger
 * (though still not perfect) readiness signal, and waits longer overall.
 */
async function waitForOneSignalReady(OneSignal: any, maxAttempts = 14): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (OneSignal.login && OneSignal.User && OneSignal.User.PushSubscription) {
      // Additional delay to ensure internal hydration completes
      await new Promise(r => setTimeout(r, 300));
      return true;
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

export const initOneSignal = async () => {
  if (initPromise) return initPromise;

  // Confirmed via Logcat: the OneSignal Web SDK (loaded in index.html) logs
  // "Incompatible browser" inside the Capacitor Android WebView and never
  // functions there — pushing into its deferred queue just retries uselessly.
  // Same VSeva notification events remain the source of truth either way;
  // only the delivery layer differs. Native push needs OneSignal's Android
  // (FCM-backed) integration, which requires Firebase project credentials
  // (google-services.json) this codebase doesn't have yet — that's a
  // deliberately separate follow-up, not silently faked here.
  if (isNativePlatform()) {
    console.log('OneSignal: Skipping Web SDK on native platform (Android push not yet wired — see services/oneSignalService.ts)');
    initPromise = Promise.resolve();
    return initPromise;
  }

  initPromise = new Promise((resolve) => {
    // @ts-ignore
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    // @ts-ignore
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      console.log('OneSignal: Starting initialization...');
      try {
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: 'sw.js', // Match VitePWA config
          notifyButton: {
            enable: false,
          },
        });
        // init() resolving doesn't mean the SDK's internal managers have
        // finished hydrating — a login attempted right after init still
        // races them. This settle delay is what actually closes that race,
        // more than any property-existence check made afterwards.
        await new Promise(r => setTimeout(r, 800));
        console.log('OneSignal: Initialized');
      } catch (err) {
        console.error('OneSignal: Initialization failed', err);
      } finally {
        resolve();
      }
    });
  });

  return initPromise;
};

export const loginToOneSignal = async (username: string, retries = 3) => {
  if (!username) return;
  if (isNativePlatform()) return; // See initOneSignal — Web SDK is a no-op on native.

  await initOneSignal();

  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    const attemptLogin = async (remaining: number): Promise<void> => {
      try {
        const isReady = await waitForOneSignalReady(OneSignal);
        if (!isReady) {
          throw new Error("SDK readiness timeout");
        }

        if (OneSignal.User.externalId === username) {
          console.log(`OneSignal: Already logged in as ${username}`);
          return;
        }

        await OneSignal.login(username);
        console.log(`OneSignal: Logged in successfully as ${username}`);
      } catch (err) {
        if (remaining > 0) {
          // The SDK's internal hydration race (see waitForOneSignalReady) is
          // the expected cause here, not a real fault — logged quietly at
          // debug level so it doesn't read as an app error on every login,
          // with a growing backoff to give the SDK more time to settle.
          const attemptNumber = retries - remaining + 1;
          console.debug(`OneSignal: Login attempt ${attemptNumber} not ready yet, retrying...`);
          await new Promise(r => setTimeout(r, 1200 * attemptNumber));
          return attemptLogin(remaining - 1);
        }
        // Non-critical — this only affects push-notification targeting, not
        // login itself, and the next app open (or another login elsewhere in
        // the app) will retry it.
        console.warn("OneSignal: Login did not complete after retries — push notifications may not be targeted correctly until the next app open", err);
      }
    };

    await attemptLogin(retries);
  });
};

export const logoutFromOneSignal = async () => {
  if (isNativePlatform()) return; // See initOneSignal — Web SDK is a no-op on native.

  await initOneSignal();

  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    try {
      if (!OneSignal.logout) return;
      console.log('OneSignal: Logging out');
      await OneSignal.logout();
    } catch (err) {
      console.error("OneSignal: Logout failed", err);
    }
  });
};
