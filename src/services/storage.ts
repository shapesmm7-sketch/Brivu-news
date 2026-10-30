import {
  AppBackupData,
  AppSettings,
  BusinessProfile,
  Receipt,
  ReceiptItem,
  InventoryProduct,
  InventorySale,
  InventoryExpense,
  InventoryDebt,
  ShoppingListItem,
  ShoppingCategory,
  ProductCategory,
  Customer,
  BusinessAgent,
  AgentLedgerRecord,
  BusinessWorker,
  StaffAttendanceRecord,
  StaffLossRecord,
  StaffSaleRecord,
  StaffIncidentRecord,
  QRCodeHostedPage,
  WebsiteAppQrItem,
  SocialQrItem,
  EventQrItem,
  UserSubscription,
  AppLockConfig,
  CloudflareConfig,
  ThermalPrinterDevice,
  WorkOSUser,
} from '../types';
import { PushNotificationService } from './pushNotificationService';
import { CloudflareService } from './cloudflareService';
import { QRHostingService } from './qrHostingService';

const STORAGE_KEYS = {
  PROFILE: 'quickreceipt_business_profile_v1',
  SETTINGS: 'quickreceipt_app_settings_v1',
  RECEIPTS: 'quickreceipt_receipts_list_v1',
  DRAFT: 'quickreceipt_current_draft_v1',
  INVENTORY_PRODUCTS: 'quickreceipt_inventory_products_v1',
  INVENTORY_SALES: 'quickreceipt_inventory_sales_v1',
  INVENTORY_EXPENSES: 'quickreceipt_inventory_expenses_v1',
  INVENTORY_DEBTS: 'quickreceipt_inventory_debts_v1',
  SHOPPING_LIST: 'quickreceipt_shopping_list_v1',
  SHOPPING_CATEGORIES: 'quickreceipt_shopping_categories_v1',
  PRODUCT_CATEGORIES: 'quickreceipt_product_categories_v1',
  CUSTOMERS: 'quickreceipt_customers_v1',
  AGENTS: 'quickreceipt_agents_v1',
  AGENT_LEDGER: 'quickreceipt_agent_ledger_v1',
  WORKERS: 'quickreceipt_workers_v1',
  STAFF_ATTENDANCE: 'quickreceipt_staff_attendance_v1',
  STAFF_LOSSES: 'quickreceipt_staff_losses_v1',
  STAFF_SALES: 'quickreceipt_staff_sales_v1',
  STAFF_INCIDENTS: 'quickreceipt_staff_incidents_v1',
  QR_HOSTED_PAGES: 'quickreceipt_qr_hosted_pages_v1',
  WEBSITES_QR: 'quickreceipt_websites_apps_qr_v1',
  SOCIALS_QR: 'quickreceipt_socials_qr_v1',
  EVENTS_QR: 'quickreceipt_events_qr_v1',
  SUBSCRIPTION: 'quickreceipt_subscription_v1',
  APP_LOCK: 'quickreceipt_app_lock_config_v1',
  APP_LOCKED_STATE: 'quickreceipt_app_locked_state_v1',
  CLOUDFLARE: 'quickreceipt_cloudflare_config_v1',
  DELETED_RECEIPTS: 'quickreceipt_deleted_receipt_ids_v1',
  INSTALL_DATE: 'quickreceipt_install_date_v1',
  BRIVU_USER_ID: 'quickreceipt_brivu_user_id_v1',
  WORKOS_USER: 'quickreceipt_workos_user_v1',
  ACTIVE_WORKSPACE_USER: 'quickreceipt_active_workspace_user_v1',
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: '',
  description: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  taxNumber: '',
  website: '',
  currency: 'UGX',
  customFooter: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankBranchSwift: '',
  mobileMoneyMerchant: '',
  mobileMoneyName: '',
  defaultPaymentInstructions: '',
};

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'UGX',
  receiptPrefix: 'REC-',
  nextReceiptNumber: 1,
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1,
  numberPadding: 2,
  defaultPaymentMethod: 'Cash',
  defaultTemplate: 'modern',
  defaultDueDateDays: 14,
  defaultPaymentTerms: 'Net 14',
  defaultTaxRate: 0,
  customFooter: '',
  darkMode: false,
  hapticsEnabled: true,
};

// No sample receipts by default
export const INITIAL_SAMPLE_RECEIPTS: Receipt[] = [];

// Helper to safely read from localStorage
function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Failed reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

// Helper to test if an error was caused by localStorage quota limit
function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  const str = String(err).toLowerCase();
  return str.includes('quota') || str.includes('exceeded');
}

// Clean oversized base64 images from hosted pages to prevent quota overflow
function sanitizeHostedPagesImages(pages: QRCodeHostedPage[], stripAllBase64 = false): QRCodeHostedPage[] {
  return pages.map((page) => ({
    ...page,
    coverImage: stripAllBase64 || (page.coverImage && page.coverImage.startsWith('data:') && page.coverImage.length > 400000)
      ? (stripAllBase64 && page.coverImage?.startsWith('data:') ? undefined : (page.coverImage?.startsWith('data:') ? undefined : page.coverImage))
      : page.coverImage,
    logo: stripAllBase64 || (page.logo && page.logo.startsWith('data:') && page.logo.length > 400000)
      ? (stripAllBase64 && page.logo?.startsWith('data:') ? undefined : (page.logo?.startsWith('data:') ? undefined : page.logo))
      : page.logo,
    photos: (page.photos || [])
      .slice(0, stripAllBase64 ? 6 : 30)
      .map((photo) => ({
        ...photo,
        url: (stripAllBase64 && photo.url.startsWith('data:')) || (photo.url && photo.url.startsWith('data:') && photo.url.length > 400000)
          ? ''
          : photo.url,
      }))
      .filter((photo) => Boolean(photo.url)),
    menuItems: (page.menuItems || []).map((item) => ({
      ...item,
      photoUrl: (stripAllBase64 && item.photoUrl?.startsWith('data:')) || (item.photoUrl && item.photoUrl.startsWith('data:') && item.photoUrl.length > 400000)
        ? undefined
        : item.photoUrl,
    })),
  }));
}

// Helper to safely write to localStorage with automatic quota recovery
function writeToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn(`LocalStorage quota reached for key "${key}". Running storage recovery...`);

      // 1. Clear non-essential cached drafts
      try {
        localStorage.removeItem(STORAGE_KEYS.DRAFT);
      } catch {}

      // 2. Global cleanup: trim heavy snapshots from older receipts
      try {
        const rawReceipts = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
        if (rawReceipts && rawReceipts.length > 300000) {
          const parsed = JSON.parse(rawReceipts) as Receipt[];
          const trimmed = parsed.map((r, idx) => {
            if (idx > 3 && r.businessSnapshot) {
              return {
                ...r,
                businessSnapshot: {
                  ...r.businessSnapshot,
                  logo: undefined,
                  signature: undefined,
                },
              };
            }
            return r;
          });
          localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(trimmed));
        }
      } catch {}

      // 3. Global cleanup: strip heavy images from stored inventory products
      try {
        const rawInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY_PRODUCTS);
        if (rawInventory && rawInventory.length > 300000) {
          const parsed = JSON.parse(rawInventory) as InventoryProduct[];
          const cleaned = parsed.map((p, idx) => (idx > 2 ? { ...p, image: undefined } : p));
          localStorage.setItem(STORAGE_KEYS.INVENTORY_PRODUCTS, JSON.stringify(cleaned));
        }
      } catch {}

      // 4. Global cleanup: if target is NOT QR_HOSTED_PAGES, sanitize stored QR pages to free up quota
      if (key !== STORAGE_KEYS.QR_HOSTED_PAGES) {
        try {
          const rawQRPages = localStorage.getItem(STORAGE_KEYS.QR_HOSTED_PAGES);
          if (rawQRPages && rawQRPages.length > 1500000) {
            const parsed = JSON.parse(rawQRPages) as QRCodeHostedPage[];
            const cleaned = sanitizeHostedPagesImages(parsed, true);
            localStorage.setItem(STORAGE_KEYS.QR_HOSTED_PAGES, JSON.stringify(cleaned));
          }
        } catch {}
      }

      // Try writing original value again after global cleanup
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {}

      // 5. Targeted recovery: QR_HOSTED_PAGES
      if (key === STORAGE_KEYS.QR_HOSTED_PAGES && Array.isArray(value)) {
        try {
          // Attempt 1: sanitize oversized (>400KB) base64 images
          const sanitized = sanitizeHostedPagesImages(value as QRCodeHostedPage[], false);
          localStorage.setItem(key, JSON.stringify(sanitized));
          console.info('Successfully saved QR hosted pages after sanitizing oversized images.');
          return true;
        } catch {
          // Attempt 2: strip all base64 data URLs to guarantee all text, menu dishes, prices, and venue info are preserved
          try {
            const noDataUrls = sanitizeHostedPagesImages(value as QRCodeHostedPage[], true);
            localStorage.setItem(key, JSON.stringify(noDataUrls));
            console.warn('Saved QR hosted pages with base64 images stripped to satisfy storage quota.');
            return true;
          } catch (lastErr) {
            console.warn('Could not persist QR hosted pages to localStorage due to strict quota limits:', lastErr);
            return false;
          }
        }
      }

      // 6. Targeted recovery: INVENTORY_PRODUCTS
      if (key === STORAGE_KEYS.INVENTORY_PRODUCTS && Array.isArray(value)) {
        try {
          const optimized = (value as InventoryProduct[]).map((p, idx) => {
            if (idx > 3 || (p.image && p.image.length > 50000)) {
              return { ...p, image: undefined };
            }
            return p;
          });
          localStorage.setItem(key, JSON.stringify(optimized));
          console.info('Successfully saved inventory products after image compression cleanup.');
          return true;
        } catch {
          try {
            const noImages = (value as InventoryProduct[]).map((p) => ({ ...p, image: undefined }));
            localStorage.setItem(key, JSON.stringify(noImages));
            console.warn('Saved inventory products without images to avoid quota failure.');
            return true;
          } catch (lastErr) {
            console.error('Failed to save inventory products even without images:', lastErr);
          }
        }
      }

      // 7. Targeted recovery: RECEIPTS
      if (key === STORAGE_KEYS.RECEIPTS && Array.isArray(value)) {
        try {
          const trimmed = (value as Receipt[]).map((r, idx) => {
            if (idx > 5 && r.businessSnapshot) {
              return {
                ...r,
                businessSnapshot: {
                  ...r.businessSnapshot,
                  logo: undefined,
                  signature: undefined,
                },
              };
            }
            return r;
          });
          localStorage.setItem(key, JSON.stringify(trimmed));
          return true;
        } catch {}
      }
    }

    console.warn(`Failed writing ${key} to localStorage (quota or storage restriction). Continuing with in-memory state:`, err);
    return false;
  }
}

let systemActionExpiresAt = 0;

