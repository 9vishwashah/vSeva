import type { jsPDF } from 'jspdf';

const isNativePlatform = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

// jsPDF's own doc.save(filename) creates a blob: URL and clicks a hidden
// <a download> — the standard browser "Save As" flow, and it keeps working
// exactly as before on web. Confirmed via Logcat: that flow fails silently
// inside the Capacitor Android WebView (the app reports success but no file
// ever appears), since a WebView has no download manager to hand a blob: URL
// to. Content/layout of the PDF itself is untouched here — this only swaps
// how the already-built jsPDF document reaches the user on native: written to
// the device's cache dir via @capacitor/filesystem, then handed to the native
// share sheet via @capacitor/share, so the user can save or send it exactly
// like any other Android file.
export async function deliverPdf(doc: jsPDF, filename: string): Promise<void> {
  if (!isNativePlatform()) {
    doc.save(filename);
    return;
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const base64Data = doc.output('datauristring').split(',')[1];

  const written = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });

  await Share.share({
    title: filename,
    url: written.uri,
  });
}

// Same delivery for any generated file (Excel, CSV, ...): a normal download in browsers; in the Android app
// it is written to the cache and handed to the share sheet (Save to Files / Drive / WhatsApp ...), because a
// plain <a download> does nothing inside the app's WebView.
export async function deliverFile(blob: Blob, filename: string): Promise<void> {
  if (!isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64Data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const written = await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Cache });
  await Share.share({ title: filename, url: written.uri }).catch((e: any) => {
    if (!/cancel/i.test(String(e?.message || e))) throw e;
  });
}
