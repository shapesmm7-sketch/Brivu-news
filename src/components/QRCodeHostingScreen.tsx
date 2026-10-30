import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { saveFile, shareContent } from '../services/fileSaver';
import { t } from '../utils/i18n';
import {
  QrCode,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Download,
  Share2,
  ExternalLink,
  Eye,
  Camera,
  Utensils,
  Building2,
  Wifi,
  Copy,
  Check,
  Printer,
  Sparkles,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  Pencil,
  Tag,
  X,
  Layers,
  Calendar,
  BadgePercent,
  Upload,
  FolderPlus,
  Palette,
  RotateCcw,
  Cloud,
  Loader2,
  Globe,
  Smartphone,
  Store,
  ArrowUpRight,
} from 'lucide-react';
import { QRCodeHostedPage, QRMenuItem, QRBusinessPhoto, QRBusinessSocialLink, BusinessProfile } from '../types';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { QRHostingService } from '../services/qrHostingService';
import { AdMobService, ADMOB_UNITS } from '../services/admobService';
import { AdMobNativeAd } from './AdMobNativeAd';
import { compressImageFile } from '../utils/imageCompressor';
import { QRCodeColorEditorScreen } from './QRCodeColorEditorScreen';
import { PhoneInputField } from './PhoneInputField';
import { WebsitesAppsQrSection } from './WebsitesAppsQrSection';
import { SocialsQrSection } from './SocialsQrSection';
import { EventsQrSection } from './EventsQrSection';

interface QRCodeHostingScreenProps {
  business: BusinessProfile;
  onNavigateHome: () => void;
  onOpenCustomerView: (
    page: QRCodeHostedPage,
    initialTab?: 'menu' | 'photos' | 'about',
    initialItemId?: string,
    initialPhotoId?: string
  ) => void;
}

export type QRScope = 'all' | 'menu' | 'about' | 'photos';

interface ScopeOption {
  id: QRScope;
  label: string;
  badge: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
  targetTabName?: 'menu' | 'photos' | 'about';
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    id: 'all',
    label: 'All Pages (Full Hub)',
    badge: 'All-in-One Experience',
    desc: 'Customer opens the full hub with items showcase, photos, WiFi, and contact channels.',
    icon: Layers,
    accentColor: 'emerald',
    targetTabName: undefined,
  },
  {
    id: 'menu',
    label: 'Items',
    badge: 'Items',
    desc: 'Customer opens directly into the digital items showcase with category filters and ordering.',
    icon: Utensils,
    accentColor: 'amber',
    targetTabName: 'menu',
  },
  {
    id: 'about',
    label: 'Business Info',
    badge: 'Business Info',
    desc: 'Customer opens directly to venue address, phone, WhatsApp, opening hours & WiFi.',
    icon: Building2,
    accentColor: 'indigo',
    targetTabName: 'about',
  },
  {
    id: 'photos',
    label: 'Photos',
    badge: 'Photos',
    desc: 'Customer opens directly to the business photos & details.',
    icon: Camera,
    accentColor: 'rose',
    targetTabName: 'photos',
  },
];

