import QRCode from 'qrcode';
import { Receipt, BusinessProfile } from '../types';
import { formatCurrency, formatDateTime } from './currencies';
import { StorageService } from '../services/storage';

export interface ReceiptDataForQr {
  id?: string;
  receiptNumber: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  balance?: number;
  paymentMethod: string;
  currency?: string;
  businessName?: string;
  businessSnapshot?: BusinessProfile;
  storeName?: string;
}

/**
 * Normalizes any receipt or render data into a standard Receipt object structure.
 */
export function normalizeReceiptData(input: ReceiptDataForQr | Receipt): Receipt {
  const inputObj = input as ReceiptDataForQr & Receipt;
  const rawBizName = (inputObj.businessName || inputObj.storeName || '').trim();
  const cleanBizName = (rawBizName && rawBizName.toLowerCase() !== 'business name') ? rawBizName : '';
  const businessSnapshot: BusinessProfile = inputObj.businessSnapshot || {
    name: cleanBizName,
    currency: inputObj.currency || 'UGX',
    phone: '',
    address: '',
  };

  const total = input.total || 0;
  const amountPaid = input.amountPaid || 0;
  const computedBalance = input.balance !== undefined ? input.balance : (amountPaid - total);

  return {
    id: input.id || `REC-ID-${input.receiptNumber}`,
    receiptNumber: input.receiptNumber,
    createdAt: input.createdAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items: input.items.map((item, idx) => ({
      id: (item as { id?: string }).id || `item-${idx}`,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    subtotal: input.subtotal,
    discount: 0,
    discountType: 'fixed',
    discountAmount: input.discountAmount || 0,
    total: total,
    amountPaid: amountPaid,
    balance: computedBalance,
    paymentStatus: computedBalance >= 0 ? 'paid' : 'partial',
    paymentMethod: (input.paymentMethod as Receipt['paymentMethod']) || 'Cash',
    businessSnapshot: businessSnapshot,
    notes: (input as Receipt).notes,
    template: (input as Receipt).template || 'modern',
  };
}

/**
 * Generates a deterministic SHA-256-like hex verification hash based on core receipt fields
 */
export function generateVerificationHash(input: ReceiptDataForQr | Receipt): string {
  const rec = normalizeReceiptData(input);
  const coreString = [
    rec.receiptNumber,
    rec.businessSnapshot.name,
    rec.total,
    rec.amountPaid,
    rec.items.length,
    rec.createdAt,
    rec.paymentMethod,
  ].join('|');

  let hashVal = 0x811c9dc5;
  for (let i = 0; i < coreString.length; i++) {
    hashVal ^= coreString.charCodeAt(i);
    hashVal += (hashVal << 1) + (hashVal << 4) + (hashVal << 7) + (hashVal << 8) + (hashVal << 24);
  }
  
  const unsigned = hashVal >>> 0;
  const rawHex = unsigned.toString(16).padStart(8, '0').toUpperCase();
  return `V-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}`;
}

/**
 * Constructs the receipt verification URL for QR code encoding so scanning opens the hosted web receipt page with details and boxes
 */
export function buildQrReceiptPayload(input: ReceiptDataForQr | Receipt): string {
  const rec = normalizeReceiptData(input);
  try {
    const config = StorageService.getCloudflareConfig();
    if (config && config.workerUrl) {
      const cleanUrl = config.workerUrl.trim().replace(/\/$/, '');
      return `${cleanUrl}/api/receipts/${encodeURIComponent(rec.id)}`;
    }
  } catch (err) {
    console.warn('Could not get Cloudflare workerUrl for QR:', err);
  }

  const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'https://quickreceipt.app';
  return `${fallbackBase}/api/receipts/${encodeURIComponent(rec.id)}`;
}

/**
 * Asynchronously generates a PNG Data URL for a receipt's QR code
 */
export async function generateReceiptQrDataUrl(
  input: ReceiptDataForQr | Receipt,
  size: number = 240
): Promise<string> {
  try {
    const payload = buildQrReceiptPayload(input);
    const dataUrl = await QRCode.toDataURL(payload, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code Data URL:', err);
    return '';
  }
}
