import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Receipt, ReceiptTemplateId, TemplateCustomization, BusinessProfile } from '../types';
import { formatCurrency, formatDateTime } from '../utils/currencies';
import { getTemplateConfig } from '../utils/templates';
import { resolveEffectiveTheme } from '../utils/colors';
import { generateReceiptQrDataUrl, generateVerificationHash } from '../utils/qrCode';
import { StorageService } from './storage';
import { saveJsPdf, shareContent, SaveFileResult } from './fileSaver';
import { ReceiptLayoutRenderer } from '../components/ReceiptLayoutRenderer';

/**
 * Resolves effective business profile by overlaying latest profile onto snapshot
 * so updated business information (name, address, phone, logo, signature, etc.) always reflects on PDFs.
 */
export function resolveEffectiveBusinessProfile(receipt: Receipt): BusinessProfile {
  const latest = StorageService.getProfile();
  const snapshot = receipt.businessSnapshot || (receipt as any).businessProfile || {};

  const cleanName = (val?: string) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === 'business name') return '';
    return trimmed;
  };

  const effectiveName = cleanName(latest.name) || cleanName(snapshot.name) || '';

  return {
    name: effectiveName,
    description: (latest.description !== undefined && latest.description !== null && latest.description.trim() !== '') ? latest.description : (snapshot.description || ''),
    logo: latest.logo || snapshot.logo,
    signature: latest.signature || snapshot.signature,
    phone: (latest.phone && latest.phone.trim() !== '') ? latest.phone : (snapshot.phone || ''),
    whatsapp: (latest.whatsapp && latest.whatsapp.trim() !== '') ? latest.whatsapp : (snapshot.whatsapp || ''),
    email: (latest.email && latest.email.trim() !== '') ? latest.email : (snapshot.email || ''),
    address: (latest.address && latest.address.trim() !== '') ? latest.address : (snapshot.address || ''),
    taxNumber: (latest.taxNumber && latest.taxNumber.trim() !== '') ? latest.taxNumber : (snapshot.taxNumber || ''),
    website: (latest.website && latest.website.trim() !== '') ? latest.website : (snapshot.website || ''),
    currency: snapshot.currency || latest.currency || 'UGX',
    language: latest.language || snapshot.language,
    customFooter: (latest.customFooter !== undefined && latest.customFooter !== null) ? latest.customFooter : (snapshot.customFooter || ''),
    accentColor: receipt.accentColor || snapshot.accentColor,
    headerBgColor: receipt.customTheme?.headerBgColor || snapshot.headerBgColor,
    headerTextColor: receipt.customTheme?.headerTextColor || snapshot.headerTextColor,
    totalBgColor: receipt.customTheme?.totalBgColor || snapshot.totalBgColor,
    totalTextColor: receipt.customTheme?.totalTextColor || snapshot.totalTextColor,
    paperBgColor: receipt.customTheme?.paperBgColor || snapshot.paperBgColor,
    bankName: (latest.bankName && latest.bankName.trim() !== '') ? latest.bankName : (snapshot.bankName || ''),
    bankAccountNumber: (latest.bankAccountNumber && latest.bankAccountNumber.trim() !== '') ? latest.bankAccountNumber : (snapshot.bankAccountNumber || ''),
    bankAccountName: (latest.bankAccountName && latest.bankAccountName.trim() !== '') ? latest.bankAccountName : (snapshot.bankAccountName || ''),
    bankBranchSwift: (latest.bankBranchSwift && latest.bankBranchSwift.trim() !== '') ? latest.bankBranchSwift : (snapshot.bankBranchSwift || ''),
    mobileMoneyMerchant: (latest.mobileMoneyMerchant && latest.mobileMoneyMerchant.trim() !== '') ? latest.mobileMoneyMerchant : (snapshot.mobileMoneyMerchant || ''),
    mobileMoneyName: (latest.mobileMoneyName && latest.mobileMoneyName.trim() !== '') ? latest.mobileMoneyName : (snapshot.mobileMoneyName || ''),
    defaultPaymentInstructions: (latest.defaultPaymentInstructions && latest.defaultPaymentInstructions.trim() !== '') ? latest.defaultPaymentInstructions : (snapshot.defaultPaymentInstructions || ''),
  };
}

/**
 * Loads an image URL (data URL or http URL) and converts it to a base64 Data URL for jsPDF.
 */
async function loadImgDataUrl(src?: string): Promise<string | undefined> {
  if (!src || typeof src !== 'string' || !src.trim()) return undefined;
  const clean = src.trim();
  if (clean.startsWith('data:image')) return clean;
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/')) {
    try {
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 200;
            canvas.height = img.naturalHeight || img.height || 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(undefined);
            }
          } catch {
            resolve(undefined);
          }
        };
        img.onerror = () => resolve(undefined);
        img.src = clean;
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * High quality vector PDF generator for Brivu
 * Supports 15 professional templates with selectable text, business logos, and offline QR verification
 */