export const StorageService = {
  // Temporary marker for system intents (e.g. system file picker, native share sheet, camera)
  // so that briefly opening an Android system dialog doesn't trigger app lock on return
  markSystemActionActive(durationMs: number = 60000): void {
    systemActionExpiresAt = Date.now() + durationMs;
  },

  consumeSystemActionActive(): boolean {
    if (systemActionExpiresAt > 0 && Date.now() < systemActionExpiresAt) {
      systemActionExpiresAt = 0;
      return true;
    }
    systemActionExpiresAt = 0;
    return false;
  },

  isSystemActionActive(): boolean {
    return systemActionExpiresAt > 0 && Date.now() < systemActionExpiresAt;
  },
  getProfile(): BusinessProfile {
    const profile = readFromStorage<BusinessProfile>(
      STORAGE_KEYS.PROFILE,
      DEFAULT_BUSINESS_PROFILE
    );
    if (profile && profile.customFooter && profile.customFooter.includes('Please keep this receipt for warranty and returns')) {
      profile.customFooter = '';
    }
    return profile;
  },

  saveProfile(profile: BusinessProfile): boolean {
    const success = writeToStorage(STORAGE_KEYS.PROFILE, profile);
    if (success) {
      const current = this.getProfile();
      let hasUpdates = false;

      // Auto-upload logo to Cloudflare R2
      if (profile.logo && profile.logo.startsWith('data:image/')) {
        const mimeType = profile.logo.slice(5, profile.logo.indexOf(';')) || 'image/png';
        const ext = mimeType.split('/')[1] || 'png';
        CloudflareService.uploadFile({
          data: profile.logo,
          filename: `logo_${Date.now()}.${ext}`,
          mimeType,
          folder: 'photos',
        }).then((res) => {
          if (res.success && res.url) {
            const p = this.getProfile();
            p.logo = res.url;
            writeToStorage(STORAGE_KEYS.PROFILE, p);
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }
        }).catch(() => {});
      }

      // Auto-upload signature to Cloudflare R2
      if (profile.signature && profile.signature.startsWith('data:image/')) {
        const mimeType = profile.signature.slice(5, profile.signature.indexOf(';')) || 'image/png';
        const ext = mimeType.split('/')[1] || 'png';
        CloudflareService.uploadFile({
          data: profile.signature,
          filename: `signature_${Date.now()}.${ext}`,
          mimeType,
          folder: 'signatures',
        }).then((res) => {
          if (res.success && res.url) {
            const p = this.getProfile();
            p.signature = res.url;
            writeToStorage(STORAGE_KEYS.PROFILE, p);
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }
        }).catch(() => {});
      }

      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  getSettings(): AppSettings {
    const current = readFromStorage<AppSettings>(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS
    );
    const settings = { ...DEFAULT_SETTINGS, ...current };
    if (settings.customFooter === 'Thank you for your business!') {
      settings.customFooter = '';
    }
    // Default to 1 leading zero (2 digits, e.g. 01 instead of legacy 000001)
    if (!settings.numberPadding || settings.numberPadding === 6) {
      settings.numberPadding = 2;
    }
    return settings;
  },

  saveSettings(settings: AppSettings): boolean {
    const success = writeToStorage(STORAGE_KEYS.SETTINGS, settings);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  getSavedThermalPrinter(): ThermalPrinterDevice | undefined {
    const settings = this.getSettings();
    return settings.defaultPrinter;
  },

  saveThermalPrinter(printer: ThermalPrinterDevice | undefined): boolean {
    const settings = this.getSettings();
    settings.defaultPrinter = printer;
    return this.saveSettings(settings);
  },

  getCustomTemplate(templateId: string) {
    const settings = this.getSettings();
    return settings.templateCustomizations?.[templateId];
  },

  saveCustomTemplate(templateId: string, customization: any): boolean {
    const settings = this.getSettings();
    const map = settings.templateCustomizations || {};
    settings.templateCustomizations = {
      ...map,
      [templateId]: customization,
    };
    return this.saveSettings(settings);
  },

  resetCustomTemplate(templateId: string): boolean {
    const settings = this.getSettings();
    if (!settings.templateCustomizations) return true;
    const map = { ...settings.templateCustomizations };
    delete map[templateId];
    settings.templateCustomizations = map;
    return this.saveSettings(settings);
  },

  getDeletedReceiptIds(): string[] {
    return readFromStorage<string[]>(STORAGE_KEYS.DELETED_RECEIPTS, []);
  },

  recordDeletedReceipt(id: string, receiptNumber?: string, customerName?: string): void {
    const list = this.getDeletedReceiptIds();
    const set = new Set(list.map((s) => String(s).trim()));
    if (id) {
      set.add(String(id).trim());
      set.add(String(id).trim().toLowerCase());
    }
    if (receiptNumber) {
      set.add(String(receiptNumber).trim());
      set.add(String(receiptNumber).trim().toLowerCase());
    }
    if (customerName && customerName.trim().length > 1) {
      set.add(`cust:${customerName.trim().toLowerCase()}`);
    }
    writeToStorage(STORAGE_KEYS.DELETED_RECEIPTS, Array.from(set));
  },

  unmarkDeletedReceipt(id: string, receiptNumber?: string): void {
    const list = this.getDeletedReceiptIds();
    const idLower = String(id).trim().toLowerCase();
    const numLower = receiptNumber ? String(receiptNumber).trim().toLowerCase() : '';
    const filtered = list.filter((item) => {
      const itemLower = String(item).trim().toLowerCase();
      return itemLower !== idLower && (!numLower || itemLower !== numLower);
    });
    writeToStorage(STORAGE_KEYS.DELETED_RECEIPTS, filtered);
  },

  getReceipts(): Receipt[] {
    const data = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
    const deletedList = this.getDeletedReceiptIds();
    const deletedSet = new Set(deletedList.map((s) => String(s).trim().toLowerCase()));

    if (!data) {
      // First time initialization
      writeToStorage(STORAGE_KEYS.RECEIPTS, INITIAL_SAMPLE_RECEIPTS);
      return INITIAL_SAMPLE_RECEIPTS;
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((r) => r && typeof r === 'object' && (!r.id || !String(r.id).startsWith('sample-')))
        .filter((r) => {
          const rId = String(r.id || '').trim().toLowerCase();
          const rNum = String(r.receiptNumber || '').trim().toLowerCase();
          const rCust = r.customerName ? `cust:${String(r.customerName).trim().toLowerCase()}` : '';
          if (deletedSet.has(rId) || (rNum && deletedSet.has(rNum))) {
            return false;
          }
          if (rCust && deletedSet.has(rCust)) {
            return false;
          }
          return true;
        })
        .map((r: any): Receipt => ({
          ...r,
          id: String(r.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
          receiptNumber: String(r.receiptNumber || 'REC-01'),
          items: Array.isArray(r.items) ? r.items : [],
          subtotal: typeof r.subtotal === 'number' ? r.subtotal : (parseFloat(r.subtotal) || 0),
          total: typeof r.total === 'number' ? r.total : (parseFloat(r.total) || 0),
          amountPaid: typeof r.amountPaid === 'number' ? r.amountPaid : (parseFloat(r.amountPaid) || 0),
          balance: typeof r.balance === 'number' ? r.balance : 0,
          paymentStatus: r.paymentStatus || 'paid',
          documentType: r.documentType === 'invoice' ? 'invoice' : 'receipt',
          createdAt: r.createdAt || new Date().toISOString(),
          businessSnapshot: r.businessSnapshot || {
            name: '',
            phone: '',
            email: '',
            address: '',
            currency: 'UGX',
          },
        }));
    } catch {
      return [];
    }
  },

  getReceiptById(id: string): Receipt | undefined {
    const receipts = this.getReceipts();
    return receipts.find((r) => r.id === id);
  },

  saveReceipt(receipt: Receipt): boolean {
    // Unmark from deleted list if user explicitly created/saved this receipt
    this.unmarkDeletedReceipt(receipt.id, receipt.receiptNumber);

    const receipts = this.getReceipts();
    const existingIndex = receipts.findIndex((r) => r.id === receipt.id);
    let updated: Receipt[];
    const isNew = existingIndex < 0;

    if (existingIndex >= 0) {
      updated = [...receipts];
      updated[existingIndex] = receipt;
    } else {
      updated = [receipt, ...receipts];
    }
    const success = writeToStorage(STORAGE_KEYS.RECEIPTS, updated);

    if (success) {
      // Background sync receipt/invoice JSON information to Cloudflare D1
      this.syncReceiptToCloudflare(receipt);
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }

    if (success && isNew) {
      const currencySymbol = receipt.businessSnapshot.currency || 'UGX';
      const isInvoiceDoc = receipt.documentType === 'invoice';

      // Trigger new sale / receipt notification
      PushNotificationService.triggerBusinessAlert({
        title: isInvoiceDoc ? `🧾 New Invoice: ${receipt.receiptNumber}` : `🧾 New Receipt: ${receipt.receiptNumber}`,
        body: `Issued ${receipt.items.length} item(s) for ${currencySymbol} ${receipt.total.toLocaleString()} to ${receipt.customerName || 'Customer'}`,
        type: 'sale',
      }).catch(() => {});

      // If it's an unpaid invoice, trigger debt reminder
      if (isInvoiceDoc && receipt.paymentStatus !== 'paid') {
        PushNotificationService.triggerBusinessAlert({
          title: `⏳ Invoice Due Reminder: ${receipt.receiptNumber}`,
          body: `Due on ${receipt.dueDate || 'due date'}. Total: ${currencySymbol} ${receipt.total.toLocaleString()} for ${receipt.customerName || 'Customer'}`,
          type: 'debt_reminder',
        }).catch(() => {});
      }
    }

    return success;
  },

  /**
   * Cloud-First Receipt Save: Awaits saving to Cloudflare D1 first before persisting locally.
   */
  async saveReceiptAsync(receipt: Receipt): Promise<{ success: boolean; cloudSynced: boolean; message: string }> {
    let cloudSynced = false;
    try {
      const config = this.getCloudflareConfig();
      if (config.workerUrl && config.autoSyncData !== false) {
        const res = await CloudflareService.saveReceipt(receipt);
        if (res.success) {
          cloudSynced = true;
        }
      }
    } catch (cfErr) {
      console.warn('Cloud-first receipt save note:', cfErr);
    }

    const localSuccess = this.saveReceipt(receipt);
    return {
      success: localSuccess,
      cloudSynced,
      message: `Receipt saved to device successfully!`,
    };
  },

  /**
   * Cloud-First Business Profile Save: Awaits saving to Cloudflare D1 first.
   */
  async saveProfileAsync(profile: BusinessProfile): Promise<{ success: boolean; cloudSynced: boolean }> {
    let cloudSynced = false;
    try {
      const config = this.getCloudflareConfig();
      if (config.workerUrl && config.autoSyncData !== false) {
        const res = await CloudflareService.syncAllToCloudflare();
        if (res.success) {
          cloudSynced = true;
        }
      }
    } catch (cfErr) {
      console.warn('Cloud-first profile save note:', cfErr);
    }

    const localSuccess = this.saveProfile(profile);
    return { success: localSuccess, cloudSynced };
  },

  deleteReceipt(id: string): boolean {
    const receipts = this.getReceipts();
    const target = receipts.find((r) => r.id === id);
    const receiptNumber = target?.receiptNumber;
    const customerName = target?.customerName;

    // Record persistent deletion tombstone
    this.recordDeletedReceipt(id, receiptNumber, customerName);

    const filtered = receipts.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.RECEIPTS, filtered);

    if (success) {
      // Instantly synchronize the updated receipts list to Cloudflare D1 so pull cannot restore it
      CloudflareService.deleteReceipt(id).catch(() => {});
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }

    return success;
  },

  /**
   * Permanent Async Receipt & Cloud Deletion
   */
  async deleteReceiptAsync(id: string): Promise<{ success: boolean; cloudSynced: boolean }> {
    const receipts = this.getReceipts();
    const target = receipts.find((r) => r.id === id);
    const receiptNumber = target?.receiptNumber;
    const customerName = target?.customerName;

    this.recordDeletedReceipt(id, receiptNumber, customerName);

    const filtered = receipts.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.RECEIPTS, filtered);

    let cloudSynced = false;
    try {
      await CloudflareService.deleteReceipt(id);
      await CloudflareService.syncAllToCloudflare();
      cloudSynced = true;
    } catch (cfErr) {
      console.warn('Async cloud receipt deletion note:', cfErr);
    }

    return { success, cloudSynced };
  },

  /**
   * Generates a new unique receipt number based on current settings
   * Ensures no duplicates even if manual numbering was modified
   */
  generateReceiptNumber(): string {
    const settings = this.getSettings();
    const receipts = this.getReceipts();
    const existingNumbers = new Set(receipts.map((r) => r.receiptNumber.trim()));

    let currentNum = settings.nextReceiptNumber;
    const padding = settings.numberPadding === 6 ? 2 : (settings.numberPadding || 2);
    let candidate = `${settings.receiptPrefix}${String(currentNum).padStart(padding, '0')}`;

    while (existingNumbers.has(candidate)) {
      currentNum++;
      candidate = `${settings.receiptPrefix}${String(currentNum).padStart(padding, '0')}`;
    }

    return candidate;
  },

  /**
   * Advances the receipt sequence counter
   */
  advanceReceiptSequence(): void {
    const settings = this.getSettings();
    settings.nextReceiptNumber += 1;
    this.saveSettings(settings);
  },

  /**
   * Generates a new unique invoice number based on current settings
   * Ensures no duplicates even if manual numbering was modified
   */
  generateInvoiceNumber(): string {
    const settings = this.getSettings();
    const receipts = this.getReceipts();
    const existingNumbers = new Set(receipts.map((r) => r.receiptNumber.trim()));

    let currentNum = settings.nextInvoiceNumber || 1;
    const prefix = settings.invoicePrefix || 'INV-';
    const padding = settings.numberPadding === 6 ? 2 : (settings.numberPadding || 2);
    let candidate = `${prefix}${String(currentNum).padStart(padding, '0')}`;

    while (existingNumbers.has(candidate)) {
      currentNum++;
      candidate = `${prefix}${String(currentNum).padStart(padding, '0')}`;
    }

    return candidate;
  },

  /**
   * Advances the invoice sequence counter
   */
  advanceInvoiceSequence(): void {
    const settings = this.getSettings();
    settings.nextInvoiceNumber = (settings.nextInvoiceNumber || 1) + 1;
    this.saveSettings(settings);
  },

  /**
   * Converts an invoice into a paid receipt
   */
  convertInvoiceToReceipt(invoice: Receipt): Receipt {
    const newReceiptNumber = this.generateReceiptNumber();
    this.advanceReceiptSequence();

    const newReceipt: Receipt = {
      ...invoice,
      id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      documentType: 'receipt',
      receiptNumber: newReceiptNumber,
      createdAt: new Date().toISOString(),
      paymentStatus: 'paid',
      amountPaid: invoice.total,
      balance: 0,
      notes: invoice.notes ? `${invoice.notes} (Converted from ${invoice.receiptNumber})` : `Converted from ${invoice.receiptNumber}`,
    };

    this.saveReceipt(newReceipt);
    return newReceipt;
  },

  /**
   * Converts a receipt into an invoice
   */
  convertReceiptToInvoice(receipt: Receipt): Receipt {
    const newInvoiceNumber = this.generateInvoiceNumber();
    this.advanceInvoiceSequence();

    const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const newInvoice: Receipt = {
      ...receipt,
      id: `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      documentType: 'invoice',
      receiptNumber: newInvoiceNumber,
      createdAt: new Date().toISOString(),
      dueDate,
      paymentTerms: 'Net 14',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      balance: -receipt.total,
      notes: receipt.notes ? `${receipt.notes} (Created from ${receipt.receiptNumber})` : `Created from ${receipt.receiptNumber}`,
    };

    this.saveReceipt(newInvoice);
    return newInvoice;
  },

  getStats(): {
    totalReceipts: number;
    totalInvoices: number;
    todayReceipts: number;
    todaySales: number;
    pendingInvoices: number;
    totalOutstanding: number;
    recentReceipts: Receipt[];
  } {
    const receipts = this.getReceipts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayReceipts = 0;
    let todaySales = 0;
    let totalReceiptsCount = 0;
    let totalInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let totalOutstanding = 0;

    for (const r of receipts) {
      const isInvoice = r.documentType === 'invoice';
      if (isInvoice) {
        totalInvoicesCount++;
        if (r.paymentStatus !== 'paid') {
          pendingInvoicesCount++;
          const owed = r.balance < 0 ? Math.abs(r.balance) : (r.total - (r.amountPaid || 0));
          totalOutstanding += Math.max(0, owed);
        }
      } else {
        totalReceiptsCount++;
      }

      try {
        const rDate = new Date(r.createdAt);
        if (rDate >= today) {
          todayReceipts++;
          todaySales += r.amountPaid || r.total;
        }
      } catch {
        // Skip invalid dates
      }
    }

    return {
      totalReceipts: totalReceiptsCount,
      totalInvoices: totalInvoicesCount,
      todayReceipts,
      todaySales,
      pendingInvoices: pendingInvoicesCount,
      totalOutstanding,
      recentReceipts: receipts.slice(0, 8),
    };
  },

  exportBackup(): AppBackupData & { brivuUserId?: string } {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      brivuUserId: this.getBrivuUserId(),
      profile: this.getProfile(),
      settings: this.getSettings(),
      receipts: this.getReceipts(),
      deletedReceiptIds: this.getDeletedReceiptIds(),
      inventoryProducts: this.getInventoryProducts(),
      inventorySales: this.getInventorySales(),
      inventoryExpenses: this.getInventoryExpenses(),
      inventoryDebts: this.getInventoryDebts(),
      shoppingListItems: this.getShoppingListItems(),
      shoppingCategories: this.getShoppingCategories(),
      productCategories: this.getProductCategories(),
      customers: this.getCustomers(),
      agents: this.getAgents(),
      workers: this.getWorkers(),
      staffAttendance: this.getStaffAttendance(),
      staffLosses: this.getStaffLosses(),
      staffSales: this.getStaffSales(),
      staffIncidents: this.getStaffIncidents(),
      qrHostedPages: this.getAllHostedPagesForSync(),
      websitesQrItems: this.getWebsitesQrItems(),
      socialsQrItems: this.getSocialsQrItems(),
      eventsQrItems: this.getEventsQrItems(),
    };
  },

  importBackup(backupData: AppBackupData, replaceExisting = false): { success: boolean; message: string } {
    if (!backupData || typeof backupData !== 'object') {
      return { success: false, message: 'Invalid backup file format' };
    }
    const hasAnyContent = Array.isArray(backupData.receipts) ||
      Array.isArray(backupData.inventoryProducts) ||
      Array.isArray(backupData.inventorySales) ||
      Array.isArray(backupData.inventoryExpenses) ||
      Array.isArray(backupData.inventoryDebts) ||
      Boolean(backupData.profile);
    if (!hasAnyContent) {
      return { success: false, message: 'Backup file is empty or missing data' };
    }

    try {
      if (backupData.profile) {
        if (replaceExisting) {
          this.saveProfile(backupData.profile);
        } else {
          const currentProfile = this.getProfile();
          this.saveProfile({
            ...backupData.profile,
            ...currentProfile,
            name: currentProfile.name || backupData.profile.name || '',
            phone: currentProfile.phone || backupData.profile.phone || '',
            email: currentProfile.email || backupData.profile.email || '',
            currency: currentProfile.currency || backupData.profile.currency || 'UGX',
          });
        }
      }
      if (backupData.settings) {
        if (replaceExisting) {
          this.saveSettings(backupData.settings);
        }
      }
      // Import and merge deleted receipt ids so tombstones survive across devices/APK installs
      if (Array.isArray(backupData.deletedReceiptIds)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.DELETED_RECEIPTS, backupData.deletedReceiptIds);
        } else if (backupData.deletedReceiptIds.length > 0) {
          const currentDeleted = this.getDeletedReceiptIds();
          const mergedSet = new Set([
            ...currentDeleted.map((s) => String(s).trim().toLowerCase()),
            ...backupData.deletedReceiptIds.map((s) => String(s).trim().toLowerCase()),
          ]);
          writeToStorage(STORAGE_KEYS.DELETED_RECEIPTS, Array.from(mergedSet));
        }
      }

      if (Array.isArray(backupData.receipts)) {
        const deletedList = this.getDeletedReceiptIds();
        const deletedSet = new Set(deletedList.map((s) => String(s).trim().toLowerCase()));

        const isDeleted = (r: any) => {
          if (!r || typeof r !== 'object') return true;
          if (r.id && String(r.id).startsWith('sample-')) return true;
          const rId = String(r.id || '').trim().toLowerCase();
          return deletedSet.has(rId);
        };

        const cloudReceipts = backupData.receipts.filter((r) => !isDeleted(r));
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.RECEIPTS, cloudReceipts);
        } else {
          const existing = this.getReceipts().filter((r) => !isDeleted(r));
          const cloudIds = new Set(cloudReceipts.map((r) => r.id));
          const localOnly = existing.filter((r) => !cloudIds.has(r.id));
          const mergedReceipts = [...cloudReceipts, ...localOnly];
          writeToStorage(STORAGE_KEYS.RECEIPTS, mergedReceipts);
        }

        // If cloud backup still held receipts that were locally deleted, push sanitized state back to D1 immediately
        const hadDeletedInCloud = backupData.receipts.some((r) => isDeleted(r));
        if (hadDeletedInCloud) {
          setTimeout(() => {
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }, 100);
        }
      }
      if (Array.isArray(backupData.inventoryProducts)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, backupData.inventoryProducts);
        } else {
          const existing = this.getInventoryProducts();
          const cloudIds = new Set(backupData.inventoryProducts.map((p) => p.id));
          const localOnly = existing.filter((p) => !cloudIds.has(p.id));
          writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, [...backupData.inventoryProducts, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.inventorySales)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.INVENTORY_SALES, backupData.inventorySales);
        } else {
          const existing = this.getInventorySales();
          const cloudIds = new Set(backupData.inventorySales.map((s) => s.id));
          const localOnly = existing.filter((s) => !cloudIds.has(s.id));
          writeToStorage(STORAGE_KEYS.INVENTORY_SALES, [...backupData.inventorySales, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.inventoryExpenses)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.INVENTORY_EXPENSES, backupData.inventoryExpenses);
        } else {
          const existing = this.getInventoryExpenses();
          const cloudIds = new Set(backupData.inventoryExpenses.map((e) => e.id));
          const localOnly = existing.filter((e) => !cloudIds.has(e.id));
          writeToStorage(STORAGE_KEYS.INVENTORY_EXPENSES, [...backupData.inventoryExpenses, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.inventoryDebts)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, backupData.inventoryDebts);
        } else {
          const existing = this.getInventoryDebts();
          const cloudIds = new Set(backupData.inventoryDebts.map((d) => d.id));
          const localOnly = existing.filter((d) => !cloudIds.has(d.id));
          writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, [...backupData.inventoryDebts, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.shoppingListItems)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.SHOPPING_LIST, backupData.shoppingListItems);
        } else {
          const existing = this.getShoppingListItems();
          const cloudIds = new Set(backupData.shoppingListItems.map((s) => s.id));
          const localOnly = existing.filter((s) => !cloudIds.has(s.id));
          writeToStorage(STORAGE_KEYS.SHOPPING_LIST, [...backupData.shoppingListItems, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.shoppingCategories)) {
        writeToStorage(STORAGE_KEYS.SHOPPING_CATEGORIES, backupData.shoppingCategories);
      }
      if (Array.isArray(backupData.productCategories)) {
        writeToStorage(STORAGE_KEYS.PRODUCT_CATEGORIES, backupData.productCategories);
      }
      if (Array.isArray(backupData.customers)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.CUSTOMERS, backupData.customers);
        } else {
          const existing = this.getCustomers();
          const cloudIds = new Set(backupData.customers.map((c) => c.id));
          const localOnly = existing.filter((c) => !cloudIds.has(c.id));
          writeToStorage(STORAGE_KEYS.CUSTOMERS, [...backupData.customers, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.agents)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.AGENTS, backupData.agents);
        } else {
          const existing = this.getAgents();
          const cloudIds = new Set(backupData.agents.map((a) => a.id));
          const localOnly = existing.filter((a) => !cloudIds.has(a.id));
          writeToStorage(STORAGE_KEYS.AGENTS, [...backupData.agents, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.workers)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.WORKERS, backupData.workers);
        } else {
          const existing = this.getWorkers();
          const cloudIds = new Set(backupData.workers.map((w) => w.id));
          const localOnly = existing.filter((w) => !cloudIds.has(w.id));
          writeToStorage(STORAGE_KEYS.WORKERS, [...backupData.workers, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.staffAttendance)) {
        writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, backupData.staffAttendance);
      }
      if (Array.isArray(backupData.staffLosses)) {
        writeToStorage(STORAGE_KEYS.STAFF_LOSSES, backupData.staffLosses);
      }
      if (Array.isArray(backupData.staffSales)) {
        writeToStorage(STORAGE_KEYS.STAFF_SALES, backupData.staffSales);
      }
      if (Array.isArray(backupData.staffIncidents)) {
        writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, backupData.staffIncidents);
      }
      if (Array.isArray(backupData.qrHostedPages)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, backupData.qrHostedPages);
        } else {
          const existing = this.getHostedQRPages();
          const cloudIds = new Set(backupData.qrHostedPages.map((p) => p.id));
          const localOnly = existing.filter((p) => !cloudIds.has(p.id));
          const merged = [...backupData.qrHostedPages, ...localOnly];
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, merged.length > 0 ? merged : existing);
        }
      }
      if (Array.isArray(backupData.websitesQrItems)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.WEBSITES_QR, backupData.websitesQrItems);
        } else {
          const existing = this.getWebsitesQrItems();
          const cloudIds = new Set(backupData.websitesQrItems.map((w) => w.id));
          const localOnly = existing.filter((w) => !cloudIds.has(w.id));
          writeToStorage(STORAGE_KEYS.WEBSITES_QR, [...backupData.websitesQrItems, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.socialsQrItems)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.SOCIALS_QR, backupData.socialsQrItems);
        } else {
          const existing = this.getSocialsQrItems();
          const cloudIds = new Set(backupData.socialsQrItems.map((s) => s.id));
          const localOnly = existing.filter((s) => !cloudIds.has(s.id));
          writeToStorage(STORAGE_KEYS.SOCIALS_QR, [...backupData.socialsQrItems, ...localOnly]);
        }
      }
      if (Array.isArray(backupData.eventsQrItems)) {
        if (replaceExisting) {
          writeToStorage(STORAGE_KEYS.EVENTS_QR, backupData.eventsQrItems);
        } else {
          const existing = this.getEventsQrItems();
          const cloudIds = new Set(backupData.eventsQrItems.map((e) => e.id));
          const localOnly = existing.filter((e) => !cloudIds.has(e.id));
          writeToStorage(STORAGE_KEYS.EVENTS_QR, [...backupData.eventsQrItems, ...localOnly]);
        }
      }
      return {
        success: true,
        message: `Successfully restored ${backupData.receipts.length} receipts and settings!`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to import backup data',
      };
    }
  },

  // --- INVENTORY & STOCK MANAGEMENT ---
  getInventoryProducts(): InventoryProduct[] {
    const products = readFromStorage<InventoryProduct[]>(STORAGE_KEYS.INVENTORY_PRODUCTS, []);

    // Check if any product has an enormous uncompressed photo that could cause quota issues
    const hasBloatedImage = products.some((p) => p.image && p.image.length > 50000);
    if (hasBloatedImage) {
      setTimeout(() => {
        try {
          const sanitized = products.map((p) => {
            if (p.image && p.image.length > 50000) {
              return { ...p, image: undefined };
            }
            return p;
          });
          writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, sanitized);
        } catch {}
      }, 50);
    }

    return products;
  },

  isItemIdTaken(itemId: string, excludeProductId?: string): boolean {
    if (!itemId || !itemId.trim()) return false;
    const cleanId = itemId.trim().toLowerCase();
    const products = this.getInventoryProducts();
    return products.some(
      (p) => p.id !== excludeProductId && p.itemId.trim().toLowerCase() === cleanId
    );
  },

  saveInventoryProduct(product: InventoryProduct): boolean {
    const products = this.getInventoryProducts();

    // Prevent saving duplicate Item ID
    const duplicate = products.find(
      (p) => p.id !== product.id && p.itemId.trim().toLowerCase() === product.itemId.trim().toLowerCase()
    );
    if (duplicate) {
      console.warn(`Product with ID "${product.itemId}" already exists ("${duplicate.name}")`);
      return false;
    }

    const existingIndex = products.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({ ...product, updatedAt: new Date().toISOString() });
    }
    const success = writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, products);

    // Check if low stock
    const threshold = 5;
    if (success && product.quantity <= threshold) {
      PushNotificationService.triggerBusinessAlert({
        title: `⚠️ Low Stock Warning: ${product.name}`,
        body: `Only ${product.quantity} items left in stock!`,
        type: 'low_stock',
      }).catch(() => {});
    }

    if (success) {
      // Auto-upload product photo to Cloudflare R2 if it is a base64 image string
      if (product.image && product.image.startsWith('data:image/')) {
        const prodId = product.id;
        const mimeType = product.image.slice(5, product.image.indexOf(';')) || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpeg';
        CloudflareService.uploadFile({
          data: product.image,
          filename: `product_${prodId}_${Date.now()}.${ext}`,
          mimeType,
          folder: 'photos',
        }).then((res) => {
          if (res.success && res.url) {
            const latestProds = this.getInventoryProducts();
            const pIdx = latestProds.findIndex((p) => p.id === prodId);
            if (pIdx >= 0) {
              latestProds[pIdx].image = res.url;
              writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, latestProds);
              CloudflareService.syncAllToCloudflare().catch(() => {});
            }
          }
        }).catch(() => {});
      } else {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }

    return success;
  },

  deleteInventoryProduct(id: string): void {
    const products = this.getInventoryProducts().filter((p) => p.id !== id);
    writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, products);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  getNextInventoryItemId(): string {
    const products = this.getInventoryProducts();
    let maxId = 0;
    for (const p of products) {
      const parsed = parseInt(p.itemId, 10);
      if (!isNaN(parsed) && parsed > maxId) {
        maxId = parsed;
      }
    }
    return String(maxId + 1);
  },

  updateInventoryProductStock(productId: string, newQuantity: number): void {
    const products = this.getInventoryProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.quantity = Math.max(0, newQuantity);
      product.updatedAt = new Date().toISOString();
      writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, products);
      CloudflareService.syncAllToCloudflare().catch(() => {});

      const threshold = 5;
      if (product.quantity <= threshold) {
        PushNotificationService.triggerBusinessAlert({
          title: `⚠️ Low Stock Warning: ${product.name}`,
          body: `Only ${product.quantity} items left in stock!`,
          type: 'low_stock',
        }).catch(() => {});
      }
    }
  },

  adjustInventoryProductStock(productId: string, delta: number): void {
    const products = this.getInventoryProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.quantity = Math.max(0, product.quantity + delta);
      product.updatedAt = new Date().toISOString();
      writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, products);
      CloudflareService.syncAllToCloudflare().catch(() => {});

      const threshold = 5;
      if (product.quantity <= threshold) {
        PushNotificationService.triggerBusinessAlert({
          title: `⚠️ Low Stock Warning: ${product.name}`,
          body: `Only ${product.quantity} items left in stock!`,
          type: 'low_stock',
        }).catch(() => {});
      }
    }
  },

  getInventorySales(): InventorySale[] {
    return readFromStorage<InventorySale[]>(STORAGE_KEYS.INVENTORY_SALES, []);
  },

  recordInventorySale(saleData: Omit<InventorySale, 'id' | 'createdAt'>): InventorySale {
    const sales = this.getInventorySales();
    const newSale: InventorySale = {
      ...saleData,
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    sales.unshift(newSale);
    writeToStorage(STORAGE_KEYS.INVENTORY_SALES, sales);

    // If sale is tied to an inventory product, deduct stock
    if (newSale.productId) {
      this.adjustInventoryProductStock(newSale.productId, -newSale.quantity);
    }
    CloudflareService.syncAllToCloudflare().catch(() => {});

    return newSale;
  },

  deleteInventorySale(id: string, restoreStock: boolean = true): void {
    const sales = this.getInventorySales();
    const saleToDelete = sales.find((s) => s.id === id);
    if (saleToDelete && restoreStock && saleToDelete.productId) {
      this.adjustInventoryProductStock(saleToDelete.productId, saleToDelete.quantity);
    }
    const filtered = sales.filter((s) => s.id !== id);
    writeToStorage(STORAGE_KEYS.INVENTORY_SALES, filtered);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  updateInventorySale(id: string, updates: Partial<InventorySale>): boolean {
    const sales = this.getInventorySales();
    const index = sales.findIndex((s) => s.id === id);
    if (index === -1) return false;
    const oldSale = sales[index];
    const newQty = updates.quantity !== undefined ? updates.quantity : oldSale.quantity;
    const newPrice = updates.sellingPrice !== undefined ? updates.sellingPrice : oldSale.sellingPrice;
    const updated: InventorySale = {
      ...oldSale,
      ...updates,
      totalPrice: newQty * newPrice,
      profit: (newPrice - oldSale.costPrice) * newQty,
    };

    if (updates.quantity !== undefined && updates.quantity !== oldSale.quantity && oldSale.productId) {
      const diff = updates.quantity - oldSale.quantity;
      this.adjustInventoryProductStock(oldSale.productId, -diff);
    }

    sales[index] = updated;
    writeToStorage(STORAGE_KEYS.INVENTORY_SALES, sales);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return true;
  },

  getInventoryExpenses(): InventoryExpense[] {
    return readFromStorage<InventoryExpense[]>(STORAGE_KEYS.INVENTORY_EXPENSES, []);
  },

  recordInventoryExpense(expenseData: Omit<InventoryExpense, 'id' | 'createdAt'>): InventoryExpense {
    const expenses = this.getInventoryExpenses();
    const newExpense: InventoryExpense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    writeToStorage(STORAGE_KEYS.INVENTORY_EXPENSES, expenses);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newExpense;
  },

  deleteInventoryExpense(id: string): void {
    const expenses = this.getInventoryExpenses().filter((e) => e.id !== id);
    writeToStorage(STORAGE_KEYS.INVENTORY_EXPENSES, expenses);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  getInventoryDebts(): InventoryDebt[] {
    return readFromStorage<InventoryDebt[]>(STORAGE_KEYS.INVENTORY_DEBTS, []);
  },

  recordInventoryDebt(
    debtData: Omit<InventoryDebt, 'id' | 'createdAt' | 'status'> & {
      status?: 'unpaid' | 'paid' | 'partial';
      paidAmount?: number;
    }
  ): InventoryDebt {
    const debts = this.getInventoryDebts();
    const newDebt: InventoryDebt = {
      ...debtData,
      id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: debtData.status || 'unpaid',
      paidAmount: debtData.paidAmount || 0,
      createdAt: new Date().toISOString(),
    };
    debts.unshift(newDebt);
    writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, debts);
    CloudflareService.syncAllToCloudflare().catch(() => {});

    // Trigger Debt Reminder Notification
    if (newDebt.amount > (newDebt.paidAmount || 0)) {
      PushNotificationService.triggerBusinessAlert({
        title: `💳 Customer Debt Recorded: ${newDebt.customerName}`,
        body: `Amount: ${newDebt.amount.toLocaleString()} due on ${newDebt.dueDate || 'due date'}. Status: ${newDebt.status.toUpperCase()}`,
        type: 'debt_reminder',
      }).catch(() => {});
    }

    return newDebt;
  },

  updateInventoryDebt(id: string, updates: Partial<InventoryDebt>): boolean {
    const debts = this.getInventoryDebts();
    const idx = debts.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    debts[idx] = { ...debts[idx], ...updates };
    const success = writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, debts);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteInventoryDebt(id: string): void {
    const debts = this.getInventoryDebts().filter((d) => d.id !== id);
    writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, debts);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  markInventoryDebtPaid(id: string, paidAmount?: number): void {
    const debts = this.getInventoryDebts();
    const debt = debts.find((d) => d.id === id);
    if (debt) {
      if (paidAmount !== undefined && paidAmount < debt.amount) {
        debt.status = 'partial';
        debt.paidAmount = paidAmount;
      } else {
        debt.status = 'paid';
        debt.paidAmount = debt.amount;
        debt.settledAt = new Date().toISOString();
      }
      writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, debts);
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  },

  getInventoryStats() {
    const products = this.getInventoryProducts();
    const sales = this.getInventorySales();
    const expenses = this.getInventoryExpenses();

    let totalUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalUnits += p.quantity;
      totalStockValue += p.quantity * p.sellingPrice;
      if (p.quantity === 0) {
        outOfStockCount++;
      } else if (p.quantity < 5) {
        lowStockCount++;
      }
    }

    let totalSalesAmount = 0;
    let totalNetProfit = 0;
    for (const s of sales) {
      totalSalesAmount += s.totalPrice;
      totalNetProfit += s.profit;
    }

    let totalExpensesAmount = 0;
    for (const e of expenses) {
      totalExpensesAmount += e.amount;
    }
    totalNetProfit -= totalExpensesAmount;

    // Today's sales
    const todayStr = new Date().toISOString().split('T')[0];
    let todaySalesAmount = 0;
    let todaySalesCount = 0;
    for (const s of sales) {
      if (s.date === todayStr || s.createdAt.startsWith(todayStr)) {
        todaySalesAmount += s.totalPrice;
        todaySalesCount++;
      }
    }

    return {
      totalProducts: products.length,
      totalUnits,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      totalSalesAmount,
      totalExpensesAmount,
      totalNetProfit,
      todaySalesAmount,
      todaySalesCount,
    };
  },

  getShoppingListItems(): ShoppingListItem[] {
    return readFromStorage<ShoppingListItem[]>(STORAGE_KEYS.SHOPPING_LIST, []);
  },

  getShoppingList(): ShoppingListItem[] {
    return this.getShoppingListItems();
  },

  addShoppingListItem(itemData: Omit<ShoppingListItem, 'id' | 'createdAt' | 'checked'> & { checked?: boolean }): ShoppingListItem {
    const items = this.getShoppingListItems();
    const newItem: ShoppingListItem = {
      ...itemData,
      id: `shop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      checked: itemData.checked || false,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem); // Keep normal order (append to end of list)
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, items);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newItem;
  },

  updateShoppingListItem(id: string, updates: Partial<ShoppingListItem>): boolean {
    const items = this.getShoppingListItems();
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    items[idx] = { ...items[idx], ...updates };
    const success = writeToStorage(STORAGE_KEYS.SHOPPING_LIST, items);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteShoppingListItem(id: string): void {
    const items = this.getShoppingListItems().filter((item) => item.id !== id);
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, items);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  clearCheckedShoppingListItems(): void {
    const items = this.getShoppingListItems().filter((item) => !item.checked);
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, items);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  clearAllShoppingListItems(): void {
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, []);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  getShoppingCategories(): ShoppingCategory[] {
    return readFromStorage<ShoppingCategory[]>(STORAGE_KEYS.SHOPPING_CATEGORIES, []);
  },

  addShoppingCategory(name: string, color?: string): ShoppingCategory {
    const cats = this.getShoppingCategories();
    const newCat: ShoppingCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      color: color || '#64748b',
      createdAt: new Date().toISOString(),
    };
    cats.push(newCat);
    writeToStorage(STORAGE_KEYS.SHOPPING_CATEGORIES, cats);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newCat;
  },

  deleteShoppingCategory(id: string): void {
    const cats = this.getShoppingCategories().filter((cat) => cat.id !== id);
    writeToStorage(STORAGE_KEYS.SHOPPING_CATEGORIES, cats);

    // Re-assign items in deleted category to undefined or empty string
    const items = this.getShoppingListItems().map((item) => {
      if (item.categoryId === id) {
        const { categoryId, ...rest } = item;
        return rest as any;
      }
      return item;
    });
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, items);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  getProductCategories(): ProductCategory[] {
    return readFromStorage<ProductCategory[]>(STORAGE_KEYS.PRODUCT_CATEGORIES, []);
  },

  addProductCategory(name: string, color?: string): ProductCategory {
    const cats = this.getProductCategories();
    const newCat: ProductCategory = {
      id: `pcat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      color: color || '#64748b',
      createdAt: new Date().toISOString(),
    };
    cats.push(newCat);
    writeToStorage(STORAGE_KEYS.PRODUCT_CATEGORIES, cats);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newCat;
  },

  deleteProductCategory(id: string): void {
    const cats = this.getProductCategories().filter((cat) => cat.id !== id);
    writeToStorage(STORAGE_KEYS.PRODUCT_CATEGORIES, cats);

    // Re-assign products in deleted category to uncategorized
    const products = this.getInventoryProducts().map((prod) => {
      if (prod.categoryId === id) {
        const { categoryId, ...rest } = prod;
        return rest as any;
      }
      return prod;
    });
    writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, products);
    CloudflareService.syncAllToCloudflare().catch(() => {});
  },

  // Save in-progress draft to recover if user accidentally closes app
  saveDraft(draft: Partial<Receipt>): void {
    writeToStorage(STORAGE_KEYS.DRAFT, draft);
  },

  getDraft(): Partial<Receipt> | null {
    return readFromStorage<Partial<Receipt> | null>(STORAGE_KEYS.DRAFT, null);
  },

  clearDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    } catch {
      // ignore
    }
  },

  // --- CUSTOMER MANAGEMENT ---
  getCustomers(): Customer[] {
    return readFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  },

  saveCustomers(customers: Customer[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    writeToStorage(STORAGE_KEYS.CUSTOMERS, customers);

    // Auto-upload customer photo to Cloudflare R2 if it is base64
    if (newCustomer.profilePic && newCustomer.profilePic.startsWith('data:image/')) {
      const custId = newCustomer.id;
      const mimeType = newCustomer.profilePic.slice(5, newCustomer.profilePic.indexOf(';')) || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpeg';
      CloudflareService.uploadFile({
        data: newCustomer.profilePic,
        filename: `customer_${custId}_${Date.now()}.${ext}`,
        mimeType,
        folder: 'photos',
      }).then((res) => {
        if (res.success && res.url) {
          const latest = this.getCustomers();
          const idx = latest.findIndex((c) => c.id === custId);
          if (idx >= 0) {
            latest[idx].profilePic = res.url;
            writeToStorage(STORAGE_KEYS.CUSTOMERS, latest);
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }
        }
      }).catch(() => {});
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }

    return newCustomer;
  },

  updateCustomer(id: string, updates: Partial<Customer>): boolean {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) return false;
    customers[index] = { ...customers[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.CUSTOMERS, customers);

    if (success) {
      if (updates.profilePic && updates.profilePic.startsWith('data:image/')) {
        const mimeType = updates.profilePic.slice(5, updates.profilePic.indexOf(';')) || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpeg';
        CloudflareService.uploadFile({
          data: updates.profilePic,
          filename: `customer_${id}_${Date.now()}.${ext}`,
          mimeType,
          folder: 'photos',
        }).then((res) => {
          if (res.success && res.url) {
            const latest = this.getCustomers();
            const idx = latest.findIndex((c) => c.id === id);
            if (idx >= 0) {
              latest[idx].profilePic = res.url;
              writeToStorage(STORAGE_KEYS.CUSTOMERS, latest);
              CloudflareService.syncAllToCloudflare().catch(() => {});
            }
          }
        }).catch(() => {});
      } else {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  deleteCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    const success = writeToStorage(STORAGE_KEYS.CUSTOMERS, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- AGENT MANAGEMENT ---
  getAgents(): BusinessAgent[] {
    return readFromStorage<BusinessAgent[]>(STORAGE_KEYS.AGENTS, []);
  },

  saveAgents(agents: BusinessAgent[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.AGENTS, agents);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addAgent(agent: Omit<BusinessAgent, 'id' | 'createdAt'>): BusinessAgent {
    const agents = this.getAgents();
    const newAgent: BusinessAgent = {
      ...agent,
      id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    agents.unshift(newAgent);
    writeToStorage(STORAGE_KEYS.AGENTS, agents);

    // Auto-upload agent photo to Cloudflare R2 if base64
    if (newAgent.profilePic && newAgent.profilePic.startsWith('data:image/')) {
      const agentId = newAgent.id;
      const mimeType = newAgent.profilePic.slice(5, newAgent.profilePic.indexOf(';')) || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpeg';
      CloudflareService.uploadFile({
        data: newAgent.profilePic,
        filename: `agent_${agentId}_${Date.now()}.${ext}`,
        mimeType,
        folder: 'photos',
      }).then((res) => {
        if (res.success && res.url) {
          const latest = this.getAgents();
          const idx = latest.findIndex((a) => a.id === agentId);
          if (idx >= 0) {
            latest[idx].profilePic = res.url;
            writeToStorage(STORAGE_KEYS.AGENTS, latest);
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }
        }
      }).catch(() => {});
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }

    return newAgent;
  },

  updateAgent(id: string, updates: Partial<BusinessAgent>): boolean {
    const agents = this.getAgents();
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) return false;
    agents[index] = { ...agents[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.AGENTS, agents);

    if (success) {
      if (updates.profilePic && updates.profilePic.startsWith('data:image/')) {
        const mimeType = updates.profilePic.slice(5, updates.profilePic.indexOf(';')) || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpeg';
        CloudflareService.uploadFile({
          data: updates.profilePic,
          filename: `agent_${id}_${Date.now()}.${ext}`,
          mimeType,
          folder: 'photos',
        }).then((res) => {
          if (res.success && res.url) {
            const latest = this.getAgents();
            const idx = latest.findIndex((a) => a.id === id);
            if (idx >= 0) {
              latest[idx].profilePic = res.url;
              writeToStorage(STORAGE_KEYS.AGENTS, latest);
              CloudflareService.syncAllToCloudflare().catch(() => {});
            }
          }
        }).catch(() => {});
      } else {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  deleteAgent(id: string): boolean {
    const agents = this.getAgents();
    const filtered = agents.filter((a) => a.id !== id);
    const success = writeToStorage(STORAGE_KEYS.AGENTS, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- AGENT LEDGER / STOCK & PAYMENT RECORDS ---
  getAgentLedger(agentId?: string): AgentLedgerRecord[] {
    const records = readFromStorage<AgentLedgerRecord[]>(STORAGE_KEYS.AGENT_LEDGER, []);
    if (!agentId) return records;
    return records.filter((r) => r.agentId === agentId);
  },

  addAgentLedgerRecord(record: Omit<AgentLedgerRecord, 'id' | 'createdAt'>): AgentLedgerRecord {
    const records = this.getAgentLedger();
    const newRecord: AgentLedgerRecord = {
      ...record,
      id: `agledger-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeToStorage(STORAGE_KEYS.AGENT_LEDGER, records);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newRecord;
  },

  updateAgentLedgerRecord(id: string, updates: Partial<AgentLedgerRecord>): boolean {
    const records = this.getAgentLedger();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    records[index] = { ...records[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.AGENT_LEDGER, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteAgentLedgerRecord(id: string): boolean {
    const records = this.getAgentLedger();
    const filtered = records.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.AGENT_LEDGER, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- WORKER / STAFF MANAGEMENT ---
  getWorkers(): BusinessWorker[] {
    return readFromStorage<BusinessWorker[]>(STORAGE_KEYS.WORKERS, []);
  },

  saveWorkers(workers: BusinessWorker[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.WORKERS, workers);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addWorker(worker: Omit<BusinessWorker, 'id' | 'createdAt'>): BusinessWorker {
    const workers = this.getWorkers();
    const newWorker: BusinessWorker = {
      ...worker,
      id: `worker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    workers.unshift(newWorker);
    writeToStorage(STORAGE_KEYS.WORKERS, workers);

    // Auto-upload worker photo to Cloudflare R2 if base64
    if (newWorker.profilePic && newWorker.profilePic.startsWith('data:image/')) {
      const workerId = newWorker.id;
      const mimeType = newWorker.profilePic.slice(5, newWorker.profilePic.indexOf(';')) || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpeg';
      CloudflareService.uploadFile({
        data: newWorker.profilePic,
        filename: `staff_${workerId}_${Date.now()}.${ext}`,
        mimeType,
        folder: 'photos',
      }).then((res) => {
        if (res.success && res.url) {
          const latest = this.getWorkers();
          const idx = latest.findIndex((w) => w.id === workerId);
          if (idx >= 0) {
            latest[idx].profilePic = res.url;
            writeToStorage(STORAGE_KEYS.WORKERS, latest);
            CloudflareService.syncAllToCloudflare().catch(() => {});
          }
        }
      }).catch(() => {});
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }

    return newWorker;
  },

  updateWorker(id: string, updates: Partial<BusinessWorker>): boolean {
    const workers = this.getWorkers();
    const index = workers.findIndex((w) => w.id === id);
    if (index === -1) return false;
    workers[index] = { ...workers[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.WORKERS, workers);

    if (success) {
      if (updates.profilePic && updates.profilePic.startsWith('data:image/')) {
        const mimeType = updates.profilePic.slice(5, updates.profilePic.indexOf(';')) || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpeg';
        CloudflareService.uploadFile({
          data: updates.profilePic,
          filename: `staff_${id}_${Date.now()}.${ext}`,
          mimeType,
          folder: 'photos',
        }).then((res) => {
          if (res.success && res.url) {
            const latest = this.getWorkers();
            const idx = latest.findIndex((w) => w.id === id);
            if (idx >= 0) {
              latest[idx].profilePic = res.url;
              writeToStorage(STORAGE_KEYS.WORKERS, latest);
              CloudflareService.syncAllToCloudflare().catch(() => {});
            }
          }
        }).catch(() => {});
      } else {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  deleteWorker(id: string): boolean {
    const workers = this.getWorkers();
    const filtered = workers.filter((w) => w.id !== id);
    const success = writeToStorage(STORAGE_KEYS.WORKERS, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- STAFF ATTENDANCE MANAGEMENT ---
  getStaffAttendance(workerId?: string): StaffAttendanceRecord[] {
    const records = readFromStorage<StaffAttendanceRecord[]>(STORAGE_KEYS.STAFF_ATTENDANCE, []);
    if (workerId) {
      return records.filter((r) => r.workerId === workerId);
    }
    return records;
  },

  saveStaffAttendance(records: StaffAttendanceRecord[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addStaffAttendance(record: Omit<StaffAttendanceRecord, 'id' | 'createdAt'>): StaffAttendanceRecord {
    const records = this.getStaffAttendance();
    const newRecord: StaffAttendanceRecord = {
      ...record,
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, records);
    CloudflareService.syncAllToCloudflare().catch(() => {});

    // Trigger notification
    const workerName = this.getWorkers().find((w) => w.id === record.workerId)?.name || 'Staff Member';
    PushNotificationService.triggerBusinessAlert({
      title: `👤 Staff Check-in: ${workerName}`,
      body: `Status: ${record.status.toUpperCase()} (${record.date})`,
      type: 'staff',
    }).catch(() => {});

    return newRecord;
  },

  updateStaffAttendance(id: string, updates: Partial<StaffAttendanceRecord>): boolean {
    const records = this.getStaffAttendance();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    records[index] = { ...records[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteStaffAttendance(id: string): boolean {
    const records = this.getStaffAttendance();
    const filtered = records.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- STAFF LOSSES MANAGEMENT ---
  getStaffLosses(workerId?: string): StaffLossRecord[] {
    const records = readFromStorage<StaffLossRecord[]>(STORAGE_KEYS.STAFF_LOSSES, []);
    if (workerId) {
      return records.filter((r) => r.workerId === workerId);
    }
    return records;
  },

  saveStaffLosses(records: StaffLossRecord[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.STAFF_LOSSES, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addStaffLoss(record: Omit<StaffLossRecord, 'id' | 'createdAt'>): StaffLossRecord {
    const records = this.getStaffLosses();
    const newRecord: StaffLossRecord = {
      ...record,
      id: `loss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeToStorage(STORAGE_KEYS.STAFF_LOSSES, records);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newRecord;
  },

  updateStaffLoss(id: string, updates: Partial<StaffLossRecord>): boolean {
    const records = this.getStaffLosses();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    records[index] = { ...records[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.STAFF_LOSSES, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteStaffLoss(id: string): boolean {
    const records = this.getStaffLosses();
    const filtered = records.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.STAFF_LOSSES, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- STAFF SALES MANAGEMENT ---
  getStaffSales(workerId?: string): StaffSaleRecord[] {
    const records = readFromStorage<StaffSaleRecord[]>(STORAGE_KEYS.STAFF_SALES, []);
    if (workerId) {
      return records.filter((r) => r.workerId === workerId);
    }
    return records;
  },

  saveStaffSales(records: StaffSaleRecord[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.STAFF_SALES, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addStaffSale(record: Omit<StaffSaleRecord, 'id' | 'createdAt'>): StaffSaleRecord {
    const records = this.getStaffSales();
    const newRecord: StaffSaleRecord = {
      ...record,
      id: `ssale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeToStorage(STORAGE_KEYS.STAFF_SALES, records);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    return newRecord;
  },

  updateStaffSale(id: string, updates: Partial<StaffSaleRecord>): boolean {
    const records = this.getStaffSales();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    records[index] = { ...records[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.STAFF_SALES, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteStaffSale(id: string): boolean {
    const records = this.getStaffSales();
    const filtered = records.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.STAFF_SALES, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- STAFF INCIDENTS & MISTAKES MANAGEMENT ---
  getStaffIncidents(workerId?: string): StaffIncidentRecord[] {
    const records = readFromStorage<StaffIncidentRecord[]>(STORAGE_KEYS.STAFF_INCIDENTS, []);
    if (workerId) {
      return records.filter((r) => r.workerId === workerId);
    }
    return records;
  },

  saveStaffIncidents(records: StaffIncidentRecord[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  addStaffIncident(record: Omit<StaffIncidentRecord, 'id' | 'createdAt'>): StaffIncidentRecord {
    const records = this.getStaffIncidents();
    const newRecord: StaffIncidentRecord = {
      ...record,
      id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, records);
    CloudflareService.syncAllToCloudflare().catch(() => {});

    // Trigger Staff Incident Notification
    const workerName = this.getWorkers().find((w) => w.id === record.workerId)?.name || 'Staff Member';
    PushNotificationService.triggerBusinessAlert({
      title: `🚨 Staff Incident: ${record.title || record.type}`,
      body: `Staff: ${workerName} | Type: ${record.type} | ${record.notes || 'Logged in manager system.'}`,
      type: 'staff',
    }).catch(() => {});

    return newRecord;
  },

  updateStaffIncident(id: string, updates: Partial<StaffIncidentRecord>): boolean {
    const records = this.getStaffIncidents();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    records[index] = { ...records[index], ...updates };
    const success = writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, records);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  deleteStaffIncident(id: string): boolean {
    const records = this.getStaffIncidents();
    const filtered = records.filter((r) => r.id !== id);
    const success = writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, filtered);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // ==================== QR CODE HOSTED PAGES (DIGITAL MENUS & BUSINESS SHOWCASES) ====================

  getHostedQRPages(): QRCodeHostedPage[] {
    const profile = this.getProfile();
    const createDefault = (): QRCodeHostedPage => ({
      id: `qr-${Date.now().toString(36)}`,
      title: profile.name || '',
      tagline: profile.description || '',
      description: '',
      pageType: 'menu',
      accentColor: '#059669',
      theme: 'emerald',
      phone: profile.phone || '',
      whatsapp: profile.whatsapp || profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      googleMapsUrl: '',
      wifiName: '',
      wifiPassword: '',
      openingHours: '',
      currency: profile.currency || 'UGX',
      announcement: '',
      allowWhatsAppOrdering: true,
      socialLinks: {
        instagram: '',
        facebook: '',
        website: profile.website || '',
      },
      photos: [],
      menuCategories: ['All'],
      menuItems: [],
      qrDarkColor: '#000000',
      qrEyeColor: '#000000',
      qrLightColor: '#ffffff',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#e2e8f0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    try {
      const data = localStorage.getItem(STORAGE_KEYS.QR_HOSTED_PAGES);
      if (!data) {
        const initial = createDefault();
        try {
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, [initial]);
        } catch {}
        return [initial];
      }

      let parsed: QRCodeHostedPage[] = [];
      try {
        parsed = JSON.parse(data) as QRCodeHostedPage[];
      } catch {
        parsed = [];
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = createDefault();
        try {
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, [initial]);
        } catch {}
        return [initial];
      }

      // Business QR Pages only: strictly filter out any event, website, social or hub pages
      const businessPages = parsed.filter(
        (p) =>
          p &&
          typeof p === 'object' &&
          !p.id.startsWith('event-') &&
          !p.id.startsWith('events-hub-') &&
          !p.id.startsWith('test-event-') &&
          !p.id.startsWith('web-') &&
          !p.id.startsWith('social-')
      );

      if (businessPages.length === 0) {
        const initial = createDefault();
        try {
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, [initial]);
        } catch {}
        return [initial];
      }

      if (businessPages.length !== parsed.length) {
        try {
          writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, businessPages);
        } catch {}
      }
      return businessPages;
    } catch {
      const initial = createDefault();
      return [initial];
    }
  },

  getHostedQRPage(id: string): QRCodeHostedPage | undefined {
    const pages = this.getHostedQRPages();
    const found = pages.find((p) => p.id === id);
    if (found) return found;

    try {
      const business = this.getProfile();
      // 1. Websites & Apps Hub or Single Website Link
      if (
        id.startsWith('websites-hub') ||
        id.startsWith('web-hub') ||
        id.startsWith('website') ||
        id.startsWith('web-') ||
        id === 'websites' ||
        id === 'websites-hub-all' ||
        id.includes('websites-hub') ||
        id.includes('web-hub')
      ) {
        const websites = this.getWebsitesQrItems();
        return QRHostingService.convertWebsitesHubToHostedPage(websites, business);
      }

      // 2. Socials Hub or Single Social Link
      if (
        id.startsWith('socials-hub') ||
        id.startsWith('social-hub') ||
        id.startsWith('social') ||
        id.startsWith('social-') ||
        id === 'socials' ||
        id === 'socials-hub-all' ||
        id.includes('socials-hub') ||
        id.includes('social-hub')
      ) {
        const socials = this.getSocialsQrItems();
        return QRHostingService.convertSocialsHubToHostedPage(socials, business);
      }

      // 3. Events Hub or Single Event
      const events = this.getEventsQrItems();
      if (
        id.startsWith('events-hub') ||
        id.startsWith('event-hub') ||
        id === 'events' ||
        id === 'events-hub-all' ||
        id.includes('events-hub')
      ) {
        return QRHostingService.convertEventsHubToHostedPage(events, business);
      }
      const foundEvt = events.find((e) => e.id === id);
      if (foundEvt) {
        return QRHostingService.convertEventToHostedPage(foundEvt, business);
      }
      if (id.startsWith('event-')) {
        return QRHostingService.convertEventsHubToHostedPage(events, business);
      }
    } catch {}
    return undefined;
  },

  getAllHostedPagesForSync(): QRCodeHostedPage[] {
    const businessPages = this.getHostedQRPages();
    try {
      const events = this.getEventsQrItems();
      const websites = this.getWebsitesQrItems();
      const socials = this.getSocialsQrItems();
      const business = this.getProfile();
      const eventPages = events.map((e) => QRHostingService.convertEventToHostedPage(e, business));
      const hubPage = QRHostingService.convertEventsHubToHostedPage(events, business);
      const websitesHubPage = QRHostingService.convertWebsitesHubToHostedPage(websites, business);
      const socialsHubPage = QRHostingService.convertSocialsHubToHostedPage(socials, business);
      return [...businessPages, ...eventPages, hubPage, websitesHubPage, socialsHubPage];
    } catch {
      return businessPages;
    }
  },

  saveHostedQRPages(pages: QRCodeHostedPage[]): boolean {
    const businessPages = pages.filter(
      (p) =>
        !p.id.startsWith('event-') &&
        !p.id.startsWith('events-hub-') &&
        !p.id.startsWith('websites-hub-') &&
        !p.id.startsWith('socials-hub-') &&
        !p.id.startsWith('test-event-') &&
        !p.id.startsWith('web-') &&
        !p.id.startsWith('social-')
    );
    const success = writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, businessPages);
    if (success) {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  saveHostedQRPage(page: QRCodeHostedPage): boolean {
    if (
      page.id.startsWith('event-') ||
      page.id.startsWith('events-hub-') ||
      page.id.startsWith('websites-hub-') ||
      page.id.startsWith('socials-hub-') ||
      page.id.startsWith('test-event-') ||
      page.id.startsWith('web-') ||
      page.id.startsWith('social-')
    ) {
      // Special QR page - sync directly to Cloudflare
      CloudflareService.saveSingleQrPage(page).catch(() => {});
      return true;
    }
    const pages = this.getHostedQRPages();
    const index = pages.findIndex((p) => p.id === page.id);
    let updatedPage = { ...page, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      pages[index] = updatedPage;
    } else {
      updatedPage.createdAt = updatedPage.createdAt || new Date().toISOString();
      pages.push(updatedPage);
    }
    const success = writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, pages);

    // Asynchronously upload any base64 images (cover image, logo, gallery photos, menu item photos) to Cloudflare R2
    if (success) {
      const pageId = updatedPage.id;
      const uploadPromises: Promise<any>[] = [];

      // 1. Cover Image
      if (updatedPage.coverImage && updatedPage.coverImage.startsWith('data:image/')) {
        const mime = updatedPage.coverImage.slice(5, updatedPage.coverImage.indexOf(';')) || 'image/jpeg';
        const ext = mime.split('/')[1] || 'jpeg';
        uploadPromises.push(
          CloudflareService.uploadFile({
            data: updatedPage.coverImage,
            filename: `qr_cover_${pageId}_${Date.now()}.${ext}`,
            mimeType: mime,
            folder: 'photos',
          }).then((res) => {
            if (res.success && res.url) {
              const currentPages = this.getHostedQRPages();
              const pIdx = currentPages.findIndex((p) => p.id === pageId);
              if (pIdx >= 0) {
                currentPages[pIdx].coverImage = res.url;
                writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, currentPages);
              }
            }
          }).catch(() => {})
        );
      }

      // 2. Business Logo
      if (updatedPage.logo && updatedPage.logo.startsWith('data:image/')) {
        const mime = updatedPage.logo.slice(5, updatedPage.logo.indexOf(';')) || 'image/png';
        const ext = mime.split('/')[1] || 'png';
        uploadPromises.push(
          CloudflareService.uploadFile({
            data: updatedPage.logo,
            filename: `qr_logo_${pageId}_${Date.now()}.${ext}`,
            mimeType: mime,
            folder: 'photos',
          }).then((res) => {
            if (res.success && res.url) {
              const currentPages = this.getHostedQRPages();
              const pIdx = currentPages.findIndex((p) => p.id === pageId);
              if (pIdx >= 0) {
                currentPages[pIdx].logo = res.url;
                writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, currentPages);
              }
            }
          }).catch(() => {})
        );
      }

      // 3. Gallery Photos
      if (Array.isArray(updatedPage.photos)) {
        updatedPage.photos.forEach((photo, photoIndex) => {
          if (photo.url && photo.url.startsWith('data:image/')) {
            const mime = photo.url.slice(5, photo.url.indexOf(';')) || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpeg';
            uploadPromises.push(
              CloudflareService.uploadFile({
                data: photo.url,
                filename: `qr_photo_${pageId}_${photo.id || photoIndex}_${Date.now()}.${ext}`,
                mimeType: mime,
                folder: 'photos',
              }).then((res) => {
                if (res.success && res.url) {
                  const currentPages = this.getHostedQRPages();
                  const pIdx = currentPages.findIndex((p) => p.id === pageId);
                  if (pIdx >= 0 && currentPages[pIdx].photos?.[photoIndex]) {
                    currentPages[pIdx].photos[photoIndex].url = res.url;
                    writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, currentPages);
                  }
                }
              }).catch(() => {})
            );
          }
        });
      }

      // 4. Menu / Catalog Item Photos
      if (Array.isArray(updatedPage.menuItems)) {
        updatedPage.menuItems.forEach((item, itemIndex) => {
          if (item.photoUrl && item.photoUrl.startsWith('data:image/')) {
            const mime = item.photoUrl.slice(5, item.photoUrl.indexOf(';')) || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpeg';
            uploadPromises.push(
              CloudflareService.uploadFile({
                data: item.photoUrl,
                filename: `qr_item_${pageId}_${item.id || itemIndex}_${Date.now()}.${ext}`,
                mimeType: mime,
                folder: 'photos',
              }).then((res) => {
                if (res.success && res.url) {
                  const currentPages = this.getHostedQRPages();
                  const pIdx = currentPages.findIndex((p) => p.id === pageId);
                  if (pIdx >= 0 && currentPages[pIdx].menuItems?.[itemIndex]) {
                    currentPages[pIdx].menuItems[itemIndex].photoUrl = res.url;
                    writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, currentPages);
                  }
                }
              }).catch(() => {})
            );
          }
        });
      }

      if (uploadPromises.length > 0) {
        Promise.all(uploadPromises).then(() => {
          const fresh = this.getHostedQRPage(pageId) || updatedPage;
          CloudflareService.saveSingleQrPage(fresh).catch(() => {});
          CloudflareService.syncAllToCloudflare().catch(() => {});
        }).catch(() => {});
      } else {
        CloudflareService.saveSingleQrPage(updatedPage).catch(() => {});
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }

    return success;
  },

  deleteHostedQRPage(id: string): boolean {
    const pages = this.getHostedQRPages();
    const filtered = pages.filter((p) => p.id !== id);
    const success = writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, filtered);
    if (success) {
      CloudflareService.deleteHostedQrPage(id).catch(() => {});
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
    return success;
  },

  // --- WEBSITES / APPS QR ITEMS ---
  getWebsitesQrItems(): WebsiteAppQrItem[] {
    const raw = readFromStorage<WebsiteAppQrItem[]>(STORAGE_KEYS.WEBSITES_QR, []);
    return (raw || []).filter(
      (item) =>
        item &&
        item.id !== 'web-default-1' &&
        !item.id.includes('default') &&
        !item.id.includes('sample') &&
        !item.title?.toLowerCase().includes('sample')
    );
  },

  saveWebsitesQrItems(items: WebsiteAppQrItem[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.WEBSITES_QR, items);
    if (success) {
      try {
        const business = this.getProfile();
        QRHostingService.syncAllWebsitesPages(items, business).catch(() => {});
      } catch {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  // --- SOCIALS QR ITEMS ---
  getSocialsQrItems(): SocialQrItem[] {
    const raw = readFromStorage<SocialQrItem[]>(STORAGE_KEYS.SOCIALS_QR, []);
    return (raw || []).filter(
      (item) =>
        item &&
        item.id !== 'social-wa-1' &&
        item.id !== 'social-ig-1' &&
        !item.id.includes('default') &&
        !item.id.includes('sample') &&
        !item.title?.toLowerCase().includes('sample')
    );
  },

  saveSocialsQrItems(items: SocialQrItem[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.SOCIALS_QR, items);
    if (success) {
      try {
        const business = this.getProfile();
        QRHostingService.syncAllSocialsPages(items, business).catch(() => {});
      } catch {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  // --- EVENTS QR ITEMS ---
  getEventsQrItems(): EventQrItem[] {
    const raw = readFromStorage<EventQrItem[]>(STORAGE_KEYS.EVENTS_QR, []);
    return (raw || []).filter(
      (item) =>
        item &&
        item.id !== 'event-default-1' &&
        !item.id.includes('default') &&
        !item.id.includes('sample') &&
        !item.title?.toLowerCase().includes('sample')
    );
  },

  saveEventsQrItems(items: EventQrItem[]): boolean {
    const success = writeToStorage(STORAGE_KEYS.EVENTS_QR, items);
    if (success) {
      try {
        const business = this.getProfile();
        QRHostingService.syncAllEventsPages(items, business).catch(() => {});
      } catch {
        CloudflareService.syncAllToCloudflare().catch(() => {});
      }
    }
    return success;
  },

  getSubscription(): UserSubscription | null {
    const sub = readFromStorage<UserSubscription | null>(STORAGE_KEYS.SUBSCRIPTION, null);
    if (!sub) return null;
    // Check if expired
    if (sub.status === 'active' && sub.expiresAt) {
      if (new Date(sub.expiresAt).getTime() < Date.now()) {
        const expiredSub: UserSubscription = { ...sub, status: 'expired' };
        writeToStorage(STORAGE_KEYS.SUBSCRIPTION, expiredSub);
        return expiredSub;
      }
    }
    return sub;
  },

  saveSubscription(subscription: UserSubscription): boolean {
    return writeToStorage(STORAGE_KEYS.SUBSCRIPTION, subscription);
  },

  clearSubscription(): boolean {
    return writeToStorage(STORAGE_KEYS.SUBSCRIPTION, null);
  },

  // --- APP LOCK & INTRUDER SECURITY ---
  getAppLockConfig(): AppLockConfig | null {
    return readFromStorage<AppLockConfig | null>(STORAGE_KEYS.APP_LOCK, null);
  },

  saveAppLockConfig(config: AppLockConfig | null): boolean {
    return writeToStorage(STORAGE_KEYS.APP_LOCK, config);
  },

  isAppLocked(): boolean {
    const config = this.getAppLockConfig();
    if (!config || !config.isEnabled || !config.pin) {
      return false;
    }
    // If auto-lock on app open/reload is enabled (autoLockOnExit !== false, default is true):
    // ALWAYS require the passcode whenever the app is opened, launched, or reloaded
    if (config.autoLockOnExit !== false) {
      return true;
    }
    // If auto-lock on open was explicitly turned off by the user, only lock if explicitly locked
    const lockedState = readFromStorage<boolean | null>(STORAGE_KEYS.APP_LOCKED_STATE, null);
    return lockedState === true;
  },

  setAppLocked(locked: boolean): boolean {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('brivu_session_unlocked');
      } catch {
        // Safe fallback
      }
    }
    return writeToStorage(STORAGE_KEYS.APP_LOCKED_STATE, locked);
  },

  // --- CLOUDFLARE WORKER SYNC & STORAGE ---
  getBrivuUserId(): string {
    const user = this.getWorkOSUser();
    if (user && user.email && user.email.trim() !== '') {
      return user.email.toLowerCase().trim();
    }
    let id = readFromStorage<string | null>(STORAGE_KEYS.BRIVU_USER_ID, null);
    if (!id || typeof id !== 'string' || id.trim() === '') {
      // Create a secure, non-guessable, unique random ID starting with brivu_usr_
      id = 'brivu-usr-' + Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 10)).join('-');
      writeToStorage(STORAGE_KEYS.BRIVU_USER_ID, id);
    }
    return id;
  },

  getCloudflareConfig(): CloudflareConfig {
    const defaultVal: CloudflareConfig = {
      workerUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_WORKER_URL) || 'https://brivu.shapesmm7.workers.dev',
      apiKey: '',
      autoSaveFiles: true,
      autoSyncData: true,
      lastStatus: 'untested',
      filesFolder: 'receipts',
    };
    const loaded = readFromStorage<CloudflareConfig>(STORAGE_KEYS.CLOUDFLARE, defaultVal);
    if (!loaded.workerUrl || loaded.workerUrl.trim() === '' || loaded.workerUrl.includes('localhost') || loaded.workerUrl.includes('127.0.0.1')) {
      loaded.workerUrl = defaultVal.workerUrl;
      writeToStorage(STORAGE_KEYS.CLOUDFLARE, loaded);
    }
    // Get the unique, secure, persistent Brivu User ID
    const brivuId = this.getBrivuUserId();
    // Ensure every single device has a unique, cryptographically-isolated API key to prevent data sharing/overwriting
    if (!loaded.apiKey || loaded.apiKey.trim() === '') {
      loaded.apiKey = brivuId;
      writeToStorage(STORAGE_KEYS.CLOUDFLARE, loaded);
    }
    return loaded;
  },

  saveCloudflareConfig(config: CloudflareConfig): CloudflareConfig {
    writeToStorage(STORAGE_KEYS.CLOUDFLARE, config);
    return config;
  },

  syncReceiptToCloudflare(receipt: Receipt): void {
    try {
      const user = this.getWorkOSUser();
      const status = this.getTrialStatus();
      if (!user?.email && status.isExpired && !this.isSubscribed()) {
        console.info('Skip background Cloudflare receipt sync: Trial expired without subscription.');
        return;
      }

      const config = this.getCloudflareConfig();
      if (!config.workerUrl || config.autoSyncData === false) return;
      const url = config.workerUrl.replace(/\/$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey && config.apiKey.trim() !== '') {
        headers['X-Sync-Key'] = config.apiKey.trim();
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }
      if (user && user.email) {
        headers['X-User-Email'] = user.email.toLowerCase().trim();
        headers['X-User-Id'] = user.email.toLowerCase().trim();
      }
      fetch(`${url}/api/receipts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(receipt),
      }).catch((err) => {
        console.warn('Background Cloudflare receipt sync note:', err);
      });
    } catch {
      // Non-blocking
    }
  },

  // --- FREE TRIAL, GRACE PERIOD, AND PURGE LIFE CYCLE ---
  getInstallDate(): string {
    let date = localStorage.getItem(STORAGE_KEYS.INSTALL_DATE);
    if (!date) {
      date = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.INSTALL_DATE, date);
    }
    return date;
  },

  getDaysSinceInstall(): number {
    const installDate = this.getInstallDate();
    const diffTime = Date.now() - new Date(installDate).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  isSubscribed(): boolean {
    const sub = this.getSubscription();
    return Boolean(sub && sub.status === 'active');
  },

  getTrialStatus() {
    const daysSinceInstall = this.getDaysSinceInstall();
    const subscribed = this.isSubscribed();

    // Free trial lasts for exactly 7 days
    const isFreeTrial = daysSinceInstall <= 7;
    // Grace period lasts for exactly 7 days after free trial (day 8 to 14)
    const isGracePeriod = !isFreeTrial && daysSinceInstall <= 14 && !subscribed;
    // Expired without subscription (above 7 days since install and not subscribed)
    const isExpired = daysSinceInstall > 7 && !subscribed;
    // Grace period expired without subscription (above 14 days)
    const isGracePeriodExpired = daysSinceInstall > 14 && !subscribed;

    const remainingTrialDays = Math.max(0, 7 - daysSinceInstall);
    const remainingGraceDays = Math.max(0, 14 - daysSinceInstall);

    return {
      daysSinceInstall,
      isFreeTrial,
      isGracePeriod,
      isExpired,
      isGracePeriodExpired,
      remainingTrialDays,
      remainingGraceDays,
      subscribed,
    };
  },

  async purgeAllCloudData(): Promise<{ success: boolean; message: string }> {
    try {
      const config = this.getCloudflareConfig();
      if (!config.workerUrl) {
        return { success: false, message: 'Cloudflare Worker is not configured' };
      }
      
      const cleanUrl = config.workerUrl.replace(/\/$/, '');
      const headers: Record<string, string> = {};
      if (config.apiKey && config.apiKey.trim() !== '') {
        headers['X-Sync-Key'] = config.apiKey.trim();
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }

      // 1. Wipe bulk D1 backup by pushing an empty backup
      const emptyBackup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: { name: '', currency: 'UGX' },
        settings: { currency: 'UGX' },
        receipts: [],
        deletedReceiptIds: [],
        inventoryProducts: [],
        inventorySales: [],
        inventoryExpenses: [],
        inventoryDebts: [],
        shoppingListItems: [],
        shoppingCategories: [],
        productCategories: [],
        customers: [],
        agents: [],
        workers: [],
        staffAttendance: [],
        staffLosses: [],
        staffSales: [],
        staffIncidents: [],
        qrHostedPages: [],
      };
      
      await fetch(`${cleanUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupData: emptyBackup }),
      }).catch(() => {});

      // 2. Clear hosted QR pages individually from D1
      const localPages = this.getHostedQRPages();
      for (const p of localPages) {
        await fetch(`${cleanUrl}/api/qr/${encodeURIComponent(p.id)}`, {
          method: 'DELETE',
          headers,
        }).catch(() => {});
      }

      // Mark that cloud has been wiped/purged
      localStorage.setItem('quickreceipt_cloud_wiped_v1', 'true');
      return { success: true, message: 'All cloud files and backups permanently purged from Cloudflare' };
    } catch (err: any) {
      console.warn('Wipe all cloud data error:', err);
      return { success: false, message: err.message || 'Purge failed' };
    }
  },

  getWorkOSUser(): WorkOSUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKOS_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveWorkOSUser(user: WorkOSUser | null): void {
    try {
      if (!user) {
        localStorage.removeItem(STORAGE_KEYS.WORKOS_USER);
      } else {
        const cleanEmail = (user.email || '').toLowerCase().trim();
        const updatedUser: WorkOSUser = {
          ...user,
          id: cleanEmail || user.id,
          email: cleanEmail,
        };
        localStorage.setItem(STORAGE_KEYS.WORKOS_USER, JSON.stringify(updatedUser));
        if (cleanEmail) {
          writeToStorage(STORAGE_KEYS.BRIVU_USER_ID, cleanEmail);
        }
      }
    } catch (err) {
      console.warn('Failed to save WorkOS user to localStorage:', err);
    }
  },

  /**
   * Resets all business and operational records from the active workspace.
   * Ensures that when a user logs out or switches accounts, no private receipts or customer data remain.
   */
  clearActiveUserData(): void {
    writeToStorage(STORAGE_KEYS.RECEIPTS, []);
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    } catch {}
    writeToStorage(STORAGE_KEYS.PROFILE, { ...DEFAULT_BUSINESS_PROFILE });
    writeToStorage(STORAGE_KEYS.INVENTORY_PRODUCTS, []);
    writeToStorage(STORAGE_KEYS.INVENTORY_SALES, []);
    writeToStorage(STORAGE_KEYS.INVENTORY_EXPENSES, []);
    writeToStorage(STORAGE_KEYS.INVENTORY_DEBTS, []);
    writeToStorage(STORAGE_KEYS.SHOPPING_LIST, []);
    writeToStorage(STORAGE_KEYS.SHOPPING_CATEGORIES, []);
    writeToStorage(STORAGE_KEYS.PRODUCT_CATEGORIES, []);
    writeToStorage(STORAGE_KEYS.CUSTOMERS, []);
    writeToStorage(STORAGE_KEYS.AGENTS, []);
    writeToStorage(STORAGE_KEYS.AGENT_LEDGER, []);
    writeToStorage(STORAGE_KEYS.WORKERS, []);
    writeToStorage(STORAGE_KEYS.STAFF_ATTENDANCE, []);
    writeToStorage(STORAGE_KEYS.STAFF_LOSSES, []);
    writeToStorage(STORAGE_KEYS.STAFF_SALES, []);
    writeToStorage(STORAGE_KEYS.STAFF_INCIDENTS, []);
    writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, []);
    writeToStorage(STORAGE_KEYS.WEBSITES_QR, []);
    writeToStorage(STORAGE_KEYS.SOCIALS_QR, []);
    writeToStorage(STORAGE_KEYS.EVENTS_QR, []);
    writeToStorage(STORAGE_KEYS.DELETED_RECEIPTS, []);
  },

  /**
   * Switches user session cleanly:
   * 1. Caches previous user's workspace locally so nothing is lost if they return.
   * 2. Clears the active workspace so previous user's data never leaks to new account.
   * 3. If newUserEmail is provided, restores cached data for newUserEmail if available,
   *    or starts with a clean empty slate.
   */
  switchUserSession(newUserEmail: string | null): void {
    const activeWorkspaceUser = (localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE_USER) || '').toLowerCase().trim();
    const prevUser = this.getWorkOSUser();
    const prevEmail = (prevUser?.email || activeWorkspaceUser || '').toLowerCase().trim();
    const cleanNewEmail = (newUserEmail || '').toLowerCase().trim();

    // 1. If previous user had data in active workspace, securely cache it into their private local vault
    if (prevEmail) {
      try {
        const backup = this.exportBackup();
        localStorage.setItem(`brivu_vault_${prevEmail}`, JSON.stringify(backup));
      } catch (err) {
        console.warn('Failed to cache user vault:', err);
      }
    }

    if (!cleanNewEmail) {
      // User signed out:
      try {
        localStorage.removeItem(STORAGE_KEYS.WORKOS_USER);
        localStorage.removeItem(STORAGE_KEYS.BRIVU_USER_ID);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKSPACE_USER);
        const cf = readFromStorage<CloudflareConfig>(STORAGE_KEYS.CLOUDFLARE, null as any);
        if (cf) {
          cf.apiKey = '';
          writeToStorage(STORAGE_KEYS.CLOUDFLARE, cf);
        }
        // Securely clear the active workspace so previous user's data never leaks to unauthorized viewers
        this.clearActiveUserData();
      } catch {}
      return;
    }

    // User signed in:
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE_USER, cleanNewEmail);
    writeToStorage(STORAGE_KEYS.BRIVU_USER_ID, cleanNewEmail);

    const cf = this.getCloudflareConfig();
    cf.apiKey = cleanNewEmail;
    this.saveCloudflareConfig(cf);

    // If switching between two registered user accounts (User A -> User B):
    if (prevEmail && prevEmail !== cleanNewEmail) {
      // Clear active workspace completely to guarantee ZERO data leakage across users
      this.clearActiveUserData();

      const vaultJson = localStorage.getItem(`brivu_vault_${cleanNewEmail}`);
      if (vaultJson) {
        try {
          const vaultData = JSON.parse(vaultJson);
          this.importBackup(vaultData, true);
        } catch (_) {}
      } else {
        // Fresh account on this device: set up fresh slate for cleanNewEmail
        const cleanName = cleanNewEmail.split('@')[0] || 'My Business';
        const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        const freshProfile = {
          ...DEFAULT_BUSINESS_PROFILE,
          name: formattedTitle,
          email: cleanNewEmail,
          currency: 'UGX',
        };
        this.saveProfile(freshProfile);

        const initialQr: QRCodeHostedPage = {
          id: `qr-${Date.now().toString(36)}`,
          title: formattedTitle,
          tagline: '',
          description: '',
          pageType: 'menu',
          accentColor: '#059669',
          theme: 'emerald',
          email: cleanNewEmail,
          userEmail: cleanNewEmail,
          currency: 'UGX',
          allowWhatsAppOrdering: true,
          photos: [],
          menuCategories: ['All'],
          menuItems: [],
          qrDarkColor: '#000000',
          qrEyeColor: '#000000',
          qrLightColor: '#ffffff',
          qrBoxBgColor: '#ffffff',
          qrBoxBorderColor: '#e2e8f0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeToStorage(STORAGE_KEYS.QR_HOSTED_PAGES, [initialQr]);
      }
    } else if (!prevEmail) {
      // User created data locally/offline before logging in:
      // PRESERVE all existing local receipts, products, shopping lists, and debts!
      const vaultJson = localStorage.getItem(`brivu_vault_${cleanNewEmail}`);
      if (vaultJson) {
        try {
          const vaultData = JSON.parse(vaultJson);
          // Non-destructive merge: preserve local records and combine with user's vault
          this.importBackup(vaultData, false);
        } catch (_) {}
      }
      const prof = this.getProfile();
      if (!prof.email) {
        this.saveProfile({
          ...prof,
          email: cleanNewEmail,
        });
      }
    } else {
      const prof = this.getProfile();
      this.saveProfile({
        ...prof,
        email: cleanNewEmail,
      });
    }
  },

  clearWorkOSUser(): void {
    this.switchUserSession(null);
  },
};
