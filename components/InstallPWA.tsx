import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallPWA: React.FC = () => {
    const { install, isInstallable } = usePWAInstall();

    if (!isInstallable) return null;

    return (
        <button
            onClick={install}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 animate-fade-in-up"
            aria-label="Install App"
        >
            <Download size={20} />
            <span className="font-medium">Install App</span>
        </button>
    );
};
