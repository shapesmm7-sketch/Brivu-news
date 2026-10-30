import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Check,
  Eye,
  Share2,
  Percent,
  Sparkles,
  ArrowLeft,
  Info,
  Save,
  Download,
  CheckCircle2,
  Building2,
  CreditCard,
  Hash,
  MapPin,
  Clock,
  Send,
  FileCheck,
  AlertCircle,
  Boxes,
  Scan,
} from 'lucide-react';
import {
  BusinessProfile,
  PaymentMethod,
  PaymentStatus,
  Receipt,
  ReceiptItem,
  ReceiptTemplateId,
} from '../types';
import { formatCurrency, roundMoney } from '../utils/currencies';
import { StorageService } from '../services/storage';
import { PdfGenerator } from '../services/pdfGenerator';
import { AdMobService } from '../services/admobService';
import { StockProductPickerModal, SelectedStockItem } from './StockProductPickerModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PhoneInputField } from './PhoneInputField';
import { DownloadSuccessModal } from './DownloadSuccessModal';

interface CreateInvoiceScreenProps {
  business: BusinessProfile;
  defaultTemplate: ReceiptTemplateId;
  defaultPaymentMethod?: PaymentMethod;
  editingInvoice?: Receipt | null;
  duplicateFromInvoice?: Receipt | null;
  onCancel: () => void;
  onSaveOnly?: (invoice: Receipt) => void;
  onSaveAndPreview: (invoice: Receipt) => void;
  onQuickDownload?: (invoice: Receipt) => void;
  onQuickShare: (invoice: Receipt) => void;
}

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFutureDateString = (days: number): string => {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({
  business,
  defaultTemplate,
  defaultPaymentMethod = 'Bank',
  editingInvoice,
  duplicateFromInvoice,
  onCancel,
  onSaveOnly,
  onSaveAndPreview,
  onQuickDownload,
  onQuickShare,
}) => {
  const currency = business.currency || 'UGX';
  const settings = StorageService.getSettings();

  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Invoice Number & Dates
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState<string>(
    getFutureDateString(settings.defaultDueDateDays || 14)
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    settings.defaultPaymentTerms || 'Net 14'
  );
  const [poNumber, setPoNumber] = useState<string>('');

  // Customer / Bill To Information
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerTaxNumber, setCustomerTaxNumber] = useState<string>('');

  // Line items
  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', name: '', quantity: 1, unitPrice: 0, subtotal: 0 },
  ]);

  // Pricing adjustments
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate || 0);
  const [shippingFee, setShippingFee] = useState<number>(0);

  // Invoice notes
  const [notes, setNotes] = useState<string>(
    'Thank you for your business. Payment is due within the terms specified.'
  );

  // Bank & Payment Instructions
  const defaultBankText = business.bankName
    ? `${business.bankName}: A/C ${business.bankAccountNumber || ''} (${business.bankAccountName || business.name}) ${
        business.mobileMoneyMerchant ? `| MoMo: ${business.mobileMoneyMerchant}` : ''
      }`
    : business.defaultPaymentInstructions || '';
  const [bankDetails, setBankDetails] = useState<string>(defaultBankText);

  // Payment Status & Amount Paid
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    editingInvoice?.paymentStatus || duplicateFromInvoice?.paymentStatus || 'unpaid'
  );
  const [amountPaidValue, setAmountPaidValue] = useState<number>(
    editingInvoice?.amountPaid ?? (duplicateFromInvoice?.amountPaid || 0)
  );

  // Error state
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    fileName?: string;
    folderName?: string;
    documentType?: 'receipt' | 'invoice';
    documentNumber?: string;
  }>({ isOpen: false });

  // Stock Product Picker & Barcode Scanner Modal States
  const [isStockPickerOpen, setIsStockPickerOpen] = useState<boolean>(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);

  // Initialize Invoice Data
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.receiptNumber);
      try {
        setIssueDate(editingInvoice.createdAt.split('T')[0] || getTodayDateString());
      } catch {
        setIssueDate(getTodayDateString());
      }
      setDueDate(editingInvoice.dueDate || getFutureDateString(14));
      setPaymentTerms(editingInvoice.paymentTerms || 'Net 14');
      setPoNumber(editingInvoice.poNumber || '');
      setCustomerName(editingInvoice.customerName || '');
      setCustomerPhone(editingInvoice.customerPhone || '');
      setCustomerEmail(editingInvoice.customerEmail || '');
      setCustomerAddress(editingInvoice.customerAddress || '');
      setCustomerTaxNumber(editingInvoice.customerTaxNumber || '');
      setItems(
        editingInvoice.items.length > 0
          ? editingInvoice.items
          : [{ id: '1', name: '', quantity: 1, unitPrice: 0, subtotal: 0 }]
      );
      setDiscountType(editingInvoice.discountType || 'fixed');
      setDiscountValue(editingInvoice.discount || 0);
      setTaxRate(editingInvoice.taxRate ?? (settings.defaultTaxRate || 0));
      setShippingFee(editingInvoice.shippingFee || 0);
      setNotes(
        editingInvoice.notes ||
          'Thank you for your business. Payment is due within the terms specified.'
      );
      setBankDetails(editingInvoice.bankDetails || defaultBankText);
      setPaymentStatus(
        editingInvoice.paymentStatus ||
          (editingInvoice.amountPaid >= editingInvoice.total && editingInvoice.total > 0
            ? 'paid'
            : editingInvoice.amountPaid > 0
            ? 'partial'
            : 'unpaid')
      );
      setAmountPaidValue(editingInvoice.amountPaid ?? 0);
    } else if (duplicateFromInvoice) {
      setInvoiceNumber(StorageService.generateInvoiceNumber());
      setIssueDate(getTodayDateString());
      setDueDate(getFutureDateString(settings.defaultDueDateDays || 14));
      setPaymentTerms(duplicateFromInvoice.paymentTerms || 'Net 14');
      setPoNumber(duplicateFromInvoice.poNumber || '');
      setCustomerName(duplicateFromInvoice.customerName || '');
      setCustomerPhone(duplicateFromInvoice.customerPhone || '');
      setCustomerEmail(duplicateFromInvoice.customerEmail || '');
      setCustomerAddress(duplicateFromInvoice.customerAddress || '');
      setCustomerTaxNumber(duplicateFromInvoice.customerTaxNumber || '');
      setItems(
        duplicateFromInvoice.items.map((i) => ({
          ...i,
          id: Math.random().toString(36).substring(2, 9),
        }))
      );
      setDiscountType(duplicateFromInvoice.discountType || 'fixed');
      setDiscountValue(duplicateFromInvoice.discount || 0);
      setTaxRate(duplicateFromInvoice.taxRate ?? (settings.defaultTaxRate || 0));
      setShippingFee(duplicateFromInvoice.shippingFee || 0);
      setNotes(duplicateFromInvoice.notes || 'Thank you for your business.');
      setBankDetails(duplicateFromInvoice.bankDetails || defaultBankText);
      setPaymentStatus(duplicateFromInvoice.paymentStatus || 'unpaid');
      setAmountPaidValue(duplicateFromInvoice.amountPaid ?? 0);
    } else {
      setInvoiceNumber(StorageService.generateInvoiceNumber());
      setIssueDate(getTodayDateString());
      setDueDate(getFutureDateString(settings.defaultDueDateDays || 14));
      setPaymentTerms(settings.defaultPaymentTerms || 'Net 14');
      setBankDetails(defaultBankText);
      setPaymentStatus('unpaid');
      setAmountPaidValue(0);
    }
  }, [editingInvoice, duplicateFromInvoice]);

  // Handle Terms Presets
  const handleSelectTerms = (term: string) => {
    setPaymentTerms(term);
    if (term === 'Due on Receipt') {
      setDueDate(issueDate);
    } else if (term === 'Net 7') {
      setDueDate(getFutureDateString(7));
    } else if (term === 'Net 14') {
      setDueDate(getFutureDateString(14));
    } else if (term === 'Net 30') {
      setDueDate(getFutureDateString(30));
    } else if (term === 'Net 60') {
      setDueDate(getFutureDateString(60));
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const calculatedTaxAmount = taxRate > 0 ? Math.round((discountedSubtotal * taxRate) / 100) : 0;
  const shippingAmount = Math.max(0, Number(shippingFee) || 0);
  const grandTotal = Math.max(0, discountedSubtotal + calculatedTaxAmount + shippingAmount);

  // Effective Amount Paid & Balance based on chosen Payment Status
  let effectivePaid = 0;
  const parsedAmount = typeof amountPaidValue === 'number' ? amountPaidValue : parseFloat(String(amountPaidValue)) || 0;
  if (paymentStatus === 'paid') {
    effectivePaid = parsedAmount > 0 ? parsedAmount : grandTotal;
  } else if (paymentStatus === 'partial') {
    effectivePaid = Math.min(grandTotal, Math.max(0, parsedAmount));
  } else {
    // unpaid
    effectivePaid = 0;
  }
  const effectiveBalance = roundMoney(effectivePaid - grandTotal); // negative = balance remaining to pay
  const remainingDue = Math.max(0, grandTotal - effectivePaid);

  // Item modifications
  const handleItemChange = (
    id: string,
    field: keyof ReceiptItem,
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item };
        if (field === 'name') {
          updated.name = String(val);
        } else if (field === 'quantity') {
          const num = val === '' ? 0 : typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          updated.quantity = num;
        } else if (field === 'unitPrice') {
          const num = val === '' ? 0 : typeof val === 'number' ? val : parseFloat(String(val)) || 0;
          updated.unitPrice = num;
        }
        const q = typeof updated.quantity === 'number' ? updated.quantity : parseFloat(String(updated.quantity)) || 0;
        const p = typeof updated.unitPrice === 'number' ? updated.unitPrice : parseFloat(String(updated.unitPrice)) || 0;
        updated.subtotal = roundMoney(q * p);
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleSelectStockProduct = (selected: SelectedStockItem) => {
    const qty = selected.quantity > 0 ? selected.quantity : 1;
    const price = selected.unitPrice || 0;
    const sub = roundMoney(qty * price);

    setItems((prev) => {
      // If the current list only has one empty item, replace it
      if (prev.length === 1 && prev[0].name.trim() === '' && (!prev[0].unitPrice || prev[0].unitPrice === 0)) {
        return [
          {
            id: prev[0].id,
            name: selected.name,
            quantity: qty,
            unitPrice: price,
            subtotal: sub,
          },
        ];
      }
      // Otherwise append as a new item
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: selected.name,
          quantity: qty,
          unitPrice: price,
          subtotal: sub,
        },
      ];
    });
    showToast(`Added "${selected.name}" from stock`);
  };

  const handleSelectMultipleStockProducts = (selectedList: SelectedStockItem[]) => {
    if (!selectedList || selectedList.length === 0) return;

    setItems((prev) => {
      const nonEmpties = prev.filter(
        (i) => i.name.trim() !== '' || (i.unitPrice && i.unitPrice > 0)
      );

      const newItems: ReceiptItem[] = selectedList.map((sel, idx) => {
        const qty = sel.quantity > 0 ? sel.quantity : 1;
        const price = sel.unitPrice || 0;
        return {
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: sel.name,
          quantity: qty,
          unitPrice: price,
          subtotal: roundMoney(qty * price),
        };
      });

      return [...nonEmpties, ...newItems];
    });
    showToast(`Added ${selectedList.length} items from stock`);
  };

  const handleScanBarcodeResult = ({
    scannedCode,
    matchedProduct,
  }: {
    scannedCode: string;
    matchedProduct?: import('../types').InventoryProduct;
  }) => {
    if (matchedProduct) {
      handleSelectStockProduct({
        name: matchedProduct.name,
        unitPrice: matchedProduct.sellingPrice || 0,
        quantity: 1,
        inventoryProductId: matchedProduct.id,
        itemId: matchedProduct.itemId,
      });
    } else if (scannedCode) {
      handleAddItem();
      setItems((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) {
          last.name = `Barcode Item #${scannedCode}`;
        }
        return copy;
      });
      showToast(`Added item with barcode #${scannedCode}`);
    }
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: '1', name: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Build the Invoice record
  const buildInvoiceData = (): Receipt | null => {
    if (!invoiceNumber.trim()) {
      setErrorMessage('Please provide an invoice number.');
      return null;
    }

    const validItems = items
      .filter((item) => item.name.trim() !== '' || Number(item.unitPrice) > 0)
      .map((item, idx) => {
        const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 1;
        const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
        return {
          id: item.id || `inv-item-${Date.now()}-${idx}`,
          name: item.name.trim() || `Item #${idx + 1}`,
          quantity: qty > 0 ? qty : 1,
          unitPrice: price,
          subtotal: roundMoney(qty * price),
        };
      });

    if (validItems.length === 0) {
      setErrorMessage('Please add at least one line item to the invoice.');
      return null;
    }

    setErrorMessage('');

    const invoiceId = editingInvoice
      ? editingInvoice.id
      : `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const effectiveCreatedAt = issueDate ? `${issueDate}T12:00:00` : new Date().toISOString();

    const invoice: Receipt = {
      id: invoiceId,
      documentType: 'invoice',
      receiptNumber: invoiceNumber.trim(),
      createdAt: effectiveCreatedAt,
      dueDate: dueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      poNumber: poNumber.trim() || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerTaxNumber: customerTaxNumber.trim() || undefined,
      items: validItems,
      subtotal: roundMoney(subtotal),
      discount: discountValue,
      discountType,
      discountAmount: roundMoney(discountAmount),
      taxRate: taxRate > 0 ? taxRate : undefined,
      taxAmount: calculatedTaxAmount > 0 ? calculatedTaxAmount : undefined,
      shippingFee: shippingAmount > 0 ? shippingAmount : undefined,
      total: roundMoney(grandTotal),
      amountPaid: roundMoney(effectivePaid),
      balance: effectiveBalance, // negative = balance due
      paymentStatus,
      paymentMethod: editingInvoice?.paymentMethod,
      notes: notes.trim() || undefined,
      bankDetails: bankDetails.trim() || undefined,
      template: editingInvoice?.template || defaultTemplate || 'modern',
      accentColor: editingInvoice?.accentColor,
      customTheme: editingInvoice?.customTheme,
      businessSnapshot: StorageService.getProfile() || business,
    };

    return invoice;
  };

  const handleSaveOnly = async () => {
    const invoice = buildInvoiceData();
    if (!invoice) return;

    setIsProcessing(true);
    await StorageService.saveReceiptAsync(invoice);
    if (!editingInvoice) {
      StorageService.advanceInvoiceSequence();
    }
    setIsProcessing(false);
    showToast(
      `Invoice ${invoice.receiptNumber} has been saved successfully! You can find it anytime in Receipts & Invoices.`
    );
    AdMobService.showInterstitial('invoice_saved');
    if (onSaveOnly) {
      onSaveOnly(invoice);
    } else {
      onSaveAndPreview(invoice);
    }
  };

  const handleSaveAndPreview = async () => {
    const invoice = buildInvoiceData();
    if (!invoice) return;

    setIsProcessing(true);
    await StorageService.saveReceiptAsync(invoice);
    if (!editingInvoice) {
      StorageService.advanceInvoiceSequence();
    }
    setIsProcessing(false);
    showToast(
      `Invoice ${invoice.receiptNumber} has been saved successfully! You can find it anytime in Receipts & Invoices.`
    );
    AdMobService.showInterstitial('invoice_saved');
    onSaveAndPreview(invoice);
  };

  const handleQuickDownload = async () => {
    const invoice = buildInvoiceData();
    if (!invoice) return;

    setIsProcessing(true);
    await StorageService.saveReceiptAsync(invoice);
    if (!editingInvoice) {
      StorageService.advanceInvoiceSequence();
    }
    try {
      const res = await PdfGenerator.downloadPdf(invoice);
      showToast(res.message);
      AdMobService.showInterstitial('invoice_downloaded');
      setDownloadModalData({
        isOpen: true,
        fileName: res.filename,
        folderName: res.folder || 'Documents/Brivu',
        documentType: 'invoice',
        documentNumber: invoice.receiptNumber,
      });
      if (onQuickDownload) {
        onQuickDownload(invoice);
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickShare = async () => {
    const invoice = buildInvoiceData();
    if (!invoice) return;

    setIsProcessing(true);
    await StorageService.saveReceiptAsync(invoice);
    if (!editingInvoice) {
      StorageService.advanceInvoiceSequence();
    }
    try {
      await onQuickShare(invoice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-36 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium border border-slate-700 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                INVOICE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Professional client billing, due dates & tax calculation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAndPreview}
          disabled={isProcessing}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
          <Info className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Invoice Header & Terms */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <FileText className="w-4 h-4" />
            <span>Invoice Details</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Step 1 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Invoice Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-01"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              P.O. / Reference Number (Optional)
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-902"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Issue Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Due Date
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Bill To / Client Details */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Building2 className="w-4 h-4" />
            <span>Bill To / Client Details</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Step 2 of 4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Client / Company Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corp / John Doe"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <PhoneInputField
              id="input-invoice-customer-phone"
              label="Client Phone / WhatsApp"
              value={customerPhone}
              onChange={(val) => setCustomerPhone(val)}
              placeholder="700 000 000"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Client Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="billing@company.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Client Billing Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. Plot 10, Industrial Park"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Client Tax ID / TIN / VAT No
            </label>
            <input
              type="text"
              value={customerTaxNumber}
              onChange={(e) => setCustomerTaxNumber(e.target.value)}
              placeholder="e.g. TIN-1002938475"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Line Items */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <DollarSign className="w-4 h-4" />
            <span>Invoice Line Items</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-scan-barcode-invoice-top"
              type="button"
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold transition active:scale-95 shadow-2xs"
              title="Scan product barcode with camera"
            >
              <Scan className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Scan Barcode</span>
            </button>

            <button
              id="btn-pick-stock-invoice-top"
              type="button"
              onClick={() => setIsStockPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 text-xs font-bold transition active:scale-95 shadow-2xs"
              title="Pick products from your Stock Inventory"
            >
              <Boxes className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Choose from Stock</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-400 hidden sm:inline">
              Step 3 of 4
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                  Item #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>ITEM NAME</span>
                    <span className="text-rose-500 font-bold text-xs">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Product or service description)
                  </span>
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                  placeholder="Enter item name (e.g. Graphic Design, Shoes, Cement, Repair)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 sm:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                    placeholder="1"
                    title={String(item.quantity || '')}
                    className={`w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-center transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-1.5 ${
                      String(item.quantity || '').length >= 7
                        ? 'text-[8.5px] tracking-tighter px-0.5'
                        : String(item.quantity || '').length >= 5
                        ? 'text-[9.5px] tracking-tighter px-0.5'
                        : String(item.quantity || '').length >= 4
                        ? 'text-[11px] tracking-tight px-1'
                        : 'text-xs sm:text-sm px-1.5'
                    }`}
                  />
                </div>

                <div className="col-span-5 sm:col-span-4">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1 truncate">
                    Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                    placeholder="0"
                    title={String(item.unitPrice || '')}
                    className={`w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-1.5 ${
                      String(item.unitPrice || '').length >= 13
                        ? 'text-[8px] tracking-tighter px-0.5'
                        : String(item.unitPrice || '').length >= 10
                        ? 'text-[9px] tracking-tighter px-1'
                        : String(item.unitPrice || '').length >= 8
                        ? 'text-[10px] tracking-tight px-1'
                        : String(item.unitPrice || '').length >= 6
                        ? 'text-[11px] tracking-tight px-1.5'
                        : 'text-xs sm:text-sm px-2'
                    }`}
                  />
                </div>

                <div className="col-span-4 sm:col-span-5">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1 text-right">
                    Subtotal
                  </label>
                  <div
                    className={`min-w-0 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300/60 dark:border-slate-600/60 font-bold text-slate-900 dark:text-slate-100 flex items-center justify-end font-mono whitespace-nowrap overflow-hidden shadow-2xs transition-all ${
                      formatCurrency(item.subtotal || 0, currency).length >= 18
                        ? 'text-[8px] tracking-tighter px-0.5'
                        : formatCurrency(item.subtotal || 0, currency).length >= 15
                        ? 'text-[9px] tracking-tighter px-1'
                        : formatCurrency(item.subtotal || 0, currency).length >= 12
                        ? 'text-[10px] tracking-tight px-1'
                        : formatCurrency(item.subtotal || 0, currency).length >= 9
                        ? 'text-[11px] tracking-tight px-1.5'
                        : 'text-xs sm:text-sm px-2'
                    }`}
                    title={formatCurrency(item.subtotal || 0, currency)}
                  >
                    {formatCurrency(item.subtotal || 0, currency)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Action Button: Add Item */}
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition mt-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Section 4: Adjustments, Tax, Bank & Payment Instructions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <CreditCard className="w-4 h-4" />
            <span>Taxes, Payment & Settlement</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Step 4 of 4
          </span>
        </div>

        {/* Payment Status Selector */}
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Payment Status</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                (Select settlement status)
              </span>
            </label>
            <span
              className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                paymentStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : paymentStatus === 'partial'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Unpaid Option */}
            <button
              id="payment-status-unpaid"
              type="button"
              onClick={() => {
                setPaymentStatus('unpaid');
                setAmountPaidValue(0);
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === 'unpaid'
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-xs font-bold ${
                    paymentStatus === 'unpaid'
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Unpaid
                </span>
                <Clock
                  className={`w-4 h-4 ${
                    paymentStatus === 'unpaid'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Payment pending
              </p>
            </button>

            {/* Partial Option */}
            <button
              id="payment-status-partial"
              type="button"
              onClick={() => {
                setPaymentStatus('partial');
                if ((amountPaidValue === 0 || amountPaidValue >= grandTotal) && grandTotal > 0) {
                  setAmountPaidValue(Math.round(grandTotal / 2));
                }
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === 'partial'
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-xs font-bold ${
                    paymentStatus === 'partial'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Partial
                </span>
                <Percent
                  className={`w-4 h-4 ${
                    paymentStatus === 'partial'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Deposit / Part paid
              </p>
            </button>

            {/* Paid Option */}
            <button
              id="payment-status-paid"
              type="button"
              onClick={() => {
                setPaymentStatus('paid');
                setAmountPaidValue(grandTotal);
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === 'paid'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-xs font-bold ${
                    paymentStatus === 'paid'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Paid
                </span>
                <CheckCircle2
                  className={`w-4 h-4 ${
                    paymentStatus === 'paid'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Settled upfront
              </p>
            </button>
          </div>

          {/* Amount Box Custom for each Status */}
          {paymentStatus === 'unpaid' && (
            <div
              id="payment-status-unpaid-box"
              className="p-3.5 rounded-xl border space-y-2.5 transition animate-fadeIn bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label
                  htmlFor="invoice-total-to-pay-input"
                  className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200"
                >
                  <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Total Amount to be Paid ({currency}):</span>
                </label>
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                  Full Balance Unpaid
                </span>
              </div>

              <div className="relative">
                <input
                  id="invoice-total-to-pay-input"
                  type="text"
                  readOnly
                  value={formatCurrency(grandTotal, currency)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 text-sm font-extrabold text-slate-900 dark:text-white font-mono cursor-default focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {paymentStatus === 'partial' && (
            <div
              id="payment-status-partial-box"
              className="p-3.5 rounded-xl border space-y-2.5 transition animate-fadeIn bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label
                  htmlFor="invoice-partial-paid-input"
                  className="text-xs font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200"
                >
                  <Percent className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Partially Paid Amount / Deposit ({currency}):</span>
                </label>

                {/* Quick Helper Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAmountPaidValue(Math.round(grandTotal * 0.25))}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 transition"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaidValue(Math.round(grandTotal * 0.5))}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 transition"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountPaidValue(Math.round(grandTotal * 0.75))}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 transition"
                  >
                    75%
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  id="invoice-partial-paid-input"
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={amountPaidValue === 0 ? '' : amountPaidValue}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setAmountPaidValue(Math.min(grandTotal, Math.max(0, val)));
                  }}
                  placeholder={`e.g. ${Math.round(grandTotal / 2)}`}
                  title={String(amountPaidValue || '')}
                  className={`w-full min-w-0 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-2 ${
                    String(amountPaidValue || '').length >= 13
                      ? 'text-[8.5px] tracking-tighter px-1.5'
                      : String(amountPaidValue || '').length >= 10
                      ? 'text-[9.5px] tracking-tighter px-2'
                      : String(amountPaidValue || '').length >= 8
                      ? 'text-xs tracking-tight px-2.5'
                      : 'text-sm px-3'
                  }`}
                />
              </div>
            </div>
          )}

          {paymentStatus === 'paid' && (
            <div
              id="payment-status-paid-box"
              className="p-3.5 rounded-xl border space-y-2.5 transition animate-fadeIn bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label
                  htmlFor="invoice-amount-paid-input"
                  className="text-xs font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Amount Paid ({currency}):</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountPaidValue(grandTotal)}
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 transition"
                  >
                    100% Full Total
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  id="invoice-amount-paid-input"
                  type="number"
                  min="0"
                  value={amountPaidValue === 0 ? grandTotal : amountPaidValue}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setAmountPaidValue(Math.max(0, val));
                  }}
                  placeholder={String(grandTotal)}
                  title={String(amountPaidValue || grandTotal)}
                  className={`w-full min-w-0 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-2 ${
                    String(amountPaidValue || grandTotal || '').length >= 13
                      ? 'text-[8.5px] tracking-tighter px-1.5'
                      : String(amountPaidValue || grandTotal || '').length >= 10
                      ? 'text-[9.5px] tracking-tighter px-2'
                      : String(amountPaidValue || grandTotal || '').length >= 8
                      ? 'text-xs tracking-tight px-2.5'
                      : 'text-sm px-3'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Discount & Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Discount */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Discount
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                value={discountValue === 0 ? '' : discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                placeholder="0"
                title={String(discountValue || '')}
                className={`flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-2 ${
                  String(discountValue || '').length >= 10
                    ? 'text-[9.5px] tracking-tighter px-1.5'
                    : String(discountValue || '').length >= 7
                    ? 'text-xs tracking-tight px-2'
                    : 'text-sm px-3'
                }`}
              />
              <button
                type="button"
                onClick={() =>
                  setDiscountType((prev) => (prev === 'fixed' ? 'percentage' : 'fixed'))
                }
                className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
              >
                {discountType === 'percentage' ? '%' : currency}
              </button>
            </div>
          </div>

          {/* Tax / VAT */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tax / VAT Rate (%)
            </label>
            <div className="relative">
              <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate === 0 ? '' : taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                placeholder="0% (e.g. 18)"
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Shipping / Delivery */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Shipping / Extra Fee ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={shippingFee === 0 ? '' : shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
              placeholder="0"
              title={String(shippingFee || '')}
              className={`w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-2 ${
                String(shippingFee || '').length >= 10
                  ? 'text-[9.5px] tracking-tighter px-1.5'
                  : String(shippingFee || '').length >= 7
                  ? 'text-xs tracking-tight px-2'
                  : 'text-sm px-3'
              }`}
            />
          </div>
        </div>

        {/* Bank & Payment Instructions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Bank Details / Payment Instructions on Invoice
          </label>
          <textarea
            rows={2}
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
            placeholder="e.g. Bank: Stanbic Bank, A/C: 9030012345678 (Quick Mart Ltd) | MoMo Merchant: *165*3*123456#"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Invoice Notes / Terms */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Notes & Terms
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Thank you for your business. Late payments are subject to a 2% monthly fee."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Financial Summary Card */}
        <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Subtotal:</span>
            <span className="font-mono font-bold">{formatCurrency(subtotal, currency)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Fixed'}):</span>
              <span className="font-mono font-bold">-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}

          {calculatedTaxAmount > 0 && (
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Tax / VAT ({taxRate}%):</span>
              <span className="font-mono font-bold">+{formatCurrency(calculatedTaxAmount, currency)}</span>
            </div>
          )}

          {shippingAmount > 0 && (
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Shipping / Delivery:</span>
              <span className="font-mono font-bold">+{formatCurrency(shippingAmount, currency)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60 flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              Total Invoice:
            </span>
            <span className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>

          {/* Payment Status Breakdown */}
          {paymentStatus !== 'unpaid' && (
            <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-300 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 font-medium">
              <span>Amount Paid ({paymentStatus}):</span>
              <span className="font-mono font-bold">{formatCurrency(effectivePaid, currency)}</span>
            </div>
          )}

          {remainingDue > 0 && (
            <div className="flex justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
              <span>Balance Due to Pay:</span>
              <span className="font-mono">{formatCurrency(remainingDue, currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar - Fixed Bottom with high z-index and full visibility */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-1.5 sm:gap-2">
          {/* Back / Cancel */}
          <button
            id="btn-invoice-cancel"
            type="button"
            onClick={onCancel}
            className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition shrink-0"
            title="Cancel & Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Save Only */}
          <button
            id="btn-invoice-save"
            type="button"
            onClick={handleSaveOnly}
            disabled={isProcessing}
            className="flex-1 py-3 px-2 sm:px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-50"
            title="Save Invoice Draft"
          >
            <Save className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="whitespace-nowrap">Save</span>
          </button>

          {/* Quick Download PDF */}
          <button
            id="btn-invoice-download"
            type="button"
            onClick={handleQuickDownload}
            disabled={isProcessing}
            className="flex-1 py-3 px-2 sm:px-3.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs hover:bg-slate-700 active:scale-95 transition flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-50"
            title="Download Invoice PDF"
          >
            <Download className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="whitespace-nowrap">PDF</span>
          </button>

          {/* Quick Share via WhatsApp */}
          <button
            id="btn-invoice-share"
            type="button"
            onClick={handleQuickShare}
            disabled={isProcessing}
            className="flex-1 py-3 px-2 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-50 shadow-sm"
            title="Share Invoice"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Share</span>
          </button>

          {/* Save & Preview */}
          <button
            id="btn-invoice-save-preview"
            type="button"
            onClick={handleSaveAndPreview}
            disabled={isProcessing}
            className="flex-1.2 py-3 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25 active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Preview Invoice"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Preview</span>
          </button>
        </div>
      </div>

      {/* Stock Product Picker Modal */}
      <StockProductPickerModal
        isOpen={isStockPickerOpen}
        currency={currency}
        documentType="invoice"
        onClose={() => setIsStockPickerOpen(false)}
        onSelectProduct={handleSelectStockProduct}
        onSelectMultipleProducts={handleSelectMultipleStockProducts}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        currency={currency}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanResult={handleScanBarcodeResult}
      />

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
