import React, { useState } from 'react';
import { Download, X, Share, Plus, Copy } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';
import { BRAND } from '@brand';

interface InstallPWAProps {
    // Lets a page move its own floating buttons out of the way while the banner is up.
    onDismiss?: () => void;
}

export const InstallPWA: React.FC<InstallPWAProps> = ({ onDismiss }) => {
    const { install, isAndroidInstallable, isIOS, isIOSSafari, isAndroid } = usePWAInstall();
    const { t } = useLanguage();
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [tip, setTip] = useState<'desktop' | 'android' | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // Always show the banner — even if installed (user may want to reinstall / guide others)
    if (dismissed) return null;

    const flashTip = (which: 'desktop' | 'android') => {
        setTip(which);
        setTimeout(() => setTip(null), 5000);
    };

    const handleInstallClick = () => {
        if (isAndroidInstallable) {
            install();
        } else if (isIOS) {
            // iPhone / iPad can't be prompted — walk the user through Add to Home Screen
            setShowIOSGuide(true);
        } else if (isAndroid) {
            // Chrome hasn't offered the install prompt (already installed, or criteria not met yet)
            flashTip('android');
        } else {
            // Desktop: show tip to use browser's address bar install icon
            flashTip('desktop');
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin + '/');
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2500);
        } catch {
            // Clipboard blocked — the address is still visible in the address bar
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    const stepNumber: React.CSSProperties = {
        background: '#EA580C', color: '#fff', borderRadius: '50%',
        width: '28px', height: '28px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', fontWeight: 700,
    };
    const stepCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#f8fafc', borderRadius: '12px', padding: '14px' };
    const stepTitle: React.CSSProperties = { margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' };
    const stepBody: React.CSSProperties = { margin: 0, fontSize: '12px', color: '#64748b', marginTop: '3px' };

    return (
        <>
            {/* ── Install Tip Toast (desktop / Android without a native prompt) ── */}
            {tip && (
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10001,
                    background: '#1e293b',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    width: 'max-content',
                    maxWidth: 'calc(100vw - 32px)',
                    border: '1px solid #EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeInUp 0.25s ease',
                }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    {tip === 'android' ? (
                        <span>{t('install.tipAndroid')}</span>
                    ) : (
                        <span>
                            {t('install.tipDesktopBefore')}{' '}
                            <strong style={{ color: '#F97316', margin: '0 4px' }}>{t('install.tipDesktopIcon')}</strong>{' '}
                            {t('install.tipDesktopAfter')}
                        </span>
                    )}
                </div>
            )}
            {/* ── Sticky Footer Banner ── */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderTop: '2px solid #EA580C',
                    boxShadow: '0 -4px 24px rgba(234,88,12,0.18)',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontFamily: 'inherit',
                    // Safe area for iPhone home indicator
                    paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
                }}
            >
                {/* Left: Logo + text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <img
                        src={BRAND.logo}
                        alt={BRAND.name}
                        style={{ height: '34px', width: '34px', objectFit: 'contain', flexShrink: 0, borderRadius: '8px', background: BRAND.logoPadded ? undefined : '#fff', transform: BRAND.logoPadded ? 'scale(1.5)' : undefined }}
                    />
                    <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, lineHeight: 1.2 }}>
                            {t('install.bannerTitle', { name: BRAND.name })}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, lineHeight: 1.3, marginTop: '1px' }}>
                            {isIOS ? t('install.bannerSubIOS') : t('install.bannerSub')}
                        </p>
                    </div>
                </div>

                {/* Right: Install button + dismiss */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                        id="pwa-install-btn"
                        onClick={handleInstallClick}
                        style={{
                            background: 'linear-gradient(135deg, #EA580C, #F97316)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 18px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 12px rgba(234,88,12,0.35)',
                            whiteSpace: 'nowrap',
                            transition: 'transform 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <Download size={14} />
                        {t('install.button')}
                    </button>

                    <button
                        onClick={handleDismiss}
                        aria-label={t('install.dismiss')}
                        title={t('install.dismiss')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '50%',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ── iOS Instructions Modal ── */}
            {showIOSGuide && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                    onClick={() => setShowIOSGuide(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            background: '#fff',
                            borderRadius: '20px 20px 0 0',
                            padding: '28px 24px 40px',
                            width: '100%',
                            maxWidth: '480px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
                            // Safe area for iPhone home indicator
                            paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom) + 20px))',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <img src={BRAND.logo} alt={BRAND.name} style={{ height: '44px', width: '44px', objectFit: 'contain', borderRadius: '10px', transform: BRAND.logoPadded ? 'scale(1.4)' : undefined }} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>{t('install.iosTitle', { name: BRAND.name })}</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{t('install.iosSub')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Step 1 */}
                            <div style={{ ...stepCard, ...(isIOSSafari ? {} : { background: '#FFF7ED', border: '1px solid #FDBA74' }) }}>
                                <div style={stepNumber}>1</div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={stepTitle}>{t('install.step1Title')}</p>
                                    <p style={stepBody}>{isIOSSafari ? t('install.step1Body') : t('install.step1Warn')}</p>
                                    {!isIOSSafari && (
                                        <button
                                            onClick={copyLink}
                                            style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EA580C', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            <Copy size={14} /> {linkCopied ? t('install.linkCopied') : t('install.copyLink')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div style={stepCard}>
                                <div style={stepNumber}>2</div>
                                <div>
                                    <p style={stepTitle}>{t('install.step2Title')}</p>
                                    <p style={stepBody}>
                                        {t('install.step2Before')}{' '}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#3b82f6', fontWeight: 600 }}>
                                            <Share size={13} /> {t('install.step2Icon')}
                                        </span>{' '}
                                        {t('install.step2After')}
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div style={stepCard}>
                                <div style={stepNumber}>3</div>
                                <div>
                                    <p style={stepTitle}>{t('install.step3Title')}</p>
                                    <p style={stepBody}>
                                        {t('install.step3Before')}{' '}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#1e293b', fontWeight: 600 }}>
                                            <Plus size={13} /> {t('install.step3Icon')}
                                        </span>
                                        {t('install.step3After')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSGuide(false)}
                            style={{
                                marginTop: '20px',
                                width: '100%',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '14px',
                                fontWeight: 600,
                                fontSize: '14px',
                                color: '#475569',
                                cursor: 'pointer',
                            }}
                        >
                            {t('install.gotIt')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
