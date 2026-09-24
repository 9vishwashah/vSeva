import React, { useRef, useState } from 'react';
import { ViharEntry } from '../types';
import { MessageCircle, Download, Trash2, Pencil } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface EntryCardProps {
    entry: ViharEntry;
    getSevakInfo: (username: string) => { name: string; blood?: string };
    onDelete?: (id: number) => void;
    onEdit?: (entry: ViharEntry) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, getSevakInfo, onDelete, onEdit }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const { showToast } = useToast();

    const handleShare = async () => {
        if (!cardRef.current || isSharing) return;
        setIsSharing(true);

        try {
            // html2canvas (~200KB) is only needed for this on-demand share action —
            // load it when actually used instead of on every entries page visit.
            const { default: html2canvas } = await import('html2canvas');
            // Wait for fonts/styles
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(cardRef.current, {
                scale: 2, // Retain quality
                useCORS: true,
                backgroundColor: '#ffffff', // Ensure white background
                logging: false
            });

            const dataUrl = canvas.toDataURL("image/png", 1.0);
            const fileName = `Vihar_${entry.vihar_date}.png`;
            const file = await (await fetch(dataUrl)).blob().then(blob => new File([blob], fileName, { type: 'image/png' }));

            // Try native sharing first
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Vihar Update',
                    text: `Vihar from ${entry.vihar_from} to ${entry.vihar_to} on ${entry.vihar_date}`
                });
            } else {
                // Fallback for Desktop: Download
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = fileName;
                link.click();
                showToast("Image downloaded. Please share on WhatsApp.", "success");
            }

        } catch (error) {
            console.error("Share failed", error);
            showToast("Failed to generate image.", "error");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow relative overflow-hidden">
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-saffron-400 to-saffron-600 rounded-l-2xl" />
            {/* Capture Area */}
            <div ref={cardRef} className="bg-white p-4 pl-5 rounded-2xl relative">
                {/* Date badge — absolute top-right, matches redesign mock */}
                <div className="absolute top-3.5 right-3.5 rounded-xl text-center leading-none px-2.5 py-1.5" style={{ background: '#FFF0E5' }}>
                    <p className="text-sm font-extrabold" style={{ color: '#DE6B38' }}>{new Date(`${entry.vihar_date}T00:00:00`).getDate()}</p>
                    <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#B5602C' }}>{new Date(`${entry.vihar_date}T00:00:00`).toLocaleString('default', { month: 'short' })}</p>
                </div>

                {/* Route + Type pill */}
                <div className="flex items-center gap-2 flex-wrap pr-14 mb-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[15px] font-extrabold text-[#241C17] truncate">{entry.vihar_from}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B7B7AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        <span className="text-[15px] font-extrabold text-[#241C17] truncate">{entry.vihar_to}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: '#FFF0E5', color: '#B5602C' }}>
                        {entry.vihar_type}
                    </span>
                    {(entry.group_sadhu || entry.group_sadhvi || entry.status === 'pending' || entry.status === 'rejected') && (
                        <div className="flex gap-1 flex-wrap">
                            {entry.group_sadhu && <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">Sadhu</span>}
                            {entry.group_sadhvi && <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1.5 py-0.5 rounded">Sadhvi</span>}
                            {entry.status === 'pending' && <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-1.5 py-0.5 rounded uppercase">Pending Captain Approval</span>}
                            {entry.status === 'rejected' && <span className="text-[10px] text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded uppercase">Rejected</span>}
                        </div>
                    )}
                </div>

                {/* Stats chips */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center rounded-xl py-2" style={{ background: '#FFF0E5' }}>
                        <p className="text-sm font-extrabold text-[#241C17] leading-none">{entry.distance_km}<span className="text-[10px] font-bold" style={{ color: '#B5602C' }}> km</span></p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#B5602C' }}>Total KM</p>
                    </div>
                    <div className="text-center rounded-xl py-2" style={{ background: '#FCEAEB' }}>
                        <p className="text-sm font-extrabold text-[#241C17] leading-none">{entry.no_sadhubhagwan || 0}<span className="text-[10px]" style={{ color: '#D9A6A5' }}> / </span>{entry.no_sadhvijibhagwan || 0}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#C05A57' }}>Sadhu/Sadhvi</p>
                    </div>
                    <div className="text-center rounded-xl py-2" style={{ background: '#F1EAFB' }}>
                        <p className="text-sm font-extrabold text-[#241C17] leading-none">{(entry.sevaks || []).length}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#6B4FAE' }}>Sevaks</p>
                    </div>
                </div>

                {/* Sevaks List — single row, horizontally scrollable */}
                <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8A6A57]">Sevaks Present</p>
                    <div
                        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {(entry.sevaks || []).map((u, i) => {
                            const name = getSevakInfo(u).name;
                            const initials = name.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
                            return (
                                <div
                                    key={i}
                                    className="shrink-0 flex flex-col items-center gap-0.5"
                                >
                                    <span className="flex items-center gap-1.5 text-[11px] pl-0.5 pr-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{ background: '#F7F4F0', color: '#241C17' }}>
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0" style={{ background: '#FCE6D8', color: '#C05A2C' }}>
                                            {initials}
                                        </span>
                                        {name}
                                    </span>
                                    {getSevakInfo(u).blood && (
                                        <span className="text-[8px] px-1.5 py-0 bg-red-50 text-red-600 rounded border border-red-100 font-bold uppercase leading-tight">
                                            {getSevakInfo(u).blood}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Notes (included in image) */}
                {entry.notes && (
                    <div className="pt-2 border-t border-gray-100 mb-2">
                        <p className="text-xs text-gray-500 italic">"{entry.notes}"</p>
                    </div>
                )}

                {/* Branding Footer for Image Share */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center opacity-70">
                    <div className="text-[10px] font-bold text-saffron-600 uppercase tracking-widest">vSeva App</div>
                    <div className="text-[8px] text-gray-400">Track. Serve. Inspire.</div>
                </div>
            </div>

            {/* Footer: Action Buttons (Outside Image Capture) */}
            <div className="flex items-center justify-end pt-3 px-4 pb-3 border-t border-gray-100">
                {entry.status !== 'pending' && entry.status !== 'rejected' && (
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
                    >
                        {isSharing ? (
                            <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        )}
                        <span>Share</span>
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={() => onEdit(entry)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ml-2"
                        style={{ background: '#F1EAFB', color: '#6B4FAE' }}
                    >
                        <Pencil size={16} />
                        <span className="md:hidden">Edit</span>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors ml-2"
                        style={{ background: '#FCEAEB', color: '#C05A57' }}
                    >
                        <Trash2 size={16} />
                        <span className="md:hidden">Delete</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default EntryCard;
