export const initOneSignal = async () => {
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true, // Useful for development
      notifyButton: {
        enable: false, // We'll handle subscription via profile or automatic prompt
      },
    });
  });
};

export const loginToOneSignal = (username: string) => {
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    console.log(`Logging in to OneSignal as: ${username}`);
    await OneSignal.login(username);
  });
};

export const logoutFromOneSignal = () => {
  // @ts-ignore
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // @ts-ignore
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    console.log('Logging out from OneSignal');
    await OneSignal.logout();
  });
};
