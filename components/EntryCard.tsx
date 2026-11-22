import React, { useRef, useState } from 'react';
import { BRAND } from '@brand';
import { ViharEntry } from '../types';
import { MessageCircle, Download, Trash2, Pencil } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { isNative, shareToApp, saveImage, shareImage } from '../services/shareImage';
import Avatar from './Avatar';

interface EntryCardProps {
    entry: ViharEntry;
    getSevakInfo: (username: string) => { name: string; blood?: string; avatar_url?: string };
    onDelete?: (id: number) => void;
    onEdit?: (entry: ViharEntry) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, getSevakInfo, onDelete, onEdit }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    // which action is preparing the image ('share' | 'save'); while set, the card is laid out for capture
    const [busy, setBusy] = useState<'share' | 'save' | null>(null);
    const isSharing = busy !== null;
    const { showToast } = useToast();

    // Renders the card (with every Sevak visible and the branding footer) into a PNG.
    const captureCard = async (): Promise<Blob> => {
        // html-to-image lets the browser itself paint the card (SVG foreignObject), so the image matches the
        // screen exactly; html2canvas re-drew the text by hand and misplaced it. Loaded only when used.
        const { toBlob } = await import('html-to-image');

        // busy switches Sevaks Present from a horizontal scroller to a wrapped, fully-visible layout and
        // reveals the branding footer, only for the capture. Wait two frames for that reflow to settle,
        // then for any Sevak photos to finish loading (or fail) before handing the DOM to html2canvas.
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (cardRef.current) {
            const imgs = Array.from(cardRef.current.querySelectorAll<HTMLImageElement>('img'));
            await Promise.race([
                Promise.all(imgs.map((img: HTMLImageElement) => img.complete
                    ? Promise.resolve()
                    : new Promise<void>(res => {
                        img.addEventListener('load', () => res(), { once: true });
                        img.addEventListener('error', () => res(), { once: true });
                    })
                )),
                new Promise(res => setTimeout(res, 1200)),
            ]);
        }
        await new Promise(r => setTimeout(r, 80));
        if (!cardRef.current) throw new Error('Card is not on screen');

        // The buttons and the photo sit inside the capture area: take them out of the layout for the moment of
        // the capture, so the image is exactly as tall as what it shows.
        const hidden = Array.from(cardRef.current.querySelectorAll('[data-html2canvas-ignore="true"]')) as HTMLElement[];
        const previous = hidden.map(el => el.style.display);
        hidden.forEach(el => { el.style.display = 'none'; });
        try {
            const blob = await toBlob(cardRef.current, { pixelRatio: 3, backgroundColor: '#ffffff' });
            if (!blob) throw new Error('Could not create the image');
            return blob;
        } finally {
            hidden.forEach((el, i) => { el.style.display = previous[i]; });
        }
    };

    const fileName = `Vihar_${entry.vihar_date}_${entry.id ?? ''}.png`;
    const shareText = `Vihar from ${entry.vihar_from} to ${entry.vihar_to} on ${entry.vihar_date}`;

    // Android app: WhatsApp opens straight to its "Send to" list (chats, groups, My status) with the
    // image attached. Browser: the share menu where available, otherwise a download.
    const handleShare = async () => {
        if (isSharing) return;
        setBusy('share');
        try {
            const blob = await captureCard();
            if (isNative()) {
                await shareToApp('whatsapp', blob, fileName, shareText);
            } else {
                const outcome = await shareImage(blob, fileName, { title: 'Vihar Update', text: shareText });
                if (outcome === 'downloaded') showToast('Image downloaded. Attach it in WhatsApp.', 'success');
            }
        } catch (error) {
            console.error('Share failed', error);
            showToast('Could not share the image.', 'error');
        } finally {
            setBusy(null);
        }
    };

    const handleSave = async () => {
        if (isSharing) return;
        setBusy('save');
        try {
            const blob = await captureCard();
            const where = await saveImage(blob, fileName.replace(/\.png$/, `_${Date.now()}.png`));
            showToast(where === 'gallery' ? `Saved to your Gallery (Pictures/${BRAND.name})` : 'Image downloaded.', 'success');
        } catch (error) {
            console.error('Save failed', error);
            showToast('Could not save the image.', 'error');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="bg-surface rounded-card ring-1 ring-inset ring-line relative overflow-hidden">
            {/* Capture Area */}
            <div ref={cardRef} className="bg-surface p-4 rounded-card relative">
                {/* Date badge — absolute top-right, matches redesign mock */}
                <div className="absolute top-4 right-4 rounded-2xl text-center leading-none px-2.5 py-2 bg-sunken min-w-[48px]">
                    <p className="display num text-[1.35rem] font-extrabold text-ink">{new Date(`${entry.vihar_date}T00:00:00`).getDate()}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-2">{new Date(`${entry.vihar_date}T00:00:00`).toLocaleString('default', { month: 'short' })}</p>
                </div>

                {/* Route — its own line, full width (no pill sharing the line
                    and truncating it) */}
                <div className="flex items-center gap-1.5 min-w-0 pr-16 mb-2">
                    <span className="display text-[1.3rem] font-bold text-ink truncate">{entry.vihar_from}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A49D91" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    <span className="display text-[1.3rem] font-bold text-ink truncate">{entry.vihar_to}</span>
                </div>

                {/* Type + status — own line below the route */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span className="shrink-0 text-[12px] font-semibold px-2.5 h-6 inline-flex items-center rounded-full bg-sunken text-ink-2">
                        {entry.vihar_type}
                    </span>
                    {entry.status === 'pending' && <span className="text-[12px] text-warn font-semibold bg-warn-soft px-2.5 h-6 inline-flex items-center rounded-full">Pending Captain Approval</span>}
                    {entry.status === 'rejected' && <span className="text-[12px] text-err font-semibold bg-err-soft px-2.5 h-6 inline-flex items-center rounded-full">Rejected</span>}
                </div>

                {/* Stats chips */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center rounded-2xl py-2.5" style={{ background: '#F6E7AE' }}>
                        <p className="display num text-[1.35rem] font-extrabold text-ink leading-none">{entry.distance_km}<span className="font-sans text-[12px] font-semibold"> km</span></p>
                        <p className="mt-1 text-[12px] font-medium text-ink/70">Total KM</p>
                    </div>
                    <div className="text-center rounded-2xl py-2.5" style={{ background: '#F6DCE8' }}>
                        <p className="display num text-[1.35rem] font-extrabold text-ink leading-none">{entry.no_sadhubhagwan || 0}<span className="opacity-50"> / </span>{entry.no_sadhvijibhagwan || 0}</p>
                        <p className="mt-1 text-[12px] font-medium text-ink/70">Sadhu/Sadhvi</p>
                    </div>
                    <div className="text-center rounded-2xl py-2.5 bg-ok-soft">
                        <p className="display num text-[1.35rem] font-extrabold text-ink leading-none">{(entry.sevaks || []).length}</p>
                        <p className="mt-1 text-[12px] font-medium text-ink/70">Sevaks</p>
                    </div>
                </div>

                {/* Sevaks List — a horizontal scroller for normal on-screen
                    browsing (mobile-friendly, compact), but wraps onto
                    multiple lines only while isSharing so every sevak is
                    actually visible/captured in the shared image instead of
                    being cropped past the visible width. */}
                <div className="mb-2">
                    <p className="mb-1.5 text-[13px] font-medium text-ink-2">Sevaks Present</p>
                    <div
                        className={isSharing ? 'flex flex-wrap gap-1.5' : 'flex flex-nowrap gap-1.5 overflow-x-auto pb-1'}
                        style={isSharing ? undefined : { scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {(entry.sevaks || []).map((u, i) => {
                            const info = getSevakInfo(u);
                            return (
                                <div key={i} className="shrink-0 flex flex-col items-center gap-0.5">
                                    <span className="flex items-center gap-1.5 text-[13px] pl-0.5 pr-3 py-0.5 rounded-full font-medium whitespace-nowrap bg-sunken text-ink">
                                        <Avatar name={info.name} url={info.avatar_url} size={24} className="text-[10px]" />
                                        {info.name}
                                    </span>
                                    {info.blood && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-err-soft text-err rounded-full font-semibold uppercase leading-none">
                                            {info.blood}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Wheelchair Seva / Car Seva — who did it (only when marked Yes) */}
                {(entry.wheelchair || entry.car_seva) && (
                    <div className="mb-2 space-y-1.5">
                        {[
                            { label: 'Wheelchair Seva', on: !!entry.wheelchair, names: entry.wheelchair_sevaks || [], bg: '#DCEFF2', fg: '#1E5A66' },
                            { label: 'Car Seva', on: !!entry.car_seva, names: entry.car_seva_sevaks || [], bg: '#D9EAE5', fg: '#1F6B5F' },
                        ].filter(r => r.on).map(r => (
                            <div key={r.label}>
                                <p className="mb-1 text-[13px] font-medium text-ink-2">{r.label}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {r.names.length > 0 ? r.names.map((u, i) => (
                                        <span key={i} className="text-[13px] px-3 py-0.5 rounded-full font-medium" style={{ background: r.bg, color: r.fg }}>{getSevakInfo(u).name}</span>
                                    )) : <span className="text-[13px] px-3 py-0.5 rounded-full font-medium" style={{ background: r.bg, color: r.fg }}>Yes</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Share — sits right under Sevaks Present, excluded from the
                    captured image itself via data-html2canvas-ignore below. */}
                {entry.status !== 'pending' && entry.status !== 'rejected' && (
                    <div className="flex justify-end gap-2 mb-2" data-html2canvas-ignore="true">
                        <button
                            onClick={handleSave}
                            disabled={isSharing}
                            aria-label="Save image"
                            className="flex items-center gap-1.5 bg-sunken text-ink h-9 px-3.5 rounded-full text-[13px] font-semibold hover:bg-line transition-colors"
                        >
                            {busy === 'save'
                                ? <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>
                                : <Download size={14} />}
                            <span>Save</span>
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={isSharing}
                            className="flex items-center gap-1.5 bg-[#25D366]/15 text-[#128C4B] h-9 px-3.5 rounded-full text-[13px] font-semibold hover:bg-[#25D366]/25 transition-colors"
                        >
                            {busy === 'share' ? (
                                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            )}
                            <span>WhatsApp</span>
                        </button>
                    </div>
                )}

                {/* Vihar photo (optional, Shraman Seva Group entry forms) */}
                {entry.photo_url && (
                    <a href={entry.photo_url} target="_blank" rel="noopener noreferrer" className="block mb-2 rounded-2xl overflow-hidden bg-sunken" data-html2canvas-ignore="true">
                        <img src={entry.photo_url} alt="Vihar photo" loading="lazy" className="w-full max-h-56 object-cover" />
                    </a>
                )}

                {/* Notes (included in image) */}
                {entry.notes?.trim() && (
                    <div className="pt-2 border-t border-line mb-2">
                        <p className="text-[13px] text-ink-2 italic">"{entry.notes.trim()}"</p>
                    </div>
                )}

                {/* Branding footer — only for the shared image, not the
                    normal on-screen card. */}
                {isSharing && (
                    <div className="mt-2 pt-2 border-t border-line flex justify-between items-center opacity-80">
                        <div className="text-[11px] font-bold text-brand-700 uppercase tracking-widest">{BRAND.name} App</div>
                        <div className="text-[10px] text-ink-3">Track. Serve. Inspire.</div>
                    </div>
                )}
            </div>

            {/* Footer: Edit/Delete only (Share moved under Sevaks Present, above) */}
            {(onEdit || onDelete) && (
            <div className="flex items-center justify-end gap-2 pt-3 px-4 pb-3 border-t border-line">
                {onEdit && (
                    <button
                        onClick={() => onEdit(entry)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold transition-colors bg-sunken text-ink hover:bg-line"
                    >
                        <Pencil size={16} />
                        <span className="md:hidden">Edit</span>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full text-[13px] font-semibold transition-colors bg-err-soft text-err"
                    >
                        <Trash2 size={16} />
                        <span className="md:hidden">Delete</span>
                    </button>
                )}
            </div>
            )}
        </div>
    );
};

export default EntryCard;
