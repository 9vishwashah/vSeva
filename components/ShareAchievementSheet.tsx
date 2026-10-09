import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Share2, Download, X, Footprints, Loader2, Instagram } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import BottomSheet from './BottomSheet';
import ConfettiBurst from './ConfettiBurst';
import { BRAND } from '@brand';
import { useToast } from '../context/ToastContext';
import type { Achievement, AchievementKind } from '../services/achievements';
import { loadCardAssets, renderAchievementCard, canvasToBlob, type CardAssets, type CardFormat, type CardIdentity } from '../services/achievementCard';
import { shareImage, shareToApp, saveImage, downloadBlob, canShareFiles, installedApps, isNative, type DirectTarget } from '../services/shareImage';

interface Props {
  onClose: () => void;
  achievements: Achievement[];
  identity: CardIdentity;
  avatarUrl?: string | null;
}

const FORMATS: { id: CardFormat; label: string }[] = [
  { id: 'story', label: 'Story 9:16' },
  { id: 'square', label: 'Square 1:1' },
];

// "Share your Seva": pick an earned card, see exactly the image that will be shared, share it.
// Loaded lazily from the Dashboard, so the card renderer is only downloaded when someone opens this.
const ShareAchievementSheet: React.FC<Props> = ({ onClose, achievements, identity, avatarUrl }) => {
  const { showToast } = useToast();
  const [assets, setAssets] = useState<CardAssets | null>(null);
  const [kind, setKind] = useState<AchievementKind | null>(achievements[0]?.kind ?? null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [thumbs, setThumbs] = useState<Partial<Record<AchievementKind, string>>>({});
  const [preview, setPreview] = useState<{ url: string; blob: Blob; key: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [apps, setApps] = useState({ whatsapp: false, instagram: false });
  const [celebrated, setCelebrated] = useState(false);
  const native = useMemo(isNative, []);
  const webShare = useMemo(() => !native && canShareFiles(), [native]);

  const selected = achievements.find(a => a.kind === kind) ?? null;
  const renderKey = selected ? `${selected.kind}:${format}` : '';
  const ready = !!preview && preview.key === renderKey;

  // Direct buttons only for apps that are actually on the phone
  useEffect(() => { if (native) installedApps().then(setApps); }, [native]);

  // 1. logo, icons, photo and fonts, once
  useEffect(() => {
    let alive = true;
    loadCardAssets(BRAND.logo, avatarUrl).then(a => { if (alive) setAssets(a); });
    return () => { alive = false; };
  }, [avatarUrl]);

  // 2. small previews for the picker (the same renderer at a quarter size)
  useEffect(() => {
    if (!assets) return;
    const next: Partial<Record<AchievementKind, string>> = {};
    achievements.forEach(a => {
      const c = document.createElement('canvas');
      renderAchievementCard(c, a, identity, assets, 'story', 0.2);
      next[a.kind] = c.toDataURL('image/png');
    });
    setThumbs(next);
  }, [assets, achievements, identity]);

  // 3. the full-size image: what the preview shows is exactly what gets shared
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!assets || !selected) return;
    let alive = true;
    const key = renderKey;
    const c = document.createElement('canvas');
    renderAchievementCard(c, selected, identity, assets, format);
    canvasToBlob(c).then(blob => {
      if (!alive) return;
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setPreview({ url, blob, key });
    }).catch(() => { if (alive) showToast('Could not create the card. Please try again.', 'error'); });
    return () => { alive = false; };
  }, [assets, selected, format, identity, renderKey]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  // A little celebration the moment the first card appears.
  useEffect(() => { if (preview && !celebrated) setCelebrated(true); }, [preview, celebrated]);

  const fileName = `${BRAND.shortName}-${kind}-${format}.png`.replace(/\s+/g, '-').toLowerCase();

  const shareText = BRAND.siteUrl ? `My Vihar Seva on ${BRAND.name}: ${BRAND.siteUrl}` : `My Vihar Seva on ${BRAND.name}`;

  const run = async (action: string, fn: () => Promise<void>) => {
    if (!preview || !ready || busy) return;
    setBusy(action);
    try {
      await fn();
    } catch (e) {
      console.error(`${action} failed`, e);
      showToast(action === 'save' ? 'Could not save the image. Please try again.' : 'Sharing did not work. Try saving the image instead.', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Android app: the system share sheet. Browser: Web Share API or a download.
  const handleShare = () => run('share', async () => {
    const outcome = await shareImage(preview!.blob, fileName, { title: 'My Seva', text: shareText });
    if (outcome === 'downloaded') showToast('Card downloaded. Post it from your gallery.', 'success');
  });

  // Android app: straight into WhatsApp (chat / group / My status) or the Instagram Story composer.
  const handleDirect = (target: DirectTarget) => run(target, async () => {
    await shareToApp(target, preview!.blob, fileName, shareText);
  });

  const handleSave = () => run('save', async () => {
    // a unique name per save, so earlier saves in the Gallery are never replaced
    const where = await saveImage(preview!.blob, fileName.replace(/\.png$/, `-${Date.now()}.png`));
    showToast(where === 'gallery' ? `Saved to your Gallery (Pictures/${BRAND.name})` : 'Card downloaded.', 'success');
  });

  const handleDownload = () => {
    if (!preview || !ready) return;
    downloadBlob(preview.blob, fileName);
    showToast('Card downloaded.', 'success');
  };

  return (
    <BottomSheet open onClose={onClose} maxWidth="max-w-md">
      {celebrated && <ConfettiBurst />}
      <div className="flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-3 md:pt-5">
          <div className="min-w-0">
            <h2 className="m-0 text-lg font-extrabold tracking-tight text-[#241C17]">Share your Seva</h2>
            <p className="m-0 text-xs font-semibold text-[#8A6A57]">{identity.vyLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#8A6A57] hover:bg-saffron-50 active:scale-95 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {achievements.length === 0 ? (
            <div className="px-6 pt-8 pb-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-saffron-50 flex items-center justify-center mb-4">
                <Footprints size={28} className="text-saffron-600" />
              </div>
              <p className="m-0 text-base font-extrabold text-[#241C17]">Your first card is one Vihar away</p>
              <p className="m-0 mt-1 text-sm text-[#8A6A57] max-w-[260px]">Once a Vihar is recorded for {identity.vyLabel}, your Seva cards appear here.</p>
              <button type="button" onClick={onClose} className="mt-6 h-11 px-6 rounded-full bg-[#241C17] text-white text-sm font-bold active:scale-95 transition">
                Okay
              </button>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="px-5 pt-4">
                <div className="relative flex items-center justify-center rounded-[22px] bg-[#F7F1EA]" style={{ height: 'min(42dvh, 440px)' }}>
                  {preview ? (
                    <img
                      src={preview.url}
                      alt={selected ? `${selected.label} card preview` : 'Card preview'}
                      className={`max-h-[calc(100%-28px)] max-w-[calc(100%-28px)] rounded-[16px] shadow-[0_18px_40px_-18px_rgba(181,84,42,0.45)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${ready ? 'opacity-100 scale-100' : 'opacity-60 scale-[0.985]'}`}
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="rounded-[16px] bg-white/70 animate-pulse"
                      style={{ height: 'calc(100% - 28px)', aspectRatio: format === 'story' ? '9 / 16' : '1 / 1' }}
                    />
                  )}
                </div>
              </div>

              {/* Format */}
              <div className="px-5 pt-4">
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#F7F1EA]" role="tablist" aria-label="Image size">
                  {FORMATS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      aria-selected={format === f.id}
                      onClick={() => setFormat(f.id)}
                      className={`h-9 rounded-full text-xs font-bold transition ${format === f.id ? 'bg-white text-[#241C17] shadow-sm' : 'text-[#8A6A57]'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Picker */}
              <div className="pt-4">
                <p className="m-0 px-5 mb-2 text-xs font-bold text-[#8A6A57]">Choose a card</p>
                <div data-no-swipe className="flex gap-3 overflow-x-auto px-5 py-1 snap-x scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {achievements.map(a => {
                    const active = a.kind === kind;
                    return (
                      <button
                        key={a.kind}
                        type="button"
                        onClick={() => setKind(a.kind)}
                        aria-pressed={active}
                        className="snap-start shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition"
                      >
                        <span className={`block w-[54px] h-[96px] rounded-[12px] overflow-hidden bg-[#F7F1EA] ring-2 transition ${active ? 'ring-saffron-600' : 'ring-transparent'}`}>
                          {thumbs[a.kind] ? <img src={thumbs[a.kind]} alt="" className="w-full h-full object-cover" draggable={false} /> : <span className="block w-full h-full animate-pulse" />}
                        </span>
                        <span className={`text-[11px] font-bold ${active ? 'text-[#241C17]' : 'text-[#8A6A57]'}`}>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-4" />
            </>
          )}
        </div>

        {/* Actions: always visible at the bottom of the sheet */}
        {achievements.length > 0 && (native ? (
          <div className="shrink-0 px-5 pt-3 pb-4 border-t border-[#F2E9DE] bg-white">
            <div className="flex justify-around gap-2">
              {apps.instagram && (
                <ActionButton label="Story" busy={busy === 'instagram_story'} disabled={!ready || !!busy} onClick={() => handleDirect('instagram_story')}
                  className="text-white" style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}>
                  <Instagram size={24} />
                </ActionButton>
              )}
              {apps.whatsapp && (
                <ActionButton label="WhatsApp" busy={busy === 'whatsapp'} disabled={!ready || !!busy} onClick={() => handleDirect('whatsapp')} className="bg-[#25D366] text-white">
                  <WhatsAppIcon size={24} />
                </ActionButton>
              )}
              <ActionButton label="Save" busy={busy === 'save'} disabled={!ready || !!busy} onClick={handleSave} className="bg-[#F7F1EA] text-[#241C17]">
                <Download size={22} />
              </ActionButton>
              <ActionButton label="More" busy={busy === 'share'} disabled={!ready || !!busy} onClick={handleShare} className="bg-[#F7F1EA] text-[#241C17]">
                <Share2 size={22} />
              </ActionButton>
            </div>
            {apps.whatsapp && (
              <p className="m-0 mt-2 text-center text-[11px] font-semibold text-[#8A6A57]">WhatsApp opens with the card attached. Pick a chat, a group or My status.</p>
            )}
          </div>
        ) : (
          <div className="shrink-0 px-5 pt-3 pb-4 border-t border-[#F2E9DE] bg-white md:rounded-b-[22px]">
            <div className="flex gap-2">
              {webShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!ready || !!busy}
                  className="flex-1 h-12 rounded-full bg-saffron-600 hover:bg-saffron-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {busy === 'share' ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={!ready}
                aria-label="Download image"
                className={`h-12 rounded-full text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 ${webShare ? 'w-12 shrink-0 bg-[#F7F1EA] text-[#241C17]' : 'flex-1 bg-saffron-600 hover:bg-saffron-700 text-white'}`}
              >
                <Download size={18} />
                {!webShare && 'Download image'}
              </button>
            </div>
            <p className="m-0 mt-2.5 text-center text-[11px] font-semibold text-[#8A6A57]">
              {webShare
                ? 'Pick Instagram, WhatsApp, Status or any app from the share menu.'
                : 'Saves a high-resolution PNG you can post to Instagram or WhatsApp.'}
            </p>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};

// One round, labelled share target (Strava / Letterboxd style).
const ActionButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; busy?: boolean; className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ label, onClick, disabled, busy, className = '', style, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1.5 min-w-[64px] active:scale-95 transition disabled:opacity-60">
    <span className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${className}`} style={style}>
      {busy ? <Loader2 size={22} className="animate-spin" /> : children}
    </span>
    <span className="text-[11px] font-bold text-[#241C17]">{label}</span>
  </button>
);

export default ShareAchievementSheet;
