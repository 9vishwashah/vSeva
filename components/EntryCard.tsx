import React, { useRef, useState } from 'react';
import { ViharEntry } from '../types';
import { MapPin, Navigation, MessageCircle, Download, Trash2, Pencil } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '../context/ToastContext';

interface EntryCardProps {
    entry: ViharEntry;
    getSevakName: (username: string) => string;
    onDelete?: (id: number) => void;
    onEdit?: (entry: ViharEntry) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, getSevakName, onDelete, onEdit }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const { showToast } = useToast();

    const handleShare = async () => {
        if (!cardRef.current || isSharing) return;
        setIsSharing(true);

        try {
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
            {/* Capture Area */}
            <div ref={cardRef} className="bg-white p-2 rounded-xl">
                {/* Top Row: Date & Type */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-100 p-2 rounded-lg text-center min-w-[50px]">
                            <span className="block text-xs text-gray-500 uppercase">{new Date(entry.vihar_date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="block text-lg font-bold text-gray-800 leading-none">{new Date(entry.vihar_date).getDate()}</span>
                        </div>
                        <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${entry.vihar_type === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                {entry.vihar_type}
                            </span>
                            <div className="flex gap-1">
                                {entry.group_sadhu && <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded">Sadhu</span>}
                                {entry.group_sadhvi && <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1 rounded">Sadhvi</span>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-bold text-saffron-600">{entry.distance_km}</span>
                        <span className="text-xs text-gray-400 font-medium ml-0.5">km</span>
                    </div>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium truncate w-full">
                        <span className="truncate">{entry.vihar_from}</span>
                        <Navigation size={12} className="text-gray-300 shrink-0 rotate-90" />
                        <span className="truncate">{entry.vihar_to}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="text-center border-r border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sadhu</p>
                        <p className="font-bold text-gray-800">{entry.no_sadhubhagwan || 0}</p>
                    </div>
                    <div className="text-center border-r border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sadhvi</p>
                        <p className="font-bold text-gray-800">{entry.no_sadhvijibhagwan || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sevaks</p>
                        <p className="font-bold text-gray-800">{(entry.sevaks || []).length}</p>
                    </div>
                </div>

                {/* Sevaks List */}
                <div className="mb-3">
                    <div className="flex flex-wrap gap-1.5">
                        {(entry.sevaks || []).slice(0, 4).map((u, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                {getSevakName(u)}
                            </span>
                        ))}
                        {(entry.sevaks || []).length > 4 && (
                            <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                                +{(entry.sevaks || []).length - 4}
                            </span>
                        )}
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
            <div className="flex items-center justify-end pt-3 border-t border-gray-100 mt-[-10px]"> {/* Negative margin to pull it up if needed, but 'mt-2' gap is fine */}
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
                {onEdit && (
                    <button
                        onClick={() => onEdit(entry)}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-500 px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors ml-2"
                    >
                        <Pencil size={16} />
                        <span className="md:hidden">Edit</span>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="flex items-center gap-1.5 bg-red-50 text-red-500 px-4 py-2 rounded-full text-xs font-bold hover:bg-red-100 transition-colors ml-2"
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
