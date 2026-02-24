import React, { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import vSevaLogo from '../assets/vseva-logo.png';

export const InstallPWA: React.FC = () => {
    const { install, isAndroidInstallable, isIOS } = usePWAInstall();
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [showDesktopTip, setShowDesktopTip] = useState(false);

    // Always show the banner — even if installed (user may want to reinstall / guide others)
    if (dismissed) return null;

    const handleInstallClick = () => {
        if (isAndroidInstallable) {
            install();
        } else if (isIOS) {
            setShowIOSGuide(true);
        } else {
            // Desktop: show tip to use browser's address bar install icon
            setShowDesktopTip(true);
            setTimeout(() => setShowDesktopTip(false), 4000);
        }
    };

    return (
        <>
            {/* ── Desktop Install Tip Toast ── */}
            {showDesktopTip && (
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
                    whiteSpace: 'nowrap',
                    border: '1px solid #EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeInUp 0.25s ease',
                }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    Look for the <strong style={{ color: '#F97316', margin: '0 4px' }}>⊕ install icon</strong> in your browser's address bar
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
                        src={vSevaLogo}
                        alt="vSeva"
                        style={{ height: '34px', width: '34px', objectFit: 'contain', flexShrink: 0, borderRadius: '8px' }}
                    />
                    <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, lineHeight: 1.2 }}>
                            Install vSeva App
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, lineHeight: 1.3, marginTop: '1px' }}>
                            {isIOS
                                ? 'Add to Home Screen for the best experience'
                                : 'Get the full app experience — works offline too'}
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
                        Install App
                    </button>

                    <button
                        onClick={() => setDismissed(true)}
                        aria-label="Dismiss install banner"
                        title="Dismiss"
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
                        style={{
                            background: '#fff',
                            borderRadius: '20px 20px 0 0',
                            padding: '28px 24px 40px',
                            width: '100%',
                            maxWidth: '480px',
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
                            // Safe area for iPhone home indicator
                            paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom) + 20px))',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <img src={vSevaLogo} alt="vSeva" style={{ height: '44px', width: '44px', objectFit: 'contain', borderRadius: '10px' }} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>Install vSeva on iPhone</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '2px' }}>3 quick steps to add to Home Screen</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Step 1 */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                                <div style={{
                                    background: '#EA580C', color: '#fff', borderRadius: '50%',
                                    width: '28px', height: '28px', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', fontWeight: 700,
                                }}>1</div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                                        Open in Safari
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                        Make sure you're using <strong>Safari</strong> — PWA install only works in Safari on iPhone
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                                <div style={{
                                    background: '#EA580C', color: '#fff', borderRadius: '50%',
                                    width: '28px', height: '28px', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', fontWeight: 700,
                                }}>2</div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                                        Tap the Share button
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                        At the bottom of Safari, tap the{' '}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#3b82f6', fontWeight: 600 }}>
                                            <Share size={13} /> Share
                                        </span>{' '}
                                        icon
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#f8fafc', borderRadius: '12px', padding: '14px' }}>
                                <div style={{
                                    background: '#EA580C', color: '#fff', borderRadius: '50%',
                                    width: '28px', height: '28px', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', fontWeight: 700,
                                }}>3</div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                                        Tap "Add to Home Screen"
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                        Scroll down in the share sheet, tap{' '}
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#1e293b', fontWeight: 600 }}>
                                            <Plus size={13} /> Add to Home Screen
                                        </span>
                                        , then tap <strong>Add</strong>. Done! 🎉
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
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
