import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Tag,
} from 'lucide-react';

export interface LightboxImageItem {
  url: string;
  title: string;
  description?: string;
  category?: string;
  badge?: string;
  photoIndex?: number;
  totalPhotos?: number;
}

interface TouchZoomLightboxProps {
  image: LightboxImageItem;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onShare?: () => void;
  isCopied?: boolean;
}

export const TouchZoomLightbox: React.FC<TouchZoomLightboxProps> = ({
  image,
  onClose,
  onNext,
  onPrev,
  onShare,
  isCopied,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<number>(scale);
  const panRef = useRef<{ x: number; y: number }>(pan);
  const pinchDistStartRef = useRef<number | null>(null);
  const pinchScaleStartRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const lastTapTimeRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const updateScale = (newScale: number) => {
    scaleRef.current = newScale;
    setScale(newScale);
  };

  const updatePan = (newPan: { x: number; y: number }) => {
    panRef.current = newPan;
    setPan(newPan);
  };

  // Reset zoom on image change
  useEffect(() => {
    updateScale(1);
    updatePan({ x: 0, y: 0 });
    isDraggingRef.current = false;
    setIsDragging(false);
  }, [image.url]);

  // Keyboard navigation & Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === '+' || e.key === '=') {
        updateScale(Math.min(5, scaleRef.current + 0.5));
      } else if (e.key === '-' || e.key === '_') {
        const next = Math.max(1, scaleRef.current - 0.5);
        updateScale(next);
        if (next === 1) updatePan({ x: 0, y: 0 });
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        updateScale(1);
        updatePan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Native non-passive touch listeners to handle 2-finger pinch & single-finger pan reliably
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Prevent default pinch zoom of browser webpage
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchDistStartRef.current = dist;
        pinchScaleStartRef.current = scaleRef.current;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 300) {
          e.preventDefault();
          if (scaleRef.current > 1.2) {
            updateScale(1);
            updatePan({ x: 0, y: 0 });
          } else {
            updateScale(2.5);
            updatePan({ x: 0, y: 0 });
          }
        }
        lastTapTimeRef.current = now;

        if (scaleRef.current > 1) {
          isDraggingRef.current = true;
          setIsDragging(true);
          panStartRef.current = {
            x: e.touches[0].clientX - panRef.current.x,
            y: e.touches[0].clientY - panRef.current.y,
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchDistStartRef.current !== null && pinchDistStartRef.current > 0) {
        e.preventDefault(); // Stop mobile browser viewport zoom
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = currentDist / pinchDistStartRef.current;
        const newScale = Math.min(Math.max(1, pinchScaleStartRef.current * factor), 5);
        updateScale(newScale);
        if (newScale === 1) {
          updatePan({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && isDraggingRef.current && scaleRef.current > 1) {
        e.preventDefault();
        const newX = e.touches[0].clientX - panStartRef.current.x;
        const newY = e.touches[0].clientY - panStartRef.current.y;
        updatePan({ x: newX, y: newY });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchDistStartRef.current = null;
      }
      if (e.touches.length === 0) {
        isDraggingRef.current = false;
        setIsDragging(false);
        if (scaleRef.current <= 1.05) {
          updateScale(1);
          updatePan({ x: 0, y: 0 });
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.003;
      const newScale = Math.min(Math.max(1, scaleRef.current + delta), 5);
      updateScale(newScale);
      if (newScale === 1) {
        updatePan({ x: 0, y: 0 });
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [image.url]);

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale > 1) {
      isDraggingRef.current = true;
      setIsDragging(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && scale > 1) {
      updatePan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const hasMultiplePhotos = image.photoIndex !== undefined && image.totalPhotos !== undefined && image.totalPhotos > 1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden touch-none animate-fade-in"
      onClick={onClose}
    >
      {/* Top Header Controls Bar */}
      <div className="fixed top-3 left-3 right-3 sm:top-5 sm:left-6 sm:right-6 z-[110] flex items-center justify-between pointer-events-none">
        {hasMultiplePhotos ? (
          <span className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {image.photoIndex! + 1} of {image.totalPhotos}
            </span>
          </span>
        ) : (
          <div />
        )}

        {/* Action Buttons: Share & Close */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="px-3 py-2 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center gap-1.5 border border-white/20 transition shadow-xl text-xs font-semibold active:scale-95"
              title="Share or copy photo link"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isCopied ? 'Copied!' : 'Share'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition shadow-xl active:scale-90"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Previous Arrow for Multi-photo navigation */}
      {hasMultiplePhotos && onPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[110] w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition shadow-2xl active:scale-90"
          title="Previous photo (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next Arrow for Multi-photo navigation */}
      {hasMultiplePhotos && onNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[110] w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition shadow-2xl active:scale-90"
          title="Next photo (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Interactive Zoomable Container */}
      <div
        className="max-w-5xl w-full text-center relative flex flex-col items-center justify-center my-auto px-2 z-[105]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          className="w-full max-h-[72vh] sm:max-h-[75vh] overflow-hidden flex items-center justify-center rounded-2xl bg-slate-950 border border-white/10 shadow-2xl touch-none select-none relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={image.url}
            alt={image.title}
            className="max-h-[72vh] sm:max-h-[75vh] w-auto max-w-full object-contain pointer-events-auto select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        </div>

        {/* Bottom Captions */}
        <div className="mt-2 sm:mt-3 px-3 text-center max-w-xl mx-auto space-y-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {image.badge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                <Tag className="w-3 h-3" />
                <span>{image.badge}</span>
              </span>
            )}
            {image.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 text-emerald-400 text-xs font-semibold border border-slate-700">
                <span>{image.category}</span>
              </span>
            )}
          </div>

          {image.title && (
            <h4 className="text-white font-extrabold text-base sm:text-lg drop-shadow-md leading-tight">
              {image.title}
            </h4>
          )}

          {image.description && (
            <div className="p-3 rounded-2xl bg-slate-900/90 text-slate-100 text-xs sm:text-sm leading-relaxed text-center max-w-lg mx-auto border border-white/15 shadow-xl backdrop-blur-md">
              {image.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
