import React, { useRef, useState } from 'react';
import { Trophy, Medal, Download, Footprints } from 'lucide-react';
import html2canvas from 'html2canvas';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface LeaderboardItem {
    rank: number;
    name: string;
    count: number;
    km: number;
    username: string;
}

interface LeaderboardCardProps {
    title: string;
    icon: React.ReactNode;
    items: LeaderboardItem[];
    colorClass: string;
    bgClass: string;
    loading?: boolean;
    orgName?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, icon, items, colorClass, bgClass, loading }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!printRef.current || !wrapperRef.current || isDownloading) return;
        setIsDownloading(true);

        // Briefly show the print element in-flow so html2canvas renders it accurately
        const wrapper = wrapperRef.current;
        wrapper.style.height = 'auto';
        wrapper.style.overflow = 'visible';
        wrapper.style.position = 'static';
        wrapper.style.visibility = 'visible';

        try {
            await new Promise(r => setTimeout(r, 120));
            const canvas = await html2canvas(printRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${title.replace(/\s+/g, '_')}.png`;
            link.click();
        } catch (err) {
            console.error('Download failed', err);
        } finally {
            // Hide again
            wrapper.style.height = '0';
            wrapper.style.overflow = 'hidden';
            wrapper.style.position = 'absolute';
            wrapper.style.visibility = 'hidden';
            setIsDownloading(false);
        }
    };

    const isMale = bgClass.includes('blue');
    const headerBg = isMale ? '#eff6ff' : '#fdf2f8';
    const accentColor = isMale ? '#2563eb' : '#db2777';

    return (
        <div className="relative">
            {/* ── Visible on-screen card ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className={`p-4 border-b border-gray-100 flex items-center gap-2 ${bgClass}`}>
                    <div className={colorClass}>{icon}</div>
                    <h3 className="font-bold text-gray-800 flex-1">{title}</h3>
                    <img src={vSevaLogo} alt="vSeva" className="h-8 w-8 object-contain opacity-80 mr-1" />
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !!loading || items.length === 0}
                        title="Download as image"
                        className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-gray-500 hover:text-gray-800 border border-white/50 transition-all active:scale-90 disabled:opacity-40"
                    >
                        {isDownloading
                            ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin block" />
                            : <Download size={15} />}
                    </button>
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto max-h-[420px]">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No active sevaks found.</div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {items.map((item, index) => (
                                <div key={index} className="flex items-center p-3 hover:bg-gray-50 transition-colors">
                                    <div className={`flex-shrink-0 w-8 flex justify-center text-sm font-bold ${item.rank === 1 ? 'text-yellow-500' : item.rank === 2 ? 'text-gray-400' : item.rank === 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                                        {item.rank <= 3 ? <Medal size={18} /> : `#${item.rank}`}
                                    </div>
                                    <div className="flex-1 min-w-0 ml-3">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.km} km</p>
                                    </div>
                                    <div className="mr-2 text-right">
                                        <span className="block text-lg font-bold text-gray-800 leading-none">{item.count}</span>
                                        <span className="text-[10px] text-gray-400 uppercase">Vihars</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Hidden print canvas div (made briefly visible during capture) ── */}
            <div
                ref={wrapperRef}
                style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    height: 0,
                    overflow: 'hidden',
                    top: 0,
                    left: 0,
                    zIndex: -1,
                }}
            >
                <div
                    ref={printRef}
                    style={{
                        width: 380,
                        background: '#ffffff',
                        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, background: headerBg, borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: accentColor, display: 'inline-flex', alignItems: 'center' }}>
                            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937', lineHeight: '1.4', flex: 1 }}>{title}</span>
                        <img src={vSevaLogo} alt="vSeva" style={{ height: 32, width: 32, objectFit: 'contain' }} />
                    </div>

                    {/* Rows */}
                    <div>
                        {items.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '13px 16px',
                                borderBottom: '1px solid #f9fafb',
                                background: '#ffffff',
                            }}>
                                <div style={{
                                    flexShrink: 0, width: 32, textAlign: 'center', fontWeight: 700,
                                    fontSize: item.rank <= 3 ? 16 : 12,
                                    color: item.rank === 1 ? '#eab308' : item.rank === 2 ? '#9ca3af' : item.rank === 3 ? '#f97316' : '#9ca3af',
                                    lineHeight: '1.5',
                                }}>
                                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                                </div>
                                <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: '1.6', paddingBottom: 1 }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: '1.6' }}>{item.km} km</div>
                                </div>
                                <div style={{ textAlign: 'right', paddingRight: 4 }}>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', lineHeight: '1.4' }}>{item.count}</div>
                                    <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1.6' }}>Vihars</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Credits footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                        <img src={vSevaLogo} alt="vSeva" style={{ height: 18, width: 18, objectFit: 'contain', opacity: 0.65 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#4b5563', lineHeight: '1.5' }}>vSeva</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: '1.5' }}>· by Vishwa Alpesh Shah</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardCard;
