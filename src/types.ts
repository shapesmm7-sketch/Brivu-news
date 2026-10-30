export type CurrencyCode =
  | 'UGX'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'KES'
  | 'TZS'
  | 'RWF'
  | 'NGN'
  | 'GHS'
  | 'ZAR'
  | 'INR'
  | 'CAD'
  | 'AUD'
  | 'AED';

export interface CurrencyConfig {
  code: CurrencyCode | string;
  name: string;
  symbol: string;
  symbolPosition: 'prefix' | 'suffix';
  decimalPlaces: number;
  flag?: string;
}

export type PaymentMethod =
  | 'Cash'
  | 'Mobile Money'
  | 'Bank'
  | 'Card'
  | 'Check'
  | 'Other';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export type ReceiptTemplateId =
  | 'modern'
  | 'classic'
  | 'minimal'
  | 'business'
  | 'compact'
  | 'executive-navy'
  | 'emerald-mint'
  | 'crimson-bold'
  | 'indigo-tech'
  | 'charcoal-amber'
  | 'ocean-breeze'
  | 'monochrome-pro'
  | 'burgundy-prestige'
  | 'slate-borderless'
  | 'retro-kraft'
  | 'luxury'
  | 'bold'
  | 'cyber'
  | 'vintage'
  | 'thermal'
  | string;

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type TemplateFontFamily = 'helvetica' | 'times' | 'courier' | 'playfair' | 'geist';

export interface TemplateCustomization {
  headerBgColor?: string;
  headerTextColor?: string;
  headerNameColor?: string;
  headerDescColor?: string;
  headerAddressColor?: string;
  receiptTextColor?: string;
  accentColor?: string;
  totalBgColor?: string;
  totalTextColor?: string;
  paperBgColor?: string;
  fontFamily?: TemplateFontFamily;
  badgeText?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  tableBorderColor?: string;
}

export type CustomTemplateMap = Record<string, TemplateCustomization>;

export interface BusinessProfile {
  name: string;
  description?: string; // e.g., "Dealers in all types of men & women clothes, shoes & accessories"
  logo?: string; // base64 / data URL
  signature?: string; // base64 / data URL
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  taxNumber?: string;
  website?: string;
  currency: string;
  language?: string;
  customFooter?: string;
  accentColor?: string; // Custom primary brand HEX/gradient color for PDFs and receipts
  headerBgColor?: string; // Custom header banner background fill
  headerTextColor?: string; // Custom header text color
  totalBgColor?: string; // Custom total section background fill
  totalTextColor?: string; // Custom total section text color
  paperBgColor?: string; // Custom receipt paper canvas background fill
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranchSwift?: string;
  mobileMoneyMerchant?: string;
  mobileMoneyName?: string;
  defaultPaymentInstructions?: string;
}

export type DocumentType = 'receipt' | 'invoice';

export interface Receipt {
  id: string;
  currency?: string; // Optional document-level currency override
  documentType?: DocumentType; // 'receipt' | 'invoice' (default: 'receipt')
  receiptNumber: string; // or invoice number e.g. INV-01
  createdAt: string; // ISO string
  dueDate?: string; // ISO string or YYYY-MM-DD (for invoices)
  poNumber?: string; // Purchase Order / Ref No
  paymentTerms?: string; // e.g. 'Due on Receipt', 'Net 14', 'Net 30'
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxNumber?: string; // Client TIN / VAT
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountType: 'fixed' | 'percentage';
  discountAmount: number;
  taxRate?: number; // VAT or Sales Tax rate % (e.g. 18)
  taxAmount?: number; // Calculated tax amount
  shippingFee?: number; // Delivery / Extra charge
  total: number;
  amountPaid: number;
  balance: number; // positive = change to return, negative = balance due, 0 = paid exactly
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountInWords?: string;
  bankDetails?: string; // Payment instructions / bank details on invoice
  notes?: string;
  nonReturnable?: boolean;
  nonRefundable?: boolean;
  template: ReceiptTemplateId;
  accentColor?: string; // Optional receipt-specific override accent color
  customTheme?: TemplateCustomization; // Optional full template customization override
  businessSnapshot: BusinessProfile;
}

export interface ThermalPrinterDevice {
  id: string;
  name: string;
  paperWidth: '58mm' | '80mm';
  autoPrintOnSave?: boolean;
  connectedAt?: string;
  serviceUuid?: string;
  characteristicUuid?: string;
}

export interface AppSettings {
  currency: string;
  receiptPrefix: string;
  nextReceiptNumber: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  numberPadding: number;
  defaultPaymentMethod: PaymentMethod;
  defaultTemplate: ReceiptTemplateId;
  defaultDueDateDays?: number;
  defaultPaymentTerms?: string;
  defaultTaxRate?: number;
  defaultAccentColor?: string;
  templateCustomizations?: CustomTemplateMap; // Store customizations per template ID
  customFooter: string;
  darkMode: boolean;
  hapticsEnabled: boolean;
  defaultPrinter?: ThermalPrinterDevice;
}

