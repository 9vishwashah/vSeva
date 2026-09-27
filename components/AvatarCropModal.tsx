import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Check, X } from 'lucide-react';

interface AvatarCropModalProps {
    file: File;
    onCancel: () => void;
    onConfirm: (blob: Blob) => void;
}

const VIEWPORT_SIZE = 280; // on-screen circular crop viewport, px
const OUTPUT_SIZE = 512; // exported square image, px

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ file, onCancel, onConfirm }) => {
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [saving, setSaving] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImgUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const baseScale = naturalSize
        ? Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h)
        : 1;
    const displayScale = baseScale * zoom;
    const displayW = naturalSize ? naturalSize.w * displayScale : 0;
    const displayH = naturalSize ? naturalSize.h * displayScale : 0;

    const clamp = useCallback((x: number, y: number, w: number, h: number) => {
        const minX = Math.min(VIEWPORT_SIZE - w, 0);
        const minY = Math.min(VIEWPORT_SIZE - h, 0);
        return {
            x: Math.min(0, Math.max(minX, x)),
            y: Math.min(0, Math.max(minY, y)),
        };
    }, []);

    const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const scale = Math.max(VIEWPORT_SIZE / w, VIEWPORT_SIZE / h);
        setNaturalSize({ w, h });
        setZoom(1);
        setOffset({ x: (VIEWPORT_SIZE - w * scale) / 2, y: (VIEWPORT_SIZE - h * scale) / 2 });
    };

    const handleZoomChange = (newZoom: number) => {
        if (!naturalSize) { setZoom(newZoom); return; }
        const oldScale = baseScale * zoom;
        const newScale = baseScale * newZoom;
        // Zoom around the viewport's center rather than the image's top-left corner.
        const centerImgX = (VIEWPORT_SIZE / 2 - offset.x) / oldScale;
        const centerImgY = (VIEWPORT_SIZE / 2 - offset.y) / oldScale;
        const w = naturalSize.w * newScale;
        const h = naturalSize.h * newScale;
        setOffset(clamp(VIEWPORT_SIZE / 2 - centerImgX * newScale, VIEWPORT_SIZE / 2 - centerImgY * newScale, w, h));
        setZoom(newZoom);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        dragRef.current = { startX: e.clientX, startY: e.clientY, startOffX: offset.x, startOffY: offset.y };
    };
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setOffset(clamp(dragRef.current.startOffX + dx, dragRef.current.startOffY + dy, displayW, displayH));
    };
    const handlePointerUp = () => {
        dragRef.current = null;
        setIsDragging(false);
    };

    const handleConfirm = () => {
        if (!naturalSize || !imgRef.current) return;
        setSaving(true);

        const srcX = -offset.x / displayScale;
        const srcY = -offset.y / displayScale;
        const srcSize = VIEWPORT_SIZE / displayScale;

        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setSaving(false); return; }

        // White backing so a transparent-PNG source doesn't turn black on JPEG export.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        canvas.toBlob(blob => {
            setSaving(false);
            if (blob) onConfirm(blob);
        }, 'image/jpeg', 0.92);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-[22px] p-5 w-full max-w-sm flex flex-col items-center gap-4 shadow-2xl">
                <p className="text-sm font-extrabold text-[#241C17] self-start">Adjust Photo</p>

                <div
                    className="relative rounded-full overflow-hidden select-none"
                    style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, background: '#F7F4F0', touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    {imgUrl && (
                        <img
                            ref={imgRef}
                            src={imgUrl}
                            onLoad={handleImgLoad}
                            draggable={false}
                            alt="Crop preview"
                            style={{
                                position: 'absolute',
                                left: offset.x,
                                top: offset.y,
                                width: displayW || undefined,
                                height: displayH || undefined,
                                maxWidth: 'none',
                            }}
                        />
                    )}
                    <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 pointer-events-none" />
                </div>

                <div className="w-full flex items-center gap-3">
                    <span className="text-xs font-bold text-[#8A6A57]">−</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={e => handleZoomChange(parseFloat(e.target.value))}
                        disabled={!naturalSize}
                        className="flex-1 accent-saffron-600"
                    />
                    <span className="text-xs font-bold text-[#8A6A57]">+</span>
                </div>

                <p className="text-[11px] text-[#8A6A57] text-center -mt-1">Drag to reposition, use the slider to zoom</p>

                <div className="w-full flex gap-3 mt-1">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[#F7F4F0] text-[#241C17] active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        <X size={16} /> Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving || !naturalSize}
                        className="flex-1 py-3 rounded-2xl font-bold text-sm bg-saffron-600 hover:bg-saffron-700 text-white active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Check size={16} />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarCropModal;
