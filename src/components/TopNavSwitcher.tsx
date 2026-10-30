import React from 'react';
import { Newspaper, Home } from 'lucide-react';
import { ActiveScreen } from '../types';

interface TopNavSwitcherProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const TopNavSwitcher: React.FC<TopNavSwitcherProps> = ({
  activeScreen,
  onNavigate,
}) => {
  const isNewsActive = activeScreen === 'news';
  const isHomeActive = activeScreen === 'home' || activeScreen === 'receipts-invoices';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-3 pb-1">
      {/* Prominent Two-Option Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Main Navigation"
        className="grid grid-cols-2 p-1.5 bg-slate-200/80 dark:bg-slate-900/90 rounded-2xl border border-slate-300/70 dark:border-slate-800 shadow-inner"
      >
        {/* NEWS TAB (DEFAULT) */}
        <button
          id="nav-tab-news"
          type="button"
          role="tab"
          aria-selected={isNewsActive}
          onClick={() => onNavigate('news')}
          className={`relative flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 select-none cursor-pointer ${
            isNewsActive
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Newspaper className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isNewsActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          <span>NEWS</span>
          {isNewsActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse ml-0.5" />
          )}
        </button>

        {/* HOME TAB */}
        <button
          id="nav-tab-home"
          type="button"
          role="tab"
          aria-selected={isHomeActive}
          onClick={() => onNavigate('home')}
          className={`relative flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 select-none cursor-pointer ${
            isHomeActive
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Home className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          <span>HOME</span>
        </button>
      </div>
    </div>
  );
};
