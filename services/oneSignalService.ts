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
  // functions there. Same VSeva notification events remain the source of
  // truth either way — only the delivery layer differs here: native uses
  // OneSignal's own Capacitor plugin (FCM-backed, configured via the
  // Firebase project's google-services.json placed in android/app/), never
  // the web SDK.
  if (isNativePlatform()) {
    initPromise = (async () => {
      try {
        const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
        await OneSignal.initialize(import.meta.env.VITE_ONESIGNAL_APP_ID);
        // Push notifications need explicit runtime permission on Android 13+
        // (API 33+, which this app's minSdk/targetSdk cover) — silently no-op
        // on older Android versions where permission is implicit.
        await OneSignal.Notifications.requestPermission(false);
        console.log('OneSignal: Native SDK initialized');
      } catch (err) {
        console.error('OneSignal: Native initialization failed', err);
      }
    })();
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

  await initOneSignal();

  if (isNativePlatform()) {
    try {
      const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
      // Same identifier VSeva already uses to target a user's notifications
      // (see the Web SDK path below — both associate on this externalId).
      await OneSignal.login(username);
      console.log(`OneSignal: Native login successful as ${username}`);
    } catch (err) {
      console.warn('OneSignal: Native login failed — push notifications may not be targeted correctly until the next app open', err);
    }
    return;
  }

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
  if (isNativePlatform()) {
    try {
      const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
      console.log('OneSignal: Native logout');
      await OneSignal.logout();
    } catch (err) {
      console.error('OneSignal: Native logout failed', err);
    }
    return;
  }

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