export interface InventoryProduct {
  id: string;
  itemId: string;
  barcode?: string;
  name: string;
  image?: string;
  sizes?: string[];
  quantity: number;
  stockQuantity?: number; // Synonym/alias for quantity
  unit?: string;
  costPrice: number;
  sellingPrice: number;
  taxPercent: number;
  categoryId?: string; // product category referencing ProductCategory
  category?: string; // Legacy or direct category name alias
  createdAt: string;
  updatedAt: string;
}

export interface InventorySale {
  id: string;
  productId?: string;
  itemId?: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalPrice: number;
  profit: number;
  customerName?: string;
  categoryId?: string; // product category referencing ProductCategory
  date: string; // YYYY-MM-DD
  createdAt: string;
  remainingStock?: number; // Stock balance remaining right after this sale
}

export interface InventoryExpense {
  id: string;
  title: string;
  category?: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface DebtPayment {
  amount: number;
  date: string; // ISO string with date and time
}

export interface InventoryDebt {
  id: string;
  customerName: string; // name of the debtor / person demanded
  productTaken: string; // product/item taken
  phone: string;        // debtor's phone number
  amount: number;       // total amount demanded/owed
  description?: string; // description / additional notes
  categoryId?: string;  // product category referencing ProductCategory
  date: string;         // date recorded (YYYY-MM-DD)
  dueDate?: string;     // optional repayment due date
  status: 'unpaid' | 'paid' | 'partial';
  isPaid?: boolean;     // Helper boolean alias for status === 'paid'
  paidAmount?: number;  // amount paid so far
  payments?: DebtPayment[]; // History of payments made
  createdAt: string;
  settledAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  color?: string; // Optional hex
  createdAt: string;
}

export interface ShoppingCategory {
  id: string;
  name: string;
  color?: string; // Optional hex or tailwind class
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string; // e.g., "5", "5kg", "2 boxes"
  estimatedPrice?: number;
  estimatedCost?: number; // Alias for estimatedPrice
  checked: boolean;
  notes?: string;
  categoryId?: string; // category referencing ShoppingCategory
  hidden?: boolean;
  hiddenAt?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  location?: string;
  contact: string;
  email?: string;
  profilePic?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessAgent {
  id: string;
  agentName: string;
  shopName?: string;
  address?: string;
  contact: string;
  email?: string;
  profilePic?: string;
  notes?: string;
  createdAt: string;
}

export interface AgentLedgerRecord {
  id: string;
  agentId: string;
  date: string; // YYYY-MM-DD
  itemsTaken: string; // Name or description of items taken
  quantity?: number;
  unitPrice?: number;
  totalAmount: number; // Total price / value of items taken
  cashPaid: number; // Cash paid by agent
  remainingBalance: number; // totalAmount - cashPaid
  notes?: string;
  createdAt: string;
}

export interface BusinessWorker {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nin?: string; // National ID / NIN Number
  homeAddress?: string;
  profilePic?: string;
  startDate?: string; // YYYY-MM-DD
  salary: number;
  salaryPeriod?: 'monthly' | 'weekly' | 'daily';
  workDays?: string; // e.g. "Mon - Sat"
  workHours?: string; // e.g. "8:00 AM - 5:00 PM"
  role?: string; // e.g. "Cashier", "Store Keeper", "Sales Assistant"
  notes?: string;
  createdAt: string;
}

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'left_early';

export interface StaffAttendanceRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional end date for multi-day leave ranges)
  status: StaffAttendanceStatus;
  checkInTime?: string; // e.g. "08:15 AM"
  checkOutTime?: string; // e.g. "05:00 PM"
  notes?: string;
  createdAt: string;
}

export type StaffLossStatus = 'pending' | 'deducted' | 'waived' | 'repaid' | 'none';

export interface StaffLossRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  title: string; // Item / description of loss or damage or cash shortage
  amount: number;
  status: StaffLossStatus;
  notes?: string;
  createdAt: string;
}

export interface StaffSaleRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  itemSold: string; // Product / service description
  item?: string; // Alias for itemSold
  amount: number;
  commission?: number; // Optional commission/bonus earned
  customerName?: string;
  notes?: string;
  createdAt: string;
}

export type StaffIncidentType = 'mistake' | 'warning' | 'appreciation' | 'note' | 'none';
export type StaffIncidentSeverity = 'minor' | 'moderate' | 'critical' | 'praise';

export interface StaffIncidentRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  type: StaffIncidentType;
  title: string;
  severity?: StaffIncidentSeverity;
  actionTaken?: string;
  notes?: string;
  createdAt: string;
}

