import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  size?: 'sm' | 'md';
  className?: string;
}

// One shared share control: native Share sheet where available, otherwise a
// small menu of WhatsApp + Copy Link — used on every listing card and the
// detail page so anyone can pass a listing along.
const ShareButton: React.FC<ShareButtonProps> = ({ url, title, text, size = 'md', className = '' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 14 : 16;

  const shareText = text ? `${title} — ${text}\n${url}` : `${title}\n${url}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: text || title, url });
        return;
      } catch {
        // user cancelled the native sheet — fall through to nothing
        return;
      }
    }
    setMenuOpen((v) => !v);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — no-op, menu stays open so user can select the link manually
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        onClick={handleShare}
        title="Share"
        className={`flex items-center justify-center ${dim} rounded-xl bg-gray-50 hover:bg-gray-900 text-gray-500 hover:text-white transition-all duration-150 shadow-sm hover:shadow-md active:scale-95`}
      >
        <Share2 size={iconSize} strokeWidth={2.25} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div
            className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 w-44 vseva-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-[#e8fdf0] hover:text-[#25D366] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
