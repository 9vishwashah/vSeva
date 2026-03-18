// Track initialization state
let initPromise: Promise<void> | null = null;

/**
 * Helper to wait for OneSignal internal state to be ready
 */
async function waitForOneSignalReady(OneSignal: any, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    // Check if both the User object and the login function are available
    if (OneSignal.login && OneSignal.User) {
      // Small additional delay to ensure internal hydration completes
      await new Promise(r => setTimeout(r, 100));
      return true;
    }
    console.log(`OneSignal: Waiting for SDK readiness (attempt ${i + 1}/${maxAttempts})...`);
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

export const initOneSignal = async () => {
  if (initPromise) return initPromise;

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

        console.log(`OneSignal: Attempting login for ${username} (retries left: ${remaining})`);
        await OneSignal.login(username);
        console.log(`OneSignal: Logged in successfully as ${username}`);
      } catch (err) {
        if (remaining > 0) {
          console.warn(`OneSignal: Login failed, retrying in 1s...`, err);
          await new Promise(r => setTimeout(r, 1000));
          return attemptLogin(remaining - 1);
        }
        console.error("OneSignal: Login failed after retries", err);
      }
    };

    await attemptLogin(retries);
  });
};

export const logoutFromOneSignal = async () => {
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
