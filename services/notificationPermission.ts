import { registerPlugin } from '@capacitor/core';

// Android app only: the notification permission, asked by the app itself
// (android/app/src/main/java/in/vjas/vseva/NotificationPermissionPlugin.java). Use this instead of OneSignal's
// requestPermission(), whose separate permission screen could get stuck on top of the app (see the plugin).
interface NotificationPermissionPlugin {
  check(): Promise<{ granted: boolean }>;
  request(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
}

export const NotificationPermission = registerPlugin<NotificationPermissionPlugin>('NotificationPermission');
