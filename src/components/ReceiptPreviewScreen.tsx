import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Share2,
  Edit,
  Copy,
  Printer,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Palette,
  Cloud,
} from 'lucide-react';
import { Receipt, ReceiptTemplateId } from '../types';
import { formatCurrency, formatDateTime } from '../utils/currencies';
import { PdfGenerator, resolveEffectiveBusinessProfile } from '../services/pdfGenerator';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { BluetoothPrinterService } from '../services/bluetoothPrinterService';
import { AdMobService } from '../services/admobService';
import { BRAND_COLOR_PRESETS, isValidHex, normalizeHex, getContrastTextHex } from '../utils/colors';

interface ReceiptPreviewScreenProps {
  receipt: Receipt;
  onBack: () => void;
  onEdit: (receipt: Receipt) => void;
  onDuplicate: (receipt: Receipt) => void;
}

import { TEMPLATES_CONFIG, getTemplateConfig } from '../utils/templates';
import { ReceiptLayoutRenderer } from './ReceiptLayoutRenderer';

import { DownloadSuccessModal } from './DownloadSuccessModal';

export const ReceiptPreviewScreen: React.FC<ReceiptPreviewScreenProps> = ({
  receipt: initialReceipt,
  onBack,
  onEdit,
  onDuplicate,
}) => {
  const [receipt, setReceipt] = useState<Receipt>(initialReceipt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingCf, setIsUploadingCf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    fileName?: string;
    folderName?: string;
    documentType?: 'receipt' | 'invoice';
    documentNumber?: string;
  }>({ isOpen: false });

  const isCfConfigured = CloudflareService.isConfigured();

  const business = resolveEffectiveBusinessProfile(receipt);
  const currency = business?.currency || receipt.currency || 'UGX';
  const currentTheme = getTemplateConfig(receipt.template || 'modern');
  const isInvoice = receipt.documentType === 'invoice';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTemplateChange = (templateId: ReceiptTemplateId) => {
    const updated: Receipt = {
      ...receipt,
      template: templateId,
      accentColor: undefined,
      customTheme: undefined,
    };
    setReceipt(updated);
    StorageService.saveReceipt(updated);
    showToast(`Switched to ${templateId.toUpperCase()} template`);
  };

  const handleAccentColorChange = (newColor: string) => {
    const updated: Receipt = {
      ...receipt,
      accentColor: newColor || undefined,
    };
    setReceipt(updated);
    StorageService.saveReceipt(updated);
    if (newColor) {
      showToast(`Accent color updated to ${newColor.toUpperCase()}`);
    } else {
      showToast('Accent color reset to theme default');
    }
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const res = await PdfGenerator.downloadPdf(receipt);
      showToast(res.message);
      AdMobService.showInterstitial('preview_pdf_download');
      setDownloadModalData({
        isOpen: true,
        fileName: res.filename,
        folderName: res.folder || 'Documents/Brivu',
        documentType: receipt.documentType === 'invoice' ? 'invoice' : 'receipt',
        documentNumber: receipt.receiptNumber,
      });
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Error generating PDF file');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      const res = await PdfGenerator.shareReceiptPdf(receipt);
      showToast(res.message);
      AdMobService.showInterstitial('preview_pdf_share');
    } catch (err) {
      console.error('Share error:', err);
      showToast('Sharing cancelled or failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const savedPrinter = StorageService.getSavedThermalPrinter();
  const [isThermalPrinting, setIsThermalPrinting] = useState(false);

  const handleSmartPrint = async () => {
    if (savedPrinter) {
      setIsThermalPrinting(true);
      try {
        showToast(`Printing to ${savedPrinter.name}...`);
        const res = await BluetoothPrinterService.printReceipt(savedPrinter, receipt);
        showToast(res.message);
      } catch (err: any) {
        showToast(`Thermal print error: ${err.message || 'Check printer connection'}`);
      } finally {
        setIsThermalPrinting(false);
      }
    } else {
      // Direct thermal / system spooler print
      setIsThermalPrinting(true);
      try {
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
      } catch (err: any) {
        window.print();
      } finally {
        setIsThermalPrinting(false);
      }
    }
  };

  const handlePrint = () => {
    handleSmartPrint();
  };

  const handleThermalPrint = async () => {
    handleSmartPrint();
  };

  const handleSaveToCloudflare = async () => {
    try {
      setIsUploadingCf(true);
      // Sync receipt/invoice record (JSON information) to Cloudflare
      await CloudflareService.saveSingleReceipt(receipt);
      showToast(`Receipt information synced to Cloud!`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`Cloud save error: ${errMsg}`);
    } finally {
      setIsUploadingCf(false);
    }
  };

  return (
    <div className="space-y-4 pb-36 animate-fadeIn max-w-2xl mx-auto">
      {/* Toast Notification (Centered prominently in screen) */}
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

      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <button
          id="btn-preview-back"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {isInvoice ? 'Invoices' : 'Receipts'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-preview-edit"
            onClick={() => onEdit(receipt)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isInvoice ? 'Edit Invoice' : 'Edit Receipt'}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            id="btn-preview-duplicate"
            onClick={() => onDuplicate(receipt)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isInvoice ? 'Duplicate Invoice' : 'Duplicate Receipt'}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            id="btn-preview-print"
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isInvoice ? 'Print Invoice' : 'Print Receipt'}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Template Selector Pills & Accent Color Row */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isInvoice ? 'Invoice Template Theme' : 'Receipt Template Theme'}
            </span>
            <span className={`text-[10px] font-semibold ${isInvoice ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {TEMPLATES_CONFIG.length} Professional Themes
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {TEMPLATES_CONFIG.map((t) => {
              const active = receipt.template === t.id;
              return (
                <button
                  key={t.id}
                  id={`btn-template-select-${t.id}`}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`py-1.5 px-3 text-center rounded-xl border text-xs font-bold transition shrink-0 whitespace-nowrap active:scale-95 ${
                    active
                      ? isInvoice
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Picker Row */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <Palette className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px]">Accent:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar flex-1">
            {BRAND_COLOR_PRESETS.map((preset) => {
              const currentAccent = receipt.accentColor || business.accentColor;
              const isSelected =
                currentAccent && normalizeHex(currentAccent) === normalizeHex(preset.hex);
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`btn-preview-accent-${preset.id}`}
                  onClick={() => handleAccentColorChange(preset.hex)}
                  title={preset.name}
                  className={`w-5 h-5 rounded-full shadow-xs flex items-center justify-center transition-transform shrink-0 ${
                    isSelected ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{ background: preset.hex }}
                >
                  {isSelected && (
                    <Check
                      className="w-3 h-3 stroke-[3]"
                      style={{ color: getContrastTextHex(preset.hex) }}
                    />
                  )}
                </button>
              );
            })}

            {/* Custom Eye Dropper */}
            <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600">
              <input
                id="input-preview-custom-accent"
                type="color"
                value={
                  receipt.accentColor && isValidHex(receipt.accentColor)
                    ? normalizeHex(receipt.accentColor)
                    : business.accentColor && isValidHex(business.accentColor)
                    ? normalizeHex(business.accentColor)
                    : '#059669'
                }
                onChange={(e) => handleAccentColorChange(e.target.value)}
                className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer border-0 p-0"
              />
            </div>

            {(receipt.accentColor || business.accentColor) && (
              <button
                type="button"
                id="btn-preview-reset-accent"
                onClick={() => handleAccentColorChange('')}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition underline shrink-0 ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* REALISTIC RECEIPT PREVIEW CONTAINER                          */}
      {/* ============================================================ */}
      <div
        className="receipt-print-area"
        id="receipt-preview-render-node"
        data-receipt-id={receipt.id}
        data-receipt-number={receipt.receiptNumber}
      >
        <ReceiptLayoutRenderer
          data={{
            storeName: business.name || '',
            businessDescription: business.description || '',
            phone: business.phone || '',
            email: business.email || '',
            address: business.address || '',
            taxNumber: business.taxNumber || '',
            logo: business.logo,
            signature: business.signature,
            customFooter: business.customFooter || '',
            receiptNumber: receipt.receiptNumber,
            createdAt: receipt.createdAt,
            customerName: receipt.customerName,
            customerPhone: receipt.customerPhone,
            customerEmail: receipt.customerEmail,
            customerAddress: receipt.customerAddress,
            documentType: receipt.documentType || (isInvoice ? 'invoice' : 'receipt'),
            dueDate: receipt.dueDate,
            paymentTerms: receipt.paymentTerms,
            paymentMethod: receipt.paymentMethod,
            paymentStatus: receipt.paymentStatus,
            items: receipt.items || [],
            subtotal: receipt.subtotal,
            discountAmount: receipt.discountAmount,
            total: receipt.total,
            amountPaid: receipt.amountPaid,
            balance: receipt.balance,
            amountInWords: receipt.amountInWords,
            notes: receipt.notes,
            nonReturnable: receipt.nonReturnable === true || (receipt.nonReturnable === undefined && !receipt.nonRefundable),
            nonRefundable: Boolean(receipt.nonRefundable),
            currency: currency,
            template: receipt.template || 'modern',
            accentColor: receipt.accentColor,
            customTheme: (() => {
              const saved = StorageService.getCustomTemplate(receipt.template || 'modern');
              return {
                headerBgColor: receipt.customTheme?.headerBgColor || saved?.headerBgColor,
                headerTextColor: receipt.customTheme?.headerTextColor || saved?.headerTextColor,
                totalBgColor: receipt.customTheme?.totalBgColor || saved?.totalBgColor,
                totalTextColor: receipt.customTheme?.totalTextColor || saved?.totalTextColor,
                paperBgColor: receipt.customTheme?.paperBgColor || saved?.paperBgColor,
                accentColor: receipt.customTheme?.accentColor || saved?.accentColor || receipt.accentColor,
                fontFamily: receipt.customTheme?.fontFamily || saved?.fontFamily,
                badgeText: receipt.customTheme?.badgeText || saved?.badgeText || (isInvoice ? 'INVOICE' : 'RECEIPT'),
              };
            })(),
            isSample: false,
          }}
        />
      </div>

      {/* FIXED BOTTOM FLOATING ACTION BAR: DOWNLOAD & SHARE */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          {/* Download PDF */}
          <button
            id="btn-preview-download-pdf"
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-300 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isInvoice ? 'text-indigo-600' : 'text-emerald-600'}`} />
            <span>{isInvoice ? 'Download Invoice' : 'Download PDF'}</span>
          </button>

          {/* Share PDF (WhatsApp / Android Sheet) */}
          <button
            id="btn-preview-share-pdf"
            onClick={handleShare}
            disabled={isGenerating}
            className={`flex-1.5 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2 transition disabled:opacity-50 ${
              isInvoice
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-600/30 hover:opacity-95'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30 hover:opacity-95'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{isInvoice ? 'Share Invoice' : 'Share Receipt'}</span>
          </button>

          {/* Print Button (Bluetooth Thermal / System Printer) */}
          <button
            id="btn-preview-thermal-print"
            type="button"
            onClick={handleThermalPrint}
            disabled={isGenerating || isThermalPrinting}
            title={savedPrinter ? `Print directly to ${savedPrinter.name}` : 'Print Invoice / Receipt'}
            className="flex-1 py-3.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <Printer className={`w-4 h-4 ${isThermalPrinting ? 'animate-bounce' : ''}`} />
            <span>{isThermalPrinting ? 'Printing...' : savedPrinter ? 'Print (BT)' : 'Print'}</span>
          </button>
        </div>
      </div>

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
