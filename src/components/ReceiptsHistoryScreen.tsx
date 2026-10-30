import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Trash2,
  Copy,
  Eye,
  Share2,
  Calendar,
  AlertTriangle,
  Receipt as ReceiptIcon,
  X,
  Plus,
  Sparkles,
  TrendingUp,
  Layers,
  Store,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Phone,
  Mail,
  FileText,
  Clock,
  ArrowUpRight,
  Filter,
  Pencil,
  Download,
  Loader2,
  Palette,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { BusinessProfile, Receipt } from '../types';
import { formatCurrency, formatDateTime } from '../utils/currencies';
import { PdfGenerator } from '../services/pdfGenerator';
import { BluetoothPrinterService } from '../services/bluetoothPrinterService';
import { StorageService } from '../services/storage';
import { DownloadSuccessModal } from './DownloadSuccessModal';
import { AdMobNativeAd } from './AdMobNativeAd';
import { ADMOB_UNITS } from '../services/admobService';

interface ReceiptsHistoryScreenProps {
  receipts: Receipt[];
  business: BusinessProfile;
  mode?: 'receipts' | 'invoices';
  onOpenReceipt: (receipt: Receipt) => void;
  onEditReceipt: (receipt: Receipt) => void;
  onShareReceipt: (receipt: Receipt) => void;
  onDuplicateReceipt: (receipt: Receipt) => void;
  onDownloadReceipt?: (receipt: Receipt) => void;
  onDeleteReceipt: (id: string) => void;
  onCreateNew: () => void;
  onCreateInvoice?: () => void;
  onEditProfile?: () => void;
  onOpenTemplates?: () => void;
}

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
type StatusFilterOption = 'all' | 'paid' | 'partial' | 'unpaid';

function getInitials(name?: string): string {
  if (!name || typeof name !== 'string' || !name.trim()) return 'RC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface CardTheme {
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  circleBg: string;
  circleText: string;
  expandedRing: string;
  innerBg: string;
}

