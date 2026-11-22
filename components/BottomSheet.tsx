import React from 'react';
import Portal from './Portal';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // Tailwind max-w-* class, default max-w-md
}

// A phone-style action sheet: glides up from the bottom (a centred card on desktop), drag it down or tap outside
// to close, and the Android back button / Escape close it too. Rendered into <body> like every other overlay.
const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, children, maxWidth = 'max-w-md' }) => {
  const swipe = useSwipeDismiss(onClose, { enabled: open });
  if (!open) return null;

  return (
    <Portal>
      <div
        ref={swipe.backdropRef}
        onClick={swipe.close}
        className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-ink/45 app-modal-backdrop"
      >
        <div
          ref={swipe.sheetRef}
          {...swipe.handlers}
          onClick={e => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', overscrollBehavior: 'contain' }}
          className={`w-full ${maxWidth} bg-surface rounded-t-sheet md:rounded-[28px] shadow-sheet md:shadow-[0_24px_64px_rgb(29_29_27/0.2)] app-sheet-up`}
        >
          <div className="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" />
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default BottomSheet;