export type InventoryTab = 'add' | 'sales' | 'stock' | 'expense' | 'debts' | 'shoppingList' | 'report' | 'customers' | 'agents' | 'workers';

export interface AppBackupData {
  version: number;
  exportedAt: string;
  brivuUserId?: string;
  profile: BusinessProfile;
  settings: AppSettings;
  receipts: Receipt[];
  deletedReceiptIds?: string[];
  inventoryProducts?: InventoryProduct[];
  inventorySales?: InventorySale[];
  inventoryExpenses?: InventoryExpense[];
  inventoryDebts?: InventoryDebt[];
  shoppingListItems?: ShoppingListItem[];
  shoppingCategories?: ShoppingCategory[];
  productCategories?: ProductCategory[];
  customers?: Customer[];
  agents?: BusinessAgent[];
  workers?: BusinessWorker[];
  staffAttendance?: StaffAttendanceRecord[];
  staffLosses?: StaffLossRecord[];
  staffSales?: StaffSaleRecord[];
  staffIncidents?: StaffIncidentRecord[];
  qrHostedPages?: QRCodeHostedPage[];
  websitesQrItems?: WebsiteAppQrItem[];
  socialsQrItems?: SocialQrItem[];
  eventsQrItems?: EventQrItem[];
}

export type SocialPlatform =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'x_twitter'
  | 'youtube'
  | 'linkedin'
  | 'snapchat'
  | 'telegram'
  | 'pinterest'
  | 'google_maps'
  | 'threads'
  | 'discord'
  | 'twitch'
  | 'reddit'
  | 'wechat'
  | 'spotify'
  | 'yelp'
  | 'patreon'
  | 'github'
  | 'custom';

export interface WebsiteAppQrItem {
  id: string;
  title: string;
  url: string;
  type: 'website' | 'android_app' | 'ios_app' | 'web_app' | 'custom' | 'phone_link';
  phone?: string;
  phoneAction?: 'whatsapp' | 'tel';
  description?: string;
  ctaText: string;
  darkColor: string;
  lightColor: string;
  eyeColor?: string;
  boxBgColor?: string;
  boxBorderColor?: string;
  createdAt: string;
}

export interface SocialQrItem {
  id: string;
  platform: SocialPlatform;
  customPlatformName?: string;
  title: string;
  usernameOrPhone: string;
  fullUrl: string;
  prefilledMessage?: string;
  ctaText: string;
  darkColor: string;
  lightColor: string;
  eyeColor?: string;
  boxBgColor?: string;
  boxBorderColor?: string;
  createdAt: string;
}

export interface EventQrItem {
  id: string;
  title: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: string;
  rsvpUrl: string;
  contactPhone?: string;
  contactEmail?: string;
  description?: string;
  ctaText: string;
  photos?: string[];
  darkColor: string;
  lightColor: string;
  eyeColor?: string;
  boxBgColor?: string;
  boxBorderColor?: string;
  createdAt: string;
}

export interface QRMenuItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  promoPrice?: number;
  hasPromo?: boolean;
  promoDescription?: string;
  promoStartDate?: string;
  promoEndDate?: string;
  photoUrl?: string;
  isAvailable?: boolean;
  isSpecial?: boolean;
  tags?: string[];
  url?: string;
  ctaText?: string;
  itemType?: string;
  phone?: string;
  phoneAction?: 'whatsapp' | 'tel';
}

export interface QRBusinessPhoto {
  id: string;
  url: string;
  title?: string;
  description?: string;
  caption?: string; // Alias for description / title
  category?: string;
  badge?: string;
}

export interface QRBusinessSocialLink {
  id: string;
  name: string;
  url: string;
}

