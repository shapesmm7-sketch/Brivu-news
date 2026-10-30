import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, Check, Heart, Sparkles, Send } from 'lucide-react';

interface RateUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RateUsModal: React.FC<RateUsModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('brivu_app_rating', JSON.stringify({
        rating,
        feedback,
        date: new Date().toISOString(),
      }));
    } catch {
      // ignore
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2200);
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden text-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 space-y-4 animate-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Heart className="w-8 h-8 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Thank You for Rating Us!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Your feedback helps us make Brivu better for small businesses and shop owners worldwide.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Check className="w-4 h-4" />
              <span>Feedback Saved</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-500 flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                How is your experience with Brivu?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tap a star to rate your experience with digital receipts, stock tracking & invoicing.
              </p>
            </div>

            {/* Star Rating Bar */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const activeStar = hoverRating !== null ? star <= hoverRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        activeStar
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-slate-100 dark:fill-slate-800 text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 h-4">
              {hoverRating === 5 || (hoverRating === null && rating === 5) ? '❤️ Excellent! We love it!' :
               hoverRating === 4 || (hoverRating === null && rating === 4) ? '😊 Very Good!' :
               hoverRating === 3 || (hoverRating === null && rating === 3) ? '👍 Good' :
               hoverRating === 2 || (hoverRating === null && rating === 2) ? '😐 Fair' :
               'Poor'}
            </div>

            {/* Optional Feedback Input */}
            <div className="text-left space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Additional Comments or Suggestions (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="What features do you love or want us to add?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Rating</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