export const PdfGenerator = {
  /**
   * Appends Financial details (Tax, Shipping, Balance Due/Change, Bank details, Amount in Words, and Custom Notes)
   */
  appendFinancialInfo(doc: jsPDF, receipt: Receipt, startY: number, margin: number, pageWidth: number): number {
    let y = startY;
    
    const isOwed = receipt.balance < 0;
    const hasChange = receipt.balance > 0;
    const currency = receipt.businessSnapshot.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const isCompact = receipt.template === 'compact';

    const totalsX = isCompact ? margin : Math.max(margin + 40, pageWidth - margin - 85);
    const rightMargin = isCompact ? pageWidth - margin : pageWidth - margin - 4;
    
    y += 2;

    // Tax / VAT row
    if (receipt.taxAmount && receipt.taxAmount > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tax / VAT (${receipt.taxRate || 0}%):`, totalsX, y);
      doc.text(`+${formatCurrency(receipt.taxAmount, currency)}`, rightMargin, y, { align: 'right' });
      y += 5;
    }

    // Shipping fee row
    if (receipt.shippingFee && receipt.shippingFee > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Shipping / Delivery:', totalsX, y);
      doc.text(`+${formatCurrency(receipt.shippingFee, currency)}`, rightMargin, y, { align: 'right' });
      y += 5;
    }
    
    if (isOwed || hasChange) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      if (isOwed) {
        doc.setTextColor(217, 119, 6); // amber-600
        doc.text(isInvoice ? 'Balance Due to Pay:' : 'Balance Due:', totalsX, y);
        doc.text(formatCurrency(Math.abs(receipt.balance), currency), rightMargin, y, { align: 'right' });
      } else {
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text('Change:', totalsX, y);
        doc.text(formatCurrency(Math.abs(receipt.balance), currency), rightMargin, y, { align: 'right' });
      }
      y += 6;
    }
    
    if (receipt.amountInWords) {
      y += 1.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(isInvoice ? 'Amount in Words:' : 'Amount Paid in Words:', margin, y);
      doc.setFont('helvetica', 'italic');
      const wordsLines = doc.splitTextToSize(receipt.amountInWords.toUpperCase(), pageWidth - margin * 2 - 38);
      doc.text(wordsLines, margin + 38, y);
      y += wordsLines.length * 4.5 + 2;
    }

    // Bank Details on Invoice
    if (receipt.bankDetails) {
      y += 1.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text('Payment / Bank Details:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const bankLines = doc.splitTextToSize(receipt.bankDetails.trim(), pageWidth - margin * 2 - 42);
      doc.text(bankLines, margin + 42, y);
      y += bankLines.length * 4.5 + 2;
    }

    const hasThankYouInNotes = receipt.notes && receipt.notes.toLowerCase().includes('thank');
    // If user entered a separate custom note without "thank", print it with "Notes:" prefix on the left
    if (receipt.notes && !hasThankYouInNotes) {
      y += 1.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Notes:', margin, y);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(receipt.notes.trim(), pageWidth - margin * 2 - 15);
      doc.text(notesLines, margin + 15, y);
      y += notesLines.length * 4.5 + 2;
    }

    return y;
  },

  /**
   * Appends Signature Section on TOP of Thank You message
   */
  appendSignatureBlock(
    doc: jsPDF,
    receipt: Receipt,
    startY: number,
    margin: number,
    pageWidth: number,
    align: 'right' | 'center' = 'right'
  ): number {
    let y = startY;
    const business = receipt.businessSnapshot;
    const hasSigImage = Boolean(business.signature && business.signature.startsWith('data:image'));

    y += 3;
    const sigW = 44;
    const sigH = 14;
    const lineW = 54;
    const sigX = align === 'center' ? (pageWidth - sigW) / 2 : pageWidth - margin - sigW;
    const lineX = align === 'center' ? (pageWidth - lineW) / 2 : pageWidth - margin - lineW;

    if (hasSigImage) {
      try {
        let sigFormat = 'PNG';
        if (business.signature!.includes('image/jpeg') || business.signature!.includes('image/jpg')) sigFormat = 'JPEG';
        doc.addImage(business.signature!, sigFormat, sigX, y, sigW, sigH);
        y += sigH + 1;
      } catch (e) {
        console.warn('Could not add signature image to PDF:', e);
        y += 6;
      }
    } else {
      y += 6;
    }

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(lineX, y, lineX + lineW, y);
    y += 4;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', lineX + lineW / 2, y, { align: 'center' });
    y += 5;

    return y;
  },

  /**
   * Appends Thank You message and return/refund policies below the signature
   */
  appendThankYouAndTerms(
    doc: jsPDF,
    receipt: Receipt,
    startY: number,
    margin: number,
    pageWidth: number
  ): number {
    let y = startY;
    const hasThankYouInNotes = receipt.notes && receipt.notes.toLowerCase().includes('thank');
    const thankYouText = hasThankYouInNotes 
      ? receipt.notes!.trim() 
      : (!receipt.notes ? 'Thank you' : null);

    const showNonReturnable = receipt.nonReturnable === true || (receipt.nonReturnable === undefined && !receipt.nonRefundable);
    const showNonRefundable = Boolean(receipt.nonRefundable);

    if (thankYouText || showNonReturnable || showNonRefundable) {
      y += 2;

      // "Thank you": centered in the middle of the page between left and right
      if (thankYouText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        const thankLines = doc.splitTextToSize(thankYouText, pageWidth - margin * 2);
        doc.text(thankLines, pageWidth / 2, y, { align: 'center' });
        y += thankLines.length * 4.5 + 1;
      }
      
      if (showNonReturnable) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Goods once sold are not returnable.', pageWidth / 2, y, { align: 'center' });
        y += 4;
      }

      if (showNonRefundable) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Money paid are not refundable.', pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
    }

    return y;
  },

  /**
   * Appends Centered QR Code at the bottom of the receipt
   */
  async appendBottomCenteredQrCode(
    doc: jsPDF,
    receipt: Receipt,
    startY: number,
    pageWidth: number,
    size: number = 22
  ): Promise<number> {
    const qrX = (pageWidth - size) / 2;
    const qrY = startY + 2;
    return await this.appendQrCodeToPdf(doc, receipt, qrX, qrY, size, true);
  },

  async appendQrCodeToPdf(
    doc: jsPDF,
    receipt: Receipt,
    x: number,
    y: number,
    size: number = 18,
    withCard: boolean = true
  ): Promise<number> {
    try {
      const qrDataUrl = await generateReceiptQrDataUrl(receipt, 240);
      if (qrDataUrl) {
        if (withCard) {
          // White border card behind QR code
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x - 1, y - 1, size + 2, size + 2, 1, 1, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(x - 1, y - 1, size + 2, size + 2, 1, 1, 'S');
        }

        doc.addImage(qrDataUrl, 'PNG', x, y, size, size);

        return y + size + 2;
      }
    } catch (e) {
      console.warn('Could not append QR code to PDF:', e);
    }
    return y;
  },

  /**
   * High fidelity DOM-to-PDF rendering matching the exact UI template design
   */
  async captureReceiptElementAsPdf(receipt: Receipt): Promise<jsPDF | null> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    let targetElement: HTMLElement | null = null;
    let tempContainer: HTMLElement | null = null;
    let root: any = null;

    try {
      const existingNode = document.getElementById('receipt-preview-render-node');
      const isMatchingPreview =
        existingNode &&
        (existingNode.getAttribute('data-receipt-id') === receipt.id ||
          existingNode.getAttribute('data-receipt-number') === receipt.receiptNumber);

      if (isMatchingPreview) {
        targetElement = existingNode;
      } else {
        // Build offscreen high-resolution container
        tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '680px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.style.zIndex = '-9999';
        tempContainer.style.opacity = '1';
        document.body.appendChild(tempContainer);

        const resolvedBiz = resolveEffectiveBusinessProfile(receipt);
        const isInvoice = receipt.documentType === 'invoice';
        const currency = resolvedBiz.currency || receipt.currency || 'UGX';

        const renderData = {
          storeName: resolvedBiz.name || '',
          businessDescription: resolvedBiz.description || '',
          phone: resolvedBiz.phone || '',
          email: resolvedBiz.email || '',
          address: resolvedBiz.address || '',
          taxNumber: resolvedBiz.taxNumber || '',
          logo: resolvedBiz.logo,
          signature: resolvedBiz.signature,
          customFooter: resolvedBiz.customFooter || '',
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
        };

        root = createRoot(tempContainer);
        root.render(React.createElement(ReceiptLayoutRenderer, { data: renderData }));

        // Allow layout and images to paint
        await new Promise((r) => setTimeout(r, 120));
        targetElement = (tempContainer.firstElementChild as HTMLElement) || tempContainer;
      }

      if (!targetElement) return null;

      const canvas = await html2canvas(targetElement, {
        scale: 2.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const isCompact = receipt.template === 'compact';
      const pdfWidth = isCompact ? 80 : 210;
      const margin = isCompact ? 3 : 12;
      const usableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png', 1.0);

      if (isCompact) {
        const compactDoc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, Math.max(160, imgHeight + margin * 2)],
        });
        compactDoc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight, undefined, 'FAST');
        return compactDoc;
      } else {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        doc.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight, undefined, 'FAST');
        return doc;
      }
    } catch (err) {
      console.warn('html2canvas render note, using vector fallback:', err);
      return null;
    } finally {
      if (root) {
        try {
          root.unmount();
        } catch {}
      }
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  },

  /**
   * Generates a jsPDF instance for a given receipt based on its template
   */
  async createPdfDoc(receipt: Receipt): Promise<jsPDF> {
    const resolvedBiz = resolveEffectiveBusinessProfile(receipt);

    // Pre-load logo and signature as base64 Data URLs so they render reliably on PDFs
    const [logoDataUrl, sigDataUrl] = await Promise.all([
      loadImgDataUrl(resolvedBiz.logo),
      loadImgDataUrl(resolvedBiz.signature),
    ]);

    const enrichedBusiness: BusinessProfile = {
      ...resolvedBiz,
      logo: logoDataUrl || resolvedBiz.logo,
      signature: sigDataUrl || resolvedBiz.signature,
    };

    const enrichedReceipt: Receipt = {
      ...receipt,
      businessSnapshot: enrichedBusiness,
    };

    // 1. Try pristine high-fidelity DOM snapshot matching the exact screen template
    try {
      const fidelityPdf = await this.captureReceiptElementAsPdf(enrichedReceipt);
      if (fidelityPdf) {
        return fidelityPdf;
      }
    } catch (err) {
      console.warn('DOM capture note, falling back to direct vector generator:', err);
    }

    // 2. Fallback: Native vector jsPDF generator
    const template: ReceiptTemplateId = enrichedReceipt.template || 'modern';

    if (template === 'compact') {
      return this.renderCompactTemplate(enrichedReceipt);
    } else if (template === 'classic') {
      return this.renderClassicTemplate(enrichedReceipt);
    } else if (template === 'minimal') {
      return this.renderMinimalTemplate(enrichedReceipt);
    } else if (template === 'business') {
      return this.renderBusinessTemplate(enrichedReceipt);
    } else {
      return this.renderModernTemplate(enrichedReceipt);
    }
  },

  /**
   * Renders the Modern Template & Themed Variants (Clean contemporary layout with branded headers)
   */
  async renderModernTemplate(receipt: Receipt): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const business = receipt.businessSnapshot;
    const currency = business.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const accentColor = receipt.accentColor;
    const savedCustom = StorageService.getCustomTemplate(receipt.template || 'modern');
    const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
    let effectiveBadge = receipt.customTheme?.badgeText || savedCustom?.badgeText || defaultBadge;
    if (isInvoice && effectiveBadge.toUpperCase() === 'RECEIPT') {
      effectiveBadge = 'INVOICE';
    }
    const customTheme: TemplateCustomization = {
      headerBgColor: receipt.customTheme?.headerBgColor || savedCustom?.headerBgColor,
      headerTextColor: receipt.customTheme?.headerTextColor || savedCustom?.headerTextColor,
      totalBgColor: receipt.customTheme?.totalBgColor || savedCustom?.totalBgColor,
      totalTextColor: receipt.customTheme?.totalTextColor || savedCustom?.totalTextColor,
      paperBgColor: receipt.customTheme?.paperBgColor || savedCustom?.paperBgColor,
      accentColor: receipt.customTheme?.accentColor || savedCustom?.accentColor || receipt.accentColor,
      fontFamily: receipt.customTheme?.fontFamily || savedCustom?.fontFamily,
      badgeText: effectiveBadge,
      badgeBgColor: receipt.customTheme?.badgeBgColor || savedCustom?.badgeBgColor,
      badgeTextColor: receipt.customTheme?.badgeTextColor || savedCustom?.badgeTextColor,
    };
    const theme = resolveEffectiveTheme(receipt.template || 'modern', accentColor, customTheme);

    // Page background if theme specifies
    if (theme.pdf.pageBg) {
      doc.setFillColor(theme.pdf.pageBg[0], theme.pdf.pageBg[1], theme.pdf.pageBg[2]);
      doc.rect(0, 0, 210, 297, 'F');
    }

    // Dimensions
    const pageWidth = 210;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    // Calculate required height with centered text
    const hasLogo = Boolean(business.logo && business.logo.startsWith('data:image'));
    const logoSize = hasLogo ? 15 : 0;
    // Symmetrical width to guarantee centered text never overlaps the left logo
    const maxTextWidth = hasLogo ? contentWidth - (logoSize + 8) * 2 : contentWidth - 14;
    const badgeText = customTheme?.badgeText || defaultBadge;

    const rawBizName = (business.name || '').trim();
    const hasBizName = rawBizName.length > 0 && rawBizName.toLowerCase() !== 'business name';
    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(13.5);
    const titleLines = hasBizName ? doc.splitTextToSize(rawBizName, maxTextWidth) : [];

    doc.setFont(theme.pdf.font, 'italic');
    doc.setFontSize(8);
    const descLines = business.description ? doc.splitTextToSize(business.description, maxTextWidth) : [];

    doc.setFont(theme.pdf.font, 'normal');
    doc.setFontSize(7.5);
    const contactLine = [business.phone, business.email].filter(Boolean).join('   •   ');
    const contactLines = contactLine ? doc.splitTextToSize(contactLine, maxTextWidth) : [];

    const addrLines = business.address ? doc.splitTextToSize(business.address, maxTextWidth) : [];

    // Calculate dynamic header height so all text fits comfortably
    let neededBannerHeight = 12; // Top padding & Badge text & spacing
    if (hasBizName && titleLines.length > 0) {
      neededBannerHeight += (titleLines.length - 1) * 5.0 + 4.0;
    }
    if (descLines.length > 0) neededBannerHeight += descLines.length * 4.0;
    if (contactLines.length > 0) neededBannerHeight += contactLines.length * 3.6;
    if (addrLines.length > 0) neededBannerHeight += addrLines.length * 3.6;
    if (hasLogo) {
      neededBannerHeight = Math.max(neededBannerHeight, logoSize + 12);
    }
    neededBannerHeight += 4; // Bottom padding

    const headerBannerHeight = Math.max(34, neededBannerHeight);

    // Header Background Bar (Themed)
    doc.setFillColor(theme.pdf.headerBg[0], theme.pdf.headerBg[1], theme.pdf.headerBg[2]);
    doc.rect(margin, y, contentWidth, headerBannerHeight, 'F');

    // 1. "RECEIPT" / "INVOICE" badge with snug background matching word size
    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(8);
    const badgeTextWidth = doc.getTextWidth(badgeText);
    const badgeW = badgeTextWidth + 6; // Snug padding matching the word size
    const badgeH = 4.2;
    const badgeX = (pageWidth - badgeW) / 2;
    const badgeY = y + 2.5;

    // Check contrast between headerBg and badgeBg
    let bBg = theme.pdf.badgeBg || [16, 185, 129];
    let bText = theme.pdf.badgeText || [255, 255, 255];
    if (bBg && theme.pdf.headerBg) {
      const diff = Math.abs(bBg[0] - theme.pdf.headerBg[0]) + Math.abs(bBg[1] - theme.pdf.headerBg[1]) + Math.abs(bBg[2] - theme.pdf.headerBg[2]);
      if (diff < 90) {
        if (receipt.template === 'modern' || !receipt.template) {
          bBg = [16, 185, 129];
          bText = [255, 255, 255];
        } else {
          bBg = [255, 255, 255];
          bText = [15, 23, 42];
        }
      }
    }

    doc.setFillColor(bBg[0], bBg[1], bBg[2]);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
    doc.setTextColor(bText[0], bText[1], bText[2]);
    doc.text(badgeText, pageWidth / 2, badgeY + 3.0, { align: 'center' });

    // 2. Business logo on the LEFT side where it was
    if (hasLogo) {
      try {
        let imageFormat = 'JPEG';
        if (business.logo!.includes('image/png')) imageFormat = 'PNG';
        else if (business.logo!.includes('image/webp')) imageFormat = 'WEBP';

        const logoX = margin + 4;
        const logoY = y + 4.5;
        doc.addImage(business.logo!, imageFormat, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    // 3. Centered Business Name - positioned safely below the badge with ample clearance
    let currentOffsetY = y + 12.0;
    if (hasBizName && titleLines.length > 0) {
      doc.setFont(theme.pdf.font, 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(theme.pdf.headerText[0], theme.pdf.headerText[1], theme.pdf.headerText[2]);
      doc.text(titleLines, pageWidth / 2, currentOffsetY, { align: 'center' });
      currentOffsetY += titleLines.length * 5.0;
    }

    // 4. Centered Business Description
    if (descLines.length > 0) {
      doc.setFont(theme.pdf.font, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(theme.pdf.subText[0], theme.pdf.subText[1], theme.pdf.subText[2]);
      doc.text(descLines, pageWidth / 2, currentOffsetY, { align: 'center' });
      currentOffsetY += descLines.length * 4.0;
    }

    // 5. Centered Business Contact subline
    if (contactLines.length > 0) {
      doc.setFont(theme.pdf.font, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(theme.pdf.subText[0], theme.pdf.subText[1], theme.pdf.subText[2]);
      doc.text(contactLines, pageWidth / 2, currentOffsetY, { align: 'center' });
      currentOffsetY += contactLines.length * 3.6;
    }

    // 6. Centered Address line
    if (addrLines.length > 0) {
      doc.setFont(theme.pdf.font, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(theme.pdf.subText[0], theme.pdf.subText[1], theme.pdf.subText[2]);
      doc.text(addrLines, pageWidth / 2, currentOffsetY, { align: 'center' });
    }

    y += headerBannerHeight + 7;

    // Info Strip: Customer (Invoice To / Received with thanks from) & Meta Info
    const custContactLines: string[] = [];
    if (receipt.customerPhone) custContactLines.push(`Phone: ${receipt.customerPhone}`);
    if (receipt.customerEmail) custContactLines.push(`Email: ${receipt.customerEmail}`);
    if (receipt.customerAddress) custContactLines.push(`Address: ${receipt.customerAddress}`);

    const extraLinesCount = custContactLines.length;
    const infoCardHeight = Math.max(26, 16 + extraLinesCount * 4.5);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, infoCardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, infoCardHeight, 2, 2, 'S');

    // Customer column
    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:', margin + 6, y + 6.5);

    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const defaultCust = isInvoice ? 'Valued Client' : 'General Customer (Walk-in)';
    const custNameLines = doc.splitTextToSize(receipt.customerName || defaultCust, 75);
    doc.text(custNameLines[0], margin + 6, y + 12);

    let custDetailY = y + 16.5;
    if (custContactLines.length > 0) {
      doc.setFont(theme.pdf.font, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      custContactLines.forEach((lineText) => {
        doc.text(lineText, margin + 6, custDetailY);
        custDetailY += 4.2;
      });
    }

    // Details column (Invoice No / Receipt No)
    const col2X = margin + 92;

    // Doc No (Row 1)
    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(isInvoice ? 'INVOICE NO:' : 'RECEIPT NO:', col2X, y + 6.5);
    doc.setFont(theme.pdf.font, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(receipt.receiptNumber, col2X + 22, y + 6.5);

    // Date & Time (Row 2)
    doc.setFont(theme.pdf.font, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${formatDateTime(receipt.createdAt)}`, col2X, y + 12);

    // Row 3: Due Date / Payment Info
    if (isInvoice) {
      const dueText = receipt.dueDate ? `Due Date: ${receipt.dueDate}` : `Terms: ${receipt.paymentTerms || 'Due on receipt'}`;
      doc.text(dueText, col2X, y + 17.5);
    } else {
      const statusNote = receipt.paymentStatus === 'paid' ? 'Paid' : receipt.paymentStatus === 'partial' ? 'Partial' : 'Pending';
      doc.text(`Payment: ${receipt.paymentMethod} (${statusNote})`, col2X, y + 17.5);
    }

    y += infoCardHeight + 7;

    // Items Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 9, pageWidth - margin, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(isInvoice ? 'ITEM DESCRIPTION' : 'PAID FOR', margin + 4, y + 6);
    doc.text('QTY', margin + 105, y + 6, { align: 'center' });
    doc.text('PRICE', margin + 140, y + 6, { align: 'right' });
    doc.text('AMOUNT', pageWidth - margin - 4, y + 6, { align: 'right' });

    y += 9;

    // Item Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    receipt.items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 8.5, 'F');
      }

      doc.setTextColor(15, 23, 42);
      const itemName = item.name.length > 50 ? item.name.substring(0, 50) + '...' : item.name;
      doc.text(itemName, margin + 4, y + 6);

      doc.setTextColor(71, 85, 105);
      doc.text(String(item.quantity), margin + 105, y + 6, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice, currency), margin + 140, y + 6, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(item.subtotal, currency), pageWidth - margin - 4, y + 6, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 8.5;

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
    });

    y += 6;

    // Subtotal & Totals Box
    const totalsX = margin + 100;
    const totalsW = contentWidth - 100;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);

    doc.text('Subtotal:', totalsX, y);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(receipt.subtotal, currency), pageWidth - margin - 4, y, { align: 'right' });
    y += 6;

    if (receipt.discountAmount > 0) {
      doc.setTextColor(225, 29, 72);
      doc.text('Discount:', totalsX, y);
      doc.text(`-${formatCurrency(receipt.discountAmount, currency)}`, pageWidth - margin - 4, y, { align: 'right' });
      y += 6;
    }

    doc.setFillColor(theme.pdf.totalBg[0], theme.pdf.totalBg[1], theme.pdf.totalBg[2]);
    doc.roundedRect(totalsX - 4, y, totalsW + 4, 12, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(isInvoice ? 'TOTAL DUE:' : 'GRAND TOTAL:', totalsX, y + 8);
    doc.text(formatCurrency(receipt.total, currency), pageWidth - margin - 4, y + 8, { align: 'right' });

    y += 18;

    if (!isInvoice || (receipt.amountPaid && receipt.amountPaid > 0)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Amount Paid (${receipt.paymentMethod || 'Bank'}):`, totalsX, y);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(receipt.amountPaid, currency), pageWidth - margin - 4, y, { align: 'right' });
      y += 6;
    }

    // 1. Financial info
    y = this.appendFinancialInfo(doc, receipt, y, margin, pageWidth);

    // 2. Signature section ON TOP of thank you message
    y = this.appendSignatureBlock(doc, receipt, y, margin, pageWidth, 'right');

    // 3. Centered Thank You message and terms
    y = this.appendThankYouAndTerms(doc, receipt, y, margin, pageWidth);

    // 4. Centered QR Code at bottom of receipt
    y = await this.appendBottomCenteredQrCode(doc, receipt, y, pageWidth, 22);

    // Bottom footer (only if user explicitly provided a custom footer)
    if (business.customFooter && business.customFooter.trim().length > 0 && !business.customFooter.includes('Please keep this receipt for warranty and returns')) {
      const footerY = Math.max(y + 6, 282);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(business.customFooter, pageWidth / 2, footerY, { align: 'center' });
    }

    return doc;
  },

  /**
   * Renders the Classic Template (Formal timeless design with traditional borders)
   */
  async renderClassicTemplate(receipt: Receipt): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const business = receipt.businessSnapshot;
    const currency = business.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const pageWidth = 210;
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    // Formal Top Header with Logo on the left and Centered Text
    const hasLogo = Boolean(business.logo && business.logo.startsWith('data:image'));
    const logoSize = hasLogo ? 16 : 0;
    const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
    let badgeText = receipt.customTheme?.badgeText || defaultBadge;
    if (isInvoice && badgeText.toUpperCase() === 'RECEIPT') badgeText = 'INVOICE';

    // 1. "RECEIPT" / "INVOICE" - centered on top with background badge matching word size
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    const formalBadgeW = doc.getTextWidth(badgeText) + 6;
    const formalBadgeH = 4.2;
    const formalBadgeX = (pageWidth - formalBadgeW) / 2;
    const formalBadgeY = y - 5;
    doc.setFillColor(30, 41, 59); // deep slate
    doc.roundedRect(formalBadgeX, formalBadgeY, formalBadgeW, formalBadgeH, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, pageWidth / 2, formalBadgeY + 3.0, { align: 'center' });

    // 2. Business logo on the LEFT side where it was
    if (hasLogo) {
      try {
        let imageFormat = 'JPEG';
        if (business.logo!.includes('image/png')) imageFormat = 'PNG';
        else if (business.logo!.includes('image/webp')) imageFormat = 'WEBP';
        const logoX = margin;
        const logoY = y - 1;
        doc.addImage(business.logo!, imageFormat, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    const startTextY = y;
    const maxTextW = hasLogo ? contentWidth - (logoSize + 8) * 2 : contentWidth - 10;

    // 3. Centered Business Name
    const rawBizName = (business.name || '').trim();
    const hasBizName = rawBizName.length > 0 && rawBizName.toLowerCase() !== 'business name';
    if (hasBizName) {
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      const formalTitleLines = doc.splitTextToSize(rawBizName, maxTextW);
      doc.text(formalTitleLines, pageWidth / 2, y + 5, { align: 'center' });
      y += Math.max(9, formalTitleLines.length * 6 + 1.5);
    }

    // 4. Centered Business Description
    if (business.description) {
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      const descLines = doc.splitTextToSize(business.description, maxTextW);
      doc.text(descLines, pageWidth / 2, y + 2, { align: 'center' });
      y += descLines.length * 4.5 + 1;
    }

    // 5. Centered Business Contact & Address
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    const contact = [business.address, business.phone, business.email].filter(Boolean).join('   •   ');
    if (contact) {
      const contactLines = doc.splitTextToSize(contact, maxTextW);
      doc.text(contactLines, pageWidth / 2, y + 2, { align: 'center' });
      y += contactLines.length * 4.5 + 1;
    }

    if (hasLogo) {
      y = Math.max(y, startTextY + logoSize + 4);
    }

    // Double rule divider
    y += 3;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 1.2, pageWidth - margin, y + 1.2);
    y += 7;

    // Metadata Box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${isInvoice ? 'Invoice No' : 'Receipt No'}: ${receipt.receiptNumber}`, margin, y);
    doc.text(`Date & Time: ${formatDateTime(receipt.createdAt)}`, pageWidth - margin, y, { align: 'right' });
    y += 6;

    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    if (isInvoice) {
      doc.text(`Due Date: ${receipt.dueDate || 'On Receipt'}`, margin, y);
      doc.text(`Terms: ${receipt.paymentTerms || 'Due on receipt'}`, pageWidth - margin, y, { align: 'right' });
    } else {
      doc.text(`Date & Time: ${formatDateTime(receipt.createdAt)}`, margin, y);
      doc.text(`Payment: ${receipt.paymentMethod}`, pageWidth - margin, y, { align: 'right' });
    }
    y += 6;

    const custPrefix = isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${custPrefix} ${receipt.customerName || (isInvoice ? 'Valued Client' : 'General Customer')}`, margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    if (receipt.customerPhone) {
      doc.text(`Phone: ${receipt.customerPhone}`, margin, y);
      y += 4.5;
    }
    if (receipt.customerEmail) {
      doc.text(`Email: ${receipt.customerEmail}`, margin, y);
      y += 4.5;
    }
    if (receipt.customerAddress) {
      doc.text(`Address: ${receipt.customerAddress}`, margin, y);
      y += 4.5;
    }

    y += 4;

    // Table Header
    doc.setLineWidth(0.4);
    doc.setDrawColor(60, 60, 60);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(isInvoice ? 'ITEM DESCRIPTION' : 'PAID FOR', margin, y);
    doc.text('QTY', margin + 110, y, { align: 'center' });
    doc.text('PRICE', margin + 140, y, { align: 'right' });
    doc.text('TOTAL', pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    receipt.items.forEach((item) => {
      doc.text(item.name, margin, y);
      doc.text(String(item.quantity), margin + 110, y, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice, currency), margin + 140, y, { align: 'right' });
      doc.text(formatCurrency(item.subtotal, currency), pageWidth - margin, y, { align: 'right' });
      y += 7;
    });

    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Totals
    const tX = pageWidth - margin - 80;
    doc.text('Subtotal:', tX, y);
    doc.text(formatCurrency(receipt.subtotal, currency), pageWidth - margin, y, { align: 'right' });
    y += 6;

    if (receipt.discountAmount > 0) {
      doc.text('Discount:', tX, y);
      doc.text(`-${formatCurrency(receipt.discountAmount, currency)}`, pageWidth - margin, y, { align: 'right' });
      y += 6;
    }

    doc.setDrawColor(40, 40, 40);
    doc.line(tX, y, pageWidth - margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(isInvoice ? 'TOTAL DUE:' : 'TOTAL DUE:', tX, y);
    doc.text(formatCurrency(receipt.total, currency), pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.line(tX, y + 1, pageWidth - margin, y + 1);
    doc.line(tX, y + 2, pageWidth - margin, y + 2);
    y += 8;

    if (!isInvoice || (receipt.amountPaid && receipt.amountPaid > 0)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Amount Paid (${receipt.paymentMethod || 'Bank'}):`, tX, y);
      doc.text(formatCurrency(receipt.amountPaid, currency), pageWidth - margin, y, { align: 'right' });
      y += 6;
    }

    // 1. Financial info
    y = this.appendFinancialInfo(doc, receipt, y, margin, pageWidth);

    // 2. Classic Signature Line & Footer ON TOP of thank you message
    y = this.appendSignatureBlock(doc, receipt, y, margin, pageWidth, 'right');

    // 3. Centered Thank you message
    y = this.appendThankYouAndTerms(doc, receipt, y, margin, pageWidth);

    // 4. Centered QR Code at bottom
    y = await this.appendBottomCenteredQrCode(doc, receipt, y, pageWidth, 22);

    if (business.customFooter && business.customFooter.trim().length > 0 && !business.customFooter.includes('Please keep this receipt for warranty and returns')) {
      doc.setFont('times', 'italic');
      doc.setFontSize(9.5);
      doc.text(business.customFooter, pageWidth / 2, Math.max(y + 6, 282), { align: 'center' });
    }

    return doc;
  },

  /**
   * Renders the Minimal Template (Airy modern Scandinavian typography)
   */
  async renderMinimalTemplate(receipt: Receipt): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const business = receipt.businessSnapshot;
    const currency = business.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const pageWidth = 210;
    const margin = 22;
    const contentWidth = pageWidth - margin * 2;
    let y = 22;

    // Minimal Header with Logo on the left and Centered Text
    const hasLogo = Boolean(business.logo && business.logo.startsWith('data:image'));
    const logoSize = hasLogo ? 15 : 0;
    const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
    let badgeText = receipt.customTheme?.badgeText || defaultBadge;
    if (isInvoice && badgeText.toUpperCase() === 'RECEIPT') badgeText = 'INVOICE';

    // 1. "RECEIPT" / "INVOICE" badge - centered on top with background matching word size
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const minBadgeW = doc.getTextWidth(badgeText) + 6;
    const minBadgeH = 4.2;
    const minBadgeX = (pageWidth - minBadgeW) / 2;
    const minBadgeY = y - 5;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(minBadgeX, minBadgeY, minBadgeW, minBadgeH, 1, 1, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(minBadgeX, minBadgeY, minBadgeW, minBadgeH, 1, 1, 'D');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(badgeText, pageWidth / 2, minBadgeY + 3.0, { align: 'center' });

    // 2. Business logo on the LEFT side where it was
    if (hasLogo) {
      try {
        let imageFormat = 'JPEG';
        if (business.logo!.includes('image/png')) imageFormat = 'PNG';
        else if (business.logo!.includes('image/webp')) imageFormat = 'WEBP';
        const logoX = margin;
        const logoY = y - 1;
        doc.addImage(business.logo!, imageFormat, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    const startTextY = y;
    const maxTextW = hasLogo ? contentWidth - (logoSize + 8) * 2 : contentWidth - 10;

    // 3. Centered Business Name
    const rawBizName = (business.name || '').trim();
    const hasBizName = rawBizName.length > 0 && rawBizName.toLowerCase() !== 'business name';
    if (hasBizName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      const minTitleLines = doc.splitTextToSize(rawBizName, maxTextW);
      doc.text(minTitleLines, pageWidth / 2, y + 5, { align: 'center' });
      y += Math.max(9, minTitleLines.length * 6 + 1.5);
    }

    // 4. Centered Business Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    if (business.description) {
      const minDescLines = doc.splitTextToSize(business.description, maxTextW);
      doc.text(minDescLines, pageWidth / 2, y + 2, { align: 'center' });
      y += minDescLines.length * 4 + 1;
    }

    // 5. Centered Business Address & Contacts
    const minContacts = [business.address, business.phone, business.email].filter(Boolean).join('   •   ');
    if (minContacts) {
      const contactLines = doc.splitTextToSize(minContacts, maxTextW);
      doc.text(contactLines, pageWidth / 2, y + 2, { align: 'center' });
      y += contactLines.length * 4 + 2;
    }

    if (hasLogo) {
      y = Math.max(y, startTextY + logoSize + 4);
    }

    y += 6;

    // Large Document Number Display
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`${isInvoice ? 'Invoice' : 'Receipt'} ${receipt.receiptNumber}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    const rightMeta = isInvoice && receipt.dueDate ? `Due: ${receipt.dueDate}` : formatDateTime(receipt.createdAt);
    doc.text(rightMeta, pageWidth - margin, y, { align: 'right' });
    y += 6;

    if (receipt.customerName || receipt.customerPhone || receipt.customerEmail || receipt.customerAddress) {
      const cLabel = isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`${cLabel} ${receipt.customerName || (isInvoice ? 'Valued Client' : 'Customer')}`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      if (receipt.customerPhone) {
        doc.text(`Phone: ${receipt.customerPhone}`, margin, y);
        y += 4.5;
      }
      if (receipt.customerEmail) {
        doc.text(`Email: ${receipt.customerEmail}`, margin, y);
        y += 4.5;
      }
      if (receipt.customerAddress) {
        doc.text(`Address: ${receipt.customerAddress}`, margin, y);
        y += 4.5;
      }
      y += 2;
    } else {
      y += 4;
    }

    // Hairline divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Minimal table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(isInvoice ? 'ITEM DESCRIPTION' : 'PAID FOR', margin, y);
    doc.text('QTY', margin + 110, y, { align: 'center' });
    doc.text('TOTAL', pageWidth - margin, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);

    receipt.items.forEach((item) => {
      doc.text(item.name, margin, y);
      doc.text(String(item.quantity), margin + 110, y, { align: 'center' });
      doc.text(formatCurrency(item.subtotal, currency), pageWidth - margin, y, { align: 'right' });
      y += 7;
    });

    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Clean Right-Aligned Summary
    const sumX = pageWidth - margin - 70;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Subtotal', sumX, y);
    doc.setTextColor(31, 41, 55);
    doc.text(formatCurrency(receipt.subtotal, currency), pageWidth - margin, y, { align: 'right' });
    y += 6;

    if (receipt.discountAmount > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text('Discount', sumX, y);
      doc.text(`-${formatCurrency(receipt.discountAmount, currency)}`, pageWidth - margin, y, { align: 'right' });
      y += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(isInvoice ? 'Total Due' : 'Total', sumX, y + 2);
    doc.text(formatCurrency(receipt.total, currency), pageWidth - margin, y + 2, { align: 'right' });
    y += 10;

    if (!isInvoice || (receipt.amountPaid && receipt.amountPaid > 0)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`Paid via ${receipt.paymentMethod || 'Bank'}`, sumX, y);
      doc.text(formatCurrency(receipt.amountPaid, currency), pageWidth - margin, y, { align: 'right' });
      y += 8;
    }

    // 1. Financial info
    y = this.appendFinancialInfo(doc, receipt, y, margin, pageWidth);

    // 2. Minimal Signature Block ON TOP of Thank you
    y = this.appendSignatureBlock(doc, receipt, y, margin, pageWidth, 'right');

    // 3. Centered Thank You message
    y = this.appendThankYouAndTerms(doc, receipt, y, margin, pageWidth);

    // 4. Centered QR Code at bottom
    y = await this.appendBottomCenteredQrCode(doc, receipt, y, pageWidth, 22);

    // Minimal footer
    if (business.customFooter && business.customFooter.trim().length > 0 && !business.customFooter.includes('Please keep this receipt for warranty and returns')) {
      doc.setFontSize(8.5);
      doc.text(business.customFooter, margin, Math.max(y + 6, 282));
    }

    return doc;
  },

  /**
   * Renders the Business Template (Corporate layout with TIN/VAT and formal tax details)
   */
  async renderBusinessTemplate(receipt: Receipt): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const business = receipt.businessSnapshot;
    const currency = business.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const accentColor = receipt.accentColor;
    const theme = resolveEffectiveTheme('business', accentColor);
    const pageWidth = 210;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    // Top Brand Bar (Themed) - full width
    const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
    let badgeText = receipt.customTheme?.badgeText || defaultBadge;
    if (isInvoice && badgeText.toUpperCase() === 'RECEIPT') badgeText = 'INVOICE';
    doc.setFillColor(theme.pdf.headerBg[0], theme.pdf.headerBg[1], theme.pdf.headerBg[2]);
    doc.rect(margin, y, contentWidth, 8, 'F');

    // 1. "RECEIPT" / "INVOICE" badge with background inside top brand bar matching word size
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const corpBadgeW = doc.getTextWidth(badgeText) + 6;
    const corpBadgeH = 4.2;
    const corpBadgeX = (pageWidth - corpBadgeW) / 2;
    const corpBadgeY = y + 1.9;
    doc.setFillColor(theme.pdf.badgeBg[0], theme.pdf.badgeBg[1], theme.pdf.badgeBg[2]);
    doc.roundedRect(corpBadgeX, corpBadgeY, corpBadgeW, corpBadgeH, 1, 1, 'F');
    doc.setTextColor(theme.pdf.badgeText[0], theme.pdf.badgeText[1], theme.pdf.badgeText[2]);
    doc.text(badgeText, pageWidth / 2, corpBadgeY + 3.0, { align: 'center' });

    y += 9;

    // Business Header with Logo on the left and Centered Text
    const hasLogo = Boolean(business.logo && business.logo.startsWith('data:image'));
    const logoSize = hasLogo ? 16 : 0;
    if (hasLogo) {
      try {
        let imageFormat = 'JPEG';
        if (business.logo!.includes('image/png')) imageFormat = 'PNG';
        else if (business.logo!.includes('image/webp')) imageFormat = 'WEBP';
        const logoX = margin;
        const logoY = y;
        doc.addImage(business.logo!, imageFormat, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    const startBizY = y;
    const maxTextW = hasLogo ? contentWidth - (logoSize + 8) * 2 : contentWidth - 10;

    const rawBizName = (business.name || '').trim();
    const hasBizName = rawBizName.length > 0 && rawBizName.toLowerCase() !== 'business name';
    if (hasBizName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      const corpTitleLines = doc.splitTextToSize(rawBizName, maxTextW);
      doc.text(corpTitleLines, pageWidth / 2, y + 3.5, { align: 'center' });
      y += corpTitleLines.length * 5 + 2;
    }

    if (business.description) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const corpDescLines = doc.splitTextToSize(business.description, maxTextW);
      doc.text(corpDescLines, pageWidth / 2, y + 2, { align: 'center' });
      y += corpDescLines.length * 4 + 1;
    }

    const businessDetails = [
      business.taxNumber ? `TIN: ${business.taxNumber} (VAT REGISTERED)` : '',
      business.address,
      [business.phone, business.email].filter(Boolean).join(' • ')
    ].filter(Boolean).join('   |   ');

    if (businessDetails) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const bizLines = doc.splitTextToSize(businessDetails, maxTextW);
      doc.text(bizLines, pageWidth / 2, y + 2, { align: 'center' });
      y += bizLines.length * 4 + 2;
    }

    if (hasLogo) {
      y = Math.max(y, startBizY + logoSize + 4);
    }

    y += 3;

    // Customer & Receipt Info Card
    const bizContactLines: string[] = [];
    if (receipt.customerPhone) bizContactLines.push(`Phone: ${receipt.customerPhone}`);
    if (receipt.customerEmail) bizContactLines.push(`Email: ${receipt.customerEmail}`);
    if (receipt.customerAddress) bizContactLines.push(`Address: ${receipt.customerAddress}`);

    const bizBoxH = Math.max(22, 14 + bizContactLines.length * 4.5);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, bizBoxH, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, bizBoxH, 2, 2, 'S');

    // Left Column: Customer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(isInvoice ? 'INVOICE TO:' : 'RECEIVED WITH THANKS FROM:', margin + 6, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(receipt.customerName || (isInvoice ? 'Valued Client' : 'Walk-in Client'), margin + 6, y + 11);

    let bizCustY = y + 15.5;
    if (bizContactLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      bizContactLines.forEach((line) => {
        doc.text(line, margin + 6, bizCustY);
        bizCustY += 4.2;
      });
    }

    // Right Column: Meta Info
    const col2X = margin + 105;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(isInvoice ? 'INVOICE NO:' : 'RECEIPT NO:', col2X, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(receipt.receiptNumber, col2X + 22, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${formatDateTime(receipt.createdAt)}`, col2X, y + 11);
    if (isInvoice) {
      doc.text(receipt.dueDate ? `Due Date: ${receipt.dueDate}` : `Terms: ${receipt.paymentTerms || 'Due on receipt'}`, col2X, y + 16);
    } else {
      doc.text(`Payment: ${receipt.paymentMethod}`, col2X, y + 16);
    }

    y += bizBoxH + 5;

    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(isInvoice ? 'ITEM / SERVICE DESCRIPTION' : 'PAID FOR', margin + 3, y + 5.5);
    doc.text('QUANTITY', margin + 105, y + 5.5, { align: 'center' });
    doc.text('PRICE', margin + 140, y + 5.5, { align: 'right' });
    doc.text('TOTAL AMOUNT', pageWidth - margin - 3, y + 5.5, { align: 'right' });
    y += 8;

    // Table Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    receipt.items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 8, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.text(item.name, margin + 3, y + 5.5);
      doc.text(String(item.quantity), margin + 105, y + 5.5, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice, currency), margin + 140, y + 5.5, { align: 'right' });
      doc.text(formatCurrency(item.subtotal, currency), pageWidth - margin - 3, y + 5.5, { align: 'right' });
      y += 8;
    });

    // Boxed Totals
    y += 4;
    const boxX = margin + 100;
    const boxW = contentWidth - 100;
    doc.setDrawColor(203, 213, 225);
    doc.rect(boxX, y, boxW, 30, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Subtotal:', boxX + 4, y + 6);
    doc.text(formatCurrency(receipt.subtotal, currency), pageWidth - margin - 4, y + 6, { align: 'right' });

    doc.text('Discount Applied:', boxX + 4, y + 13);
    doc.text(`-${formatCurrency(receipt.discountAmount, currency)}`, pageWidth - margin - 4, y + 13, { align: 'right' });

    doc.setFillColor(241, 245, 249);
    doc.rect(boxX, y + 18, boxW, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(isInvoice ? 'TOTAL PAYABLE:' : 'FINAL TOTAL:', boxX + 4, y + 25.5);
    doc.text(formatCurrency(receipt.total, currency), pageWidth - margin - 4, y + 25.5, { align: 'right' });

    // Official Stamp & Signature Area (on top of thank you message)
    const stampY = y;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, stampY, 70, 30, 'S');
    if (business.signature && business.signature.startsWith('data:image')) {
      try {
        let sigFormat = 'PNG';
        if (business.signature.includes('image/jpeg') || business.signature.includes('image/jpg')) sigFormat = 'JPEG';
        doc.addImage(business.signature, sigFormat, margin + 12, stampY + 3, 46, 17);
      } catch (e) {
        console.warn('Could not add signature to Business PDF:', e);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Official Stamp & Authorized Sign', margin + 35, stampY + 26, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Official Business Stamp & Sign', margin + 35, stampY + 16, { align: 'center' });
    }

    y = Math.max(y + 34, stampY + 34);

    // 1. Financial info
    y = this.appendFinancialInfo(doc, receipt, y, margin, pageWidth);

    // 2. Thank you message below signature
    y = this.appendThankYouAndTerms(doc, receipt, y, margin, pageWidth);

    // 3. Centered QR Code at bottom
    y = await this.appendBottomCenteredQrCode(doc, receipt, y, pageWidth, 22);

    // Legal Footer
    if (business.customFooter && business.customFooter.trim().length > 0 && !business.customFooter.includes('Please keep this receipt for warranty and returns')) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(business.customFooter, pageWidth / 2, Math.max(y + 6, 282), { align: 'center' });
    }

    return doc;
  },

  /**
   * Renders the Compact Template (Thermal Slip / POS Roll style 80mm width)
   */
  async renderCompactTemplate(receipt: Receipt): Promise<jsPDF> {
    // 80mm roll width, dynamic height
    const rollWidth = 80;
    const approxHeight = Math.max(180, 130 + receipt.items.length * 10 + (receipt.notes ? 20 : 0));
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [rollWidth, approxHeight] });
    const business = receipt.businessSnapshot;
    const currency = business.currency || 'UGX';
    const isInvoice = receipt.documentType === 'invoice';
    const margin = 5;
    const contentWidth = rollWidth - margin * 2;
    let y = 6;

    // 1. "RECEIPT" / "INVOICE" as the first thing on top - centered with thermal inverted background box matching text
    const defaultBadge = isInvoice ? 'INVOICE' : 'RECEIPT';
    let badgeText = receipt.customTheme?.badgeText || defaultBadge;
    if (isInvoice && badgeText.toUpperCase() === 'RECEIPT') badgeText = 'INVOICE';
    const badgeStr = `*** ${badgeText} ***`;
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    const compactBadgeW = Math.min(contentWidth - 2, doc.getTextWidth(badgeStr) + 5);
    const compactBadgeH = 4.4;
    const compactBadgeX = (rollWidth - compactBadgeW) / 2;
    const compactBadgeY = y - 1.5;
    doc.setFillColor(20, 20, 20); // crisp thermal black
    doc.roundedRect(compactBadgeX, compactBadgeY, compactBadgeW, compactBadgeH, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(badgeStr, rollWidth / 2, compactBadgeY + 3.1, { align: 'center' });
    y += 6.5;

    // 2. Business logo on the LEFT side where it was
    const hasLogo = Boolean(business.logo && business.logo.startsWith('data:image'));
    const logoSize = hasLogo ? 12 : 0;
    if (hasLogo) {
      try {
        let imageFormat = 'JPEG';
        if (business.logo!.includes('image/png')) imageFormat = 'PNG';
        else if (business.logo!.includes('image/webp')) imageFormat = 'WEBP';
        const logoX = margin;
        const logoY = y;
        doc.addImage(business.logo!, imageFormat, logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }
    }

    const startCompactY = y;
    const maxTextW = hasLogo ? contentWidth - (logoSize + 4) * 2 : contentWidth;

    // 3. Centered Business Name
    const rawBizName = (business.name || '').trim();
    const hasBizName = rawBizName.length > 0 && rawBizName.toLowerCase() !== 'business name';
    if (hasBizName) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const splitName = doc.splitTextToSize(rawBizName.toUpperCase(), maxTextW);
      doc.text(splitName, rollWidth / 2, y + 1.5, { align: 'center' });
      y += splitName.length * 4.5 + 2;
    }

    // 4. Centered Business Description
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    if (business.description) {
      const splitDesc = doc.splitTextToSize(business.description, maxTextW);
      doc.text(splitDesc, rollWidth / 2, y, { align: 'center' });
      y += splitDesc.length * 3.5;
    }

    // 5. Centered Address & Telephone
    if (business.address) {
      const splitAddr = doc.splitTextToSize(business.address, maxTextW);
      doc.text(splitAddr, rollWidth / 2, y, { align: 'center' });
      y += splitAddr.length * 3.5;
    }
    if (business.phone) {
      doc.text(`TEL: ${business.phone}`, rollWidth / 2, y, { align: 'center' });
      y += 3.5;
    }

    if (hasLogo) {
      y = Math.max(y, startCompactY + logoSize + 2);
    }

    // Dashed divider
    doc.text('------------------------------------------', rollWidth / 2, y, { align: 'center' });
    y += 4;

    // Metadata
    doc.setFontSize(8);
    doc.text(`${isInvoice ? 'INV' : 'RC'}: ${receipt.receiptNumber}`, margin, y);
    y += 3.5;
    doc.text(`DATE: ${formatDateTime(receipt.createdAt)}`, margin, y);
    y += 3.5;
    if (receipt.customerName) {
      doc.text(`${isInvoice ? 'INVOICE TO' : 'CUST'}: ${receipt.customerName}`, margin, y);
      y += 3.5;
    }
    if (receipt.customerPhone) {
      doc.text(`TEL: ${receipt.customerPhone}`, margin, y);
      y += 3.5;
    }
    if (receipt.customerEmail) {
      doc.text(`EMAIL: ${receipt.customerEmail}`, margin, y);
      y += 3.5;
    }
    if (receipt.customerAddress) {
      doc.text(`ADDR: ${receipt.customerAddress}`, margin, y);
      y += 3.5;
    }
    if (isInvoice) {
      if (receipt.dueDate) {
        doc.text(`DUE DATE: ${receipt.dueDate}`, margin, y);
        y += 3.5;
      }
    } else {
      doc.text(`PAYMENT: ${receipt.paymentMethod.toUpperCase()}`, margin, y);
      y += 4;
    }

    doc.text('------------------------------------------', rollWidth / 2, y, { align: 'center' });
    y += 4;

    // Compact Item Lines
    doc.setFont('courier', 'bold');
    doc.text(isInvoice ? 'ITEM DESCRIPTION  QTY    AMOUNT' : 'PAID FOR          QTY    AMOUNT', margin, y);
    y += 3;
    doc.setFont('courier', 'normal');

    receipt.items.forEach((item) => {
      const shortName = item.name.length > 18 ? item.name.substring(0, 18) + '..' : item.name;
      doc.text(shortName, margin, y);
      doc.text(String(item.quantity), margin + 38, y, { align: 'center' });
      doc.text(formatCurrency(item.subtotal, currency), rollWidth - margin, y, { align: 'right' });
      y += 4;
    });

    doc.text('------------------------------------------', rollWidth / 2, y, { align: 'center' });
    y += 4;

    // Totals
    doc.text('SUBTOTAL:', margin, y);
    doc.text(formatCurrency(receipt.subtotal, currency), rollWidth - margin, y, { align: 'right' });
    y += 3.5;

    if (receipt.discountAmount > 0) {
      doc.text('DISCOUNT:', margin, y);
      doc.text(`-${formatCurrency(receipt.discountAmount, currency)}`, rollWidth - margin, y, { align: 'right' });
      y += 3.5;
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', margin, y);
    doc.text(formatCurrency(receipt.total, currency), rollWidth - margin, y, { align: 'right' });
    y += 4.5;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('PAID:', margin, y);
    doc.text(formatCurrency(receipt.amountPaid, currency), rollWidth - margin, y, { align: 'right' });
    y += 3.5;

    if (receipt.balance > 0) {
      doc.text('CHANGE:', margin, y);
      doc.text(formatCurrency(receipt.balance, currency), rollWidth - margin, y, { align: 'right' });
      y += 3.5;
    }

    if (receipt.nonRefundable) {
      y += 1;
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text('** MONEY PAID IS NOT REFUNDABLE **', rollWidth / 2, y, { align: 'center' });
      y += 3.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
    }

    const isNonReturnable = receipt.nonReturnable === true || (receipt.nonReturnable === undefined && !receipt.nonRefundable);
    if (isNonReturnable) {
      y += 1;
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text('** GOODS ONCE SOLD ARE NOT RETURNABLE **', rollWidth / 2, y, { align: 'center' });
      y += 3.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
    }

    // Signature on top of thank you
    if (business.signature && business.signature.startsWith('data:image')) {
      y += 1;
      try {
        let sigFormat = 'PNG';
        if (business.signature.includes('image/jpeg') || business.signature.includes('image/jpg')) sigFormat = 'JPEG';
        doc.addImage(business.signature, sigFormat, rollWidth / 2 - 16, y, 32, 11);
        y += 12;
      } catch (e) {
        console.warn('Could not add signature to Compact PDF:', e);
      }
      doc.text('---------------------', rollWidth / 2, y, { align: 'center' });
      y += 3;
      doc.setFontSize(7);
      doc.text('Authorized Sign', rollWidth / 2, y, { align: 'center' });
      y += 3;
    }

    y += 2;
    doc.text('==========================================', rollWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setFontSize(7.5);
    doc.text('*** THANK YOU FOR YOUR BUSINESS ***', rollWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('PLEASE KEEP YOUR RECEIPT', rollWidth / 2, y, { align: 'center' });
    y += 4;

    // Centered QR Code at bottom
    y = await this.appendBottomCenteredQrCode(doc, receipt, y, rollWidth, 18);

    return doc;
  },

  /**
   * Generates a raw PDF Blob
   */
  async generatePdfBlob(receipt: Receipt): Promise<Blob> {
    const doc = await this.createPdfDoc(receipt);
    return doc.output('blob');
  },

  /**
   * Generates a Data URI for in-browser PDF preview iframe
   */
  async generatePdfDataUri(receipt: Receipt): Promise<string> {
    const doc = await this.createPdfDoc(receipt);
    return doc.output('datauristring');
  },

  /**
   * Triggers client-side or native Android PDF file download
   */
  async downloadPdf(receipt: Receipt): Promise<SaveFileResult> {
    const doc = await this.createPdfDoc(receipt);
    const isInvoice = receipt.documentType === 'invoice';
    const prefix = isInvoice ? 'Invoice' : 'Receipt';
    const cleanNum = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${prefix}_${cleanNum}.pdf`;
    return await saveJsPdf(doc, filename, `${prefix} ${receipt.receiptNumber}`);
  },

  /**
   * Shares PDF via Android Native Share Sheet (or Web Share API on browsers)
   */
  async shareReceiptPdf(
    receipt: Receipt
  ): Promise<{ shared: boolean; method: string; message: string }> {
    const blob = await this.generatePdfBlob(receipt);
    const isInvoice = receipt.documentType === 'invoice';
    const docTypeLabel = isInvoice ? 'Invoice' : 'Receipt';
    const cleanNum = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${docTypeLabel}_${cleanNum}.pdf`;
    const currency = receipt.businessSnapshot.currency || 'UGX';
    
    const bizName = (receipt.businessSnapshot?.name || '').trim();
    const senderSuffix = (bizName && bizName.toLowerCase() !== 'business name') ? ` from ${bizName}` : '';
    let shareText = '';
    if (isInvoice) {
      const dueInfo = receipt.dueDate ? ` Due: ${receipt.dueDate}.` : '';
      shareText = `Invoice ${receipt.receiptNumber}${senderSuffix} for ${formatCurrency(receipt.total, currency)}.${dueInfo}`;
    } else {
      shareText = `Receipt ${receipt.receiptNumber}${senderSuffix} for ${formatCurrency(receipt.total, currency)}. Thank you for your business!`;
    }

    return await shareContent({
      filename,
      data: blob,
      mimeType: 'application/pdf',
      title: `${docTypeLabel} ${receipt.receiptNumber}`,
      text: shareText,
      dialogTitle: `Share ${docTypeLabel}`,
    });
  },
};
