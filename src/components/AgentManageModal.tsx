import React, { useState, useEffect, useMemo } from 'react';
import { saveJsPdf } from '../services/fileSaver';
import {
  X,
  Check,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Download,
  Briefcase,
  Store,
  Phone,
  MapPin,
  TrendingUp,
  CreditCard,
  Package,
  Layers,
  Search,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import jsPDF from 'jspdf';
import {
  BusinessAgent,
  AgentLedgerRecord,
  BusinessProfile,
  InventoryProduct,
  ProductCategory,
} from '../types';
import { StorageService } from '../services/storage';

interface AgentManageModalProps {
  agent: BusinessAgent;
  onClose: () => void;
  currency: string;
  businessProfile: BusinessProfile;
  products: InventoryProduct[];
  categories: ProductCategory[];
}

export type AgentTimeframeFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export const AgentManageModal: React.FC<AgentManageModalProps> = ({
  agent,
  onClose,
  currency,
  businessProfile,
  products = [],
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'analytics'>('records');
  const [timeframeFilter, setTimeframeFilter] = useState<AgentTimeframeFilter>('all');
  const [customFilterDate, setCustomFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ledger state
  const [ledgerList, setLedgerList] = useState<AgentLedgerRecord[]>([]);

  // Date & Time Helpers
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toDateTimeLocalValue = (dateStr: string) => {
    if (!dateStr) return getCurrentDateTimeLocal();
    if (dateStr.includes('T')) {
      return dateStr.substring(0, 16);
    }
    return `${dateStr}T12:00`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let d: Date;
      if (dateStr.includes('T')) {
        d = new Date(dateStr);
      } else {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          d = new Date(dateStr);
        }
      }
      if (isNaN(d.getTime())) return dateStr;

      if (dateStr.includes('T')) {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }

      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Form states
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [date, setDate] = useState<string>(() => getCurrentDateTimeLocal());
  const [itemsTaken, setItemsTaken] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [cashPaid, setCashPaid] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Stock picker state
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load records
  const loadRecords = () => {
    const list = StorageService.getAgentLedger(agent.id);
    setLedgerList(list);
  };

  useEffect(() => {
    loadRecords();
  }, [agent.id]);

  // Auto calculate total amount when quantity or unitPrice changes
  useEffect(() => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;
    if (q > 0 && p > 0) {
      setTotalAmount(String(q * p));
    }
  }, [quantity, unitPrice]);

  // Filtered records by timeframe
  const timeframeLedgerList = useMemo(() => {
    if (timeframeFilter === 'all') return ledgerList;

    if (timeframeFilter === 'custom') {
      if (!customFilterDate) return ledgerList;
      return ledgerList.filter((rec) => {
        if (!rec.date) return false;
        return rec.date.startsWith(customFilterDate);
      });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return ledgerList.filter((rec) => {
      if (!rec.date) return false;
      const recDate = new Date(rec.date);

      if (timeframeFilter === 'today') {
        return recDate >= startOfToday;
      }

      if (timeframeFilter === 'week') {
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        return recDate >= startOfWeek;
      }

      if (timeframeFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return recDate >= startOfMonth;
      }

      if (timeframeFilter === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return recDate >= startOfYear;
      }

      return true;
    });
  }, [ledgerList, timeframeFilter, customFilterDate]);

  // Totals calculations
  const totalItemsValue = useMemo(() => {
    return timeframeLedgerList.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [timeframeLedgerList]);

  const totalCashPaid = useMemo(() => {
    return timeframeLedgerList.reduce((sum, r) => sum + (Number(r.cashPaid) || 0), 0);
  }, [timeframeLedgerList]);

  const totalRemainingBalance = useMemo(() => {
    return Math.max(0, totalItemsValue - totalCashPaid);
  }, [totalItemsValue, totalCashPaid]);

  // All time balance for overall status
  const allTimeTotalValue = useMemo(() => {
    return ledgerList.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [ledgerList]);

  const allTimeTotalPaid = useMemo(() => {
    return ledgerList.reduce((sum, r) => sum + (Number(r.cashPaid) || 0), 0);
  }, [ledgerList]);

  const allTimeRemainingBalance = useMemo(() => {
    return Math.max(0, allTimeTotalValue - allTimeTotalPaid);
  }, [allTimeTotalValue, allTimeTotalPaid]);

  // Handle save/update ledger record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemsTaken.trim()) {
      alert('Please enter description or select items taken by agent');
      return;
    }

    const parsedTot = parseFloat(totalAmount) || 0;
    const parsedPaid = parseFloat(cashPaid) || 0;
    const parsedQty = parseFloat(quantity) || 1;
    const parsedPrice = parseFloat(unitPrice) || 0;

    const computedBalance = Math.max(0, parsedTot - parsedPaid);

    if (editingRecordId) {
      StorageService.updateAgentLedgerRecord(editingRecordId, {
        date,
        itemsTaken: itemsTaken.trim(),
        quantity: parsedQty,
        unitPrice: parsedPrice,
        totalAmount: parsedTot,
        cashPaid: parsedPaid,
        remainingBalance: computedBalance,
        notes: notes.trim() || undefined,
      });
      showToast('Agent record updated successfully!');
    } else {
      StorageService.addAgentLedgerRecord({
        agentId: agent.id,
        date,
        itemsTaken: itemsTaken.trim(),
        quantity: parsedQty,
        unitPrice: parsedPrice,
        totalAmount: parsedTot,
        cashPaid: parsedPaid,
        remainingBalance: computedBalance,
        notes: notes.trim() || undefined,
      });
      showToast('Agent record added successfully!');
    }

    // Reset form
    setEditingRecordId(null);
    setShowAddRecord(false);
    setDate(getCurrentDateTimeLocal());
    setItemsTaken('');
    setQuantity('1');
    setUnitPrice('');
    setTotalAmount('');
    setCashPaid('0');
    setNotes('');
    loadRecords();
  };

  const handleEditRecord = (rec: AgentLedgerRecord) => {
    setEditingRecordId(rec.id);
    setDate(toDateTimeLocalValue(rec.date));
    setItemsTaken(rec.itemsTaken);
    setQuantity(String(rec.quantity || 1));
    setUnitPrice(rec.unitPrice ? String(rec.unitPrice) : '');
    setTotalAmount(String(rec.totalAmount));
    setCashPaid(String(rec.cashPaid));
    setNotes(rec.notes || '');
    setShowAddRecord(true);
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this agent ledger entry?')) {
      StorageService.deleteAgentLedgerRecord(id);
      showToast('Record deleted');
      loadRecords();
    }
  };

  // Pick stock product
  const handleSelectProduct = (prod: InventoryProduct) => {
    const qtyNum = parseFloat(quantity) || 1;
    const priceNum = prod.sellingPrice || 0;
    setItemsTaken(prod.name);
    setUnitPrice(String(priceNum));
    setTotalAmount(String(qtyNum * priceNum));
    setShowStockPicker(false);
  };

  // Filter products for stock picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(stockSearchQuery));
      const matchesCategory =
        selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, stockSearchQuery, selectedCategoryId]);

  // Export PDF Report for Agent
  const handleExportAgentPDF = async () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header Banner
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, pageWidth, 60, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(businessProfile.name || 'BUSINESS PERFORMANCE REPORT', 30, 35);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('AGENT CONSIGNMENT & LEDGER AUDIT', pageWidth - 30, 35, { align: 'right' });

      y = 85;

      // Agent Info Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, y, pageWidth - 60, 95, 6, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(30, y, pageWidth - 60, 95, 6, 6, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(agent.agentName, 45, y + 22);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Shop / Outlet: ${agent.shopName || 'N/A'}   |   Phone: ${agent.contact || 'N/A'}`, 45, y + 38);
      doc.text(`Address / Location: ${agent.address || 'N/A'}`, 45, y + 54);
      doc.text(
        `Timeframe: ${getTimeframeLabel(timeframeFilter)}   |   Generated On: ${new Date().toLocaleDateString(
          'en-GB',
          { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        )}`,
        45,
        y + 70
      );

      // KPI Boxes
      const kpiY = y + 110;
      const kpiW = (pageWidth - 60 - 20) / 3;

      // Box 1: Items Taken Value
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.roundedRect(30, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text('TOTAL GOODS TAKEN', 38, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${totalItemsValue.toLocaleString()}`, 38, kpiY + 34);

      // Box 2: Cash Paid
      doc.setFillColor(240, 253, 244); // Green 50
      doc.roundedRect(30 + kpiW + 10, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text('TOTAL CASH PAID', 38 + kpiW + 10, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${totalCashPaid.toLocaleString()}`, 38 + kpiW + 10, kpiY + 34);

      // Box 3: Remaining Balance
      doc.setFillColor(254, 242, 242); // Red 50
      doc.roundedRect(30 + (kpiW + 10) * 2, kpiY, kpiW, 45, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(153, 27, 27);
      doc.text('REMAINING BALANCE', 38 + (kpiW + 10) * 2, kpiY + 15);
      doc.setFontSize(11);
      doc.text(`${currency} ${totalRemainingBalance.toLocaleString()}`, 38 + (kpiW + 10) * 2, kpiY + 34);

      y = kpiY + 65;

      // Detailed Consignment & Ledger Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('CONSIGNMENT & PAYMENT HISTORY RECORDS', 30, y);
      y += 16;

      if (timeframeLedgerList.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`No consignment or payment records for ${getTimeframeLabel(timeframeFilter).toLowerCase()}.`, 30, y);
      } else {
        // Table Header Line
        doc.setFillColor(241, 245, 249);
        doc.rect(30, y, pageWidth - 60, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        doc.text('DATE', 35, y + 13);
        doc.text('ITEMS TAKEN', 95, y + 13);
        doc.text('QTY', 230, y + 13);
        doc.text('UNIT PRICE', 270, y + 13);
        doc.text('TOTAL VALUE', 350, y + 13);
        doc.text('CASH PAID', 435, y + 13);
        doc.text('BALANCE', 510, y + 13);

        y += 24;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        timeframeLedgerList.slice(0, 20).forEach((rec) => {
          doc.text(formatDateTime(rec.date) || '', 35, y);
          doc.text(rec.itemsTaken.substring(0, 22), 95, y);
          doc.text(String(rec.quantity || 1), 230, y);
          doc.text(rec.unitPrice ? `${currency} ${rec.unitPrice.toLocaleString()}` : '-', 270, y);
          doc.text(`${currency} ${rec.totalAmount.toLocaleString()}`, 350, y);
          doc.text(`${currency} ${rec.cashPaid.toLocaleString()}`, 435, y);
          doc.text(`${currency} ${rec.remainingBalance.toLocaleString()}`, 510, y);

          y += 14;
          if (y > 780) {
            doc.addPage();
            y = 40;
          }
        });
      }

      const sanitizedName = agent.agentName.replace(/[^a-zA-Z0-9]/g, '_');
      const pdfFilename = `Agent_Ledger_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
      await saveJsPdf(doc, pdfFilename, `Agent Ledger - ${agent.agentName}`);
      showToast('Agent report PDF exported!');
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export PDF report. Please try again.');
    }
  };

  const getTimeframeLabel = (f: AgentTimeframeFilter) => {
    switch (f) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year';
      case 'all':
        return 'All Time';
      case 'custom':
        if (customFilterDate) {
          const parts = customFilterDate.split('-').map(Number);
          if (parts.length === 3) {
            const dt = new Date(parts[0], parts[1] - 1, parts[2]);
            return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          }
        }
        return 'Selected Date';
    }
  };

  const initials =
    agent.agentName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'AG';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full sm:h-[92vh] sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleUp">
        
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-700 text-white p-3.5 sm:p-4 shrink-0 shadow-sm">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {agent.profilePic ? (
                <img
                  src={agent.profilePic}
                  alt={agent.agentName}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover ring-2 ring-white/30 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 text-white backdrop-blur-xs flex items-center justify-center font-black text-sm sm:text-base shadow-md shrink-0 border border-white/30">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight truncate text-white">
                    {agent.agentName}
                  </h3>
                  {agent.shopName && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide backdrop-blur-xs shrink-0 flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      <span>{agent.shopName}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-indigo-100 mt-0.5">
                  {agent.contact && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-sky-300" />
                      <span>{agent.contact}</span>
                    </span>
                  )}
                  {agent.address && (
                    <span className="hidden sm:flex items-center gap-1">
                      • <MapPin className="w-3 h-3 text-emerald-300" />
                      <span>{agent.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-export-agent-pdf"
                onClick={handleExportAgentPDF}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer border border-white/30 backdrop-blur-xs"
                title="Export all data and analytics PDF for this agent"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-black flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                title="Done & Close"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition sm:hidden cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="mt-3 bg-white/10 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/20 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'today' as AgentTimeframeFilter, label: 'Today' },
              { id: 'week' as AgentTimeframeFilter, label: 'This Week' },
              { id: 'month' as AgentTimeframeFilter, label: 'This Month' },
              { id: 'year' as AgentTimeframeFilter, label: 'This Year' },
              { id: 'all' as AgentTimeframeFilter, label: 'All Time' },
            ].map((f) => {
              const active = timeframeFilter === f.id;
              return (
                <button
                  key={f.id}
                  id={`btn-agent-filter-${f.id}`}
                  type="button"
                  onClick={() => setTimeframeFilter(f.id)}
                  className={`flex-1 min-w-[68px] py-1.5 px-2 rounded-xl font-bold text-xs text-center transition whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md scale-[1.02]'
                      : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}

            {/* Custom Date Picker Button */}
            <div className="relative flex-1 min-w-[105px] flex items-center shrink-0">
              <button
                type="button"
                id="btn-agent-filter-custom"
                className={`w-full py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  timeframeFilter === 'custom'
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-md scale-[1.02]'
                    : 'text-white/80 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-white/10 dark:hover:bg-slate-800/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {timeframeFilter === 'custom' && customFilterDate
                    ? (() => {
                        const parts = customFilterDate.split('-').map(Number);
                        if (parts.length === 3) {
                          const d = new Date(parts[0], parts[1] - 1, parts[2]);
                          return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                        }
                        return customFilterDate;
                      })()
                    : 'Select Date'}
                </span>
              </button>
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomFilterDate(e.target.value);
                    setTimeframeFilter('custom');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select specific date for analytics"
              />
            </div>
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-fadeIn shrink-0">
            {toastMessage}
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">

          {/* SUMMARY KPI METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Goods Issued */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  Items Value Taken
                </span>
                <span className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-100 mt-0.5 block">
                  {currency} {totalItemsValue.toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-500 font-medium">
                  {timeframeLedgerList.length} transaction records
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* Cash Paid */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Cash Paid / Remitted
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100 mt-0.5 block">
                  {currency} {totalCashPaid.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  {totalItemsValue > 0 ? `${Math.round((totalCashPaid / totalItemsValue) * 100)}% paid` : 'No items yet'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Remaining Balance */}
            <div className={`border rounded-2xl p-3.5 flex items-center justify-between ${
              allTimeRemainingBalance > 0
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  allTimeRemainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                }`}>
                  Remaining Balance
                </span>
                <span className={`text-base sm:text-lg font-black mt-0.5 block ${
                  allTimeRemainingBalance > 0 ? 'text-rose-950 dark:text-rose-100' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {currency} {totalRemainingBalance.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold">
                  {allTimeRemainingBalance > 0 ? (
                    <span className="text-rose-600">Owed balance pending</span>
                  ) : (
                    <span className="text-emerald-600">⚪ Fully Paid & Settled</span>
                  )}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                allTimeRemainingBalance > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ACTION TOOLBAR: RECORD NEW TRANSACTION / STOCK TAKEN */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Consignment & Stock Ledger
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Log items taken by agent, prices, cash remitted, and balance
              </p>
            </div>

            <button
              type="button"
              id="btn-record-agent-stock"
              onClick={() => {
                setEditingRecordId(null);
                setShowAddRecord(!showAddRecord);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
            >
              {showAddRecord ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showAddRecord ? 'Cancel' : `Record ${agent.agentName ? agent.agentName.trim().split(/\s+/).slice(-1)[0] : 'Agent'} Stock / Cash`}</span>
            </button>
          </div>

          {/* FORM: RECORD AGENT STOCK / CASH */}
          {showAddRecord && (
            <form
              onSubmit={handleSaveRecord}
              className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-indigo-200 dark:border-slate-700 space-y-3 animate-fadeIn shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h5 className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>{editingRecordId ? 'Edit Agent Ledger Entry' : `Record Goods Issued & Cash Paid by ${agent.agentName}`}</span>
                </h5>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Auto-calculates remaining balance
                </span>
              </div>

              {/* Row 1: Date & Time & Items Taken with Pick from Stock Button */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(date)}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Item / Goods Taken *
                    </label>
                    <button
                      type="button"
                      id="btn-pick-stock-for-agent"
                      onClick={() => setShowStockPicker(true)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Pick from Stock</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 10x Men's Polo T-Shirts, or 5 Bags of Rice"
                    value={itemsTaken}
                    onChange={(e) => setItemsTaken(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Quantity, Unit Price, Total Amount, Cash Paid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Quantity Taken
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Unit Price ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Total Goods Value ({currency}) *
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-indigo-700 dark:text-indigo-300"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cash Paid Now ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-emerald-700 dark:text-emerald-300"
                  />
                </div>
              </div>

              {/* Calculated Balance Preview Banner */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Calculated Remaining Balance for this Entry:
                </span>
                <span className={`font-black text-sm ${
                  (parseFloat(totalAmount) || 0) - (parseFloat(cashPaid) || 0) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {currency} {Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(cashPaid) || 0)).toLocaleString()}
                </span>
              </div>

              {/* Row 3: Notes & Submit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Items taken for market day consignment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRecord(false);
                      setEditingRecordId(null);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingRecordId ? 'Update Entry' : 'Save Agent Entry'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STOCK PICKER MODAL */}
          {showStockPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
                <div className="p-3.5 bg-indigo-600 text-white flex items-center justify-between">
                  <h4 className="text-xs font-bold flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Select Product from Stock</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowStockPicker(false)}
                    className="p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search product by name or barcode..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>

                  {categories.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto no-scrollbar pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId('all')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                          selectedCategoryId === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        All Stock
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                            selectedCategoryId === cat.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No stock items found
                    </div>
                  ) : (
                    filteredProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod)}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-between transition cursor-pointer group"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Stock: {prod.quantity} available
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                            {currency} {prod.sellingPrice?.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            Select Item
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LEDGER RECORDS LIST */}
          {ledgerList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No stock or consignment entries recorded yet for {agent.agentName}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Click "Record Agent Stock / Cash" above to log goods taken by this agent, prices, cash remitted, and track remaining balances.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingRecordId(null);
                  setShowAddRecord(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record First Consignment</span>
              </button>
            </div>
          ) : timeframeLedgerList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No entries recorded for {getTimeframeLabel(timeframeFilter).toLowerCase()}
              </p>
              <button
                type="button"
                onClick={() => setTimeframeFilter('all')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                View all agent records ({ledgerList.length})
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {timeframeLedgerList.map((rec) => {
                const isPaid = rec.remainingBalance <= 0;

                return (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>

                        <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {rec.itemsTaken}
                        </h5>

                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 text-[10px] font-black border border-indigo-200 dark:border-indigo-800 shrink-0">
                          Qty: {rec.quantity || 1}
                        </span>

                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border uppercase shrink-0 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                        }`}>
                          {isPaid ? 'PAID IN FULL' : `BAL: ${currency} ${rec.remainingBalance.toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditRecord(rec)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 pl-9 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Date & Time: <strong className="text-slate-700 dark:text-slate-300">{formatDateTime(rec.date)}</strong></span>
                      {rec.unitPrice ? (
                        <span>• Unit Price: <strong className="text-slate-700 dark:text-slate-300">{currency} {rec.unitPrice.toLocaleString()}</strong></span>
                      ) : null}
                      <span>• Total: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{currency} {rec.totalAmount.toLocaleString()}</strong></span>
                      <span>• Cash Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{currency} {rec.cashPaid.toLocaleString()}</strong></span>
                    </div>

                    {rec.notes && (
                      <p className="mt-0.5 pl-9 text-[10px] text-slate-400 italic">
                        “{rec.notes}”
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>All transactions for {agent.agentName} are saved automatically.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>

      </div>
    </div>
  );
};
