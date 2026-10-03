import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// iPhone / iPod, and iPad — including iPadOS 13+, whose Safari reports a desktop
// "Macintosh" user agent and can only be told apart by its touch screen.
const detectIOS = (): boolean => {
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

// "Add to Home Screen" is only offered by Safari. Chrome/Firefox/Edge on iOS and in-app
// browsers (WhatsApp, Instagram, Facebook …) either lack it or hide it.
const detectIOSSafari = (): boolean => {
    const ua = navigator.userAgent;
    return /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\/|fban|fbav|instagram|line\/|twitter|snapchat|whatsapp|linkedinapp/i.test(ua);
};

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isAndroidInstallable, setIsAndroidInstallable] = useState(false);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    const isIOS = detectIOS();
    const isIOSSafari = isIOS && detectIOSSafari();
    const isAndroid = /android/i.test(navigator.userAgent);
    // Detect if already running as installed PWA (standalone mode)
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

    useEffect(() => {
        // Check if already installed as PWA
        if (isStandalone) {
            setIsAppInstalled(true);
            return;
        }

        // Check if event already fired and was captured globally
        const globalPrompt = (window as any).deferredPWAPrompt;
        if (globalPrompt) {
            setDeferredPrompt(globalPrompt);
            setIsAndroidInstallable(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsAndroidInstallable(true);
        };

        const globalReadyHandler = () => {
            const prompt = (window as any).deferredPWAPrompt;
            if (prompt) {
                setDeferredPrompt(prompt);
                setIsAndroidInstallable(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('pwa-prompt-ready', globalReadyHandler);

        // Fires when installed via the prompt
        window.addEventListener('appinstalled', () => {
            setIsAppInstalled(true);
            setIsAndroidInstallable(false);
            setDeferredPrompt(null);
            (window as any).deferredPWAPrompt = null;
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('pwa-prompt-ready', globalReadyHandler);
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        // Do NOT hide banner on dismiss — user can try again later
    };

    return {
        install,
        isAndroidInstallable,
        isIOS,
        isIOSSafari,
        isAndroid,
        isStandalone,
        isAppInstalled,
        // Always show banner — visibility controlled by dismissed state in InstallPWA
        shouldShowBanner: true,
    };
};