function getReceiptCardTheme(name?: string, receiptNumber?: string): CardTheme {
  const themes: CardTheme[] = [
    {
      // Violet / Purple Theme
      cardBg: 'bg-purple-50/90 dark:bg-purple-950/30',
      cardBorder: 'border-purple-200/80 dark:border-purple-900/50',
      cardHover: 'hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40',
      circleBg: 'bg-purple-200 dark:bg-purple-900/80',
      circleText: 'text-purple-800 dark:text-purple-200',
      expandedRing: 'ring-2 ring-purple-400/40 border-purple-400 dark:border-purple-600',
      innerBg: 'bg-purple-50/40 dark:bg-purple-950/20',
    },
    {
      // Emerald / Green Theme
      cardBg: 'bg-emerald-50/90 dark:bg-emerald-950/30',
      cardBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
      cardHover: 'hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
      circleBg: 'bg-emerald-200 dark:bg-emerald-900/80',
      circleText: 'text-emerald-800 dark:text-emerald-200',
      expandedRing: 'ring-2 ring-emerald-400/40 border-emerald-400 dark:border-emerald-600',
      innerBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    },
    {
      // Blue / Sky Theme
      cardBg: 'bg-sky-50/90 dark:bg-sky-950/30',
      cardBorder: 'border-sky-200/80 dark:border-sky-900/50',
      cardHover: 'hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40',
      circleBg: 'bg-sky-200 dark:bg-sky-900/80',
      circleText: 'text-sky-800 dark:text-sky-200',
      expandedRing: 'ring-2 ring-sky-400/40 border-sky-400 dark:border-sky-600',
      innerBg: 'bg-sky-50/40 dark:bg-sky-950/20',
    },
    {
      // Amber / Orange Theme
      cardBg: 'bg-amber-50/90 dark:bg-amber-950/30',
      cardBorder: 'border-amber-200/80 dark:border-amber-900/50',
      cardHover: 'hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40',
      circleBg: 'bg-amber-200 dark:bg-amber-900/80',
      circleText: 'text-amber-800 dark:text-amber-200',
      expandedRing: 'ring-2 ring-amber-400/40 border-amber-400 dark:border-amber-600',
      innerBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    },
    {
      // Teal Theme
      cardBg: 'bg-teal-50/90 dark:bg-teal-950/30',
      cardBorder: 'border-teal-200/80 dark:border-teal-900/50',
      cardHover: 'hover:border-teal-300 dark:hover:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40',
      circleBg: 'bg-teal-200 dark:bg-teal-900/80',
      circleText: 'text-teal-800 dark:text-teal-200',
      expandedRing: 'ring-2 ring-teal-400/40 border-teal-400 dark:border-teal-600',
      innerBg: 'bg-teal-50/40 dark:bg-teal-950/20',
    },
    {
      // Rose / Pink Theme
      cardBg: 'bg-rose-50/90 dark:bg-rose-950/30',
      cardBorder: 'border-rose-200/80 dark:border-rose-900/50',
      cardHover: 'hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40',
      circleBg: 'bg-rose-200 dark:bg-rose-900/80',
      circleText: 'text-rose-800 dark:text-rose-200',
      expandedRing: 'ring-2 ring-rose-400/40 border-rose-400 dark:border-rose-600',
      innerBg: 'bg-rose-50/40 dark:bg-rose-950/20',
    },
    {
      // Indigo Theme
      cardBg: 'bg-indigo-50/90 dark:bg-indigo-950/30',
      cardBorder: 'border-indigo-200/80 dark:border-indigo-900/50',
      cardHover: 'hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
      circleBg: 'bg-indigo-200 dark:bg-indigo-900/80',
      circleText: 'text-indigo-800 dark:text-indigo-200',
      expandedRing: 'ring-2 ring-indigo-400/40 border-indigo-400 dark:border-indigo-600',
      innerBg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
    },
  ];

  const key = String(name || 'Customer') + String(receiptNumber || '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
}

export const ReceiptsHistoryScreen: React.FC<ReceiptsHistoryScreenProps> = ({
  receipts,
  business,
  mode = 'receipts',
  onOpenReceipt,
  onEditReceipt,
  onShareReceipt,
  onDuplicateReceipt,
  onDownloadReceipt,
  onDeleteReceipt,
  onCreateNew,
  onCreateInvoice,
  onEditProfile,
  onOpenTemplates,
}) => {
  const isInvoiceMode = mode === 'invoices';
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    fileName?: string;
    folderName?: string;
    documentType?: 'receipt' | 'invoice';
    documentNumber?: string;
  }>({ isOpen: false });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  const currency = business?.currency || 'UGX';

  const handlePrintReceipt = async (receipt: Receipt) => {
    setPrintingId(receipt.id);
    try {
      const savedPrinter = StorageService.getSavedThermalPrinter();
      if (savedPrinter) {
        showToast(`Printing to ${savedPrinter.name}...`);
        const res = await BluetoothPrinterService.printReceipt(savedPrinter, receipt);
        showToast(res.message);
      } else {
        showToast('Spooling print document...');
        const tempPrinter: any = {
          id: 'system-default',
          name: 'Thermal / System Printer',
          paperWidth: '80mm',
          autoPrintOnSave: false,
          connectedAt: new Date().toISOString(),
        };
        const res = await BluetoothPrinterService.printReceipt(tempPrinter, receipt);
        if (res?.message) {
          showToast(res.message);
        }
      }
    } catch (err: any) {
      console.error('Print error:', err);
      showToast(`Print note: ${err.message || 'Check printer connection'}`);
    } finally {
      setPrintingId(null);
    }
  };

  const handleDownload = async (receipt: Receipt) => {
    setDownloadingId(receipt.id);
    try {
      if (onDownloadReceipt) {
        await onDownloadReceipt(receipt);
      } else {
        const res = await PdfGenerator.downloadPdf(receipt);
        showToast(res.message);
        setDownloadModalData({
          isOpen: true,
          fileName: res.filename,
          folderName: res.folder || 'Documents/Brivu',
          documentType: receipt.documentType === 'invoice' ? 'invoice' : 'receipt',
          documentNumber: receipt.receiptNumber,
        });
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast('Error generating PDF download');
    } finally {
      setDownloadingId(null);
    }
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedReceiptId((prev) => (prev === id ? null : id));
  };

  // Filter receipts based strictly on document mode (receipt vs invoice), search, date, and status
  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 86400000 * 7;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    return (receipts || []).filter((receipt) => {
      if (!receipt || typeof receipt !== 'object') return false;

      // Strictly separate receipts vs invoices
      const isInvoice = receipt.documentType === 'invoice';
      if (isInvoiceMode && !isInvoice) return false;
      if (!isInvoiceMode && isInvoice) return false;

      // Status filtering
      const pStatus = receipt.paymentStatus || (receipt as any).status || 'paid';
      if (statusFilter !== 'all' && pStatus !== statusFilter) {
        return false;
      }

      // Search matching
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const numMatch = (receipt.receiptNumber || '').toLowerCase().includes(query);
        const nameMatch = receipt.customerName?.toLowerCase().includes(query) ?? false;
        const phoneMatch = receipt.customerPhone?.includes(query) ?? false;
        const emailMatch = receipt.customerEmail?.toLowerCase().includes(query) ?? false;
        const poMatch = receipt.poNumber?.toLowerCase().includes(query) ?? false;
        const notesMatch = receipt.notes?.toLowerCase().includes(query) ?? false;
        const itemMatch = Array.isArray(receipt.items)
          ? receipt.items.some((i) => i?.name?.toLowerCase().includes(query))
          : false;

        if (!numMatch && !nameMatch && !phoneMatch && !emailMatch && !poMatch && !notesMatch && !itemMatch) {
          return false;
        }
      }

      // Date filtering
      if (dateFilter === 'all') return true;

      try {
        const time = new Date(receipt.createdAt).getTime();
        if (dateFilter === 'today') {
          return time >= todayStart;
        }
        if (dateFilter === 'yesterday') {
          return time >= yesterdayStart && time < todayStart;
        }
        if (dateFilter === 'week') {
          return time >= weekStart;
        }
        if (dateFilter === 'month') {
          return time >= monthStart;
        }
        if (dateFilter === 'year') {
          return time >= yearStart;
        }
        if (dateFilter === 'custom' && customDate) {
          const [yr, mo, dy] = customDate.split('-').map(Number);
          const customStart = new Date(yr, mo - 1, dy).getTime();
          const customEnd = customStart + 86400000;
          return time >= customStart && time < customEnd;
        }
      } catch {
        return true;
      }

      return true;
    });
  }, [receipts, searchQuery, dateFilter, customDate, statusFilter, isInvoiceMode]);

  // Total count of relevant docs
  const totalModeCount = useMemo(() => {
    return receipts.filter((r) =>
      isInvoiceMode ? r.documentType === 'invoice' : (r.documentType || 'receipt') === 'receipt'
    ).length;
  }, [receipts, isInvoiceMode]);

  // Computed dynamic stats for the dashboard based on active filters
  const periodStats = useMemo(() => {
    let sales = 0;
    let count = 0;
    let pendingCount = 0;
    let outstanding = 0;

    for (const r of filteredReceipts) {
      const tot = typeof r.total === 'number' ? r.total : (parseFloat(r.total as any) || 0);
      sales += tot;
      count++;
      if (r.paymentStatus === 'unpaid' || r.paymentStatus === 'partial') {
        pendingCount++;
        const paid = typeof r.amountPaid === 'number' ? r.amountPaid : (parseFloat(r.amountPaid as any) || 0);
        const unpaid = Math.max(0, tot - paid);
        outstanding += unpaid;
      }
    }
    return {
      sales,
      count,
      pendingCount,
      outstanding,
      totalCount: totalModeCount,
    };
  }, [filteredReceipts, totalModeCount]);

  const getSalesLabel = () => {
    const prefix = isInvoiceMode ? 'Invoiced' : 'Sales';
    switch (dateFilter) {
      case 'today': return `Today's ${prefix}`;
      case 'yesterday': return `Yesterday's ${prefix}`;
      case 'week': return `This Week ${prefix}`;
      case 'month': return `This Month ${prefix}`;
      case 'year': return `This Year ${prefix}`;
      case 'custom': {
        if (customDate) {
          const [yr, mo, dy] = customDate.split('-').map(Number);
          const d = new Date(yr, mo - 1, dy);
          const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return `${prefix} on ${formatted}`;
        }
        return `Specific Day ${prefix}`;
      }
      default: return `Total ${prefix}`;
    }
  };

  const confirmDelete = () => {
    if (deletingReceipt) {
      onDeleteReceipt(deletingReceipt.id);
      setDeletingReceipt(null);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn max-w-2xl mx-auto">
      {/* Toast Notification (Centered prominently so user sees it without scrolling) */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[99999] flex items-center justify-center p-4">
          <div className="pointer-events-auto max-w-sm sm:max-w-md w-auto px-5 py-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs sm:text-sm font-bold shadow-2xl border border-emerald-500/40 flex items-center gap-3 backdrop-blur-md animate-bounce">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="leading-snug">{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Dashboard Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
            isInvoiceMode ? 'bg-indigo-500/15' : 'bg-emerald-500/15'
          }`}
        />
        <div
          className={`absolute -left-8 -bottom-8 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
            isInvoiceMode ? 'bg-indigo-500/10' : 'bg-emerald-500/10'
          }`}
        />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isInvoiceMode
                    ? 'text-indigo-400 bg-indigo-950/60 border-indigo-500/20'
                    : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20'
                }`}
              >
                <Sparkles className="w-3 h-3" /> {isInvoiceMode ? 'Invoices Report' : 'Sales Report'}
              </span>
            </div>
          </div>
        </div>

        {/* Sales / Invoiced Amount Card */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-xs flex flex-col justify-between mt-4">
          <div className="flex items-center justify-between text-slate-400 mb-1.5 gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300" title={getSalesLabel()}>
              {getSalesLabel()}
            </span>
            <TrendingUp className={`w-4 h-4 shrink-0 ${isInvoiceMode ? 'text-indigo-400' : 'text-emerald-400'}`} />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {formatCurrency(periodStats.sales, currency)}
          </div>

          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10 text-xs text-slate-400 font-medium">
            <span>
              {periodStats.count} {isInvoiceMode ? (periodStats.count === 1 ? 'invoice' : 'invoices') : (periodStats.count === 1 ? 'receipt' : 'receipts')}
            </span>
            {isInvoiceMode && periodStats.outstanding > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  {formatCurrency(periodStats.outstanding, currency)} pending
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="flex items-center justify-between gap-2.5 pt-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isInvoiceMode ? 'Invoices' : 'Receipts'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredReceipts.length} {isInvoiceMode ? 'invoices' : 'receipts'} • Tap to expand details
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTemplates && (
            <button
              id={isInvoiceMode ? 'btn-history-invoice-themes' : 'btn-history-receipt-themes'}
              type="button"
              onClick={onOpenTemplates}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition"
              title={isInvoiceMode ? 'Browse invoice themes and layouts' : 'Browse receipt themes and layouts'}
            >
              <Palette className={`w-4 h-4 ${isInvoiceMode ? 'text-indigo-500 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>Themes</span>
            </button>
          )}

          {isInvoiceMode ? (
            <button
              id="btn-history-create-invoice"
              type="button"
              onClick={onCreateInvoice || onCreateNew}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </button>
          ) : (
            <button
              id="btn-history-create-receipt"
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="input-history-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isInvoiceMode
              ? 'Search invoices by #, client, items, PO #, notes...'
              : 'Search receipts by #, customer, items, notes...'
          }
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row: Date Chips & Status Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold uppercase mr-0.5 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Specific Day' },
          ].map((f) => {
            const active = dateFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as DateFilterOption)}
                className={`shrink-0 font-semibold px-3 py-1.5 rounded-xl transition ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}

          {/* Status Filter Separator */}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />

          {[
            { id: 'all', label: 'All Status' },
            { id: 'paid', label: 'Paid' },
            { id: 'partial', label: 'Partial' },
            { id: 'unpaid', label: 'Unpaid' },
          ].map((s) => {
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id as StatusFilterOption)}
                className={`shrink-0 font-semibold px-2.5 py-1.5 rounded-xl transition ${
                  active
                    ? isInvoiceMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Picker Section when 'Specific Day' is selected */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/70 animate-fadeIn">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Choose Day:
            </span>
            <input
              id="input-custom-report-date"
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs font-semibold"
            />
          </div>
        )}
      </div>

      {/* Document List */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200/80 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400 mb-3">
            {isInvoiceMode ? <FileText className="w-6 h-6 text-indigo-500" /> : <ReceiptIcon className="w-6 h-6 text-emerald-500" />}
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isInvoiceMode ? 'No invoices found' : 'No receipts found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery || dateFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting or clearing your search filter.'
              : isInvoiceMode
              ? 'Start by tapping "+ New Invoice" above.'
              : 'Start by tapping "+ New Receipt" above.'}
          </p>
          {(searchQuery || dateFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
                setStatusFilter('all');
              }}
              className={`mt-3 text-xs font-semibold hover:underline ${
                isInvoiceMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Reset all filters
            </button>
          )}

          {!searchQuery && dateFilter === 'all' && statusFilter === 'all' && onOpenTemplates && (
            <div className="mt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={onOpenTemplates}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition active:scale-95"
              >
                <Palette className={`w-4 h-4 ${isInvoiceMode ? 'text-indigo-500' : 'text-emerald-500'}`} />
                <span>Browse Themes & Layouts</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredReceipts.map((receipt, index) => {
            const isPaid = (receipt.paymentStatus || 'paid') === 'paid';
            const isPartial = receipt.paymentStatus === 'partial';
            const isExpanded = expandedReceiptId === receipt.id;
            const theme = getReceiptCardTheme(receipt.customerName, receipt.receiptNumber);
            const initials = getInitials(receipt.customerName);
            const receiptItems = Array.isArray(receipt.items) ? receipt.items : [];
            const safeTotal = typeof receipt.total === 'number' ? receipt.total : (parseFloat(receipt.total as any) || 0);
            const safeSubtotal = typeof receipt.subtotal === 'number' ? receipt.subtotal : (parseFloat(receipt.subtotal as any) || safeTotal);
            const safeAmountPaid = typeof receipt.amountPaid === 'number' ? receipt.amountPaid : (parseFloat(receipt.amountPaid as any) || 0);
            const safeBalance = typeof receipt.balance === 'number' ? receipt.balance : (safeTotal - safeAmountPaid);

            return (
              <React.Fragment key={receipt.id}>
                <div
                  className={`${theme.cardBg} rounded-2xl border ${
                  isExpanded ? theme.expandedRing : theme.cardBorder
                } ${theme.cardHover} transition-all duration-200 overflow-hidden shadow-2xs`}
              >
                {/* Compact Clickable Summary Row */}
                <div
                  id={`receipt-card-header-${receipt.id}`}
                  onClick={() => toggleExpand(receipt.id)}
                  className="py-2.5 px-3 sm:px-3.5 flex items-center justify-between gap-2.5 cursor-pointer select-none transition-colors"
                >
                  {/* Left: Customer Circle Avatar & Basic Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full ${theme.circleBg} ${theme.circleText} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {receipt.customerName ? receipt.customerName : (isInvoiceMode ? 'Client' : 'Walk-in Customer')}
                          </h3>
                        </div>
                        <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white shrink-0">
                          {formatCurrency(safeTotal, currency)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {receipt.receiptNumber || 'REC'}
                          </span>
                          <span>•</span>
                          <span>{formatDateTime(receipt.createdAt || '')}</span>
                          {receipt.dueDate && isInvoiceMode && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Due {receipt.dueDate}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{receiptItems.length} item{receiptItems.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : isPartial
                                ? 'bg-amber-100/90 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-rose-100/90 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}
                          >
                            {receipt.paymentStatus || 'paid'}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAIL VIEW (Visible on Click) */}
                {isExpanded && (
                  <div className="border-t border-black/5 dark:border-white/5 bg-white/70 dark:bg-slate-900/60 p-3.5 sm:p-4 animate-fadeIn space-y-3.5">
                    {/* Invoice Specific Meta Header */}
                    {isInvoiceMode && (receipt.poNumber || receipt.paymentTerms || receipt.dueDate) && (
                      <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl p-2.5 border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {receipt.poNumber && (
                          <div className="text-slate-600 dark:text-slate-300">
                            PO #: <strong className="text-slate-900 dark:text-white font-mono">{receipt.poNumber}</strong>
                          </div>
                        )}
                        {receipt.paymentTerms && (
                          <div className="text-slate-600 dark:text-slate-300">
                            Terms: <strong className="text-slate-900 dark:text-white">{receipt.paymentTerms}</strong>
                          </div>
                        )}
                        {receipt.dueDate && (
                          <div className="text-indigo-700 dark:text-indigo-300 font-semibold">
                            Due Date: <strong>{receipt.dueDate}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items Breakdown Table */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Items Breakdown ({receiptItems.length})
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-750 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-700">
                            <tr>
                              <th className="py-1.5 px-3">Item Description</th>
                              <th className="py-1.5 px-2 text-center">Qty</th>
                              <th className="py-1.5 px-2 text-right">Price</th>
                              <th className="py-1.5 px-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                            {receiptItems.map((item, idx) => (
                              <tr key={item.id || idx} className="text-slate-800 dark:text-slate-200">
                                <td className="py-1.5 px-3 font-semibold">{item.name}</td>
                                <td className="py-1.5 px-2 text-center text-slate-500 dark:text-slate-400">
                                  {item.quantity}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400">
                                  {formatCurrency(item.unitPrice || 0, currency)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(item.subtotal || (item.quantity * item.unitPrice) || 0, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Summary Breakdown */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatCurrency(safeSubtotal, currency)}</span>
                      </div>

                      {Boolean(receipt.discountAmount && receipt.discountAmount > 0) && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>
                            Discount {receipt.discountType === 'percentage' ? `(${receipt.discount}%)` : '(Fixed)'}
                          </span>
                          <span className="font-mono">-{formatCurrency(receipt.discountAmount || 0, currency)}</span>
                        </div>
                      )}

                      {receipt.taxAmount ? (
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Tax / VAT ({receipt.taxRate}%)</span>
                          <span className="font-mono">+{formatCurrency(receipt.taxAmount, currency)}</span>
                        </div>
                      ) : null}

                      {receipt.shippingFee ? (
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Shipping / Delivery</span>
                          <span className="font-mono">+{formatCurrency(receipt.shippingFee, currency)}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-between text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span>{isInvoiceMode ? 'Total Invoice Amount' : 'Total Payable'}</span>
                        <span className={`font-mono ${isInvoiceMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatCurrency(safeTotal, currency)}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Amount Paid ({receipt.paymentMethod || 'Cash'})</span>
                        <span className="font-mono">{formatCurrency(safeAmountPaid, currency)}</span>
                      </div>

                      {safeBalance !== 0 && (
                        <div className="flex justify-between text-[11px] font-semibold pt-0.5">
                          <span>{safeBalance > 0 ? 'Change Returned' : 'Balance Due'}</span>
                          <span className={`font-mono ${safeBalance > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(Math.abs(safeBalance), currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bank details if invoice */}
                    {isInvoiceMode && receipt.bankDetails && (
                      <div className="bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl p-2.5 border border-indigo-100 dark:border-indigo-900/50 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-0.5">
                          Remittance Bank & Payment Details
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          {receipt.bankDetails}
                        </p>
                      </div>
                    )}

                    {/* Additional Details (Phone, Email, Notes) */}
                    {(receipt.customerPhone || receipt.customerEmail || receipt.notes) && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                        {receipt.customerPhone && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>Phone: <strong>{receipt.customerPhone}</strong></span>
                          </div>
                        )}
                        {receipt.customerEmail && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Mail className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>Email: <strong>{receipt.customerEmail}</strong></span>
                          </div>
                        )}
                        {receipt.notes && (
                          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>Notes: <em>{receipt.notes}</em></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="space-y-2 pt-1">
                      {/* Row 1: Primary Actions (Preview, Print, Share) */}
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <button
                          id={`btn-open-doc-${receipt.id}`}
                          onClick={() => onOpenReceipt(receipt)}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs active:scale-95 transition min-w-0"
                          title={isInvoiceMode ? 'Preview Invoice' : 'Preview Receipt'}
                        >
                          <Eye className={`w-3.5 h-3.5 shrink-0 ${isInvoiceMode ? 'text-indigo-400 dark:text-indigo-600' : 'text-emerald-400 dark:text-emerald-600'}`} />
                          <span className="truncate">Preview</span>
                        </button>

                        <button
                          id={`btn-print-doc-${receipt.id}`}
                          onClick={() => handlePrintReceipt(receipt)}
                          disabled={printingId === receipt.id}
                          className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/70 dark:border-purple-800/70 text-xs font-bold transition active:scale-95 disabled:opacity-50 min-w-0"
                          title={isInvoiceMode ? 'Print Invoice (Bluetooth Thermal / Printer)' : 'Print Receipt (Bluetooth Thermal / Printer)'}
                        >
                          {printingId === receipt.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : (
                            <Printer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          )}
                          <span className="truncate">Print</span>
                        </button>

                        <button
                          id={`btn-share-doc-${receipt.id}`}
                          onClick={() => onShareReceipt(receipt)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition active:scale-95 border min-w-0 ${
                            isInvoiceMode
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200/70 dark:border-indigo-800/70'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200/70 dark:border-emerald-800/70'
                          }`}
                          title="Share Document"
                        >
                          <Share2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Share</span>
                        </button>
                      </div>

                      {/* Row 2: Secondary Actions (Edit, Download, Duplicate, Delete) */}
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        <button
                          id={`btn-edit-doc-${receipt.id}`}
                          onClick={() => onEditReceipt(receipt)}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/60 text-[11px] font-semibold transition active:scale-95 min-w-0"
                          title={isInvoiceMode ? 'Edit invoice details' : 'Edit receipt details'}
                        >
                          <Pencil className="w-3 h-3 shrink-0" />
                          <span className="truncate">Edit</span>
                        </button>

                        <button
                          id={`btn-download-doc-${receipt.id}`}
                          onClick={() => handleDownload(receipt)}
                          disabled={downloadingId === receipt.id}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50 min-w-0"
                          title={isInvoiceMode ? 'Download PDF Invoice' : 'Download PDF Receipt'}
                        >
                          {downloadingId === receipt.id ? (
                            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          ) : (
                            <Download className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate">PDF</span>
                        </button>

                        <button
                          id={`btn-duplicate-doc-${receipt.id}`}
                          onClick={() => onDuplicateReceipt(receipt)}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-semibold transition active:scale-95 min-w-0"
                          title={isInvoiceMode ? 'Duplicate as new invoice' : 'Duplicate as new receipt'}
                        >
                          <Copy className="w-3 h-3 shrink-0" />
                          <span className="truncate">Duplicate</span>
                        </button>

                        <button
                          id={`btn-delete-doc-${receipt.id}`}
                          onClick={() => setDeletingReceipt(receipt)}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-900/60 text-[11px] font-semibold transition active:scale-95 min-w-0"
                          title={isInvoiceMode ? 'Delete Invoice' : 'Delete Receipt'}
                        >
                          <Trash2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {(index + 1) % 6 === 0 && (
                <div key={`inline-admob-${receipt.id}`} className="py-1">
                  <AdMobNativeAd
                    context={isInvoiceMode ? 'invoices' : 'receipts'}
                    variant="in-feed"
                    unitId={ADMOB_UNITS.NATIVE_ADVANCED}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
        </div>
      )}

      {/* Native Advanced Ad at bottom of Receipts & Invoices */}
      <div className="pt-3 pb-8">
        <AdMobNativeAd
          context={isInvoiceMode ? 'invoices' : 'receipts'}
          variant="compact"
          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
        />
      </div>

      {/* CONFIRMATION MODAL BEFORE PERMANENT DELETION */}
      {deletingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete {isInvoiceMode ? 'Invoice' : 'Receipt'} {deletingReceipt.receiptNumber}?
            </h3>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete {isInvoiceMode ? 'invoice' : 'receipt'} for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatCurrency(deletingReceipt.total, currency)}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center gap-2.5">
              <button
                id="btn-cancel-delete"
                onClick={() => setDeletingReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}


      <DownloadSuccessModal
        isOpen={downloadModalData.isOpen}
        onClose={() => setDownloadModalData({ isOpen: false })}
        fileName={downloadModalData.fileName}
        folderName={downloadModalData.folderName}
        documentType={downloadModalData.documentType}
        documentNumber={downloadModalData.documentNumber}
      />
    </div>
  );
};