const QR_COLOR_PRESETS = [
  { name: 'Slate / Black', value: '#0f172a' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Crimson', value: '#b91c1c' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'White', value: '#ffffff' },
];

const QR_LIGHT_PRESETS = [
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Slate Light', value: '#f8fafc' },
  { name: 'Warm Ivory', value: '#fffbeb' },
  { name: 'Mint Tint', value: '#f0fdf4' },
  { name: 'Ice Cyan', value: '#f0fdfa' },
  { name: 'Dark Onyx', value: '#0f172a' },
];

const BOX_BG_PRESETS = [
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Soft Slate', value: '#f8fafc' },
  { name: 'Warm Cream', value: '#fffbeb' },
  { name: 'Mint Wash', value: '#f0fdf4' },
  { name: 'Soft Indigo', value: '#eef2ff' },
  { name: 'Soft Rose', value: '#fff1f2' },
  { name: 'Dark Slate', value: '#0f172a' },
  { name: 'Midnight', value: '#1e1b4b' },
];

const BOX_BORDER_PRESETS = [
  { name: 'Subtle Slate', value: '#e2e8f0' },
  { name: 'Medium Gray', value: '#cbd5e1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Luxury Gold', value: '#f59e0b' },
  { name: 'Rose Red', value: '#f43f5e' },
  { name: 'Dark Slate', value: '#334155' },
  { name: 'Borderless', value: 'transparent' },
];

export const QRCodeHostingScreen: React.FC<QRCodeHostingScreenProps> = ({
  business,
  onNavigateHome,
  onOpenCustomerView,
}) => {
  // Main Category Selector: 'business' | 'websites' | 'socials' | 'events' | null (defaults to null so the Quick Actions overview screen shows first)
  const [qrCategory, setQrCategory] = useState<'business' | 'websites' | 'socials' | 'events' | null>(null);

  const [pages, setPages] = useState<QRCodeHostedPage[]>(() => StorageService.getHostedQRPages());
  const [activePageId, setActivePageId] = useState<string>(() => {
    const list = StorageService.getHostedQRPages();
    return list[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'qr' | 'info' | 'menu' | 'photos' | 'socials'>('qr');
  const [qrScope, setQrScope] = useState<QRScope>('all');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isUploadingToCloudflare, setIsUploadingToCloudflare] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('Uploading...');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  const [tableNumberForPrint, setTableNumberForPrint] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Quick QR Modal state for per-page generation
  const [showQuickQrModal, setShowQuickQrModal] = useState<boolean>(false);
  const [quickQrScope, setQuickQrScope] = useState<QRScope>('menu');
  const [quickQrDataUrl, setQuickQrDataUrl] = useState<string>('');
  const [quickQrCopied, setQuickQrCopied] = useState<boolean>(false);
  const [quickQrTableNumber, setQuickQrTableNumber] = useState<string>('');
  const [quickQrPdfLoading, setQuickQrPdfLoading] = useState<boolean>(false);

  // New menu item form state
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<QRMenuItem | null>(null);
  const [itemName, setItemName] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<string>('');
  const [itemPrice, setItemPrice] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string>('');
  const [itemTagsInput, setItemTagsInput] = useState<string>('');
  const [itemHasPromo, setItemHasPromo] = useState<boolean>(false);
  const [itemPromoPrice, setItemPromoPrice] = useState<string>('');
  const [itemPromoPercent, setItemPromoPercent] = useState<string>('');
  const [itemPromoDescription, setItemPromoDescription] = useState<string>('');
  const [itemPromoStartDate, setItemPromoStartDate] = useState<string>('');
  const [itemPromoEndDate, setItemPromoEndDate] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [categoryFeedback, setCategoryFeedback] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [categoryModalInput, setCategoryModalInput] = useState<string>('');
  const [categoryModalError, setCategoryModalError] = useState<string>('');

  // Business photo modal state (titles, categories, badges, captions)
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [editingPhoto, setEditingPhoto] = useState<QRBusinessPhoto | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [photoCategory, setPhotoCategory] = useState<string>('');
  const [photoBadge, setPhotoBadge] = useState<string>('');
  const [photoDescription, setPhotoDescription] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Item-specific QR Code Modal state
  const [itemQrModalItem, setItemQrModalItem] = useState<QRMenuItem | null>(null);
  const [itemQrDataUrl, setItemQrDataUrl] = useState<string>('');
  const [itemQrTableNumber, setItemQrTableNumber] = useState<string>('');
  const [itemQrPdfLoading, setItemQrPdfLoading] = useState<boolean>(false);
  const [itemQrCopied, setItemQrCopied] = useState<boolean>(false);

  // Photo-specific QR Code Modal state
  const [photoQrModalPhoto, setPhotoQrModalPhoto] = useState<QRBusinessPhoto | null>(null);
  const [photoQrDataUrl, setPhotoQrDataUrl] = useState<string>('');
  const [photoQrTableNumber, setPhotoQrTableNumber] = useState<string>('');
  const [photoQrPdfLoading, setPhotoQrPdfLoading] = useState<boolean>(false);
  const [photoQrCopied, setPhotoQrCopied] = useState<boolean>(false);

  // QR Page deletion state (for custom in-app confirmation modal)
  const [pageToDelete, setPageToDelete] = useState<QRCodeHostedPage | null>(null);

  // Business Socials Modal state
  const [showSocialModal, setShowSocialModal] = useState<boolean>(false);
  const [editingSocial, setEditingSocial] = useState<QRBusinessSocialLink | null>(null);
  const [socialName, setSocialName] = useState<string>('');
  const [socialUrl, setSocialUrl] = useState<string>('');

  // Dedicated QR Code Colors Editor screen state
  const [isEditingQrColors, setIsEditingQrColors] = useState<boolean>(false);

  // Photo upload ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fallbackPage = useMemo<QRCodeHostedPage>(() => {
    const cleanBizName = (business.name || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    return {
      id: `business-hub-${cleanBizName}`,
      title: business.name || 'Brivu Business',
      tagline: business.description || '',
      description: '',
    pageType: 'menu',
    accentColor: '#059669',
    theme: 'emerald',
    phone: business.phone || '',
    whatsapp: business.whatsapp || business.phone || '',
    email: business.email || '',
    address: business.address || '',
    googleMapsUrl: '',
    wifiName: '',
    wifiPassword: '',
    openingHours: '',
    currency: business.currency || 'UGX',
    announcement: '',
    allowWhatsAppOrdering: true,
    socialLinks: { instagram: '', facebook: '', website: business.website || '' },
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
}, [business]);

  const activePage: QRCodeHostedPage = (pages.find((p) => p.id === activePageId) || pages[0]) || fallbackPage;

  // Keep pages fresh when user logs in or out
  useEffect(() => {
    const handleRefresh = () => {
      const freshPages = StorageService.getHostedQRPages();
      setPages(freshPages);
      if (freshPages.length > 0 && (!activePageId || !freshPages.some((p) => p.id === activePageId))) {
        setActivePageId(freshPages[0].id);
      }
    };
    window.addEventListener('brivu_data_refreshed', handleRefresh);
    window.addEventListener('workos_user_updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('brivu_data_refreshed', handleRefresh);
      window.removeEventListener('workos_user_updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [activePageId]);

  const activeDarkColor = activePage.qrDarkColor || '#000000';
  const activeEyeColor = activePage.qrEyeColor || activePage.qrDarkColor || '#000000';
  const activeLightColor = activePage.qrLightColor || '#ffffff';
  const activeBoxBgColor = activePage.qrBoxBgColor || '#ffffff';
  const activeBoxBorderColor = activePage.qrBoxBorderColor || '#e2e8f0';

  const ownerEmail = useMemo(() => {
    const user = StorageService.getWorkOSUser();
    if (user?.email) return user.email.toLowerCase().trim();
    const profile = StorageService.getProfile();
    if (profile?.email) return profile.email.toLowerCase().trim();
    const brivuId = StorageService.getBrivuUserId();
    if (brivuId && brivuId.includes('@')) return brivuId.toLowerCase().trim();
    return QRHostingService.resolveOwnerEmail(activePage?.email || activePage?.userEmail || business.email);
  }, [activePage?.email, activePage?.userEmail, business.email]);

  // Scoped URLs
  const customerPageUrl = useMemo(() => {
    if (!activePage) return '';
    const cleanBizName = (business.name || activePage.title || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const cleanId = activePage.id?.startsWith('business-') ? activePage.id : `business-hub-${cleanBizName}`;
    return QRHostingService.getCustomerPageUrl(cleanId, qrScope, ownerEmail);
  }, [activePage, qrScope, ownerEmail, business.name]);

  const quickQrCustomerUrl = useMemo(() => {
    if (!activePage) return '';
    const cleanBizName = (business.name || activePage.title || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const cleanId = activePage.id?.startsWith('business-') ? activePage.id : `business-hub-${cleanBizName}`;
    return QRHostingService.getCustomerPageUrl(cleanId, quickQrScope, ownerEmail);
  }, [activePage, quickQrScope, ownerEmail, business.name]);

  const itemQrCustomerUrl = useMemo(() => {
    if (!activePage || !itemQrModalItem) return '';
    return QRHostingService.getCustomerItemUrl(activePage.id, itemQrModalItem.id, ownerEmail);
  }, [activePage, itemQrModalItem, ownerEmail]);

  const photoQrCustomerUrl = useMemo(() => {
    if (!activePage || !photoQrModalPhoto) return '';
    return QRHostingService.getCustomerPhotoUrl(activePage.id, photoQrModalPhoto.id, ownerEmail);
  }, [activePage, photoQrModalPhoto, ownerEmail]);

  // Sync QR pages with Cloudflare on mount
  useEffect(() => {
    if (activePage) {
      CloudflareService.saveSingleQrPage(activePage, ownerEmail).catch(() => {});
    }
    CloudflareService.syncAllToCloudflare().catch(() => {});
  }, [ownerEmail]);

  // Refresh Main QR Code when active page or scope changes
  useEffect(() => {
    if (!activePage) return;
    const url = QRHostingService.getCustomerPageUrl(activePage.id, qrScope, ownerEmail);
    QRHostingService.generateQrCodeDataUrl(url, {
      width: 600,
      margin: 1.5,
      color: {
        dark: activePage.qrDarkColor || '#000000',
        light: activePage.qrLightColor || '#ffffff',
        eyeColor: activePage.qrEyeColor || activePage.qrDarkColor || '#000000',
      },
    })
      .then((data) => setQrDataUrl(data))
      .catch((err) => console.error(err));
  }, [activePage?.id, activePage?.qrDarkColor, activePage?.qrLightColor, activePage?.qrEyeColor, qrScope, ownerEmail]);

  // Refresh Quick QR Modal QR Code
  useEffect(() => {
    if (!activePage || !showQuickQrModal) return;
    const url = QRHostingService.getCustomerPageUrl(activePage.id, quickQrScope, ownerEmail);
    QRHostingService.generateQrCodeDataUrl(url, {
      width: 600,
      margin: 1.5,
      color: {
        dark: activePage.qrDarkColor || '#000000',
        light: activePage.qrLightColor || '#ffffff',
        eyeColor: activePage.qrEyeColor || activePage.qrDarkColor || '#000000',
      },
    })
      .then((data) => setQuickQrDataUrl(data))
      .catch((err) => console.error(err));
  }, [activePage?.id, activePage?.qrDarkColor, activePage?.qrLightColor, activePage?.qrEyeColor, quickQrScope, showQuickQrModal, ownerEmail]);

  // Refresh Item QR Code when item modal is open
  useEffect(() => {
    if (!activePage || !itemQrModalItem) return;
    const url = QRHostingService.getCustomerItemUrl(activePage.id, itemQrModalItem.id, ownerEmail);
    QRHostingService.generateQrCodeDataUrl(url, {
      width: 600,
      margin: 1.5,
    })
      .then((data) => setItemQrDataUrl(data))
      .catch((err) => console.error(err));
  }, [activePage, itemQrModalItem, ownerEmail]);

  // Refresh Photo QR Code when photo modal is open
  useEffect(() => {
    if (!activePage || !photoQrModalPhoto) return;
    const url = QRHostingService.getCustomerPhotoUrl(activePage.id, photoQrModalPhoto.id, ownerEmail);
    QRHostingService.generateQrCodeDataUrl(url, {
      width: 600,
      margin: 1.5,
    })
      .then((data) => setPhotoQrDataUrl(data))
      .catch((err) => console.error(err));
  }, [activePage, photoQrModalPhoto, ownerEmail]);

  const handleOpenQuickQr = (scope: QRScope) => {
    setQuickQrScope(scope);
    setQuickQrCopied(false);
    setShowQuickQrModal(true);
  };

  const handleUpdateActivePage = (updates: Partial<QRCodeHostedPage>) => {
    if (!activePage) return;
    const resolvedEmail = ownerEmail || activePage.email || activePage.userEmail || business.email;
    const updated = {
      ...activePage,
      ...updates,
      email: resolvedEmail || activePage.email,
      userEmail: resolvedEmail || activePage.userEmail,
      updatedAt: new Date().toISOString(),
    };
    const newPages = pages.map((p) => (p.id === activePage.id ? updated : p));
    setPages(newPages);
    StorageService.saveHostedQRPage(updated);
    CloudflareService.saveSingleQrPage(updated, resolvedEmail).catch(() => {});
    CloudflareService.syncAllToCloudflare().catch(() => {});
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreateNewPage = () => {
    const newId = `business-${Date.now().toString(36)}`;
    const resolvedEmail = ownerEmail || activePage?.email || activePage?.userEmail || business.email;
    const newPage: QRCodeHostedPage = {
      id: newId,
      title: business.name || '',
      tagline: business.description || '',
      description: '',
      pageType: 'menu',
      accentColor: '#059669',
      theme: 'emerald',
      phone: business.phone || '',
      whatsapp: business.whatsapp || business.phone || '',
      email: resolvedEmail || business.email || '',
      userEmail: resolvedEmail || business.email || '',
      address: business.address || '',
      openingHours: '',
      currency: business.currency || 'UGX',
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

    const newPages = [newPage, ...pages];
    setPages(newPages);
    setActivePageId(newPage.id);
    StorageService.saveHostedQRPage(newPage);
    CloudflareService.saveSingleQrPage(newPage, resolvedEmail).catch(() => {});
    CloudflareService.syncAllToCloudflare().catch(() => {});
  };

  const handleDeletePage = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) {
      setPageToDelete(page);
    }
  };

  const handleConfirmDeletePage = () => {
    if (!pageToDelete) return;
    if (pages.length <= 1) {
      setPageToDelete(null);
      return;
    }
    const filtered = pages.filter((p) => p.id !== pageToDelete.id);
    setPages(filtered);
    StorageService.deleteHostedQRPage(pageToDelete.id);
    CloudflareService.syncAllToCloudflare().catch(() => {});
    if (activePageId === pageToDelete.id) {
      setActivePageId(filtered[0]?.id || '');
    }
    setPageToDelete(null);
  };

  const handleRemoveLogo = () => {
    if (!activePage) return;
    const resolvedEmail = ownerEmail || activePage.email || activePage.userEmail || business.email;
    const updated: QRCodeHostedPage = {
      ...activePage,
      logo: undefined,
      email: resolvedEmail || activePage.email,
      userEmail: resolvedEmail || activePage.userEmail,
      updatedAt: new Date().toISOString(),
    };
    const newPages = pages.map((p) => (p.id === activePage.id ? updated : p));
    setPages(newPages);
    StorageService.saveHostedQRPage(updated);
    CloudflareService.saveSingleQrPage(updated, resolvedEmail).catch(() => {});
    CloudflareService.syncAllToCloudflare().catch(() => {});
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRemoveCoverImage = () => {
    if (!activePage) return;
    const resolvedEmail = ownerEmail || activePage.email || activePage.userEmail || business.email;
    const updated: QRCodeHostedPage = {
      ...activePage,
      coverImage: undefined,
      email: resolvedEmail || activePage.email,
      userEmail: resolvedEmail || activePage.userEmail,
      updatedAt: new Date().toISOString(),
    };
    const newPages = pages.map((p) => (p.id === activePage.id ? updated : p));
    setPages(newPages);
    StorageService.saveHostedQRPage(updated);
    CloudflareService.saveSingleQrPage(updated, resolvedEmail).catch(() => {});
    CloudflareService.syncAllToCloudflare().catch(() => {});
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!activePage) return;
    const success = await QRHostingService.copyCustomerUrl(activePage.id, qrScope, ownerEmail);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyQuickQrLink = async () => {
    if (!activePage) return;
    const success = await QRHostingService.copyCustomerUrl(activePage.id, quickQrScope, ownerEmail);
    if (success) {
      setQuickQrCopied(true);
      setTimeout(() => setQuickQrCopied(false), 2000);
    }
  };

  const handleDownloadPng = async () => {
    if (!qrDataUrl || !activePage) return;
    const scopeLabel = qrScope === 'all' ? 'All Pages' : qrScope === 'menu' ? 'Menu & Catalog' : qrScope === 'about' ? 'About & Profile' : 'Photos Gallery';
    const qrName = tableNumberForPrint
      ? `${activePage.title} - ${tableNumberForPrint}`
      : `${activePage.title}`;
    const subtitle = qrScope === 'all'
      ? 'Point camera here for direct navigation to All Pages'
      : `Point camera here to open ${scopeLabel}`;

    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl,
      name: qrName,
      subtitle,
      tag: tableNumberForPrint || scopeLabel,
      urlOrHandle: customerPageUrl,
      boxBgColor: activePage.qrBoxBgColor,
      boxBorderColor: activePage.qrBoxBorderColor,
      darkColor: activePage.qrDarkColor,
      lightColor: activePage.qrLightColor,
      accentColor: activePage.accentColor || '#059669',
    });

    const filename = `${qrName.replace(/[^a-zA-Z0-9]/g, '_')}_${qrScope}_QRCode.png`;
    const res = await saveFile({
      data: finalPngUrl,
      filename,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleDownloadQuickQrPng = async () => {
    if (!quickQrDataUrl || !activePage) return;
    const scopeLabel = quickQrScope === 'all' ? 'All Pages' : quickQrScope === 'menu' ? 'Menu' : quickQrScope === 'about' ? 'About' : 'Photos';
    const qrName = quickQrTableNumber
      ? `${activePage.title} - ${scopeLabel} (${quickQrTableNumber})`
      : `${activePage.title} - ${scopeLabel}`;
    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl: quickQrDataUrl,
      name: qrName,
      subtitle: `Quick Scan QR Code (${scopeLabel})`,
      tag: quickQrTableNumber || scopeLabel,
      urlOrHandle: QRHostingService.getCustomerPageUrl(activePage.id, quickQrScope, ownerEmail),
      boxBgColor: activePage.qrBoxBgColor,
      boxBorderColor: activePage.qrBoxBorderColor,
      darkColor: activePage.qrDarkColor,
      lightColor: activePage.qrLightColor,
      accentColor: activePage.accentColor || '#059669',
    });

    const filename = `${qrName.replace(/[^a-zA-Z0-9]/g, '_')}_QRCode.png`;
    const res = await saveFile({
      data: finalPngUrl,
      filename,
      mimeType: 'image/png',
      title: `${qrName} Quick QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleDownloadTableStandPdf = async () => {
    if (!activePage) return;
    setIsGeneratingPdf(true);
    try {
      const currentScopeObj = SCOPE_OPTIONS.find((s) => s.id === qrScope);
      const res = await QRHostingService.downloadPrintableTableStand(activePage, {
        tableNumber: tableNumberForPrint || undefined,
        targetTab: qrScope,
        tabLabel: currentScopeObj?.badge,
      });
      if (res.success) {
        showToast(res.message);
      }
    } catch (err) {
      console.error('Failed to generate PDF table stand:', err);
      showToast('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadQuickQrPdf = async () => {
    if (!activePage) return;
    setQuickQrPdfLoading(true);
    try {
      const currentScopeObj = SCOPE_OPTIONS.find((s) => s.id === quickQrScope);
      const res = await QRHostingService.downloadPrintableTableStand(activePage, {
        tableNumber: quickQrTableNumber || undefined,
        targetTab: quickQrScope,
        tabLabel: currentScopeObj?.badge,
      });
      if (res.success) {
        showToast(res.message);
      }
    } catch (err) {
      console.error('Failed to generate PDF stand:', err);
      showToast('Failed to generate PDF. Please try again.');
    } finally {
      setQuickQrPdfLoading(false);
    }
  };

  const handleShareLink = async (scope: QRScope) => {
    if (!activePage) return;
    const url = QRHostingService.getCustomerPageUrl(activePage.id, scope, ownerEmail);
    const scopeObj = SCOPE_OPTIONS.find((s) => s.id === scope);
    const title = `${activePage.title} - ${scopeObj?.label || 'QR Menu'}`;
    const text = `Scan or visit ${activePage.title} digital page:`;

    const res = await shareContent({
      title,
      text,
      url,
      dialogTitle: 'Share QR Menu Link',
    });

    if (res.method === 'clipboard_copy') {
      if (scope === quickQrScope) {
        setQuickQrCopied(true);
        setTimeout(() => setQuickQrCopied(false), 2000);
      } else {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleOpenItemQrModal = (item: QRMenuItem) => {
    setItemQrModalItem(item);
    setItemQrCopied(false);
    setItemQrTableNumber('');
  };

  const handleOpenPhotoQrModal = (photo: QRBusinessPhoto) => {
    setPhotoQrModalPhoto(photo);
    setPhotoQrCopied(false);
    setPhotoQrTableNumber('');
  };

  const handleCopyItemLink = async () => {
    if (!activePage || !itemQrModalItem) return;
    const success = await QRHostingService.copyItemUrl(activePage.id, itemQrModalItem.id);
    if (success) {
      setItemQrCopied(true);
      setTimeout(() => setItemQrCopied(false), 2000);
    }
  };

  const handleDownloadItemPng = async () => {
    if (!itemQrDataUrl || !itemQrModalItem || !activePage) return;
    const qrName = itemQrTableNumber
      ? `${itemQrModalItem.name} (${itemQrTableNumber})`
      : itemQrModalItem.name;
    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl: itemQrDataUrl,
      name: qrName,
      subtitle: `${activePage.title} • ${activePage.currency} ${itemQrModalItem.price.toLocaleString()}`,
      tag: itemQrModalItem.category || 'Menu Item',
      urlOrHandle: QRHostingService.getCustomerItemUrl(activePage.id, itemQrModalItem.id),
      boxBgColor: activePage.qrBoxBgColor,
      boxBorderColor: activePage.qrBoxBorderColor,
      darkColor: activePage.qrDarkColor,
      lightColor: activePage.qrLightColor,
      accentColor: activePage.accentColor || '#059669',
    });

    const safeName = qrName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_Item_QRCode.png`;
    const res = await saveFile({
      data: finalPngUrl,
      filename,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleDownloadItemPdf = async () => {
    if (!activePage || !itemQrModalItem) return;
    setItemQrPdfLoading(true);
    try {
      const res = await QRHostingService.downloadPrintableItemStand(
        activePage,
        itemQrModalItem,
        itemQrTableNumber || undefined
      );
      if (res.success) {
        showToast(res.message);
      }
    } catch (err) {
      console.error('Failed to generate item PDF:', err);
      showToast('Failed to generate PDF. Please try again.');
    } finally {
      setItemQrPdfLoading(false);
    }
  };

  const handleShareItemLink = async () => {
    if (!activePage || !itemQrModalItem) return;
    const url = QRHostingService.getCustomerItemUrl(activePage.id, itemQrModalItem.id, ownerEmail);
    const title = `${itemQrModalItem.name} - ${activePage.title}`;
    const text = `Check out ${itemQrModalItem.name} (${activePage.currency} ${itemQrModalItem.price}) at ${activePage.title}:`;

    const res = await shareContent({
      title,
      text,
      url,
      dialogTitle: 'Share Item Link',
    });

    if (res.method === 'clipboard_copy') {
      await handleCopyItemLink();
    }
  };

  const handleCopyPhotoLink = async () => {
    if (!activePage || !photoQrModalPhoto) return;
    const success = await QRHostingService.copyPhotoUrl(activePage.id, photoQrModalPhoto.id, ownerEmail);
    if (success) {
      setPhotoQrCopied(true);
      setTimeout(() => setPhotoQrCopied(false), 2000);
    }
  };

  const handleDownloadPhotoPng = async () => {
    if (!photoQrDataUrl || !photoQrModalPhoto || !activePage) return;
    const photoTitle = photoQrModalPhoto.caption || photoQrModalPhoto.title || 'Photo';
    const qrName = photoQrTableNumber
      ? `${photoTitle} (${photoQrTableNumber})`
      : `${activePage.title} - ${photoTitle}`;
    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl: photoQrDataUrl,
      name: qrName,
      subtitle: 'Scan with phone camera to view full photo',
      tag: photoQrTableNumber || 'Gallery Photo',
      urlOrHandle: QRHostingService.getCustomerPhotoUrl(activePage.id, photoQrModalPhoto.id, ownerEmail),
      boxBgColor: activePage.qrBoxBgColor,
      boxBorderColor: activePage.qrBoxBorderColor,
      darkColor: activePage.qrDarkColor,
      lightColor: activePage.qrLightColor,
      accentColor: activePage.accentColor || '#059669',
    });

    const safeName = qrName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_Photo_QRCode.png`;
    const res = await saveFile({
      data: finalPngUrl,
      filename,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleDownloadPhotoPdf = async () => {
    if (!activePage || !photoQrModalPhoto) return;
    setPhotoQrPdfLoading(true);
    try {
      const res = await QRHostingService.downloadPrintablePhotoStand(
        activePage,
        photoQrModalPhoto,
        photoQrTableNumber || undefined
      );
      if (res.success) {
        showToast(res.message);
      }
    } catch (err) {
      console.error('Failed to generate photo PDF:', err);
      showToast('Failed to generate PDF. Please try again.');
    } finally {
      setPhotoQrPdfLoading(false);
    }
  };

  const handleSharePhotoLink = async () => {
    if (!activePage || !photoQrModalPhoto) return;
    const url = QRHostingService.getCustomerPhotoUrl(activePage.id, photoQrModalPhoto.id, ownerEmail);
    const title = `${photoQrModalPhoto.caption || 'Photo Details'} - ${activePage.title}`;
    const text = `Check out this photo from ${activePage.title}:`;

    const res = await shareContent({
      title,
      text,
      url,
      dialogTitle: 'Share Photo Link',
    });

    if (res.method === 'clipboard_copy') {
      await handleCopyPhotoLink();
    }
  };

  // Upload file helper with direct Cloudflare R2 save and auto-compression
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (dataUrl: string) => void,
    options: { maxDimension?: number; quality?: number; maxBytes?: number; fileTypeLabel?: string } = { maxDimension: 800, quality: 0.85 }
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const label = options.fileTypeLabel || 'Image';
    setIsUploadingToCloudflare(true);
    setUploadProgressText('Uploading...');

    try {
      const compressed = await compressImageFile(file, options);
      if (compressed) {
        // Direct upload to Cloud Storage first
        try {
          const uploadRes = await CloudflareService.uploadFile({
            data: compressed,
            filename: `qr_${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            folder: 'photos',
          });
          if (uploadRes.success && uploadRes.url) {
            callback(uploadRes.url);
            showToast('Saved');
            return;
          }
        } catch (cfErr) {
          console.warn('Cloudflare upload note:', cfErr);
        }
        // Fallback to compressed image string so user is never blocked
        callback(compressed);
        showToast('Saved');
      }
    } catch (err) {
      console.warn('Image compression failed, trying lightweight fallback:', err);
      try {
        const reader = new FileReader();
        reader.onload = async (uploadEvent) => {
          const res = uploadEvent.target?.result as string;
          if (res) {
            try {
              const uploadRes = await CloudflareService.uploadFile({
                data: res,
                filename: `qr_${Date.now()}.jpg`,
                mimeType: 'image/jpeg',
                folder: 'photos',
              });
              if (uploadRes.success && uploadRes.url) {
                callback(uploadRes.url);
                showToast('Saved');
                return;
              }
            } catch {}
            callback(res);
          }
        };
        reader.readAsDataURL(file);
      } catch {}
    } finally {
      setIsUploadingToCloudflare(false);
      e.target.value = '';
    }
  };

  const MAX_PHOTOS = 20;

  const handlePhotoUploadClick = () => {
    if (activePage && activePage.photos.length >= MAX_PHOTOS) {
      setToastMessage(`Limit reached: Maximum ${MAX_PHOTOS} photos allowed. Please delete a photo to upload a new one.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    photoInputRef.current?.click();
  };

  const handlePhotoFileUploaded = (url: string) => {
    if (!editingPhoto && activePage && activePage.photos.length >= MAX_PHOTOS) {
      setToastMessage(`Limit reached: Maximum ${MAX_PHOTOS} photos allowed. Please delete an existing photo.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setPhotoUrl(url);
    if (!showPhotoModal) {
      setEditingPhoto(null);
      setPhotoTitle('');
      setPhotoCategory('');
      setPhotoBadge('');
      setPhotoDescription('');
      setShowPhotoModal(true);
    }
  };

  const handleEditPhoto = (photo: QRBusinessPhoto) => {
    setEditingPhoto(photo);
    setPhotoUrl(photo.url);
    setPhotoTitle(photo.title || '');
    setPhotoCategory(photo.category || '');
    setPhotoBadge(photo.badge || '');
    setPhotoDescription(photo.description || photo.caption || '');
    setShowPhotoModal(true);
  };

  const handleSavePhotoModal = () => {
    if (!activePage || !photoUrl.trim()) return;

    if (!editingPhoto && activePage.photos.length >= MAX_PHOTOS) {
      setToastMessage(`Limit reached: Maximum ${MAX_PHOTOS} photos allowed. Please remove a photo.`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const finalCategory = photoCategory.trim();
    const finalBadge = photoBadge.trim() || undefined;
    const finalTitle = photoTitle.trim();
    const finalDesc = photoDescription.trim() || undefined;

    if (editingPhoto) {
      const updatedPhotos = activePage.photos.map((p) =>
        p.id === editingPhoto.id
          ? {
              ...p,
              url: photoUrl,
              title: finalTitle,
              category: finalCategory,
              badge: finalBadge,
              description: finalDesc,
              caption: finalDesc,
            }
          : p
      );
      handleUpdateActivePage({ photos: updatedPhotos });
    } else {
      const newPhoto: QRBusinessPhoto = {
        id: `photo-${Date.now()}`,
        url: photoUrl,
        title: finalTitle,
        category: finalCategory,
        badge: finalBadge,
        description: finalDesc,
        caption: finalDesc,
      };
      handleUpdateActivePage({ photos: [newPhoto, ...activePage.photos] });
    }

    setShowPhotoModal(false);
    showToast(editingPhoto ? 'Photo updated & saved!' : 'Photo added & saved!');
    AdMobService.showInterstitial('qr_photo_saved');
    setEditingPhoto(null);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!activePage) return;
    handleUpdateActivePage({
      photos: activePage.photos.filter((p) => p.id !== photoId),
    });
  };

  // Menu Item Management
  const handlePriceChange = (val: string) => {
    setItemPrice(val);
    const regular = parseFloat(val);
    const pct = parseFloat(itemPromoPercent);
    const promo = parseFloat(itemPromoPrice);

    if (!isNaN(regular) && regular > 0) {
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        const calculated = Math.round(regular * (1 - pct / 100));
        setItemPromoPrice(calculated.toString());
      } else if (!isNaN(promo) && promo > 0 && promo < regular) {
        const calculatedPct = Math.round(((regular - promo) / regular) * 100);
        setItemPromoPercent(calculatedPct > 0 ? calculatedPct.toString() : '');
      }
    }
  };

  const handlePromoPercentChange = (val: string) => {
    setItemPromoPercent(val);
    const pct = parseFloat(val);
    const regular = parseFloat(itemPrice);
    if (!isNaN(pct) && pct >= 0 && pct <= 100 && !isNaN(regular) && regular > 0) {
      const calculated = Math.round(regular * (1 - pct / 100));
      setItemPromoPrice(calculated.toString());
    } else if (val === '') {
      setItemPromoPrice('');
    }
  };

  const handlePromoPriceChange = (val: string) => {
    setItemPromoPrice(val);
    const promo = parseFloat(val);
    const regular = parseFloat(itemPrice);
    if (!isNaN(promo) && !isNaN(regular) && regular > 0) {
      if (promo > 0 && promo < regular) {
        const pct = Math.round(((regular - promo) / regular) * 100);
        setItemPromoPercent(pct > 0 ? pct.toString() : '');
      } else if (promo === 0) {
        setItemPromoPercent('100');
      } else {
        setItemPromoPercent('');
      }
    } else {
      setItemPromoPercent('');
    }
  };

  const handleOpenItemModal = (item?: QRMenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.category || '');
      setItemPrice(item.price ? item.price.toString() : '');
      setItemDescription(item.description || '');
      setItemPhotoUrl(item.photoUrl || '');
      setItemTagsInput(item.tags && item.tags.length > 0 ? item.tags.join(', ') : '');
      setItemHasPromo(Boolean(item.hasPromo));
      setItemPromoPrice(item.promoPrice ? item.promoPrice.toString() : '');
      if (item.promoPrice && item.price && item.price > item.promoPrice) {
        const pct = Math.round(((item.price - item.promoPrice) / item.price) * 100);
        setItemPromoPercent(pct > 0 ? pct.toString() : '');
      } else {
        setItemPromoPercent('');
      }
      setItemPromoDescription(item.promoDescription || '');
      setItemPromoStartDate(item.promoStartDate || '');
      setItemPromoEndDate(item.promoEndDate || '');
    } else {
      setEditingItem(null);
      setItemName('');
      setItemCategory(selectedCategoryFilter !== 'All' ? selectedCategoryFilter : '');
      setItemPrice('');
      setItemDescription('');
      setItemPhotoUrl('');
      setItemTagsInput('');
      setItemHasPromo(false);
      setItemPromoPrice('');
      setItemPromoPercent('');
      setItemPromoDescription('');
      setItemPromoStartDate(new Date().toISOString().split('T')[0]);
      setItemPromoEndDate('');
    }
    setShowAddItemModal(true);
  };

  const handleSaveMenuItem = () => {
    if (!itemName.trim() || !activePage) return;
    const priceNum = parseFloat(itemPrice) || 0;
    const finalCategory = itemCategory.trim();
    const finalTags = itemTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const promoPriceNum = parseFloat(itemPromoPrice) || undefined;

    const newItem: QRMenuItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      name: itemName.trim(),
      category: finalCategory,
      price: priceNum,
      hasPromo: itemHasPromo,
      promoPrice: itemHasPromo && promoPriceNum ? promoPriceNum : undefined,
      promoDescription: itemHasPromo && itemPromoDescription.trim() ? itemPromoDescription.trim() : undefined,
      promoStartDate: itemHasPromo && itemPromoStartDate ? itemPromoStartDate : undefined,
      promoEndDate: itemHasPromo && itemPromoEndDate ? itemPromoEndDate : undefined,
      description: itemDescription.trim(),
      photoUrl: itemPhotoUrl,
      tags: finalTags.length > 0 ? finalTags : undefined,
      isAvailable: editingItem ? editingItem.isAvailable !== false : true,
    };

    let updatedList: QRMenuItem[];
    if (editingItem) {
      updatedList = activePage.menuItems.map((i) => (i.id === editingItem.id ? newItem : i));
    } else {
      updatedList = [newItem, ...activePage.menuItems];
    }

    // Keep categories dynamically updated with user's chosen categories
    const cats = new Set<string>(['All']);
    (activePage.menuCategories || []).forEach((c) => {
      if (c && c !== 'All') cats.add(c.trim());
    });
    updatedList.forEach((i) => {
      if (i.category && i.category.trim()) cats.add(i.category.trim());
    });

    handleUpdateActivePage({
      menuItems: updatedList,
      menuCategories: Array.from(cats),
    });

    setShowAddItemModal(false);
    showToast(editingItem ? 'Item updated & saved!' : 'Item added & saved!');
    AdMobService.showInterstitial('qr_item_saved');
  };

  const handleDeleteMenuItem = (id: string) => {
    if (!activePage) return;
    handleUpdateActivePage({
      menuItems: activePage.menuItems.filter((i) => i.id !== id),
    });
  };

  const handleToggleItemAvailability = (id: string) => {
    if (!activePage) return;
    handleUpdateActivePage({
      menuItems: activePage.menuItems.map((i) => (i.id === id ? { ...i, isAvailable: !i.isAvailable } : i)),
    });
  };

  const handleOpenAddSocial = () => {
    setEditingSocial(null);
    setSocialName('');
    setSocialUrl('');
    setShowSocialModal(true);
  };

  const handleOpenEditSocial = (soc: QRBusinessSocialLink) => {
    setEditingSocial(soc);
    setSocialName(soc.name);
    setSocialUrl(soc.url);
    setShowSocialModal(true);
  };

  const handleSaveSocial = () => {
    if (!socialName.trim()) {
      showToast('Please enter social name (e.g. Instagram, WhatsApp)');
      return;
    }
    if (!socialUrl.trim()) {
      showToast('Please enter social link / URL');
      return;
    }

    let formattedUrl = socialUrl.trim();
    if (
      !/^https?:\/\//i.test(formattedUrl) &&
      !/^mailto:/i.test(formattedUrl) &&
      !/^tel:/i.test(formattedUrl)
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const existingSocials = activePage.customSocialLinks || [];
    let updatedSocials: QRBusinessSocialLink[];

    if (editingSocial) {
      updatedSocials = existingSocials.map((s) =>
        s.id === editingSocial.id ? { ...s, name: socialName.trim(), url: formattedUrl } : s
      );
    } else {
      const newSocial: QRBusinessSocialLink = {
        id: `soc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: socialName.trim(),
        url: formattedUrl,
      };
      updatedSocials = [...existingSocials, newSocial];
    }

    handleUpdateActivePage({ customSocialLinks: updatedSocials });
    setShowSocialModal(false);
    showToast(editingSocial ? 'Social link updated!' : 'Social link added!');
  };

  const handleDeleteSocial = (id: string) => {
    const existingSocials = activePage.customSocialLinks || [];
    const updatedSocials = existingSocials.filter((s) => s.id !== id);
    handleUpdateActivePage({ customSocialLinks: updatedSocials });
    showToast('Social link removed');
  };

  const handleOpenCategoryModal = () => {
    setCategoryModalInput('');
    setCategoryModalError('');
    setShowCategoryModal(true);
  };

  const handleSaveCategoryModal = () => {
    const trimmed = categoryModalInput.trim();
    if (!trimmed) {
      setCategoryModalError('Please enter a category name');
      return;
    }
    if (!activePage) return;

    const existingCats = activePage.menuCategories || [];
    const exists = existingCats.some((c) => c.toLowerCase() === trimmed.toLowerCase());

    if (!exists) {
      const updatedCats = [...existingCats.filter((c) => c !== 'All'), trimmed];
      handleUpdateActivePage({
        menuCategories: updatedCats,
      });
      setCategoryFeedback(`Category "${trimmed}" added!`);
    } else {
      setCategoryFeedback(`Category "${trimmed}" selected.`);
    }

    setSelectedCategoryFilter(trimmed);
    if (showAddItemModal) {
      setItemCategory(trimmed);
    }
    setShowCategoryModal(false);
    setTimeout(() => setCategoryFeedback(''), 3500);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (!activePage) return;
    const updatedCats = (activePage.menuCategories || []).filter((c) => c !== categoryToDelete);
    handleUpdateActivePage({
      menuCategories: updatedCats,
    });
    if (selectedCategoryFilter.toLowerCase() === categoryToDelete.toLowerCase()) {
      setSelectedCategoryFilter('All');
    }
    setCategoryFeedback(`Category "${categoryToDelete}" removed.`);
    setTimeout(() => setCategoryFeedback(''), 3500);
  };

  // Categories dynamically derived from active items & user created categories
  const userCategories = useMemo(() => {
    if (!activePage) return [];
    const set = new Set<string>();
    (activePage.menuCategories || []).forEach((c) => {
      if (c && c.trim() && c.trim() !== 'All') {
        set.add(c.trim());
      }
    });
    (activePage.menuItems || []).forEach((i) => {
      if (i.category && i.category.trim()) {
        set.add(i.category.trim());
      }
    });
    return Array.from(set);
  }, [activePage]);

  // Items filtered by category selection
  const filteredMenuItems = useMemo(() => {
    if (!activePage) return [];
    if (selectedCategoryFilter === 'All') return activePage.menuItems;
    return activePage.menuItems.filter(
      (i) => (i.category || 'General').toLowerCase() === selectedCategoryFilter.toLowerCase()
    );
  }, [activePage, selectedCategoryFilter]);

  if (!activePage) {
    return null;
  }

  if (isEditingQrColors) {
    return (
      <QRCodeColorEditorScreen
        page={activePage}
        onSave={(updates) => handleUpdateActivePage(updates)}
        onBack={() => setIsEditingQrColors(false)}
      />
    );
  }

  return (
    <div className="space-y-5 pt-2 pb-36 sm:pb-40 animate-fadeIn max-w-2xl mx-auto">
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, handlePhotoFileUploaded, { maxDimension: 1920, quality: 0.95, maxBytes: 1500 * 1024, fileTypeLabel: 'Photo' })}
      />
      <input
        ref={itemPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, (data) => setItemPhotoUrl(data), { maxDimension: 1600, quality: 0.95, fileTypeLabel: 'Item Photo' })}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, (url) => handleUpdateActivePage({ coverImage: url }), { maxDimension: 1920, quality: 0.95, fileTypeLabel: 'Cover Banner' })}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, (url) => handleUpdateActivePage({ logo: url }), { maxDimension: 1024, quality: 0.95, fileTypeLabel: 'Business Logo' })}
      />

      {/* Uploading Overlay */}
      {isUploadingToCloudflare && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3 max-w-xs text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{uploadProgressText}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Saving...</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={qrCategory ? () => setQrCategory(null) : onNavigateHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        {qrCategory === 'business' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const freshPages = StorageService.getHostedQRPages();
                setPages(freshPages);
                if (activePage) {
                  CloudflareService.saveSingleQrPage(activePage, ownerEmail).catch(() => {});
                }
                CloudflareService.syncAllToCloudflare().catch(() => {});
                showToast('Data synced & saved!');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition active:scale-95 cursor-pointer"
              title="Save and sync all QR code files, stand PDFs, photos, and items"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Cloud Sync</span>
            </button>

            {isSaved && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved!
              </span>
            )}

            <button
              onClick={() => onOpenCustomerView(activePage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        )}
      </div>

      {/* OVERVIEW SCREEN: When qrCategory is null, show the clean Quick Actions dashboard matching screenshot */}
      {qrCategory === null && (
        <div className="space-y-3 pt-1 animate-fadeIn">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('quick_actions', business?.language) || 'QUICK ACTIONS'}
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              {t('select_option', business?.language) || 'Select an option below'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* 1. BUSINESS QR BUTTON */}
            <button
              id="btn-main-qr-business"
              type="button"
              onClick={() => setQrCategory('business')}
              className="group relative flex flex-col justify-between p-3 rounded-2xl bg-gradient-to-br from-[#059669] to-[#047857] text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-left min-h-[82px] sm:min-h-[90px] cursor-pointer active:scale-98"
            >
              <div className="flex items-start justify-between w-full mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Store className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                  <span>Hub</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <div className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  Business QR
                </div>
                <p className="text-[10px] sm:text-[11px] font-normal text-emerald-100/90 mt-0.5 leading-snug line-clamp-2">
                  Host catalog, menu, photos, WiFi & info
                </p>
              </div>
            </button>

            {/* 2. WEBSITES / APPS QR BUTTON */}
            <button
              id="btn-main-qr-websites"
              type="button"
              onClick={() => setQrCategory('websites')}
              className="group relative flex flex-col justify-between p-3 rounded-2xl bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#4338ca] text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-left min-h-[82px] sm:min-h-[90px] cursor-pointer active:scale-98"
            >
              <div className="flex items-start justify-between w-full mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Globe className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                  <span>Links</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <div className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  Websites / Apps QR
                </div>
                <p className="text-[10px] sm:text-[11px] font-normal text-blue-100/90 mt-0.5 leading-snug line-clamp-2">
                  Websites, Google Play, App Store & links
                </p>
              </div>
            </button>

            {/* 3. SOCIALS QR BUTTON */}
            <button
              id="btn-main-qr-socials"
              type="button"
              onClick={() => setQrCategory('socials')}
              className="group relative flex flex-col justify-between p-3 rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#064e3b] text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-left min-h-[82px] sm:min-h-[90px] cursor-pointer active:scale-98"
            >
              <div className="flex items-start justify-between w-full mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                  <span>Socials</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <div className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  Socials QR
                </div>
                <p className="text-[10px] sm:text-[11px] font-normal text-teal-100/90 mt-0.5 leading-snug line-clamp-2">
                  WhatsApp, Instagram, TikTok & Facebook
                </p>
              </div>
            </button>

            {/* 4. HOST EVENTS QR BUTTON */}
            <button
              id="btn-main-qr-events"
              type="button"
              onClick={() => setQrCategory('events')}
              className="group relative flex flex-col justify-between p-3 rounded-2xl bg-gradient-to-br from-[#9333ea] via-[#7c3aed] to-[#4c1d95] text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-left min-h-[82px] sm:min-h-[90px] cursor-pointer active:scale-98"
            >
              <div className="flex items-start justify-between w-full mb-0.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                  <span>Events</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <div className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
                  Host Events
                </div>
                <p className="text-[10px] sm:text-[11px] font-normal text-purple-100/90 mt-0.5 leading-snug line-clamp-2">
                  Conferences, parties & invitations
                </p>
              </div>
            </button>
          </div>
        </div>
      )}



      {/* WEBSITES / APPS QR SECTION */}
      {qrCategory === 'websites' && (
        <WebsitesAppsQrSection
          business={business}
          hostedPageId={activePageId || activePage?.id}
          showToast={showToast}
          onOpenCustomerView={(page) => onOpenCustomerView(page)}
        />
      )}

      {/* SOCIALS QR SECTION */}
      {qrCategory === 'socials' && (
        <SocialsQrSection
          business={business}
          hostedPageId={activePageId || activePage?.id}
          showToast={showToast}
          onOpenCustomerView={(page) => onOpenCustomerView(page)}
        />
      )}

      {/* EVENTS QR SECTION */}
      {qrCategory === 'events' && (
        <EventsQrSection
          business={business}
          hostedPageId={activePageId || activePage?.id}
          showToast={showToast}
          onOpenCustomerView={(page) => onOpenCustomerView(page)}
        />
      )}

      {/* BUSINESS QR SECTIONS */}
      {qrCategory === 'business' && (
        <>
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-5 sm:p-6 text-white shadow-md">
        {activePage.coverImage && (
          <img
            src={activePage.coverImage}
            alt="Cover background"
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-overlay"
          />
        )}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {activePage.logo ? (
              <img
                src={activePage.logo}
                alt="Business Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover bg-white/20 border-2 border-white/40 shadow-md shrink-0"
              />
            ) : null}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200">
                  Host QR code & business info
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{activePage.title}</h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1 leading-snug">
                Host your business info, photos, and items. Generate a scannable QR code for tables & flyers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCreateNewPage}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New QR Page</span>
            </button>
          </div>
        </div>

        </div>

      {/* Screen Navigation Tabs: QR Code | Business Info | Hotel Menu | Photos */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-slate-200 dark:bg-slate-800/80 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('qr')}
          className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition ${
            activeTab === 'qr'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">QR Stand</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition ${
            activeTab === 'info'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">Info</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition ${
            activeTab === 'menu'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">Items ({activePage.menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition ${
            activeTab === 'photos'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="truncate">Photos ({activePage.photos.length}/20)</span>
        </button>
      </div>

      {/* TAB 1: QR CODE & PRINTABLE TABLE STAND */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mb-2">
              <QrCode className="w-3.5 h-3.5" />
              <span>All-in-One Experience QR Code</span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Scannable Customer QR Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Point phone camera here to test direct navigation to All Pages (Full Hub)
            </p>

            {/* QR Code Name Input Field On Top of QR Code Box */}
            <div className="max-w-xs sm:max-w-sm mx-auto mt-4 mb-3 text-left">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>QR Code Name</span>
                {tableNumberForPrint && (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Included on Downloads
                  </span>
                )}
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="e.g. Main Office, Reception, Entrance, Display Poster"
                  value={tableNumberForPrint}
                  onChange={(e) => setTableNumberForPrint(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
                {tableNumberForPrint && (
                  <button
                    type="button"
                    onClick={() => setTableNumberForPrint('')}
                    className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Container with Custom Box & Border Colors */}
            <div
              className="inline-block p-4 sm:p-5 rounded-3xl shadow-xl transition-all duration-300 relative"
              style={{
                backgroundColor: activeBoxBgColor,
                borderColor: activeBoxBorderColor === 'transparent' ? 'transparent' : activeBoxBorderColor,
                borderWidth: activeBoxBorderColor === 'transparent' ? '0px' : '4px',
                borderStyle: 'solid',
              }}
            >
              {tableNumberForPrint && (
                <div className="mb-2.5 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider shadow-xs">
                    {tableNumberForPrint}
                  </span>
                </div>
              )}
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Hosted QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain transition-transform"
                  style={{
                    backgroundColor: activeLightColor,
                    borderRadius: '16px',
                    padding: '8px',
                  }}
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR Code...
                </div>
              )}
            </div>

            {/* Dedicated QR Code & Box Editor Button Near QR Code */}
            <div className="mt-3.5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsEditingQrColors(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition active:scale-95 shadow-xs"
              >
                <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>QR Code & Box Editor</span>
              </button>
            </div>

            {/* Direct URL Box */}
            <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs max-w-md mx-auto">
              <span className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-[280px]">
                {customerPageUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition"
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Action Buttons: Download PNG, Share, Customer Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto mt-4">
              <button
                onClick={handleDownloadPng}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => handleShareLink(qrScope)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>

              <button
                onClick={() => onOpenCustomerView(activePage, qrScope === 'all' ? undefined : (qrScope as any))}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm shadow-emerald-600/20 sm:col-span-1 col-span-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test Preview</span>
              </button>
            </div>
          </div>

          {/* Printable Table Stand / Wall Poster Generator Card */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Print Table & Wall QR Code Poster (PDF)
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Download a high-resolution A4 poster with your business name & QR code.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                  QR Code Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Office, Reception, Entrance, Display Poster"
                  value={tableNumberForPrint}
                  onChange={(e) => setTableNumberForPrint(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleDownloadTableStandPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Table & Wall Poster (PDF)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Native Advanced Ad in QR Stand */}
          <AdMobNativeAd
            context="qr"
            variant="card"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

      {/* TAB 2: BUSINESS INFORMATION */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          {/* Quick QR Generation Action Bar for Info Page */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Generate Info & Contacts QR Code
                </h3>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  Create a QR code that opens directly to this Info & Contacts page
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenQuickQr('about')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-95 transition shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Generate Info QR Code</span>
            </button>
          </div>

          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business & Venue Details</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400">Venue / Business Title</label>
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => handleUpdateActivePage({ title: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400">Tagline / Slogan</label>
              <input
                type="text"
                placeholder="e.g. Fine Dining, Artisan Coffee & Luxury Comfort"
                value={activePage.tagline || ''}
                onChange={(e) => handleUpdateActivePage({ tagline: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400">About / Welcome Message</label>
              <textarea
                rows={3}
                placeholder="Describe your dishes, restaurant concept, or services..."
                value={activePage.description || ''}
                onChange={(e) => handleUpdateActivePage({ description: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Announcement Banner */}
            <div>
              <label className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Special Promo / Announcement Notice (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 20% off all cocktails every Friday 5PM - 8PM!"
                value={activePage.announcement || ''}
                onChange={(e) => handleUpdateActivePage({ announcement: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 focus:ring-2 focus:ring-amber-500 focus:outline-none text-amber-900 dark:text-amber-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhoneInputField
                id="input-qr-phone"
                label="Phone Number"
                value={activePage.phone || ''}
                onChange={(val) => handleUpdateActivePage({ phone: val })}
                placeholder="700 123 456"
              />

              <PhoneInputField
                id="input-qr-whatsapp"
                label="WhatsApp Number"
                icon={MessageCircle}
                value={activePage.whatsapp || ''}
                onChange={(val) => handleUpdateActivePage({ whatsapp: val })}
                placeholder="700 123 456"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Physical Address / Location</label>
                <input
                  type="text"
                  placeholder="Plot 22 Kampala Road, Kampala"
                  value={activePage.address || ''}
                  onChange={(e) => handleUpdateActivePage({ address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Opening Hours</label>
                <input
                  type="text"
                  placeholder="Mon - Sun: 7:00 AM - 11:30 PM"
                  value={activePage.openingHours || ''}
                  onChange={(e) => handleUpdateActivePage({ openingHours: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Guest Wi-Fi details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Guest Wi-Fi Details (Displayed to Customers)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Wi-Fi Name (SSID)</label>
                  <input
                    type="text"
                    placeholder="Guest_WiFi"
                    value={activePage.wifiName || ''}
                    onChange={(e) => handleUpdateActivePage({ wifiName: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Wi-Fi Password</label>
                  <input
                    type="text"
                    placeholder="Password123"
                    value={activePage.wifiPassword || ''}
                    onChange={(e) => handleUpdateActivePage({ wifiPassword: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Ordering Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Allow WhatsApp Orders for Items</p>
                <p className="text-[11px] text-slate-500">
                  Customers can tap items, add table number, and send order straight to your WhatsApp
                </p>
              </div>
              <input
                type="checkbox"
                checked={activePage.allowWhatsAppOrdering !== false}
                onChange={(e) => handleUpdateActivePage({ allowWhatsAppOrdering: e.target.checked })}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Branding Logos & Banners */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Visual Branding (Logo & Cover Banner)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Uploaded branding appears on customer QR screens and PDF table stands
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Business Logo Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Business Logo</span>
                    </span>
                    {activePage.logo && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Uploaded
                      </span>
                    )}
                  </div>

                  {activePage.logo ? (
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                        <img
                          src={activePage.logo}
                          alt="Uploaded Logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          Current Logo
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition active:scale-95"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                            title="Delete logo"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 text-center transition flex flex-col items-center justify-center gap-1.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Upload Business Logo</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG or WEBP</span>
                    </button>
                  )}
                </div>

                {/* Cover Banner Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-teal-600" />
                      <span>Cover Banner</span>
                    </span>
                    {activePage.coverImage && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Uploaded
                      </span>
                    )}
                  </div>

                  {activePage.coverImage ? (
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
                        <img
                          src={activePage.coverImage}
                          alt="Cover Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Header Backdrop
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition active:scale-95"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveCoverImage}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1 transition active:scale-95"
                            title="Delete cover banner"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 text-center transition flex flex-col items-center justify-center gap-1.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Upload Cover Banner</span>
                      <span className="text-[10px] text-slate-400">Wide banner landscape image</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Social Channels & Online Links Section */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Social Channels & Links
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Added socials appear at the bottom of your hosted Business QR page
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddSocial}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Social</span>
                </button>
              </div>

              {activePage.customSocialLinks && activePage.customSocialLinks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {activePage.customSocialLinks.map((soc) => (
                    <div
                      key={soc.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {soc.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                          {soc.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSocial(soc)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="Edit social link"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSocial(soc.id)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition"
                          title="Remove social link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 text-center rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No social channels added yet. Tap <strong>+ Add Social</strong> to add where customers can find and follow you (Instagram, TikTok, WhatsApp, Facebook, Website, etc.).
                </div>
              )}
            </div>

            </div>

          {/* Native Advanced Ad in Business Info */}
          <AdMobNativeAd
            context="qr"
            variant="card"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

      {/* TAB 3: HOTEL / RESTAURANT ITEMS */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Digital Items</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activePage.menuItems.length} items in {userCategories.length} categories
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenQuickQr('menu')}
                className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Generate Items QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenItemModal()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Category Bar & Filter Chips */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Categories</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  {userCategories.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenCategoryModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Add Category</span>
              </button>
            </div>

            {categoryFeedback && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{categoryFeedback}</span>
              </p>
            )}

            {/* Category Badges & Filter Bar */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedCategoryFilter === 'All'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Items</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedCategoryFilter === 'All'
                      ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {activePage.menuItems.length}
                </span>
              </button>

              {userCategories.map((cat) => {
                const itemCount = activePage.menuItems.filter((i) => (i.category || 'General').toLowerCase() === cat.toLowerCase()).length;
                const isSelected = selectedCategoryFilter.toLowerCase() === cat.toLowerCase();
                return (
                  <div
                    key={cat}
                    className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className="flex items-center gap-1.5"
                    >
                      <span>{cat}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {itemCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat);
                      }}
                      className={`p-1 rounded-lg hover:bg-rose-500 hover:text-white transition ${
                        isSelected ? 'text-white/80 hover:bg-white/20' : 'text-slate-400 hover:text-rose-500'
                      }`}
                      title={`Remove category "${cat}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items List */}
          {activePage.menuItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No items yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Add items, products, dishes or services with prices and photos.
              </p>
              <button
                onClick={() => handleOpenItemModal()}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + Add First Item
              </button>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No items in "{selectedCategoryFilter}"</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Add your first item under the "{selectedCategoryFilter}" category.
              </p>
              <button
                onClick={() => handleOpenItemModal()}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                + Add Item in {selectedCategoryFilter}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.category}
                        </span>
                      </div>
                      {item.hasPromo ? (
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {item.promoPrice ? (
                            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                              {activePage.currency} {item.promoPrice.toLocaleString()}
                            </span>
                          ) : null}
                          <span
                            className={`text-xs ${
                              item.promoPrice
                                ? 'line-through text-slate-400'
                                : 'font-extrabold text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {activePage.currency} {item.price.toLocaleString()}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-extrabold flex items-center gap-0.5">
                            <BadgePercent className="w-2.5 h-2.5" />
                            <span>Promo{item.promoEndDate ? ` to ${item.promoEndDate}` : ' Active'}</span>
                          </span>
                          {item.promoDescription && (
                            <p className="w-full text-[10px] text-amber-600 dark:text-amber-400 font-medium italic truncate">
                              "{item.promoDescription}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {activePage.currency} {item.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenItemQrModal(item)}
                      className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition border border-emerald-200 dark:border-emerald-800/60"
                      title={`Generate QR Code for ${item.name}`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleItemAvailability(item.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.isAvailable !== false
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {item.isAvailable !== false ? 'In Stock' : 'Sold Out'}
                    </button>

                    <button
                      onClick={() => handleOpenItemModal(item)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 flex items-center justify-center"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center hover:bg-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Native Advanced Ad in Digital Items */}
          <AdMobNativeAd
            context="qr"
            variant="card"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

      {/* TAB 4: BUSINESS PHOTOS & GALLERY */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Photos</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {activePage.photos.length}/20 Max
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload up to 20 photos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenQuickQr('photos')}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Generate Photos QR</span>
              </button>

              <button
                onClick={handlePhotoUploadClick}
                disabled={activePage.photos.length >= 20}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition ${
                  activePage.photos.length >= 20
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{activePage.photos.length >= 20 ? 'Limit Reached (20/20)' : 'Upload Photo'}</span>
              </button>
            </div>
          </div>

          {activePage.photos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
              <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No photos uploaded yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Customers love seeing real photos of your venue, products, and services (Max 20 photos).
              </p>
              <button
                onClick={handlePhotoUploadClick}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition"
              >
                + Upload Business Photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activePage.photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handleEditPhoto(photo)}
                  className="relative group aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500/70 hover:shadow-md transition"
                  title="Click to edit photo title, category & badge"
                >
                  <img
                    src={photo.url}
                    alt={photo.title || 'Photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />

                  {/* Top Bar: Badge & Action Buttons */}
                  <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between gap-1 z-10">
                    <div>
                      {photo.badge ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold shadow-xs backdrop-blur-xs flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{photo.badge}</span>
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold backdrop-blur-xs">
                          Edit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPhotoQrModal(photo);
                        }}
                        className="w-7 h-7 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white flex items-center justify-center transition shadow-md backdrop-blur-xs"
                        title="Generate QR Code for this photo"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPhoto(photo);
                        }}
                        className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-md backdrop-blur-xs"
                        title="Edit title, category & badge"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                        className="w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition shadow-md backdrop-blur-xs"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar: Title & Category */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 flex flex-col justify-end">
                    <p className="text-xs font-bold text-white truncate drop-shadow-xs">
                      {photo.title || 'Business Photo'}
                    </p>
                    {photo.category && (
                      <p className="text-[10px] font-semibold text-emerald-300 truncate mt-0.5">
                        {photo.category}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Native Advanced Ad in Business Photos */}
          <AdMobNativeAd
            context="qr"
            variant="card"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

      {/* TAB 5: BUSINESS SOCIALS & CUSTOM LINKS */}
      {activeTab === 'socials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Business Channels
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {(activePage.customSocialLinks || []).length} Connected
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                Business Socials & Links
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your social channels (Instagram, TikTok, WhatsApp, Facebook, Website). All added socials appear at the bottom of your hosted Business QR page on Cloudflare.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddSocial}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Social</span>
            </button>
          </div>

          {/* Social Links List */}
          {activePage.customSocialLinks && activePage.customSocialLinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activePage.customSocialLinks.map((soc) => (
                <div
                  key={soc.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {soc.name}
                      </h4>
                      <a
                        href={soc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline truncate block font-mono mt-0.5"
                      >
                        {soc.url}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={soc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEditSocial(soc)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                      title="Edit social"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSocial(soc.id)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition"
                      title="Delete social"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Share2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  No Business Socials Added
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Connect your business social profiles so customers scanning your Business QR code can easily follow and message you on Instagram, TikTok, WhatsApp, Facebook, or your website.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddSocial}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Social</span>
              </button>
            </div>
          )}

          {/* Native Advanced Ad in Socials */}
          <AdMobNativeAd
            context="qr"
            variant="card"
            unitId={ADMOB_UNITS.NATIVE_ADVANCED}
          />
        </div>
      )}

      {/* MODAL: ADD / EDIT BUSINESS SOCIAL LINK (ONLY SOCIAL NAME & LINK) */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 bg-slate-900/65 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white animate-fadeIn">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {editingSocial ? 'Edit Social Link' : 'Add Social Link'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Displayed on your hosted Business QR page
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSocialModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body - ONLY Social Name and Link */}
            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Social Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Instagram, TikTok, WhatsApp, Facebook, Website"
                  value={socialName}
                  onChange={(e) => setSocialName(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Link / URL *</label>
                <input
                  type="text"
                  placeholder="https://instagram.com/yourbusiness or link URL"
                  value={socialUrl}
                  onChange={(e) => setSocialUrl(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setShowSocialModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSocial}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-1.5"
              >
                <span>{editingSocial ? 'Save Changes' : 'Add Social'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 bg-slate-900/65 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Char-Grilled T-Bone Steak"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-600 dark:text-slate-400">Category *</label>
                    <button
                      type="button"
                      onClick={handleOpenCategoryModal}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Room Service, Dining, Drinks, Spa"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 text-xs sm:text-sm"
                  />
                  {userCategories.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Quick Select:</span>
                      {userCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setItemCategory(cat)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                            itemCategory.toLowerCase() === cat.toLowerCase()
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400">Price ({activePage.currency}) *</label>
                  <input
                    type="number"
                    placeholder="35000"
                    value={itemPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Description & Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Served with pepper sauce, grilled vegetables and fries..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Photo */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Item Photo</label>
                <div className="flex items-center gap-3 mt-1">
                  {itemPhotoUrl ? (
                    <img
                      src={itemPhotoUrl}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => itemPhotoInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs"
                  >
                    {itemPhotoUrl ? 'Replace Photo' : 'Upload Photo'}
                  </button>
                  {itemPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setItemPhotoUrl('')}
                      className="text-xs text-red-500 font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Badges & Tags */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400">Badges & Tags (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Best Seller, Popular, Chef Special, Organic, VIP"
                  value={itemTagsInput}
                  onChange={(e) => setItemTagsInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 text-xs"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Ex: Best Seller, Popular, Chef Special (separate with commas for multiple)
                </p>
              </div>

              {/* Promo Toggle & Scheduled Dates */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        itemHasPromo
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <BadgePercent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Promotion & Discount
                        </h4>
                        {itemHasPromo ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 text-[9px] font-extrabold uppercase">
                            Tuned ON
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-[9px] font-bold uppercase">
                            OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Turn on promo to schedule promotional start & end dates
                      </p>
                    </div>
                  </div>

                  {/* Promo Tune ON/OFF Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !itemHasPromo;
                      setItemHasPromo(nextVal);
                      if (nextVal && !itemPromoStartDate) {
                        setItemPromoStartDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      itemHasPromo ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={itemHasPromo}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        itemHasPromo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Promo Fields (Visible when tuned ON) */}
                {itemHasPromo && (
                  <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    {/* Dual Percentage and Amount Inputs (Promo Price on Top) */}
                    <div className="space-y-2.5">
                      {/* Promo / Discounted Price Amount (ON TOP) */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                          <span>Promo Price ({activePage.currency}) *</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Amount</span>
                        </label>
                        <input
                          type="number"
                          placeholder={
                            itemPrice
                              ? `e.g. ${(Math.round((parseFloat(itemPrice) * 0.8) / 100) * 100).toString()}`
                              : 'e.g. 25000'
                          }
                          value={itemPromoPrice}
                          onChange={(e) => handlePromoPriceChange(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs sm:text-sm"
                        />
                      </div>

                      {/* Discount Percentage (BELOW PROMO PRICE) */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                          <span>Discount % <span className="font-normal text-slate-400 dark:text-slate-500 text-[10px]">(Optional)</span></span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Percentage</span>
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            placeholder="e.g. 20"
                            value={itemPromoPercent}
                            onChange={(e) => handlePromoPercentChange(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs sm:text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-xs text-amber-600 dark:text-amber-400 pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Savings Summary Banner */}
                    {parseFloat(itemPrice) > 0 && parseFloat(itemPromoPrice) > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs gap-2">
                        <span className="text-amber-900 dark:text-amber-200 font-medium text-[11px] leading-tight">
                          Customer pays <strong className="font-bold">{activePage.currency} {parseFloat(itemPromoPrice).toLocaleString()}</strong> (Saves {activePage.currency} {Math.max(0, parseFloat(itemPrice) - parseFloat(itemPromoPrice)).toLocaleString()})
                        </span>
                        {parseFloat(itemPrice) > parseFloat(itemPromoPrice) && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-black text-[10px] shrink-0">
                            {Math.round(((parseFloat(itemPrice) - parseFloat(itemPromoPrice)) / parseFloat(itemPrice)) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    )}

                    {/* Discount Description */}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        Discount Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 20% off weekend special, happy hour discount..."
                        value={itemPromoDescription}
                        onChange={(e) => setItemPromoDescription(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Brief details explaining this discount or promotional offer
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Start Date *</span>
                        </label>
                        <input
                          type="date"
                          value={itemPromoStartDate}
                          onChange={(e) => setItemPromoStartDate(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>End Date *</span>
                        </label>
                        <input
                          type="date"
                          value={itemPromoEndDate}
                          onChange={(e) => setItemPromoEndDate(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuItem}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / MANAGE CATEGORY */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 bg-slate-900/65 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-0 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Add Category
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create a new category for your digital items & services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Suites, Cocktails, Breakfast, Spa Services..."
                  value={categoryModalInput}
                  onChange={(e) => {
                    setCategoryModalInput(e.target.value);
                    if (categoryModalError) setCategoryModalError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCategoryModal();
                    }
                  }}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-slate-100 text-sm"
                  autoFocus
                />
                {categoryModalError && (
                  <p className="text-rose-500 font-semibold text-[11px] mt-1.5 flex items-center gap-1">
                    <span>{categoryModalError}</span>
                  </p>
                )}
              </div>

              {/* Existing Categories */}
              {userCategories.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Existing Categories ({userCategories.length}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5 max-h-28 overflow-y-auto">
                    {userCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 transition"
                          title={`Delete "${cat}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategoryModal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BUSINESS PHOTO (TITLE, CATEGORY, BADGE, DETAILS) */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 bg-slate-900/65 backdrop-blur-xs overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {editingPhoto ? 'Edit Photo Details' : 'Add Photo Details'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add title text, category, and badges to display
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPhotoModal(false);
                  setEditingPhoto(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Photo Preview & Change Option */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                  Photo Preview
                </label>
                {photoUrl ? (
                  <div className="relative aspect-16/9 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner group">
                    <img
                      src={photoUrl}
                      alt={photoTitle || 'Preview'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Change Photo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full aspect-16/9 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 transition text-slate-500"
                  >
                    <Camera className="w-8 h-8 text-slate-400" />
                    <span className="font-bold text-xs">Click to select photo</span>
                  </button>
                )}
                {photoUrl && (
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Choose a different photo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Title */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Photo Title / Headline Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter title or leave blank..."
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This headline is shown directly over the photo on the customer view.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Products, Interior, Outdoor, Dishes..."
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Badge / Tag */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Badge / Highlight Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Featured, Special, Popular..."
                  value={photoBadge}
                  onChange={(e) => setPhotoBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Description / Caption */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Caption (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief details shown when customers tap on the photo..."
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowPhotoModal(false);
                  setEditingPhoto(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-200/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhotoModal}
                disabled={!photoUrl}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition"
              >
                {editingPhoto ? 'Save Changes' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QUICK PAGE-SPECIFIC QR CODE GENERATOR MODAL */}
      {showQuickQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 animate-in fade-in duration-150 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden min-h-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Generate Specific Page QR Code
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activePage.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickQrModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Target Page Pill Switcher */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Select Page Destination:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPE_OPTIONS.map((scope) => {
                    const IconComponent = scope.icon;
                    const isSelected = quickQrScope === scope.id;
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setQuickQrScope(scope.id);
                          setQuickQrCopied(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs truncate">{scope.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* QR Code Name Input Field On Top of QR Code Box */}
              <div className="text-left mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>QR Code Name</span>
                  {quickQrTableNumber && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Included on Downloads
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Main Office, Reception, Entrance, Display Poster"
                    value={quickQrTableNumber}
                    onChange={(e) => setQuickQrTableNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {quickQrTableNumber && (
                    <button
                      type="button"
                      onClick={() => setQuickQrTableNumber('')}
                      className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scannable QR Code Frame */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold mb-2">
                  <span>{SCOPE_OPTIONS.find((s) => s.id === quickQrScope)?.badge}</span>
                </div>

                <div
                  className="inline-block p-3 rounded-2xl shadow-md transition-all relative"
                  style={{
                    backgroundColor: activeBoxBgColor,
                    borderColor: activeBoxBorderColor === 'transparent' ? 'transparent' : activeBoxBorderColor,
                    borderWidth: activeBoxBorderColor === 'transparent' ? '0px' : '3px',
                    borderStyle: 'solid',
                  }}
                >
                  {quickQrTableNumber && (
                    <div className="mb-2 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-wider shadow-xs">
                        {quickQrTableNumber}
                      </span>
                    </div>
                  )}
                  {quickQrDataUrl ? (
                    <img
                      src={quickQrDataUrl}
                      alt="Specific Page QR Code"
                      className="w-44 h-44 mx-auto object-contain"
                      style={{
                        backgroundColor: activeLightColor,
                        borderRadius: '12px',
                        padding: '6px',
                      }}
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR Code...
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Scanning this code opens directly into {SCOPE_OPTIONS.find((s) => s.id === quickQrScope)?.label}.
                </p>
              </div>

              {/* Direct Link Box */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">
                  {quickQrCustomerUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyQuickQrLink}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition"
                >
                  {quickQrCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{quickQrCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Printable Table Stand PDF Action Button */}
              <button
                type="button"
                onClick={handleDownloadQuickQrPdf}
                disabled={quickQrPdfLoading}
                className="w-full justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{quickQrPdfLoading ? 'Generating PDF...' : 'Print Table & Wall QR Code Poster (PDF)'}</span>
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 grid grid-cols-3 gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadQuickQrPng}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareLink(quickQrScope)}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickQrModal(false);
                  onOpenCustomerView(
                    activePage,
                    quickQrScope === 'all' ? undefined : (quickQrScope as any)
                  );
                }}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 transition active:scale-98"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test View</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SPECIFIC ITEM QR CODE MODAL */}
      {itemQrModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 animate-in fade-in duration-150 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden min-h-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                    Item QR Code & Deep Link
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Direct access to {itemQrModalItem.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setItemQrModalItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Item Card Overview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                {itemQrModalItem.photoUrl ? (
                  <img
                    src={itemQrModalItem.photoUrl}
                    alt={itemQrModalItem.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                    <Utensils className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {itemQrModalItem.name}
                    </h4>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {itemQrModalItem.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {itemQrModalItem.hasPromo && itemQrModalItem.promoPrice ? (
                      <>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          {activePage.currency} {itemQrModalItem.promoPrice.toLocaleString()}
                        </span>
                        <span className="text-[11px] line-through text-slate-400">
                          {activePage.currency} {itemQrModalItem.price.toLocaleString()}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                          Promo
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {activePage.currency} {itemQrModalItem.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code Name Input Field On Top of QR Code Box */}
              <div className="text-left mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>QR Code Name</span>
                  {itemQrTableNumber && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Included on Downloads
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Front Desk, Counter, Display Stand, Section A"
                    value={itemQrTableNumber}
                    onChange={(e) => setItemQrTableNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {itemQrTableNumber && (
                    <button
                      type="button"
                      onClick={() => setItemQrTableNumber('')}
                      className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scannable Item QR Code Frame */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold mb-2">
                  <span>Direct Item Ordering QR</span>
                </div>

                <div className="inline-block p-3 bg-white rounded-2xl shadow-md border-2 border-slate-100 relative">
                  {itemQrTableNumber && (
                    <div className="mb-2 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        {itemQrTableNumber}
                      </span>
                    </div>
                  )}
                  {itemQrDataUrl ? (
                    <img
                      src={itemQrDataUrl}
                      alt={`${itemQrModalItem.name} QR Code`}
                      className="w-44 h-44 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                      Generating Item QR...
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  When customers scan this QR code, they are taken directly to {itemQrModalItem.name} on your hosted page.
                </p>
              </div>

              {/* Direct Item Link Box */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">
                  {itemQrCustomerUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyItemLink}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition"
                >
                  {itemQrCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{itemQrCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Printable Table Stand Action Button */}
              <button
                type="button"
                onClick={handleDownloadItemPdf}
                disabled={itemQrPdfLoading}
                className="w-full justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{itemQrPdfLoading ? 'Generating PDF...' : 'Print Table & Wall QR Code Poster (PDF)'}</span>
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 grid grid-cols-3 gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadItemPng}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleShareItemLink}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = itemQrModalItem;
                  setItemQrModalItem(null);
                  onOpenCustomerView(activePage, 'menu', item.id);
                }}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 transition active:scale-98"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test View</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SPECIFIC PHOTO QR CODE MODAL */}
      {photoQrModalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-8 animate-in fade-in duration-150 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[calc(100dvh-6.5rem)] sm:max-h-[85dvh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden min-h-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                    Photo QR Code
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {photoQrModalPhoto.title || photoQrModalPhoto.caption || 'Venue Photo'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPhotoQrModalPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Photo Overview Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                <img
                  src={photoQrModalPhoto.url}
                  alt={photoQrModalPhoto.title || 'Photo'}
                  className="w-16 h-14 rounded-xl object-cover shrink-0 bg-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {photoQrModalPhoto.title || photoQrModalPhoto.caption || 'Business Photo'}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {photoQrModalPhoto.category && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {photoQrModalPhoto.category}
                      </span>
                    )}
                    {photoQrModalPhoto.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {photoQrModalPhoto.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code Name Input Field On Top of QR Code Box */}
              <div className="text-left mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>QR Code Name</span>
                  {photoQrTableNumber && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Included on Downloads
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Gallery Wall, Reception, Entrance, Spotlight"
                    value={photoQrTableNumber}
                    onChange={(e) => setPhotoQrTableNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {photoQrTableNumber && (
                    <button
                      type="button"
                      onClick={() => setPhotoQrTableNumber('')}
                      className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scannable Photo QR Code Frame */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold mb-2">
                  <span>Photo QR Code</span>
                </div>

                <div className="inline-block p-3 bg-white rounded-2xl shadow-md border-2 border-slate-100 relative">
                  {photoQrTableNumber && (
                    <div className="mb-2 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        {photoQrTableNumber}
                      </span>
                    </div>
                  )}
                  {photoQrDataUrl ? (
                    <img
                      src={photoQrDataUrl}
                      alt="Photo QR Code"
                      className="w-44 h-44 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                      Generating Photo QR...
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Scanning opens your photos directly zoomed into this spotlight photo.
                </p>
              </div>

              {/* Direct Photo Link Box */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate flex-1 min-w-0">
                  {photoQrCustomerUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPhotoLink}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition"
                >
                  {photoQrCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{photoQrCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              {/* Printable Table Stand Action Button */}
              <button
                type="button"
                onClick={handleDownloadPhotoPdf}
                disabled={photoQrPdfLoading}
                className="w-full justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{photoQrPdfLoading ? 'Generating PDF...' : 'Print Table & Wall QR Code Poster (PDF)'}</span>
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 grid grid-cols-3 gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPhotoPng}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleSharePhotoLink}
                className="py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const photo = photoQrModalPhoto;
                  setPhotoQrModalPhoto(null);
                  onOpenCustomerView(activePage, 'photos', undefined, photo.id);
                }}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/20 transition active:scale-98"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Test View</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete QR Page Confirmation Modal */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Delete QR Page?
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800 dark:text-slate-200">&quot;{pageToDelete.title}&quot;</strong>?
              </p>

              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <span>Items attached:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{pageToDelete.menuItems?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Photos attached:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{pageToDelete.photos?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition active:scale-95"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeletePage}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Bottom Native Advanced Ad */}
      <div className="pt-4 pb-6">
        <AdMobNativeAd
          context="qr"
          variant="bottom"
          unitId={ADMOB_UNITS.NATIVE_ADVANCED}
        />
      </div>
    </div>
  );
};
