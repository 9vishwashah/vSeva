import React, { useCallback, useEffect, useRef } from 'react';

// Native-feeling "drag the sheet down to close" for bottom sheets and pop-ups.
//
//   const sheet = useSwipeDismiss(() => setOpen(false), { enabled: open });
//   <div ref={sheet.backdropRef} onClick={sheet.close}>          // dimmed background, fades while dragging
//     <div ref={sheet.sheetRef} {...sheet.handlers}>…</div>       // follows the finger, snaps back or glides away
//   </div>
//
// It only starts when the finger goes DOWN while the touched content is not scrolled (so scrolling a long
// list inside the sheet still works), and never from inputs. Escape (and the Android back button, which the
// app turns into Escape) closes it with the same glide-down animation.
interface Options {
  enabled?: boolean;
  /** Distance (px) after which letting go closes the sheet. */
  threshold?: number;
  /** Close with Escape / the Android back button (default true). */
  escape?: boolean;
}

const INTERACTIVE = 'input, textarea, select, [data-no-swipe], [contenteditable="true"]';

function scrolledAncestor(target: EventTarget | null, stop: HTMLElement): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== stop) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollTop > 0) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function useSwipeDismiss(onDismiss: () => void, { enabled = true, threshold = 110, escape = true }: Options = {}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const state = useRef({ y0: 0, dy: 0, t0: 0, tracking: false, dragging: false });
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const closing = useRef(false);

  const animateOut = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transition = 'transform 230ms cubic-bezier(0.4, 0, 1, 1)';
      sheet.style.transform = 'translateY(105%)';
    }
    if (backdrop) {
      backdrop.style.transition = 'opacity 230ms ease-out';
      backdrop.style.opacity = '0';
    }
    window.setTimeout(() => {
      closing.current = false;
      dismissRef.current();
    }, sheet ? 220 : 0);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || closing.current || e.touches.length !== 1) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    if ((e.target as HTMLElement).closest?.(INTERACTIVE)) return;
    if (scrolledAncestor(e.target, sheet)) return;
    state.current = { y0: e.touches[0].clientY, dy: 0, t0: Date.now(), tracking: true, dragging: false };
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const s = state.current;
    if (!s.tracking) return;
    const dy = e.touches[0].clientY - s.y0;
    if (!s.dragging) {
      if (dy < -4) { s.tracking = false; return; } // moving up: let the content scroll
      if (dy < 6) return;
      s.dragging = true;
      if (sheetRef.current) sheetRef.current.style.transition = 'none';
      if (backdropRef.current) backdropRef.current.style.transition = 'none';
    }
    s.dy = Math.max(0, dy);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${s.dy}px)`;
    if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.15, 1 - s.dy / 320));
  }, []);

  const finish = useCallback(() => {
    const s = state.current;
    if (!s.tracking) return;
    const wasDragging = s.dragging;
    s.tracking = false;
    s.dragging = false;
    if (!wasDragging) return;
    const velocity = s.dy / Math.max(1, Date.now() - s.t0); // px per ms
    if (s.dy > threshold || (velocity > 0.55 && s.dy > 40)) {
      animateOut();
    } else {
      // not far enough: spring back
      const sheet = sheetRef.current;
      const backdrop = backdropRef.current;
      if (sheet) {
        sheet.style.transition = 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1.15)';
        sheet.style.transform = '';
      }
      if (backdrop) {
        backdrop.style.transition = 'opacity 200ms ease-out';
        backdrop.style.opacity = '';
      }
    }
  }, [animateOut, threshold]);

  // Escape / Android back button -> glide down
  useEffect(() => {
    if (!enabled || !escape) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animateOut(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, escape, animateOut]);

  // a fresh open starts from a clean slate
  useEffect(() => {
    if (enabled) {
      closing.current = false;
      if (sheetRef.current) { sheetRef.current.style.transition = ''; sheetRef.current.style.transform = ''; }
      if (backdropRef.current) { backdropRef.current.style.transition = ''; backdropRef.current.style.opacity = ''; }
    }
  }, [enabled]);

  return {
    sheetRef,
    backdropRef,
    close: animateOut,
    handlers: { onTouchStart, onTouchMove, onTouchEnd: finish, onTouchCancel: finish },
  };
}
