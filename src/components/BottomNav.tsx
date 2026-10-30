import React from 'react';
import { Home, Receipt as ReceiptIcon, FileText, Boxes, QrCode, Newspaper, Heart, Clock } from 'lucide-react';
import { ActiveScreen } from '../types';

interface BottomNavProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  receiptsCount: number;
  invoicesCount?: number;
  inventoryCount?: number;
  newsFooterTab?: 'feed' | 'favorites' | 'history';
  onSelectNewsTab?: (tab: 'feed' | 'favorites' | 'history') => void;
  favoritesCount?: number;
  historyCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  receiptsCount,
  invoicesCount = 0,
  inventoryCount = 0,
  newsFooterTab = 'feed',
  onSelectNewsTab,
  favoritesCount = 0,
  historyCount = 0,
}) => {
  if (currentScreen === 'news') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors pb-safe shadow-lg">
        <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-around relative">
          {/* 1. News Feed */}
          <button
            id="nav-btn-news-feed"
            type="button"
            onClick={() => {
              onSelectNewsTab?.('feed');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[70px] ${
              newsFooterTab === 'feed'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px] leading-tight font-semibold">News Feed</span>
          </button>

          {/* 2. Favorites */}
          <button
            id="nav-btn-news-favorites"
            type="button"
            onClick={() => {
              onSelectNewsTab?.('favorites');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[70px] ${
              newsFooterTab === 'favorites'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 mb-0.5 ${newsFooterTab === 'favorites' ? 'fill-rose-500 stroke-rose-500' : ''}`} />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-rose-500 text-white font-bold text-[9px] rounded-full min-w-[16px] text-center shadow-xs">
                  {favoritesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight font-semibold">Favorites</span>
          </button>

          {/* 3. History */}
          <button
            id="nav-btn-news-history"
            type="button"
            onClick={() => {
              onSelectNewsTab?.('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[70px] ${
              newsFooterTab === 'history'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Clock className="w-5 h-5 mb-0.5" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-indigo-600 text-white font-bold text-[9px] rounded-full min-w-[16px] text-center shadow-xs">
                  {historyCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight font-semibold">History</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors pb-safe">
      <div className="max-w-2xl mx-auto px-1 sm:px-3 py-1 flex items-center justify-between sm:justify-around relative">
        {/* 1. Home */}
        <button
          id="nav-btn-home"
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer min-w-[50px] xs:min-w-[56px] ${
            currentScreen === 'home' || currentScreen === 'receipts-invoices'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home className="w-4.5 h-4.5 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] leading-tight">Home</span>
        </button>

        {/* 2. Receipts */}
        <button
          id="nav-btn-receipts"
          type="button"
          onClick={() => onNavigate('receipts')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer min-w-[50px] xs:min-w-[56px] ${
            currentScreen === 'receipts'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ReceiptIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] leading-tight">Receipts</span>
        </button>

        {/* 3. Invoices */}
        <button
          id="nav-btn-invoices"
          type="button"
          onClick={() => onNavigate('invoices')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer min-w-[50px] xs:min-w-[56px] ${
            currentScreen === 'invoices'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] leading-tight">Invoices</span>
        </button>

        {/* 4. Inventory */}
        <button
          id="nav-btn-inventory"
          type="button"
          onClick={() => onNavigate('inventory')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer min-w-[50px] xs:min-w-[56px] ${
            currentScreen === 'inventory'
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4.5 h-4.5 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] leading-tight">Inventory</span>
        </button>

        {/* 5. Host QR */}
        <button
          id="nav-btn-qr-hosting"
          type="button"
          onClick={() => onNavigate('qr-hosting')}
          className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition cursor-pointer min-w-[50px] xs:min-w-[56px] ${
            currentScreen === 'qr-hosting'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4.5 h-4.5 sm:w-5 sm:h-5 mb-0.5" />
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] leading-tight whitespace-nowrap">Host QR</span>
        </button>
      </div>
    </nav>
  );
};


