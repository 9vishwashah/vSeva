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
        className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm app-modal-backdrop"
      >
        <div
          ref={swipe.sheetRef}
          {...swipe.handlers}
          onClick={e => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', overscrollBehavior: 'contain' }}
          className={`w-full ${maxWidth} bg-white rounded-t-[28px] md:rounded-[22px] shadow-2xl app-sheet-up`}
        >
          <div className="md:hidden mx-auto mt-3 h-1 w-9 rounded-full bg-gray-200" />
          {children}
        </div>
      </div>
    </Portal>
  );
};

export default BottomSheet;
