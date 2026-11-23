import { PUSH_ENABLED } from './oneSignalService';

// Is this device getting push notifications, and turning them on. Used by the start-up guide's notifications card
// (components/OnboardingWalkthrough.tsx). Android asks through the app's own permission plugin
// (services/notificationPermission.ts), never OneSignal's permission screen; web uses the browser's prompt.
//   on          the phone/browser allows it and this device is opted in
//   off         not allowed yet (can still be asked), or switched off in the app
//   blocked     the phone/browser won't ask again: only its settings can turn it on
//   unsupported this build or browser has no push

export type PushState = 'on' | 'off' | 'blocked' | 'unsupported';

const isNative = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

// The web OneSignal SDK may never finish loading (blocked, wrong domain): answer within `ms` regardless.
function withWebOneSignal<T>(fn: (OneSignal: any) => Promise<T> | T, fallback: T, ms = 4000): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal: any) => {
      try { resolve(await fn(OneSignal)); } catch { resolve(fallback); } finally { window.clearTimeout(timer); }
    });
  });
}

export async function readPushState(): Promise<PushState> {
  if (!PUSH_ENABLED) return 'unsupported';
  if (isNative()) {
    try {
      const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
      if (await OneSignal.Notifications.hasPermission()) {
        const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync().catch(() => true);
        return optedIn ? 'on' : 'off';
      }
      return (await OneSignal.Notifications.canRequestPermission()) ? 'off' : 'blocked';
    } catch {
      return 'unsupported';
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  const optedIn = await withWebOneSignal(OS => OS.User?.PushSubscription?.optedIn, undefined as boolean | undefined, 2500);
  return optedIn === false ? 'off' : 'on';
}

// Asks for permission (or opens the phone's notification settings when Android won't ask again), then opts this
// device in and links it to the signed-in person so their notifications reach it.
export async function turnOnPush(username?: string): Promise<PushState> {
  if (!PUSH_ENABLED) return 'unsupported';
  if (isNative()) {
    try {
      const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
      const { NotificationPermission } = await import('./notificationPermission');
      const { granted } = await NotificationPermission.request();
      if (!granted) {
        await NotificationPermission.openSettings();
        return readPushState();
      }
      await OneSignal.User.pushSubscription.optIn(); // permission already granted: no extra screen
      if (username) await OneSignal.login(username);
      return 'on';
    } catch {
      return readPushState();
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission().catch(() => 'default' as NotificationPermission);
    if (result !== 'granted') return result === 'denied' ? 'blocked' : 'off';
  }
  await withWebOneSignal(async (OS) => {
    await OS.User?.PushSubscription?.optIn?.();
    if (username) await OS.login(username);
  }, undefined);
  return 'on';
}
