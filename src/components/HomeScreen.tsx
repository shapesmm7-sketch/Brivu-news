import React, { useState } from 'react';
import {
  ArrowUpRight,
  FileText,
  Receipt as ReceiptIcon,
  Boxes,
  QrCode,
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ActiveScreen, BusinessProfile, Receipt, InventoryTab } from '../types';
import { t } from '../utils/i18n';
import { AdMobNativeAd } from './AdMobNativeAd';
import { ADMOB_UNITS } from '../services/admobService';

interface HomeScreenProps {
  business: BusinessProfile;
  stats: {
    totalReceipts: number;
    totalInvoices?: number;
    todayReceipts: number;
    todaySales: number;
    pendingInvoices?: number;
    totalOutstanding?: number;
    recentReceipts: Receipt[];
  };
  activeTemplate: string;
  onNavigate: (screen: ActiveScreen) => void;
  onNavigateToInventory?: (tab?: InventoryTab, showAddInline?: boolean) => void;
  onSelectReceipt: (receipt: Receipt) => void;
  onShareReceipt: (receipt: Receipt) => void;
  onOpenCustomerView?: (page: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  business,
  stats,
  onNavigate,
  onNavigateToInventory,
}) => {
  const lang = business?.language;

  return (
    <div className="space-y-6 pt-2 pb-36 sm:pb-40 animate-fadeIn max-w-2xl mx-auto">
      {/* SECTION: CHOOSE ACTION (RECEIPTS & INVOICES, INVENTORY, OR QR HOSTING) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('quick_actions', lang)}
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            {t('select_option', lang)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* COMBINED OPTION: RECEIPTS & INVOICES */}
          <button
            id="btn-main-receipts-invoices"
            type="button"
            onClick={() => onNavigate('receipts-invoices')}
            className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all overflow-hidden border border-emerald-500/40 text-left min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-start justify-between w-full mb-2">
              <div className="flex items-center -space-x-1.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs z-10">
                  <ReceiptIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-900/40 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs border border-white/20">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/20 text-[10px] sm:text-xs font-semibold text-white group-hover:bg-white/30 transition">
                <span>{t('billing', lang)}</span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight flex items-center gap-1.5">
                <span>{t('receipts_and_invoices', lang)}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 font-normal mt-0.5 leading-snug">
                {t('issue_receipts_invoices', lang)}
              </p>
            </div>
          </button>

          {/* OPTION 2: INVENTORY */}
          <button
            id="btn-main-inventory"
            type="button"
            onClick={() => onNavigate('inventory')}
            className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm shadow-sky-600/20 active:scale-[0.99] transition-all overflow-hidden border border-sky-500/50 text-left min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-start justify-between w-full mb-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/15 text-[10px] sm:text-xs font-semibold text-sky-100 group-hover:bg-white/25 transition">
                <span>{t('stock', lang)}</span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                {t('inventory', lang)}
              </div>
              <p className="text-[11px] sm:text-xs text-sky-100/90 font-normal mt-0.5 leading-snug">
                {t('track_stock_products', lang)}
              </p>
            </div>
          </button>

          {/* OPTION 3: QR CODE HOSTING */}
          <button
            id="btn-main-qr-hosting"
            type="button"
            onClick={() => onNavigate('qr-hosting')}
            className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-sm shadow-teal-600/20 active:scale-[0.99] transition-all overflow-hidden border border-teal-500/50 text-left min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-start justify-between w-full mb-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-white" />
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md sm:rounded-lg bg-white/15 text-[10px] sm:text-xs font-semibold text-teal-100 group-hover:bg-white/25 transition">
                <span>{t('items', lang)}</span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                {t('host_qr_business_info', lang)}
              </div>
              <p className="text-[11px] sm:text-xs text-teal-100/90 font-normal mt-0.5 leading-snug">
                {t('host_photos_menu_links', lang)}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Native Advanced Ad */}
      <div className="pt-2">
        <AdMobNativeAd
          context="home"
          variant="bottom"
          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
        />
      </div>
    </div>
  );
};


