import React, { useRef } from 'react';
import { Reply, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import { ChannelPost } from '../types';

interface ChannelMessageRowProps {
  post: ChannelPost;
  isMine: boolean;
  /** Whether the viewer can post here (so can reply). Copy / delete via the long-press menu work regardless. */
  canReply: boolean;
  /** Briefly true after jumping to this message from a quote. */
  highlighted: boolean;
  formatTime: (iso: string) => string;
  onReply: (post: ChannelPost) => void;
  onOpenActions: (post: ChannelPost) => void;
  onOpenProfile: (post: ChannelPost) => void;
  onJumpTo: (postId: string) => void;
  onDelete: (postId: string) => void;
}

const SWIPE_TRIGGER = 56; // px of drag after which letting go replies
const LONG_PRESS_MS = 450;

const tick = (ms: number) => { try { (navigator as any).vibrate?.(ms); } catch { /* ignore */ } };

// One chat message, WhatsApp-style:
//   * swipe right  -> reply to it (the row follows your finger, a reply arrow appears, a tick when it's armed)
//   * long-press / right-click -> menu (Reply, Copy, Delete)
//   * a reply shows the message it answers as a quote; tap the quote to jump to the original
const ChannelMessageRow: React.FC<ChannelMessageRowProps> = ({
  post, isMine, canReply, highlighted, formatTime, onReply, onOpenActions, onOpenProfile, onJumpTo, onDelete,
}) => {
  const isOptimistic = post.id.startsWith('optimistic-');
  const slideRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const g = useRef({ x0: 0, y0: 0, tracking: false, horizontal: false, armed: false, openedAt: 0, timer: 0 });

  const resetSlide = () => {
    const s = slideRef.current;
    const i = iconRef.current;
    if (s) { s.style.transition = 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1)'; s.style.transform = ''; }
    if (i) { i.style.transition = 'opacity 160ms'; i.style.opacity = '0'; }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isOptimistic || e.touches.length !== 1) return;
    const t = e.touches[0];
    const s = g.current;
    s.x0 = t.clientX; s.y0 = t.clientY; s.tracking = true; s.horizontal = false; s.armed = false;
    window.clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
      if (!s.tracking || s.horizontal) return;
      s.tracking = false;
      s.openedAt = Date.now();
      tick(15);
      onOpenActions(post);
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = g.current;
    if (!s.tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;
    if (!s.horizontal) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) window.clearTimeout(s.timer); // it's a drag/scroll, not a long-press
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { s.tracking = false; return; } // vertical scroll wins
      if (!(canReply && dx > 10 && dx > Math.abs(dy) * 1.6)) return;
      s.horizontal = true;
    }
    const shift = Math.min(Math.max(dx, 0) * 0.55, 64);
    const slide = slideRef.current;
    const icon = iconRef.current;
    if (slide) { slide.style.transition = 'none'; slide.style.transform = `translateX(${shift}px)`; }
    if (icon) {
      icon.style.transition = 'none';
      icon.style.opacity = String(Math.min(shift / 36, 1));
      icon.style.transform = `translateY(-50%) scale(${0.6 + Math.min(shift / SWIPE_TRIGGER, 1) * 0.4})`;
    }
    if (shift >= SWIPE_TRIGGER && !s.armed) { s.armed = true; tick(10); }
    if (shift < SWIPE_TRIGGER && s.armed) s.armed = false;
  };

  const endTouch = (commit: boolean) => {
    const s = g.current;
    window.clearTimeout(s.timer);
    if (!s.tracking) return;
    s.tracking = false;
    if (s.horizontal) {
      if (commit && s.armed) onReply(post);
      resetSlide();
    }
  };

  const hasQuote = !!post.reply_to_author || !!post.reply_to_id;
  const quoteDeleted = hasQuote && !post.reply_to_id; // the original message has since been deleted

  return (
    <div
      id={`chat-post-${post.id}`}
      className={`group relative -mx-1.5 rounded-2xl px-1.5 py-0.5 transition-colors duration-700 ${highlighted ? 'bg-saffron-300/40' : ''}`}
    >
      {/* the arrow that appears behind the row while swiping */}
      <div ref={iconRef} className="pointer-events-none absolute left-2 top-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-saffron-100 text-saffron-700 opacity-0" style={{ transform: 'translateY(-50%) scale(0.6)' }}>
        <Reply size={16} />
      </div>

      <div
        ref={slideRef}
        className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => endTouch(true)}
        onTouchCancel={() => endTouch(false)}
        onContextMenu={e => {
          e.preventDefault();
          if (isOptimistic || Date.now() - g.current.openedAt < 900) return; // the touch long-press already opened it
          onOpenActions(post);
        }}
      >
        <button type="button" onClick={() => onOpenProfile(post)} className="shrink-0 self-start rounded-full ring-2 ring-white shadow-sm transition-opacity hover:opacity-80">
          <Avatar name={post.author_name} url={post.author_avatar_url} size={26} />
        </button>
        <div className={`max-w-[78%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={() => onOpenProfile(post)} className="text-xs font-extrabold uppercase tracking-wide text-saffron-600 hover:opacity-80 transition-opacity truncate">
              {isMine ? 'You' : post.author_name}
            </button>
            <p className="text-[10px] text-[#8A6A57] shrink-0">{formatTime(post.created_at)}</p>
            {canReply && !isOptimistic && (
              <button
                type="button"
                onClick={() => onReply(post)}
                aria-label="Reply to this message"
                title="Reply"
                className="hidden md:inline-flex shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-saffron-600 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Reply size={13} />
              </button>
            )}
            {isMine && !isOptimistic && (
              <button onClick={() => onDelete(post.id)} className="text-gray-400 hover:text-red-500 shrink-0" aria-label="Delete message">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div
            className={`chat-bubble mt-1 px-3.5 py-2 rounded-2xl text-sm break-words ${
              isMine ? 'bg-[#FFDDBD] text-[#241C17] rounded-tr-sm shadow-[0_1px_1px_rgba(120,70,20,0.12)]' : 'bg-white text-[#241C17] rounded-tl-sm shadow-[0_1px_1px_rgba(120,70,20,0.10)]'
            }`}
          >
            {hasQuote && (
              quoteDeleted ? (
                <div className="mb-1.5 rounded-lg border-l-4 border-gray-300 bg-black/[0.04] px-2.5 py-1.5">
                  <span className="block text-[11px] font-extrabold text-gray-400 truncate">{post.reply_to_author}</span>
                  <span className="block text-xs italic text-gray-400">Original message deleted</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => post.reply_to_id && onJumpTo(post.reply_to_id)}
                  className="mb-1.5 block w-full rounded-lg border-l-4 border-saffron-500 bg-black/[0.05] px-2.5 py-1.5 text-left active:bg-black/10"
                >
                  <span className="block text-[11px] font-extrabold text-saffron-700 truncate">{post.reply_to_author}</span>
                  <span
                    className="block text-xs text-[#6B5B50] whitespace-pre-wrap"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {post.reply_to_excerpt}
                  </span>
                </button>
              )
            )}
            <span className="whitespace-pre-wrap">{post.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelMessageRow;
