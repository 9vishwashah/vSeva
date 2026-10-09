// Hands a generated PNG to whatever the platform offers for sharing.
//
// Android app (Capacitor): images are written to the app's cache folder (@capacitor/filesystem) and then
//   * shareImage()   -> the native Android share sheet (@capacitor/share), like deliverPdf() does for PDFs;
//   * shareToApp()   -> straight into WhatsApp's "Send to" picker (chats, groups and "My status") or Instagram's
//                       Story composer, through the app's own AppShare plugin (android/.../AppSharePlugin.java);
//   * saveImage()    -> into the phone's Gallery (Pictures/<app name>), also via AppShare.
// Browsers: the Web Share API with the file when the browser can share files (Chrome on Android, Safari on
// iOS, some desktops); otherwise, and for saveImage(), the PNG is downloaded.
import { registerPlugin } from '@capacitor/core';
import { BRAND } from '@brand';

export const isNative = (): boolean => {
  const cap = (globalThis as any).Capacitor;
  return !!cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
};

interface AppSharePlugin {
  apps(): Promise<{ whatsapp: boolean; instagram: boolean }>;
  shareTo(options: { target: 'whatsapp' | 'instagram_story'; path?: string; text?: string; facebookAppId?: string }): Promise<void>;
  saveToGallery(options: { path: string; fileName: string; album: string }): Promise<{ uri: string }>;
}
const AppShare = registerPlugin<AppSharePlugin>('AppShare');

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';
export type DirectTarget = 'whatsapp' | 'instagram_story';

export const canShareFiles = (): boolean => {
  if (isNative()) return true;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

const isCancel = (e: unknown) => {
  const msg = String((e as any)?.message || e || '').toLowerCase();
  return (e as any)?.name === 'AbortError' || msg.includes('cancel') || msg.includes('abort');
};

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// A fixed name per image overwrites the previous copy, so shared images never pile up in the cache.
async function writeCacheImage(blob: Blob, fileName: string): Promise<string> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const written = await Filesystem.writeFile({
    path: `shared/${fileName}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  return written.uri;
}

/** Which direct-share apps are installed (Android app only; on the web both are false). */
let appsPromise: Promise<{ whatsapp: boolean; instagram: boolean }> | null = null;
export function installedApps(): Promise<{ whatsapp: boolean; instagram: boolean }> {
  if (!isNative()) return Promise.resolve({ whatsapp: false, instagram: false });
  if (!appsPromise) appsPromise = AppShare.apps().catch(() => ({ whatsapp: false, instagram: false }));
  return appsPromise;
}

/** The native share sheet (Android app) / Web Share API / download (browsers). */
export async function shareImage(blob: Blob, fileName: string, opts: { title: string; text?: string }): Promise<ShareOutcome> {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    const uri = await writeCacheImage(blob, fileName);
    try {
      await Share.share({ title: opts.title, text: opts.text, files: [uri], dialogTitle: opts.title });
      return 'shared';
    } catch (e) {
      if (isCancel(e)) return 'cancelled';
      throw e;
    }
  }

  const file = new File([blob], fileName, { type: 'image/png' });
  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: opts.text });
      return 'shared';
    } catch (e) {
      if (isCancel(e)) return 'cancelled';
      throw e;
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}

/**
 * Opens WhatsApp (chat / group / Status picker) or Instagram's Story composer with the image already loaded.
 * Android app only. If the app is not installed, falls back to the regular share sheet.
 */
export async function shareToApp(target: DirectTarget, blob: Blob, fileName: string, text?: string): Promise<ShareOutcome> {
  if (!isNative()) return shareImage(blob, fileName, { title: BRAND.name, text });
  const path = await writeCacheImage(blob, fileName);
  try {
    await AppShare.shareTo({
      target,
      path,
      // Instagram ignores text on a Story; WhatsApp uses it as the caption.
      text: target === 'whatsapp' ? text : undefined,
      facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || undefined,
    });
    return 'shared';
  } catch (e: any) {
    if (e?.code === 'not_installed') return shareImage(blob, fileName, { title: BRAND.name, text });
    throw e;
  }
}

/** Opens WhatsApp's chat picker with a text message already typed (Android app); wa.me on the web. */
export async function shareTextToWhatsApp(text: string): Promise<void> {
  if (isNative()) {
    try {
      await AppShare.shareTo({ target: 'whatsapp', text });
      return;
    } catch (e: any) {
      if (e?.code !== 'not_installed') throw e;
      const { Share } = await import('@capacitor/share');
      await Share.share({ text }).catch(err => { if (!isCancel(err)) throw err; });
      return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

/** Saves the image where the user expects it: the phone Gallery in the app, a download in the browser. */
export async function saveImage(blob: Blob, fileName: string): Promise<'gallery' | 'downloaded'> {
  if (isNative()) {
    const path = await writeCacheImage(blob, fileName);
    await AppShare.saveToGallery({ path, fileName, album: BRAND.name });
    return 'gallery';
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}
