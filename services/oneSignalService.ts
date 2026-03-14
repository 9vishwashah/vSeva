export const initOneSignal = async () => {
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    console.log('Initializing OneSignal...');
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'sw.js',
      notifyButton: {
        enable: false,
      },
    });
    
    // Listen for subscription changes to re-login and link the user
    OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
      console.log("OneSignal: Subscription changed", event.current.token);
      if (event.current.token) {
        // We have a token now, ensure we are logged in
        console.log("OneSignal: Current ID on subscribe:", OneSignal.User.externalId);
      }
    });

    console.log('OneSignal Initialized');
  });
};

export const loginToOneSignal = (username: string) => {
  if (!username) return;
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    const externalId = OneSignal.User.externalId;
    if (externalId !== username) {
      console.log(`OneSignal: Logging in as ${username}`);
      await OneSignal.login(username);
    } else {
      console.log(`OneSignal: Already logged in as ${username}`);
    }
  });
};

export const logoutFromOneSignal = () => {
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    console.log('OneSignal: Logging out');
    await OneSignal.logout();
  });
};