export interface QRCodeHostedPage {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  pageType: 'menu' | 'business_showcase' | 'hotel_resort' | 'catalog' | 'event' | 'events_hub' | 'website' | 'websites_hub' | 'social' | 'socials_hub' | string;
  logo?: string;
  coverImage?: string;
  accentColor?: string;
  theme?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' | 'luxury-gold';
  phone?: string;
  whatsapp?: string;
  email?: string;
  userEmail?: string;
  address?: string;
  googleMapsUrl?: string;
  wifiName?: string;
  wifiPassword?: string;
  openingHours?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
  customSocialLinks?: QRBusinessSocialLink[];
  photos: QRBusinessPhoto[];
  menuCategories: string[];
  menuItems: QRMenuItem[];
  websitesQrItems?: WebsiteAppQrItem[];
  socialsQrItems?: SocialQrItem[];
  eventsQrItems?: EventQrItem[];
  currency: string;
  announcement?: string;
  allowWhatsAppOrdering?: boolean;
  // QR Code and Box Color Customization
  qrDarkColor?: string;
  qrLightColor?: string;
  qrEyeColor?: string; // Color for the 3 corner square boxes (top-left, top-right, bottom-left)
  qrBoxBgColor?: string;
  qrBoxBorderColor?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveScreen =
  | 'news'
  | 'home'
  | 'receipts-invoices'
  | 'create-receipt'
  | 'create-invoice'
  | 'receipts'
  | 'invoices'
  | 'inventory'
  | 'preview-receipt'
  | 'profile'
  | 'templates'
  | 'settings'
  | 'qr-hosting'
  | 'qr-customer-view'
  | 'upgrade'
  | 'app-lock-setup'
  | 'cloud-backup';

export type NewsCategory =
  | 'for-you'
  | 'country'
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'australia-oceania'
  | 'middle-east'
  | 'world'
  | 'finance'
  | 'technology'
  | 'entrepreneurship'
  | 'small-business';

export interface BusinessNewsArticle {
  id: string;
  title: string;
  link: string;
  publisher: string;
  publisherDomain?: string;
  publisherUrl?: string;
  pubDate: string;
  formattedDate: string;
  description: string;
  thumbnailUrl: string;
  category: NewsCategory;
}

export type OpportunityCategory =
  | 'grants'
  | 'country'
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'australia-oceania'
  | 'middle-east'
  | 'world'
  | 'funding'
  | 'loans'
  | 'tenders'
  | 'competitions'
  | 'programmes'
  | 'training'
  | 'partnerships';

export interface BusinessOpportunity {
  id: string;
  title: string;
  organisation: string;
  publisherDomain?: string;
  countryOrRegion: string;
  description: string;
  fundingAmount?: string;
  deadline?: string;
  originalLink: string;
  verificationStatus: 'verified' | 'unverified';
  category: OpportunityCategory;
  pubDate: string;
  formattedDate: string;
  thumbnailUrl: string;
}


export type SubscriptionPlanId = '1-month' | '6-months' | '1-year';

export interface UserSubscription {
  planId: SubscriptionPlanId;
  planName: string;
  status: 'active' | 'expired' | 'canceled';
  price: number;
  formattedPrice: string;
  startDate: string;
  expiresAt: string;
  paymentMethod?: string;
  productId?: string;
  orderId?: string;
  purchaseToken?: string;
  isGooglePlay?: boolean;
  autoRenewing?: boolean;
  acknowledged?: boolean;
}

export interface AppLockConfig {
  isEnabled: boolean;
  pin: string; // Digits password (e.g., 4 or 6 digits)
  secretWord: string; // Secret word or number used for password reset/recovery
  hint?: string; // Optional reminder hint
  autoLockOnExit?: boolean; // Automatically lock on fresh tab/app start
  lastLockedAt?: string;
  updatedAt?: string;
}

export interface CloudflareConfig {
  workerUrl: string; // e.g. https://brivu-worker.subdomain.workers.dev
  apiKey?: string; // Optional secret key / token
  autoSaveFiles: boolean; // Auto-save generated receipts/invoices/reports to R2
  autoSyncData: boolean; // Auto-sync receipts & database info to D1 SQL database
  lastSyncAt?: string;
  lastStatus?: 'connected' | 'error' | 'untested';
  lastErrorMessage?: string;
  filesFolder?: string;

  // Custom live WorkOS override variables
  customWorkosClientId?: string;
  customWorkosApiKey?: string;
  overrideWorkosKeys?: boolean;

  // Optional Direct R2 / S3 API Configuration
  accessKeyId?: string;
  secretAccessKey?: string;
  s3EndpointUrl?: string; // e.g. https://<account_id>.r2.cloudflarestorage.com
  bucketName?: string; // e.g. brivu-files
  publicDomainUrl?: string; // e.g. https://pub-xxx.r2.dev or custom domain
}

export interface CloudflareFileRecord {
  key: string;
  filename: string;
  size: number;
  mimeType?: string;
  uploadedAt: string;
  url: string;
  folder?: string;
}

export interface CloudflareSyncResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  receiptsSaved?: number;
  data?: any;
}

export interface WorkOSUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  profilePictureUrl?: string;
  emailVerified?: boolean;
  provider?: 'google' | 'workos' | string;
  updatedAt?: string;
  syncedToCloudflare?: boolean;
  cloudflareStoredAt?: string;
}

export interface WorkOSAuthConfig {
  clientId?: string;
  apiKeyConfigured?: boolean;
  redirectUri?: string;
  authUrl?: string;
  workerUrl?: string;
  cloudflareClientIdConfigured?: boolean;
  cloudflareApiKeyConfigured?: boolean;
  isUsingFallback?: boolean;
}

export interface WorkOSAuthState {
  user: WorkOSUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastSyncedAt?: string;
  authProvider?: string;
}

