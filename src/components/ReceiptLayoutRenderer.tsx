import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Coffee,
  Leaf,
  QrCode,
  Sparkles,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { ReceiptTemplateId, TemplateCustomization } from '../types';
import { formatCurrency, formatDateTime } from '../utils/currencies';
import { getTemplateConfig } from '../utils/templates';
import { isValidHex, normalizeHex, getContrastTextHex, resolveEffectiveTheme, rgbToHex, hexToRgb, getLuminance, isValidColorOrGradient, formatBgStyle, formatTextStyle } from '../utils/colors';
import { ReceiptQrCodeSection } from './ReceiptQrCodeSection';


const renderSupplementaryInfo = (amountInWords?: string, notes?: string, balance: number = 0, currency: string = 'UGX', nonReturnable: boolean = true, nonRefundable: boolean = false, isInvoice: boolean = false) => {
  const isOwed = balance < 0;
  const hasChange = balance > 0;
  
  if (!amountInWords && !notes && !isOwed && !hasChange && !nonReturnable && !nonRefundable) return null;

  const hasThankYouInNotes = notes && notes.toLowerCase().includes('thank');
  const thankYouText = hasThankYouInNotes ? notes.trim() : (!notes ? 'Thank you' : null);

  return (
    <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-1.5 font-sans">
      {(isOwed || hasChange) && (
        <div className="ml-auto max-w-[280px] flex justify-between gap-4 py-0.5 font-bold text-xs">
          <span className={isOwed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {isOwed ? (isInvoice ? 'Balance Due to Pay:' : 'Balance Due:') : 'Change:'}
          </span>
          <span className={`font-mono ${isOwed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(Math.abs(balance), currency)}
          </span>
        </div>
      )}
      {amountInWords && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 text-left">
          <span className="font-semibold text-slate-900 dark:text-slate-200">Amount Paid in Words: </span>
          <span className="italic uppercase">{amountInWords}</span>
        </div>
      )}
      {notes && !hasThankYouInNotes && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 text-left">
          <span className="font-semibold text-slate-900 dark:text-slate-200">Notes: </span>
          <span>{notes}</span>
        </div>
      )}
      {thankYouText && (
        <div className="text-center font-bold text-xs text-slate-800 dark:text-slate-200 pt-2 pb-0.5">
          {thankYouText}
        </div>
      )}
      {nonReturnable && (
        <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 italic">
          Goods once sold are not returnable.
        </div>
      )}
      {nonRefundable && (
        <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 italic">
          Money paid are not refundable.
        </div>
      )}
    </div>
  );
};

export interface ReceiptRenderData {
  storeName: string;
  businessDescription?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  logo?: string;
  signature?: string;
  customFooter?: string;
  receiptNumber: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  documentType?: 'receipt' | 'invoice';
  dueDate?: string;
  paymentTerms?: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  items: { id: string; name: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  balance: number;
  amountInWords?: string;
  notes?: string;
  nonReturnable?: boolean;
  nonRefundable?: boolean;
  currency: string;
  template: ReceiptTemplateId;
  accentColor?: string;
  customTheme?: TemplateCustomization;
  isSample?: boolean;
}

export const ReceiptLayoutRenderer: React.FC<{ data: ReceiptRenderData }> = ({ data }) => {
  const {
    storeName,
    businessDescription,
    phone,
    email,
    address,
    taxNumber,
    logo,
    signature,
    customFooter,
    receiptNumber,
    createdAt,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    documentType = 'receipt',
    dueDate,
    paymentTerms,
    paymentMethod,
    paymentStatus,
    items,
    subtotal,
    discountAmount = 0,
    total,
    amountPaid,
    balance,
    amountInWords,
    notes,
    nonReturnable = true,
    nonRefundable = false,
    currency,
    template,
    accentColor,
    customTheme,
    isSample = false,
  } = data;

  const rawStoreName = (storeName || '').trim();
  const cleanStoreName = (rawStoreName && rawStoreName.toLowerCase() !== 'business name') ? rawStoreName : '';

  const isInvoice = documentType === 'invoice';
  const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
  let effectiveBadgeText = defaultBadge;
  if (customTheme?.badgeText && customTheme.badgeText.trim()) {
    const trimmed = customTheme.badgeText.trim();
    if (isInvoice && (trimmed.toUpperCase() === 'RECEIPT' || trimmed === 'Receipt')) {
      effectiveBadgeText = 'INVOICE';
    } else {
      effectiveBadgeText = trimmed;
    }
  }
  const resolvedTheme = resolveEffectiveTheme(template, accentColor, customTheme);
  const theme = resolvedTheme;
  const formattedDate = isSample ? 'Today, 14:30' : formatDateTime(createdAt);

  // 1. Primary Accent Color Resolution
  const customHex = customTheme?.accentColor || (accentColor && isValidHex(accentColor) ? normalizeHex(accentColor) : null);
  const effectiveAccent = customHex || (theme.pdf.accentColor ? rgbToHex(theme.pdf.accentColor[0], theme.pdf.accentColor[1], theme.pdf.accentColor[2]) : '#059669');
  const accentContrastText = getContrastTextHex(effectiveAccent);

  const accentBadgeStyle: React.CSSProperties = {
    background: effectiveAccent,
    color: accentContrastText,
    borderColor: effectiveAccent,
  };

  const accentTextStyle: React.CSSProperties = {
    color: effectiveAccent,
  };

  const accentBorderStyle: React.CSSProperties = {
    borderColor: effectiveAccent,
  };

  // 2. Custom Theme Override Flags
  const isCustomHeader = Boolean(customTheme?.headerBgColor && isValidColorOrGradient(customTheme.headerBgColor));
  const isCustomHeaderText = Boolean(customTheme?.headerTextColor && isValidColorOrGradient(customTheme.headerTextColor));
  const isCustomTotalBg = Boolean(customTheme?.totalBgColor && isValidColorOrGradient(customTheme.totalBgColor));
  const isCustomTotalText = Boolean(customTheme?.totalTextColor && isValidColorOrGradient(customTheme.totalTextColor));
  const isCustomPaperBg = Boolean(customTheme?.paperBgColor && isValidColorOrGradient(customTheme.paperBgColor));

  // 3. Header Background & Text Style
  const customHeaderBg = customTheme?.headerBgColor;
  const headerBgStyle = isCustomHeader && isValidColorOrGradient(customHeaderBg)
    ? customHeaderBg
    : undefined;

  const headerStyle: React.CSSProperties = headerBgStyle
    ? {
        ...formatBgStyle(headerBgStyle),
        ...(customTheme?.headerTextColor
          ? formatTextStyle(customTheme.headerTextColor)
          : { color: (isValidHex(headerBgStyle) ? getContrastTextHex(headerBgStyle) : '#ffffff') }),
      }
    : {};

  // 4. Total Box Background & Text Style
  const customTotalBg = customTheme?.totalBgColor;
  const totalBgVal = isCustomTotalBg && isValidColorOrGradient(customTotalBg)
    ? customTotalBg
    : effectiveAccent;

  const totalStyle: React.CSSProperties = {
    ...formatBgStyle(totalBgVal),
    ...(customTheme?.totalTextColor
      ? formatTextStyle(customTheme.totalTextColor)
      : { color: (isValidHex(totalBgVal) ? getContrastTextHex(totalBgVal) : '#ffffff') }),
  };

  // 5. Paper Background & Receipt Text Color Style
  const paperBgVal = isCustomPaperBg && isValidColorOrGradient(customTheme?.paperBgColor)
    ? customTheme!.paperBgColor
    : (theme.pdf.pageBg ? rgbToHex(theme.pdf.pageBg[0], theme.pdf.pageBg[1], theme.pdf.pageBg[2]) : undefined);

  const receiptTextColorVal = customTheme?.receiptTextColor && isValidColorOrGradient(customTheme.receiptTextColor)
    ? customTheme.receiptTextColor
    : undefined;

  const paperStyle: React.CSSProperties = {
    ...(paperBgVal ? formatBgStyle(paperBgVal) : {}),
    ...(receiptTextColorVal ? formatTextStyle(receiptTextColorVal) : {}),
  };

  // 6. Header Specific Element Styles
  const headerNameStyle: React.CSSProperties = customTheme?.headerNameColor && isValidColorOrGradient(customTheme.headerNameColor)
    ? formatTextStyle(customTheme.headerNameColor)
    : {};

  const headerDescStyle: React.CSSProperties = customTheme?.headerDescColor && isValidColorOrGradient(customTheme.headerDescColor)
    ? formatTextStyle(customTheme.headerDescColor)
    : {};

  const headerAddressStyle: React.CSSProperties = customTheme?.headerAddressColor && isValidColorOrGradient(customTheme.headerAddressColor)
    ? formatTextStyle(customTheme.headerAddressColor)
    : {};

  // 6. Header Background Resolution for Contrast Checking
  let effectiveHeaderHex = '#ffffff';
  if (isCustomHeader && customTheme?.headerBgColor && isValidHex(customTheme.headerBgColor)) {
    effectiveHeaderHex = normalizeHex(customTheme.headerBgColor);
  } else if (theme.pdf.headerBg) {
    effectiveHeaderHex = rgbToHex(theme.pdf.headerBg[0], theme.pdf.headerBg[1], theme.pdf.headerBg[2]);
  } else {
    switch (template) {
      case 'modern':
        effectiveHeaderHex = '#0f172a';
        break;
      case 'luxury':
        effectiveHeaderHex = '#090d16';
        break;
      case 'bold':
        effectiveHeaderHex = '#020617';
        break;
      case 'cyber':
        effectiveHeaderHex = '#030712';
        break;
      case 'vintage':
        effectiveHeaderHex = '#1c1917';
        break;
      case 'ocean-breeze':
        effectiveHeaderHex = '#083344';
        break;
      case 'retro-kraft':
        effectiveHeaderHex = '#f4ebd0';
        break;
      case 'thermal':
        effectiveHeaderHex = '#fbfaf5';
        break;
      default:
        effectiveHeaderHex = isCustomPaperBg && customTheme?.paperBgColor && isValidHex(customTheme.paperBgColor)
          ? normalizeHex(customTheme.paperBgColor)
          : '#ffffff';
        break;
    }
  }

  const hRgb = hexToRgb(effectiveHeaderHex);
  const headerLum = getLuminance(hRgb[0], hRgb[1], hRgb[2]);
  const isHeaderDark = headerLum < 0.45;

  // 7. RECEIPT Badge Background & Text Style (Prominently visible across all themes)
  let finalBadgeBg = '';
  let finalBadgeText = '';
  let finalBadgeBorder: string | undefined = undefined;

  // Priority A: Explicit badge background from customTheme
  if (customTheme?.badgeBgColor && isValidHex(customTheme.badgeBgColor)) {
    finalBadgeBg = normalizeHex(customTheme.badgeBgColor);
    finalBadgeText = customTheme.badgeTextColor && isValidHex(customTheme.badgeTextColor)
      ? normalizeHex(customTheme.badgeTextColor)
      : getContrastTextHex(finalBadgeBg);
  } else {
    // Priority B: Theme resolved badge background (which already passed resolveEffectiveTheme contrast checks)
    const resolvedBadgeBg = theme.pdf.badgeBg ? rgbToHex(theme.pdf.badgeBg[0], theme.pdf.badgeBg[1], theme.pdf.badgeBg[2]) : null;

    // Check if customHex provides sufficient contrast against header
    let candidate = customHex;
    if (candidate && isValidHex(candidate)) {
      const cRgb = hexToRgb(candidate);
      const cLum = getLuminance(cRgb[0], cRgb[1], cRgb[2]);
      const lumDiff = Math.abs(cLum - headerLum);
      const colorDist = Math.abs(cRgb[0] - hRgb[0]) + Math.abs(cRgb[1] - hRgb[1]) + Math.abs(cRgb[2] - hRgb[2]);
      if (lumDiff < 0.25 || colorDist < 80) {
        candidate = null; // reject low-contrast candidate that would blend into header
      }
    }

    if (candidate && isValidHex(candidate)) {
      finalBadgeBg = normalizeHex(candidate);
      finalBadgeText = getContrastTextHex(finalBadgeBg);
    } else if (resolvedBadgeBg && isValidHex(resolvedBadgeBg)) {
      finalBadgeBg = normalizeHex(resolvedBadgeBg);
      finalBadgeText = theme.pdf.badgeText ? rgbToHex(theme.pdf.badgeText[0], theme.pdf.badgeText[1], theme.pdf.badgeText[2]) : getContrastTextHex(finalBadgeBg);
    } else {
      if (isHeaderDark) {
        finalBadgeBg = template === 'modern' ? '#10b981' : '#ffffff';
        finalBadgeText = template === 'modern' ? '#ffffff' : '#0f172a';
      } else {
        finalBadgeBg = '#0f172a';
        finalBadgeText = '#ffffff';
      }
    }
  }

  // Safety fallback for contrast:
  if (isValidHex(finalBadgeBg)) {
    const bRgb = hexToRgb(finalBadgeBg);
    const bLum = getLuminance(bRgb[0], bRgb[1], bRgb[2]);
    const lumDiff = Math.abs(bLum - headerLum);
    const colorDist = Math.abs(bRgb[0] - hRgb[0]) + Math.abs(bRgb[1] - hRgb[1]) + Math.abs(bRgb[2] - hRgb[2]);
    if (lumDiff < 0.22 || colorDist < 75) {
      if (isHeaderDark) {
        finalBadgeBg = template === 'modern' ? '#10b981' : '#ffffff';
        finalBadgeText = template === 'modern' ? '#ffffff' : '#0f172a';
      } else {
        finalBadgeBg = '#0f172a';
        finalBadgeText = '#ffffff';
      }
    }
  }

  if (isHeaderDark && !finalBadgeBorder) {
    finalBadgeBorder = '1px solid rgba(255, 255, 255, 0.35)';
  } else if (!isHeaderDark && !finalBadgeBorder) {
    finalBadgeBorder = '1px solid rgba(0, 0, 0, 0.12)';
  }

  const receiptBadgeStyle: React.CSSProperties = {
    backgroundColor: finalBadgeBg,
    color: finalBadgeText,
    border: finalBadgeBorder,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
  };

  /* -------------------------------------------------------------------------- */
  /* 1. CLASSIC STANDARD (Timeless Serif, Double Rules, Signature Line)         */
  /* -------------------------------------------------------------------------- */
  if (template === 'classic') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-300 dark:border-slate-700 shadow-sm ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        <div className={`pb-3 mb-3 border-b-2 border-slate-900 dark:border-slate-100 ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full font-serif inline-block shadow-xs" style={receiptBadgeStyle}>
              {effectiveBadgeText}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h2 className="text-lg sm:text-xl font-bold tracking-tight uppercase break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h2>
              )}
              {businessDescription && (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic font-sans mt-0.5 text-center" style={headerDescStyle}>
                  {businessDescription}
                </p>
              )}
              {[address, phone, email].filter(Boolean).length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5 text-center" style={headerAddressStyle}>
                  {[address, phone, email].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-start text-xs font-sans text-slate-600 dark:text-slate-400 mb-3">
          <div>
            <div className="font-bold text-slate-900 dark:text-white">
              {isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:'} {customerName || (isInvoice ? 'Valued Client' : 'General Customer')}
            </div>
            {customerPhone && <div className="text-[11px] text-slate-500">Phone: {customerPhone}</div>}
            {customerEmail && <div className="text-[11px] text-slate-500">Email: {customerEmail}</div>}
            {customerAddress && <div className="text-[11px] text-slate-500">Address: {customerAddress}</div>}
          </div>
          <span className="font-mono font-bold whitespace-nowrap">{isInvoice ? 'Invoice No.' : 'No.'} {receiptNumber}</span>
        </div>

        <div className="font-sans text-xs border-t border-b border-slate-300 dark:border-slate-700 py-2.5 space-y-2">
          <div className="flex justify-between font-bold text-slate-500 uppercase text-[10px] pb-1 border-b border-slate-200 dark:border-slate-800">
            <span>{isInvoice ? 'Item Description' : 'Paid For'}</span>
            <span className="text-center">Qty × Price</span>
            <span>Amount</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-0.5">
              <span className="font-medium">{item.name}</span>
              <span className="text-slate-500 text-[11px]">{item.quantity} × {formatCurrency(item.unitPrice, currency)}</span>
              <span className="font-bold">{formatCurrency(item.subtotal, currency)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 font-sans space-y-1.5 text-right text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-rose-600 font-medium">
              <span>Discount:</span>
              <span>-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm sm:text-base font-bold border-b-4 border-double border-slate-900 dark:border-slate-100 py-1.5" style={(totalStyle.background || totalStyle.backgroundColor) ? totalStyle : undefined}>
            <span>GRAND TOTAL:</span>
            <span className="font-mono">{formatCurrency(total, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-500 pt-0.5">
            <span>Amount Paid ({paymentMethod}):</span>
            <span>{formatCurrency(amountPaid, currency)}</span>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        <div className="mt-4 pt-3 font-sans flex justify-between items-end text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <span>{customFooter || 'Thank you for your patronage.'}</span>
          <div className="text-center flex flex-col items-center">
            {signature && (
              <img src={signature} alt="Signature" className="max-h-10 w-auto max-w-[120px] object-contain mb-1 bg-transparent" />
            )}
            <div className="w-28 border-b border-slate-400 mb-1" />
            <span>Authorized Signature</span>
          </div>
        </div>
        <div className="mt-3 pt-2 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={46} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 2. MINIMAL CLEAN (Airy Scandinavian, Hairline Dividers, Refined Margins)   */
  /* -------------------------------------------------------------------------- */
  if (template === 'minimal') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        <div className={`pb-4 border-b border-slate-100 dark:border-slate-800 ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full font-sans inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-md border border-slate-200 dark:border-slate-800 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h3>
              )}
              {businessDescription && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 text-center" style={headerDescStyle}>{businessDescription}</p>
              )}
              {address && (
                <p className="text-xs text-slate-400 mt-0.5 text-center" style={headerAddressStyle}>{address}</p>
              )}
              <div className="text-xs font-mono text-slate-400 mt-1 text-center">#{receiptNumber}</div>
            </div>
          </div>
        </div>

        {(customerName || customerPhone || customerEmail) && (
          <div className="py-2.5 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span>Client: <strong className="text-slate-700 dark:text-slate-300">{customerName || 'General Customer'}</strong>{[customerPhone, customerEmail].filter(Boolean).length > 0 ? ` (${[customerPhone, customerEmail].filter(Boolean).join(' • ')})` : ''}</span>
            <span>{formattedDate}</span>
          </div>
        )}

        <div className="py-4 space-y-2.5 text-xs">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-baseline">
              <div>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{item.name}</span>
                <span className="text-slate-400 ml-2 text-[11px]">× {item.quantity}</span>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-rose-500">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 dark:border-slate-800" style={(totalStyle.background || totalStyle.backgroundColor) ? { ...totalStyle, padding: '8px 12px', borderRadius: '12px' } : undefined}>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Total</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
            <span>Paid via {paymentMethod}</span>
            <span>Balance: {formatCurrency(Math.max(0, total - amountPaid), currency)}</span>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        {signature && (
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end">
            <img src={signature} alt="Authorized Signature" className="max-h-9 w-auto max-w-[110px] object-contain mb-0.5" />
            <div className="w-24 border-b border-slate-300 dark:border-slate-700" />
            <span className="text-[9px] text-slate-400 mt-0.5">Authorized Sign</span>
          </div>
        )}
        <div className="text-center text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {customFooter || 'Thank you.'}
        </div>
        <div className="mt-3 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={44} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 3. BUSINESS & TAX (Official Tax Invoice, TIN, VAT, Stamp & Signature Box)  */
  /* -------------------------------------------------------------------------- */
  if (template === 'business') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-300 dark:border-slate-700 shadow-sm ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        <div className={`pb-3 border-b border-slate-200 dark:border-slate-700 ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center pb-1">
            <span className="text-[9px] font-bold px-3 py-0.5 rounded-sm uppercase tracking-widest shadow-xs inline-block" style={receiptBadgeStyle}>
              {customTheme?.badgeText || defaultBadge}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-md border border-slate-200 dark:border-slate-700 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h3>
              )}
              {businessDescription && (
                <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5 text-center" style={headerDescStyle}>{businessDescription}</p>
              )}
              {taxNumber && (
                <div className="text-xs font-mono text-slate-500 mt-0.5 text-center">
                  TIN: {taxNumber} • VAT REGISTERED
                </div>
              )}
              {address && <p className="text-[11px] text-slate-500 text-center" style={headerAddressStyle}>{address}</p>}
              <div className="text-xs font-mono text-slate-500 mt-0.5 text-center font-bold">
                {isInvoice ? 'INVOICE NO:' : 'RECEIPT NO:'} {receiptNumber} • {formattedDate}
              </div>
            </div>
          </div>
        </div>

        <div className="my-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
          <span className="font-bold block text-slate-800 dark:text-slate-200">
            {isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:'} {customerName || (isInvoice ? 'Client' : 'Walk-in Client')}
          </span>
          {customerPhone && <span className="text-slate-500 text-[11px] block">Tel: {customerPhone}</span>}
          {customerEmail && <span className="text-slate-500 text-[11px] block">Email: {customerEmail}</span>}
          {customerAddress && <span className="text-slate-500 text-[11px] block">Address: {customerAddress}</span>}
        </div>

        <div className="text-xs space-y-1.5 py-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase pb-1">
            <span>{isInvoice ? 'Item Description' : 'Paid For'}</span>
            <span>Amount</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span className="font-medium font-mono">{formatCurrency(item.subtotal, currency)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 grid grid-cols-2 gap-3 items-center text-xs">
          <div className="w-full min-h-14 rounded-md border-2 border-dashed border-amber-600/40 dark:border-amber-400/40 flex flex-col items-center justify-center p-1.5 text-center bg-amber-50/40 dark:bg-amber-950/20">
            {signature ? (
              <div className="flex flex-col items-center py-0.5">
                <img src={signature} alt="Authorized Signature" className="max-h-8 w-auto max-w-[110px] object-contain mb-0.5" />
                <span className="text-[7px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                  OFFICIAL STAMP & SIGN
                </span>
              </div>
            ) : (
              <>
                <span className="text-[8px] font-bold uppercase text-amber-700 dark:text-amber-400 leading-tight">
                  OFFICIAL BUSINESS STAMP
                </span>
                <span className="text-[7px] text-slate-400">& AUTHORIZED SIGNATURE</span>
              </>
            )}
          </div>

          <div className="space-y-1 text-right">
            <div className="text-slate-500 text-[11px]">Subtotal: {formatCurrency(subtotal, currency)}</div>
            <div className="text-slate-500 text-[11px]">VAT (18% Incl.): {formatCurrency(Math.round(total * 0.1525), currency)}</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700 font-mono">
              TOTAL: {formatCurrency(total, currency)}
            </div>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        <div className="mt-3 text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {customFooter || 'Thank you for your business. Valid tax invoice.'}
        </div>
        <div className="mt-3 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={44} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 4. COMPACT THERMAL (Authentic 80mm POS Slip, Serrated Cuts, Monospace)     */
  /* -------------------------------------------------------------------------- */
  if (template === 'compact') {
    return (
      <div className="w-full bg-[#fbfaf5] dark:bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-300 dark:border-slate-700 shadow-sm font-mono text-slate-900 dark:text-slate-200 text-xs relative overflow-hidden">
        <div className="pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-sm inline-block shadow-xs" style={receiptBadgeStyle}>
              *** {customTheme?.badgeText || defaultBadge} ***
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[36px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-10 w-auto max-w-[80px] sm:max-w-[95px] object-contain rounded-sm border border-slate-300 dark:border-slate-700 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-12 sm:px-14' : 'px-1'}`}>
              {cleanStoreName && (
                <h3 className="text-sm font-bold uppercase tracking-tight break-words leading-tight text-center" style={headerNameStyle}>*** {cleanStoreName} ***</h3>
              )}
              {businessDescription && (
                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-sans italic my-0.5 text-center" style={headerDescStyle}>
                  {businessDescription}
                </p>
              )}
              {[address, phone].filter(Boolean).length > 0 && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center" style={headerAddressStyle}>
                  {[address, phone ? `Tel ${phone}` : ''].filter(Boolean).join(' • ')}
                </p>
              )}
              <div className="text-[10px] text-slate-500 pt-0.5 text-center">
                RC# {receiptNumber} • {formattedDate}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 py-2 text-[11px]">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.quantity}X {item.name.toUpperCase()}</span>
              <span className="font-bold">{formatCurrency(item.subtotal, currency)}</span>
            </div>
          ))}
        </div>

        <div className="text-center text-[9px] tracking-widest text-slate-400 select-none">
          ---------------------------------------------
        </div>

        <div className="space-y-1 py-2 text-xs">
          <div className="flex justify-between text-sm font-black">
            <span>TOTAL:</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span>AMOUNT PAID:</span>
            <span>{formatCurrency(amountPaid, currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
            <span>CHANGE:</span>
            <span>{formatCurrency(Math.max(0, amountPaid - total), currency)}</span>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        {signature && (
          <div className="text-center pt-2 flex flex-col items-center">
            <img src={signature} alt="Authorized Signature" className="max-h-8 w-auto max-w-[100px] object-contain mb-0.5" />
            <div className="w-20 border-b border-dashed border-slate-400" />
            <span className="text-[8px] text-slate-400 mt-0.5">Authorized Sign</span>
          </div>
        )}
        <div className="text-center pt-2 text-[10px] text-slate-500 space-y-0.5 border-t border-dashed border-slate-300 dark:border-slate-700">
          <p className="font-bold">*** THANK YOU FOR VISITING ***</p>
          <p>{customFooter || 'PLEASE KEEP THIS SLIP'}</p>
        </div>
        <div className="pt-2.5 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={42} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 5. EXECUTIVE NAVY & GOLD (Dual Gold Filigree Borders, Formal Crest)        */
  /* -------------------------------------------------------------------------- */
  if (template === 'executive-navy') {
    return (
      <div className="w-full rounded-2xl p-1 bg-gradient-to-b from-amber-500/40 via-amber-600/20 to-amber-500/40 shadow-lg" style={paperStyle}>
        <div className={`w-full bg-slate-950 rounded-[14px] p-5 sm:p-7 border border-amber-500/40 ${theme.fontFamily} text-slate-100`}>
          {/* Ornate Header with Crest */}
          <div className="pb-4 border-b border-amber-500/30" style={headerStyle}>
            <div className="text-center mb-1">
              <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-0.5 rounded-full inline-block font-sans shadow-xs" style={receiptBadgeStyle}>
                {customTheme?.badgeText || 'RECEIPT'}
              </span>
            </div>
            <div className="relative flex items-center justify-center min-h-[46px]">
              {logo ? (
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[80px] sm:max-w-[100px] object-contain rounded-lg border border-amber-500/40 bg-slate-900 p-0.5" />
                </div>
              ) : (
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-xs">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
              <div className={`text-center ${logo ? 'px-12 sm:px-14' : 'px-8 sm:px-10'}`}>
                {cleanStoreName && (
                  <h2 className="text-base sm:text-lg font-bold tracking-wider text-amber-300 uppercase break-words leading-tight text-center" style={headerNameStyle}>
                    {cleanStoreName}
                  </h2>
                )}
                {businessDescription && (
                  <p className="text-[10px] font-sans tracking-widest text-slate-400 uppercase mt-0.5 text-center" style={headerDescStyle}>
                    {businessDescription}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Corporate Dossier */}
          <div className="grid grid-cols-2 gap-3 my-3 p-3 rounded-xl bg-blue-950/40 border border-amber-500/20 text-xs font-sans">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                ISSUED TO
              </span>
              <span className="font-bold text-white block mt-0.5">{customerName || 'Corporate Client'}</span>
              <span className="text-[11px] text-slate-400 block">{[customerPhone, customerEmail].filter(Boolean).join(' • ') || 'Verified Walk-in'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                RECORD ID
              </span>
              <span className="font-mono font-bold text-white block mt-0.5">{receiptNumber}</span>
              <span className="text-[11px] text-slate-400">{formattedDate}</span>
            </div>
          </div>

          {/* Alternating Row Ledger */}
          <div className="text-xs font-sans py-2 space-y-1">
            <div className="flex justify-between font-bold text-amber-300/80 text-[10px] uppercase pb-1.5 border-b border-slate-800">
              <span>Item Particulars</span>
              <span>Amount</span>
            </div>
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex justify-between items-center p-2 rounded-lg ${
                  idx % 2 === 0 ? 'bg-blue-900/20' : 'bg-transparent'
                }`}
              >
                <span>{item.quantity} × {item.name}</span>
                <span className="font-mono font-bold text-amber-200">
                  {formatCurrency(item.subtotal, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Double Gold Ruled Total Banner */}
          <div className="mt-3 pt-3 border-t-2 border-amber-500/40 font-sans space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 shadow-md" style={(totalStyle.background || totalStyle.backgroundColor) ? totalStyle : undefined}>
              <span className="font-bold text-xs uppercase tracking-wider">TOTAL SETTLED</span>
              <span className="text-base sm:text-lg font-black font-mono">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          {/* Digital Wax Seal & Verification */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-sans">
            <div className="flex items-center gap-1.5 text-amber-400/90">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographically Verified Transaction</span>
            </div>
            <span className="uppercase tracking-wider">{paymentMethod}</span>
          </div>
          <div className="mt-3 pt-2 flex flex-col items-center justify-center">
            <ReceiptQrCodeSection data={data} darkBg={true} size={44} />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 6. EMERALD LUXE (Asymmetric Left Eco-Spine, Rounded Bubble Item Chips)      */
  /* -------------------------------------------------------------------------- */
  if (template === 'emerald-mint') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm flex ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        {/* Left Spine */}
        <div className="w-3.5 sm:w-4 shrink-0" style={{ background: effectiveAccent }} />

        <div className="p-4 sm:p-6 flex-1 space-y-3">
          {/* Header */}
          <div className={`border-b border-slate-200 dark:border-slate-800 pb-3 ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
            <div className="flex items-center justify-center mb-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-xs" style={receiptBadgeStyle}>
                <Leaf className="w-3.5 h-3.5" />
                <span>{customTheme?.badgeText || 'RECEIPT'}</span>
              </span>
            </div>
            <div className="relative flex items-center justify-center min-h-[44px]">
              {logo && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-white p-0.5" />
                </div>
              )}
              <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
                {cleanStoreName && (
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words leading-tight text-center" style={headerNameStyle}>
                    {cleanStoreName}
                  </h3>
                )}
                {businessDescription && (
                  <p className="text-xs text-slate-500 mt-0.5 text-center" style={headerDescStyle}>{businessDescription}</p>
                )}
                {address && (
                  <p className="text-xs text-slate-500 mt-0.5 text-center" style={headerDescStyle}>{address}</p>
                )}
                <div className="mt-1 flex justify-center">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] border" style={{ background: `${effectiveAccent}20`, color: effectiveAccent, borderColor: `${effectiveAccent}40` }}>
                    #{receiptNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rounded Item Bubble Cards */}
          <div className="space-y-1.5 pt-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0" style={accentBadgeStyle}>
                    {item.quantity}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                </div>
                <span className="font-bold font-mono" style={accentTextStyle}>
                  {formatCurrency(item.subtotal, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Floating Pill Total Bar */}
          <div className="mt-3 p-3 rounded-2xl flex justify-between items-center shadow-md text-white" style={totalStyle}>
            <span className="font-bold text-xs uppercase tracking-wider">TOTAL AMOUNT</span>
            <span className="text-base sm:text-lg font-black font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Method: {paymentMethod}</span>
            <span>Thank you for preserving nature!</span>
          </div>
          <div className="pt-2.5 flex flex-col items-center justify-center">
            <ReceiptQrCodeSection data={data} size={42} />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 7. CRIMSON & ONYX (Industrial Heavy-Grid Retail Block, Offset Drop Shadow) */
  /* -------------------------------------------------------------------------- */
  if (template === 'crimson-bold') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-950 dark:border-rose-900 shadow-[4px_4px_0px_0px_rgba(159,18,57,1)] ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        {/* Top Diagonal Stripe Banner */}
        <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#881337,#881337_10px,#0f172a_10px,#0f172a_20px)]" />

        <div className="bg-slate-950 text-white p-4 sm:p-5" style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-md border border-rose-900 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h3>
              )}
              {businessDescription && (
                <p className="text-xs text-rose-200/80 italic mt-0.5 text-center">{businessDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Heavy Boxed Grid Table */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span>RECEIPT: #{receiptNumber}</span>
            <span>{formattedDate}</span>
          </div>

          <div className="border-2 border-slate-900 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 dark:bg-slate-800 font-black p-2 border-b-2 border-slate-900 dark:border-slate-700 flex justify-between uppercase text-[10px]">
              <span>ITEM DETAILS</span>
              <span>SUBTOTAL</span>
            </div>
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`p-2.5 flex justify-between items-center ${
                  idx > 0 ? 'border-t border-slate-300 dark:border-slate-700' : ''
                }`}
              >
                <div>
                  <span className="font-bold">{item.name}</span>
                  <span className="text-rose-600 font-bold ml-2">[{item.quantity} UNIT]</span>
                </div>
                <span className="font-mono font-black">{formatCurrency(item.subtotal, currency)}</span>
              </div>
            ))}
          </div>

          {/* Heavy Block Total */}
          <div className="p-3 bg-rose-600 text-white rounded-lg border-2 border-slate-950 flex justify-between items-center shadow-[2px_2px_0px_0px_#000]" style={(totalStyle.background || totalStyle.backgroundColor) ? totalStyle : undefined}>
            <span className="font-black text-xs uppercase tracking-wider">GRAND TOTAL:</span>
            <span className="text-base sm:text-lg font-black font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>

          {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        <div className="text-center text-[10px] font-bold text-slate-400 uppercase pt-2">
            {customFooter || 'ORIGINAL CUSTOMER TAX RECEIPT • RETAIN FOR WARRANTY'}
          </div>
          <div className="pt-2.5 flex flex-col items-center justify-center">
            <ReceiptQrCodeSection data={data} darkBg={true} size={42} />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 8. INDIGO TECH (Cyber Digital Slip, QR Matrix, Metadata Badges)            */
  /* -------------------------------------------------------------------------- */
  if (template === 'indigo-tech') {
    return (
      <div className={`w-full bg-slate-950 rounded-2xl p-5 sm:p-6 border border-indigo-500/40 shadow-xl ${theme.fontFamily} text-slate-100 text-xs`} style={paperStyle}>
        {/* Top Cyber Tech Banner */}
        <div className="pb-3 border-b border-indigo-500/30" style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[9px] tracking-widest uppercase font-bold px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-indigo-500/40 bg-slate-900 p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base font-bold text-white tracking-wide font-sans break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h3>
              )}
              {businessDescription && (
                <p className="text-xs text-indigo-200/80 italic mt-0.5 text-center">{businessDescription}</p>
              )}
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono text-center">
                TX_HASH: 0x8F2A...{receiptNumber.slice(-4)}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Metrics Bar */}
        <div className="grid grid-cols-3 gap-1.5 my-3 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-center text-[10px]">
          <div>
            <span className="text-slate-400 block text-[8px]">ITEMS</span>
            <span className="font-bold text-cyan-300">{items.length} Units</span>
          </div>
          <div className="border-x border-indigo-500/20">
            <span className="text-slate-400 block text-[8px]">VERIFICATION</span>
            <span className="font-bold text-emerald-400">100% VALID</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[8px]">GATEWAY</span>
            <span className="font-bold text-white">{paymentMethod}</span>
          </div>
        </div>

        {/* Tech Item Rows with Chips */}
        <div className="space-y-2 py-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-lg bg-slate-900 border border-indigo-500/20 flex justify-between items-center"
            >
              <div>
                <span className="font-sans font-bold text-white block text-xs">{item.name}</span>
                <span className="text-[9px] text-slate-400">
                  Qty: {item.quantity} • Price: {formatCurrency(item.unitPrice, currency)}
                </span>
              </div>
              <span className="font-mono font-bold text-cyan-300">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Total Box */}
        <div className="mt-3 p-3 rounded-xl bg-indigo-600 text-white flex justify-between items-center shadow-lg shadow-indigo-600/30" style={(totalStyle.background || totalStyle.backgroundColor) ? totalStyle : undefined}>
          <span className="font-bold text-xs uppercase tracking-wider font-sans">NET TOTAL:</span>
          <span className="text-base font-black font-mono">{formatCurrency(total, currency)}</span>
        </div>

        <div className="text-center text-[9px] text-slate-400 pt-3 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Authenticated Digital Invoice</span>
        </div>
        <div className="pt-2.5 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} darkBg={true} size={42} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 9. CHARCOAL & AMBER (Artisan Bistro Docket, Perforated Teeth, Order Badge) */
  /* -------------------------------------------------------------------------- */
  if (template === 'charcoal-amber') {
    return (
      <div className={`w-full bg-[#f8f5ee] dark:bg-stone-900 rounded-2xl border-2 border-stone-300 dark:border-stone-700 shadow-sm ${theme.fontFamily} text-stone-900 dark:text-stone-100 overflow-hidden`} style={paperStyle}>
        {/* Header */}
        <div className="bg-stone-900 text-amber-300 p-3.5 border-b-2 border-dashed border-stone-600" style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-amber-500/40 bg-stone-950 p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base font-bold text-white uppercase tracking-tight break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h3>
              )}
              {businessDescription && (
                <p className="text-[10px] text-amber-200/80 italic text-center">{businessDescription}</p>
              )}
              {address && (
                <p className="text-[10px] text-stone-400 text-center" style={headerDescStyle}>{address}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex justify-between text-xs text-stone-500 pb-2 border-b border-stone-200 dark:border-stone-800">
            <span>Date: {formattedDate}</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">TABLE 04</span>
          </div>

          {/* Dot Leader Items */}
          <div className="space-y-2 text-xs">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-baseline">
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {item.quantity}× {item.name}
                </span>
                <span className="flex-1 mx-2 border-b border-dotted border-stone-400/60 dark:border-stone-600" />
                <span className="font-mono font-bold text-stone-900 dark:text-white">
                  {formatCurrency(item.subtotal, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Amber Total & Artisan Stamp */}
          <div className="pt-3 border-t-2 border-stone-300 dark:border-stone-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">TOTAL DUE:</span>
              <span className="text-base sm:text-lg font-black font-mono text-stone-900 dark:text-white">
                {formatCurrency(total, currency)}
              </span>
            </div>

            <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-600 text-amber-700 dark:text-amber-400 flex flex-col items-center justify-center text-center p-1 rotate-[-6deg] bg-amber-500/10">
              <span className="text-[7px] font-black uppercase leading-tight">FRESH</span>
              <span className="text-[6px] font-bold">★ THANK YOU ★</span>
            </div>
          </div>
          <div className="pt-2.5 flex flex-col items-center justify-center">
            <ReceiptQrCodeSection data={data} darkBg={true} size={42} />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 10. OCEAN PACIFIC (Wave Marine Header, Floating Card, Clean Zebra Table)   */
  /* -------------------------------------------------------------------------- */
  if (template === 'ocean-breeze') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-cyan-200 dark:border-cyan-800 shadow-md ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        {/* Ocean Wave Gradient Header */}
        <div className="bg-gradient-to-r from-cyan-950 via-teal-900 to-cyan-950 p-4 sm:p-5 text-white" style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-cyan-400/40 bg-slate-950 p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base sm:text-lg font-bold tracking-tight break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h3>
              )}
              {businessDescription && (
                <p className="text-xs text-cyan-200/80 italic mt-0.5 text-center">{businessDescription}</p>
              )}
              <div className="mt-0.5 flex justify-center">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-400/40">
                  #{receiptNumber}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Customer: <strong>{customerName || 'Standard Client'}</strong></span>
            <span>{formattedDate}</span>
          </div>

          {/* Zebra Striped Marine Table */}
          <div className="rounded-xl overflow-hidden border border-cyan-100 dark:border-cyan-900/40 text-xs">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex justify-between items-center p-2.5 ${
                  idx % 2 === 0 ? 'bg-cyan-50/40 dark:bg-cyan-950/20' : 'bg-transparent'
                }`}
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                  <span className="text-slate-400 ml-2 text-[11px]">× {item.quantity}</span>
                </div>
                <span className="font-mono font-bold text-cyan-800 dark:text-cyan-300">
                  {formatCurrency(item.subtotal, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Oceanic Total Banner */}
          <div className="mt-3 p-3 rounded-xl bg-cyan-600 text-white flex justify-between items-center shadow-md shadow-cyan-600/20" style={(totalStyle.background || totalStyle.backgroundColor) ? totalStyle : undefined}>
            <span className="font-bold text-xs uppercase tracking-wider">TOTAL SETTLEMENT</span>
            <span className="text-base sm:text-lg font-black font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>

          {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        <div className="text-center text-[10px] text-slate-400 pt-1">
            {customFooter || 'Smooth sailing & thank you for your patronage!'}
          </div>
          <div className="pt-2.5 flex flex-col items-center justify-center">
            <ReceiptQrCodeSection data={data} darkBg={true} size={42} />
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 11. MONOCHROME STUDIO (Swiss Brutalism, Massive Typography, Sharp Borders)  */
  /* -------------------------------------------------------------------------- */
  if (template === 'monochrome-pro') {
    return (
      <div className={`w-full bg-white dark:bg-black rounded-none border-4 border-black dark:border-white p-5 sm:p-7 ${theme.fontFamily} text-black dark:text-white`} style={paperStyle}>
        {/* Massive Swiss Title */}
        <div className={`border-b-4 border-black dark:border-white pb-3 mb-4 ${isCustomHeader ? 'p-3.5' : ''}`} style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-xs sm:text-sm font-black uppercase tracking-widest px-3.5 py-1 inline-block border-2 border-current shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-none border-2 border-black dark:border-white bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h3>
              )}
              {businessDescription && (
                <p className="text-[10px] italic mt-0.5 text-center">{businessDescription}</p>
              )}
              <span className="text-[10px] font-mono font-bold block mt-0.5 text-center">NO. {receiptNumber} • {formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Stark Item Grid */}
        <div className="border-b-2 border-black dark:border-white pb-3 space-y-2 text-xs">
          <div className="flex justify-between font-black uppercase text-[10px] tracking-wider pb-1">
            <span>DESCRIPTION</span>
            <span>QTY</span>
            <span className="text-right">TOTAL</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-baseline font-mono text-xs">
              <span className="font-sans font-bold w-1/2 truncate">{item.name}</span>
              <span className="text-center w-1/4 font-bold">{item.quantity}</span>
              <span className="text-right w-1/4 font-bold">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Massive Total Block */}
        <div className="my-4 py-3 border-b-4 border-black dark:border-white flex justify-between items-baseline">
          <span className="text-xs font-black uppercase tracking-widest">TOTAL AMOUNT:</span>
          <span className="text-xl sm:text-2xl font-black font-mono">
            {formatCurrency(total, currency)}
          </span>
        </div>

        {/* Swiss Barcode Block */}
        <div className="flex justify-between items-center text-[10px] font-mono pt-1">
          <span>PAID VIA {paymentMethod.toUpperCase()}</span>
          <div className="tracking-[3px] font-bold select-none text-xs">
            ||| | || |||| | ||| |
          </div>
        </div>
        <div className="mt-3 pt-2 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} darkBg={true} size={44} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 12. BURGUNDY PRESTIGE (Luxury French Salon Ledger, Ornate Flourishes)      */
  /* -------------------------------------------------------------------------- */
  if (template === 'burgundy-prestige') {
    return (
      <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border-2 border-rose-900/60 shadow-lg ${theme.fontFamily} text-slate-900 dark:text-slate-100 relative`} style={paperStyle}>
        <div className={`pb-4 border-b border-rose-900/30 ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-0.5 rounded-full inline-block font-serif shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-rose-900/40 bg-white p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h2 className="text-lg sm:text-xl font-bold italic tracking-wide text-rose-950 dark:text-rose-300 break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h2>
              )}
              {businessDescription && (
                <p className="text-xs font-sans text-rose-800/80 italic mt-0.5 text-center">{businessDescription}</p>
              )}
              {phone && (
                <p className="text-xs font-sans text-slate-500 mt-0.5 text-center" style={headerDescStyle}>
                  Tel: {phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs font-sans py-3 border-b border-rose-100 dark:border-rose-900/40 text-slate-600 dark:text-slate-400">
          <span>Pour: <strong className="font-serif italic text-rose-900 dark:text-rose-200">{customerName || 'Distinguished Guest'}</strong></span>
          <span>Bordereau No. {receiptNumber}</span>
        </div>

        <div className="py-3 space-y-2 text-xs">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-baseline">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                <span className="text-[11px] font-sans text-slate-400 ml-2">× {item.quantity}</span>
              </div>
              <span className="font-mono font-bold text-rose-900 dark:text-rose-300">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t-2 border-rose-900/40 space-y-2">
          <div className="flex justify-between items-center p-3 rounded-xl bg-rose-950 text-white shadow-md">
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-rose-200">
              MONTANT TOTAL
            </span>
            <span className="text-base sm:text-lg font-black font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>

        <div className="mt-4 text-center text-xs italic text-rose-900/80 dark:text-rose-400 pt-2 border-t border-rose-100 dark:border-rose-900/40">
          « Avec nos remerciements les plus chaleureux »
        </div>
        <div className="mt-2.5 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={44} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 13. SKYLINE MODERN (Floating Fintech Card, Capsule Elements, Borderless)  */
  /* -------------------------------------------------------------------------- */
  if (template === 'slate-borderless') {
    return (
      <div className={`w-full bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-5 sm:p-6 shadow-md ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        {/* Sky App Floating Header */}
        <div className={`pb-3 border-b border-sky-200/60 dark:border-slate-700 ${isCustomHeader ? 'p-3.5 rounded-2xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo ? (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-2xl border border-sky-200 dark:border-slate-700 bg-white p-0.5" />
              </div>
            ) : cleanStoreName ? (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 font-black text-xs">
                  {cleanStoreName.slice(0, 2).toUpperCase()}
                </div>
              </div>
            ) : null}
            <div className={`text-center ${logo ? 'px-12 sm:px-14' : cleanStoreName ? 'px-10 sm:px-12' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h3>
              )}
              {businessDescription && (
                <p className="text-xs text-sky-800/80 italic mt-0.5 text-center">{businessDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Floating Capsule Item Cards */}
        <div className="space-y-1.5 py-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 shadow-xs border border-slate-100 dark:border-slate-700 text-xs"
            >
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                <span className="text-slate-400 text-[11px] ml-2">Qty {item.quantity}</span>
              </div>
              <span className="font-bold text-sky-700 dark:text-sky-300 font-mono">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Floating Fintech Total Banner */}
        <div className="mt-2 p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white flex justify-between items-center shadow-lg shadow-sky-600/25">
          <span className="font-bold text-xs uppercase tracking-wider">TOTAL AMOUNT</span>
          <span className="text-base sm:text-lg font-black font-mono">
            {formatCurrency(total, currency)}
          </span>
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>Ref: #{receiptNumber}</span>
          <span>{formattedDate}</span>
        </div>
        <div className="pt-2.5 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={42} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 14. VINTAGE KRAFT (1950s Aged Typewriter Ledger, Sepia Typography)        */
  /* -------------------------------------------------------------------------- */
  if (template === 'retro-kraft') {
    return (
      <div className={`w-full bg-[#f4ebd0] dark:bg-[#251e18] rounded-2xl p-5 sm:p-7 border-2 border-[#8c6d58] shadow-sm ${theme.fontFamily} text-[#3e2723] dark:text-[#f4ebd0] relative overflow-hidden`} style={paperStyle}>
        <div className={`pb-3 border-b-2 border-[#8c6d58] ${isCustomHeader ? 'p-3.5 rounded-xl shadow-xs' : ''}`} style={headerStyle}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-0.5 rounded-sm inline-block shadow-xs" style={receiptBadgeStyle}>
              {customTheme?.badgeText || 'RECEIPT'}
            </span>
          </div>
          <div className="relative flex items-center justify-center min-h-[44px]">
            {logo && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-sm border border-[#8c6d58] bg-[#f4ebd0] p-0.5" />
              </div>
            )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h2 className="text-base sm:text-lg font-bold uppercase tracking-widest break-words leading-tight text-center" style={headerNameStyle}>{cleanStoreName}</h2>
              )}
              {businessDescription && (
                <p className="text-[10px] font-mono text-[#5d4037] dark:text-[#d7ccc8] mt-0.5 text-center" style={headerDescStyle}>
                  {businessDescription}
                </p>
              )}
              <div className="text-[10px] font-mono text-[#795548] dark:text-[#bcaaa4] mt-0.5 text-center">
                RECORD NO. {receiptNumber} • {formattedDate}
              </div>
            </div>
          </div>
        </div>

        <div className="py-3 font-mono text-xs border-b border-[#8c6d58] space-y-2">
          <div className="flex justify-between font-bold text-[#5d4037] dark:text-[#d7ccc8] text-[10px] uppercase border-b border-dashed border-[#8c6d58] pb-1">
            <span>PARTICULARS</span>
            <span>QTY</span>
            <span>PRICE</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="w-1/2 truncate font-bold">{item.name}</span>
              <span className="w-1/4 text-center">{item.quantity}</span>
              <span className="w-1/4 text-right font-bold">{formatCurrency(item.subtotal, currency)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 font-mono space-y-1.5 text-xs text-right">
          <div className="flex justify-between text-[#5d4037] dark:text-[#d7ccc8]">
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t-2 border-b-2 border-[#8c6d58] py-1.5 text-[#3e2723] dark:text-[#f4ebd0]">
            <span>TOTAL AMOUNT:</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        <div className="mt-4 pt-3 border-t border-[#8c6d58] flex justify-between items-end text-[10px] font-mono text-[#5d4037] dark:text-[#d7ccc8]">
          <span>{customFooter || 'Goods once sold are gratefully acknowledged.'}</span>
          <div className="text-center">
            <div className="w-24 border-b border-[#5d4037] dark:border-[#d7ccc8] mb-0.5" />
            <span>Checked by Clerk</span>
          </div>
        </div>
        <div className="pt-2 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={42} />
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* 15. MODERN SLATE (Original Clean Contemporary Layout with Emerald Banner)  */
  /* -------------------------------------------------------------------------- */
  return (
    <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${theme.fontFamily} text-slate-900 dark:text-slate-100`} style={paperStyle}>
        {/* Modern Slate Header Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5" style={isCustomHeader ? headerStyle : undefined}>
        <div className="text-center pb-1">
          <span className="text-[10px] uppercase tracking-widest font-extrabold px-3 py-0.5 rounded-full inline-block shadow-xs" style={receiptBadgeStyle}>
            {effectiveBadgeText}
          </span>
        </div>
        <div className="relative flex items-center justify-center min-h-[44px]">
          {logo && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <img src={logo} alt="Logo" className="max-h-12 w-auto max-w-[90px] sm:max-w-[110px] object-contain rounded-lg border border-slate-700 bg-white p-0.5" />
            </div>
          )}
            <div className={`text-center ${logo ? 'px-14 sm:px-16' : 'px-2'}`}>
              {cleanStoreName && (
                <h3 className="text-base sm:text-lg font-extrabold text-white break-words leading-tight text-center" style={headerNameStyle}>
                  {cleanStoreName}
                </h3>
              )}
              {businessDescription && (
                <p className="text-xs italic mt-0.5 opacity-90 text-center" style={headerDescStyle}>{businessDescription}</p>
              )}
              {address && (
                <p className="text-xs text-slate-400 mt-0.5 text-center" style={headerAddressStyle}>{address}</p>
              )}
            </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          <span>{isInvoice ? 'Invoice:' : 'Receipt:'} #{receiptNumber}</span>
          <span>{formattedDate}</span>
        </div>

        {(customerName || customerPhone || customerEmail || customerAddress) && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {isInvoice ? 'INVOICE TO:' : 'CUSTOMER:'} {customerName || (isInvoice ? 'Valued Client' : 'General Customer')}
            </div>
            {customerPhone && <div className="text-slate-600 dark:text-slate-400 text-[11px]">Phone: {customerPhone}</div>}
            {customerEmail && <div className="text-slate-600 dark:text-slate-400 text-[11px]">Email: {customerEmail}</div>}
            {customerAddress && <div className="text-slate-600 dark:text-slate-400 text-[11px]">Address: {customerAddress}</div>}
          </div>
        )}

        {/* Items Table */}
        <div className="space-y-2 py-1 text-xs">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between font-medium text-slate-700 dark:text-slate-200">
              <div>
                <span>{item.name}</span>
                <span className="text-slate-400 ml-2 text-[11px]">× {item.quantity}</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {formatCurrency(item.subtotal, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Emerald / Custom Accent Total Banner */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <div
            className="flex items-center justify-between p-3 rounded-xl text-white shadow-xs"
            style={totalStyle}
          >
            <span className="font-bold text-xs uppercase tracking-wide">TOTAL AMOUNT</span>
            <span className="font-extrabold text-base sm:text-lg font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
            <span>Payment: {paymentMethod}</span>
            <span>Balance: {formatCurrency(0, currency)}</span>
          </div>
        </div>

        {renderSupplementaryInfo(amountInWords, notes, balance, currency, nonReturnable, nonRefundable)}
        {signature && (
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <div className="flex flex-col items-center">
              <img src={signature} alt="Authorized Signature" className="max-h-9 w-auto max-w-[110px] object-contain mb-0.5" />
              <div className="w-24 border-b border-slate-300 dark:border-slate-700" />
              <span className="text-[9px] text-slate-400 mt-0.5">Authorized Signature</span>
            </div>
          </div>
        )}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {customFooter || 'Thank you for your business! Please come again.'}
        </div>
        <div className="pt-2.5 flex flex-col items-center justify-center">
          <ReceiptQrCodeSection data={data} size={44} />
        </div>
      </div>
    </div>
  );
};
