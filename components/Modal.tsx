import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string; // Tailwind max-w-* class, default max-w-lg
    closeOnBackdrop?: boolean; // default true
    className?: string; // extra classes on the white card (e.g. border-t-4 border-orange-500)
}

// One shared overlay + entrance animation + scroll-lock for every pop-up in
// the app, so they all look and behave the same way instead of each screen
// hand-rolling its own backdrop/animation classes.
//
// Two real bugs this fixes, not just style:
// 1. animate-in/fade-in/zoom-in are Tailwind's animate plugin classes, which
//    the Play CDN (index.html) never loads — they were completely inert, so
//    every modal using them popped in instantly with zero transition. The
//    app-modal-backdrop/app-modal-card classes below are real keyframe
//    animations defined in index.html, mirroring the existing app-stagger-in
//    shim already used elsewhere for the same reason.
// 2. The app's whole page scrolls inside <main> (see Layout.tsx), not
//    document.body/html — those never scroll here. Locking <main>'s overflow
//    while open (and restoring its exact scrollTop on close) is the right
//    place to scroll-lock in this layout. Layout.tsx also reserves a stable
//    scrollbar gutter on <main>, so toggling its overflow never removes/adds
//    the scrollbar width and can't cause a reflow "jump" behind the modal.
const Modal: React.FC<ModalProps> = ({ open, onClose, children, maxWidth = 'max-w-lg', closeOnBackdrop = true, className = '' }) => {
    const scrollTopRef = useRef(0);
    // Pull the pop-up down to close it (touch screens; Escape is already handled just below).
    const swipe = useSwipeDismiss(onClose, { enabled: open && closeOnBackdrop, escape: false });

    useEffect(() => {
        if (!open) return;
        const main = document.querySelector('main');
        if (!main) return;
        scrollTopRef.current = main.scrollTop;
        const prevOverflow = main.style.overflow;
        main.style.overflow = 'hidden';
        return () => {
            main.style.overflow = prevOverflow;
            main.scrollTop = scrollTopRef.current;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    // Rendered into <body> (not inline): a position:fixed overlay nested inside a transformed/animated page
    // wrapper is sized to that wrapper, not the viewport, which left a strip at the top un-dimmed.
    return createPortal(
        <div
            ref={swipe.backdropRef}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 app-modal-backdrop"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                ref={swipe.sheetRef}
                {...swipe.handlers}
                className={`bg-white rounded-[22px] shadow-2xl w-full ${maxWidth} overflow-hidden app-modal-card flex flex-col max-h-[90vh] ${className}`}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
