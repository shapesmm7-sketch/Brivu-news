import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Wifi,
  Search,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  Flame,
  Leaf,
  Star,
  Plus,
  Minus,
  X,
  Send,
  Camera,
  Utensils,
  Info,
  Check,
  Tag,
  BadgePercent,
  Calendar,
  Heart,
  Mail,
  Copy,
  Globe,
  Ticket,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeHostedPage, QRMenuItem, QRBusinessPhoto } from '../types';
import { shareContent } from '../services/fileSaver';
import { QRHostingService } from '../services/qrHostingService';
import { StorageService } from '../services/storage';
import { PhoneInputField } from './PhoneInputField';
import { TouchZoomLightbox, LightboxImageItem } from './TouchZoomLightbox';

export const cleanForbiddenWords = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  // Case-insensitive replacements
  cleaned = cleaned.replace(/verified online portals/gi, '');
  cleaned = cleaned.replace(/verified official websites/gi, '');
  cleaned = cleaned.replace(/portals & mobile apps/gi, '');
  cleaned = cleaned.replace(/verified official channels/gi, '');
  cleaned = cleaned.replace(/upcoming events hub/gi, '');
  
  // Replacements with custom text
  cleaned = cleaned.replace(/official websites & apps/gi, 'our sites');
  cleaned = cleaned.replace(/business events hub/gi, 'our Events');
  cleaned = cleaned.replace(/official social media hub/gi, 'our social media platforms');
  
  // Clean up double spaces or trailing/leading punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // If we cleaned up words, make sure we don't leave double commas or starting/trailing commas
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
  return cleaned;
};

interface QRCustomerViewScreenProps {
  page: QRCodeHostedPage;
  onBackToApp?: () => void;
  isMerchantPreview?: boolean;
  initialTab?: 'menu' | 'photos' | 'about';
  initialItemId?: string;
  initialPhotoId?: string;
}

interface TrayItem {
  item: QRMenuItem;
  quantity: number;
}

export const QRCustomerViewScreen: React.FC<QRCustomerViewScreenProps> = ({
  page,
  onBackToApp,
  isMerchantPreview = false,
  initialTab,
  initialItemId,
  initialPhotoId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'menu' | 'photos' | 'about'>(() => {
    if (initialPhotoId) return 'photos';
    if (initialItemId) return 'menu';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const photoIdParam = params.get('photo') || params.get('photoId');
      if (photoIdParam) return 'photos';
      const itemIdParam = params.get('item') || params.get('itemId');
      if (itemIdParam) return 'menu';
      const tabParam = params.get('tab');
      if (tabParam === 'photos' || tabParam === 'gallery') return 'photos';
      if (tabParam === 'about' || tabParam === 'info') return 'about';
      if (tabParam === 'menu' || tabParam === 'items') return 'menu';
    }
    if (initialTab) return initialTab;
    return 'menu';
  });

  const [selectedPhoto, setSelectedPhoto] = useState<QRBusinessPhoto | null>(() => {
    let targetPhotoId = initialPhotoId;
    if (!targetPhotoId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetPhotoId = params.get('photo') || params.get('photoId') || undefined;
    }
    if (targetPhotoId) {
      return page.photos.find((p) => p.id === targetPhotoId) || null;
    }
    return null;
  });

  const [selectedItemModal, setSelectedItemModal] = useState<QRMenuItem | null>(() => {
    let targetItemId = initialItemId;
    if (!targetItemId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetItemId = params.get('item') || params.get('itemId') || undefined;
    }
    if (targetItemId) {
      return page.menuItems.find((i) => i.id === targetItemId) || null;
    }
    return null;
  });

  useEffect(() => {
    let targetPhotoId = initialPhotoId;
    let targetItemId = initialItemId;
    let targetTab: 'menu' | 'photos' | 'about' | undefined = initialTab;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const photoIdParam = params.get('photo') || params.get('photoId');
      const itemIdParam = params.get('item') || params.get('itemId');
      const tabParam = params.get('tab');

      if (photoIdParam) {
        targetPhotoId = photoIdParam;
        targetTab = 'photos';
      }
      if (itemIdParam) {
        targetItemId = itemIdParam;
        targetTab = 'menu';
      }
      if (!photoIdParam && !itemIdParam && tabParam) {
        if (tabParam === 'photos' || tabParam === 'gallery') targetTab = 'photos';
        else if (tabParam === 'about' || tabParam === 'info') targetTab = 'about';
        else if (tabParam === 'menu' || tabParam === 'items') targetTab = 'menu';
      }
    }

    if (targetPhotoId) {
      const foundIdx = page.photos.findIndex((p) => p.id === targetPhotoId);
      if (foundIdx !== -1) {
        const found = page.photos[foundIdx];
        setActiveTab('photos');
        setSelectedPhoto(found);
        setLightboxImage({
          url: found.url,
          title: found.title || page.title,
          description: found.description || found.caption,
          category: found.category,
          badge: found.badge,
          photoIndex: foundIdx,
        });
        return;
      }
    }

    if (targetItemId) {
      const found = page.menuItems.find((i) => i.id === targetItemId);
      if (found) {
        setActiveTab('menu');
        setSelectedItemModal(found);
        return;
      }
    }

    if (targetTab) {
      setActiveTab(targetTab);
    }
  }, [initialTab, initialItemId, initialPhotoId, page.id, page.menuItems, page.photos]);
  const [showWifiModal, setShowWifiModal] = useState<boolean>(false);
  const [showOrderTrayModal, setShowOrderTrayModal] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [trayItems, setTrayItems] = useState<Record<string, TrayItem>>({});

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedWifi, setCopiedWifi] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [photoCopiedLink, setPhotoCopiedLink] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    description?: string;
    category?: string;
    badge?: string;
    photoIndex?: number;
  } | null>(() => {
    let targetPhotoId = initialPhotoId;
    if (!targetPhotoId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetPhotoId = params.get('photo') || params.get('photoId') || undefined;
    }
    if (targetPhotoId) {
      const foundIdx = page.photos.findIndex((p) => p.id === targetPhotoId);
      if (foundIdx !== -1) {
        const found = page.photos[foundIdx];
        return {
          url: found.url,
          title: found.title || page.title,
          description: found.description || found.caption,
          category: found.category,
          badge: found.badge,
          photoIndex: foundIdx,
        };
      }
    }
    return null;
  });

  // Keyboard navigation for fullscreen photo lightbox
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      } else if (e.key === 'ArrowRight' && lightboxImage.photoIndex !== undefined && page.photos.length > 1) {
        const nextIdx = (lightboxImage.photoIndex + 1) % page.photos.length;
        const p = page.photos[nextIdx];
        setLightboxImage({
          url: p.url,
          title: p.title || page.title,
          description: p.description || p.caption,
          category: p.category,
          badge: p.badge,
          photoIndex: nextIdx,
        });
      } else if (e.key === 'ArrowLeft' && lightboxImage.photoIndex !== undefined && page.photos.length > 1) {
        const prevIdx = (lightboxImage.photoIndex - 1 + page.photos.length) % page.photos.length;
        const p = page.photos[prevIdx];
        setLightboxImage({
          url: p.url,
          title: p.title || page.title,
          description: p.description || p.caption,
          category: p.category,
          badge: p.badge,
          photoIndex: prevIdx,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, page.photos]);

  // Automatically reset category filter to 'All' when switching to 'menu' tab so items are always visible
  useEffect(() => {
    if (activeTab === 'menu') {
      setSelectedCategory('All');
    }
  }, [activeTab]);

  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`quickreceipt_favorites_${page.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem(`quickreceipt_favorites_${page.id}`, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
  };

  // Check if promo is currently active based on date range
  const isItemPromoActive = (item: QRMenuItem): boolean => {
    if (!item.hasPromo) return false;
    const today = new Date().toISOString().split('T')[0];
    if (item.promoStartDate && item.promoStartDate > today) return false;
    if (item.promoEndDate && item.promoEndDate < today) return false;
    return true;
  };

  const getItemEffectivePrice = (item: QRMenuItem): number => {
    if (isItemPromoActive(item) && item.promoPrice !== undefined && item.promoPrice > 0) {
      return item.promoPrice;
    }
    return item.price;
  };

  // Effective menu items with fallback to pre-injected window.__INITIAL_QR_PAGE__
  const effectiveMenuItems = useMemo(() => {
    if (page.menuItems && page.menuItems.length > 0) return page.menuItems;
    try {
      const initial = typeof window !== 'undefined' ? (window as any).__INITIAL_QR_PAGE__ : null;
      if (initial?.menuItems && initial.menuItems.length > 0) return initial.menuItems;
    } catch {}
    return [];
  }, [page.menuItems]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return effectiveMenuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [effectiveMenuItems, selectedCategory, searchQuery]);

  // Effective photos with fallback to pre-injected window.__INITIAL_QR_PAGE__
  const effectivePhotos = useMemo(() => {
    if (page.photos && page.photos.length > 0) return page.photos;
    try {
      const initial = typeof window !== 'undefined' ? (window as any).__INITIAL_QR_PAGE__ : null;
      if (initial?.photos && initial.photos.length > 0) return initial.photos;
    } catch {}
    return [];
  }, [page.photos]);

  // Total in tray
  const trayList = useMemo(() => Object.values(trayItems) as TrayItem[], [trayItems]);
  const totalTrayCount = useMemo(() => trayList.reduce((sum, i) => sum + i.quantity, 0), [trayList]);
  const totalTrayPrice = useMemo(
    () => trayList.reduce((sum, i) => sum + i.quantity * getItemEffectivePrice(i.item), 0),
    [trayList]
  );

  const handleAddToCart = (item: QRMenuItem) => {
    setTrayItems((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prev,
        [item.id]: { item, quantity: 1 },
      };
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setTrayItems((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const handleShareMenu = async () => {
    const url = window.location.href;
    const res = await shareContent({
      title: page.title,
      text: page.tagline || `Check out ${page.title} digital items & showcase!`,
      url,
      dialogTitle: 'Share Menu',
    });

    if (res.method === 'clipboard_copy') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSharePhoto = async (photo: QRBusinessPhoto) => {
    const url = QRHostingService.getCustomerPhotoUrl(page.id, photo.id);
    const title = `${photo.title || 'Photo'} - ${page.title}`;
    const text = photo.description || `Check out this photo from ${page.title}`;
    const res = await shareContent({
      title,
      text,
      url,
      dialogTitle: 'Share Photo',
    });

    if (res.method === 'clipboard_copy') {
      setPhotoCopiedLink(true);
      setTimeout(() => setPhotoCopiedLink(false), 2500);
    }
  };

  const handleSendWhatsAppOrder = () => {
    if (!page.whatsapp && !page.phone) {
      alert('No business WhatsApp number configured for this page.');
      return;
    }

    const cleanNumber = (page.whatsapp || page.phone || '').replace(/[^0-9]/g, '');
    let orderMsg = `👋 Hello *${page.title}*,\nI would like to place an order for the following items:\n\n`;

    if (tableNumber.trim()) {
      orderMsg += `📍 *Table / Room Number:* ${tableNumber.trim()}\n`;
    }
    if (customerName.trim()) {
      orderMsg += `👤 *Customer:* ${customerName.trim()}\n`;
    }
    if (customerPhone.trim()) {
      orderMsg += `📞 *Phone:* ${customerPhone.trim()}\n`;
    }
    if (orderNotes.trim()) {
      orderMsg += `📝 *Order Description / Notes:* ${orderNotes.trim()}\n`;
    }
    orderMsg += `\n*Order Details:*\n`;

    trayList.forEach((t) => {
      const effPrice = getItemEffectivePrice(t.item);
      const isPromo = isItemPromoActive(t.item) && t.item.promoPrice !== undefined && t.item.promoPrice > 0;
      orderMsg += `• ${t.quantity}x ${t.item.name}${isPromo ? ' (🔥 PROMO)' : ''} (${page.currency} ${(t.quantity * effPrice).toLocaleString()})\n`;
    });

    orderMsg += `\n*Total:* ${page.currency} ${totalTrayPrice.toLocaleString()}\n`;
    orderMsg += `\nThank you!`;

    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(orderMsg)}`;
    window.open(waUrl, '_blank');
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    (page.menuCategories || []).forEach((c) => {
      if (c && c.trim() && c.trim() !== 'All') {
        set.add(c.trim());
      }
    });
    effectiveMenuItems.forEach((i) => {
      if (i.category && i.category.trim()) {
        set.add(i.category.trim());
      }
    });
    return Array.from(set);
  }, [page.menuCategories, effectiveMenuItems]);

  const pathname = typeof window !== 'undefined' ? (window.location.pathname || '').toLowerCase() : '';
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  const isEventsHub =
    page.pageType === 'events_hub' ||
    page.id.startsWith('events-hub') ||
    page.id.startsWith('event-hub') ||
    page.id === 'events-hub-all' ||
    page.id === 'events' ||
    page.id.includes('events-hub') ||
    pathname.includes('/qr/events-hub') ||
    pathname.includes('/qr/events') ||
    searchParams.get('tab') === 'events' ||
    Boolean(searchParams.get('qr')?.includes('events'));

  const isBusinessPage =
    page.id.startsWith('qr-') ||
    page.id.startsWith('business-') ||
    page.id === 'default' ||
    page.id === 'latest' ||
    page.pageType === 'menu' ||
    page.pageType === 'business_showcase' ||
    page.pageType === 'business' ||
    pathname.includes('/qr/qr-') ||
    pathname.includes('/qr/business-') ||
    searchParams.get('tab') === 'menu' ||
    Boolean(searchParams.get('qr')?.startsWith('qr-')) ||
    Boolean(searchParams.get('qr')?.startsWith('business-'));

  const isEventPage =
    !isBusinessPage &&
    (isEventsHub ||
      page.pageType === 'event' ||
      page.id.startsWith('event-') ||
      pathname.includes('/qr/event-'));

  const isSocialsHub =
    !isBusinessPage &&
    !isEventPage &&
    (page.pageType === 'socials_hub' ||
      page.pageType === 'socials' ||
      page.id.startsWith('socials-hub') ||
      page.id.startsWith('social-hub') ||
      page.id === 'socials-hub-all' ||
      page.id === 'socials' ||
      pathname.includes('/qr/socials') ||
      pathname.includes('/qr/socials-hub') ||
      searchParams.get('tab') === 'socials' ||
      searchParams.get('tab') === 'social' ||
      Boolean(searchParams.get('qr')?.includes('socials')));

  const isWebsitesHub =
    !isBusinessPage &&
    !isEventPage &&
    !isSocialsHub &&
    (page.pageType === 'websites_hub' ||
      page.pageType === 'websites' ||
      page.id.startsWith('websites-hub') ||
      page.id.startsWith('web-hub') ||
      page.id === 'websites-hub-all' ||
      page.id === 'websites' ||
      pathname.includes('/qr/websites') ||
      pathname.includes('/qr/websites-hub') ||
      searchParams.get('tab') === 'websites' ||
      searchParams.get('tab') === 'website' ||
      Boolean(searchParams.get('qr')?.includes('websites-hub')));

  const getSocialLinkIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('whatsapp') || n.includes('chat')) return <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (n.includes('instagram') || n.includes('photo') || n.includes('camera')) return <Camera className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
    if (n.includes('phone') || n.includes('call') || n.includes('tel')) return <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    if (n.includes('email') || n.includes('mail')) return <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    if (n.includes('map') || n.includes('location')) return <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    if (n.includes('ticket') || n.includes('event')) return <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (n.includes('web') || n.includes('site') || n.includes('online')) return <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    return <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  };

  // Dedicated Standalone Event Customer View
  if (isEventPage) {
    const cleanWaNumber = (page.whatsapp || page.phone || '').replace(/[^0-9]/g, '');
    const defaultRsvpMsg = encodeURIComponent(
      `👋 Hello *${page.title}*,\nI would like to RSVP and confirm my attendance for this event!\n📍 *Venue:* ${page.address || 'Event Location'}\n\nPlease share any additional entrance passes or details. Thank you!`
    );
    const waRsvpUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${defaultRsvpMsg}` : '';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-24">
        {/* Merchant preview top bar */}
        {isMerchantPreview && (
          <div className="bg-purple-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />
              <span>Event View Mode (Live Preview)</span>
            </div>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </button>
            )}
          </div>
        )}

        {/* Hero Header */}
        <div className="relative w-full overflow-hidden bg-slate-900 text-white">
          {page.coverImage ? (
            <div className="absolute inset-0 z-0">
              <img
                src={page.coverImage}
                alt={page.title}
                className="w-full h-full object-cover opacity-35 filter blur-[1px] scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 opacity-95">
              <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            </div>
          )}

          <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-6 sm:pt-8 sm:pb-8">
            {/* Top Actions: Share & Back */}
            <div className="flex items-center justify-between mb-4">
              {onBackToApp ? (
                <button
                  onClick={onBackToApp}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition active:scale-95"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold backdrop-blur-md border border-purple-400/40">
                  <Ticket className="w-3.5 h-3.5 text-purple-300" />
                  <span>{isEventsHub ? 'All Events Directory' : 'Official Event Invitation'}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleShareMenu}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition active:scale-95 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>{copiedLink ? 'Link Copied!' : 'Share Event'}</span>
              </button>
            </div>

            {/* Event Logo & Main Title */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              {page.logo ? (
                <img
                  src={page.logo}
                  alt={page.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-purple-400/30 shadow-xl bg-slate-800 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/20 shrink-0">
                  <Ticket className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!isEventsHub && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold tracking-wide uppercase border border-purple-500/30 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    <span>RSVP Open</span>
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {cleanForbiddenWords(isEventsHub ? 'our Events' : (page.title || 'our Events'))}
                </h1>
                {page.tagline && !isEventsHub && cleanForbiddenWords(page.tagline) && (
                  <p className="text-xs sm:text-sm text-purple-200/90 font-medium mt-1 leading-snug">
                    {cleanForbiddenWords(page.tagline)}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
              {waRsvpUrl ? (
                <a
                  href={waRsvpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-98 text-center shadow-sm shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4 mb-1" />
                  <span className="truncate w-full text-[11px]">RSVP WhatsApp</span>
                </a>
              ) : null}

              {page.phone ? (
                <a
                  href={`tel:${page.phone}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <Phone className="w-4 h-4 mb-1 text-purple-300" />
                  <span className="truncate w-full text-[11px]">Call Host</span>
                </a>
              ) : null}

              {page.address ? (
                <a
                  href={page.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(page.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <MapPin className="w-4 h-4 mb-1 text-purple-300" />
                  <span className="truncate w-full text-[11px]">Venue Map</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Announcement Banner */}
        {page.announcement && !page.announcement.includes('0 Upcoming Events') && (
          <div className="bg-purple-50 dark:bg-purple-950/50 border-b border-purple-200 dark:border-purple-900/60 px-4 py-2.5 text-xs text-purple-900 dark:text-purple-200 font-semibold flex items-center gap-2 shadow-2xs">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="flex-1">{page.announcement}</p>
          </div>
        )}

        {/* Main Event Content */}
        {(() => {
          let effectiveEventsList = (page.menuItems && page.menuItems.length > 0)
            ? page.menuItems
            : (page.eventsQrItems && page.eventsQrItems.length > 0)
              ? page.eventsQrItems.map((e: any) => ({
                  id: `event-pass-${e.id}`,
                  name: e.title,
                  category: 'Our Events',
                  price: 0,
                  description: `${e.startDate ? e.startDate + ' • ' : ''}${e.location || ''}${e.description ? ' • ' + e.description : ''}`,
                  url: e.rsvpUrl || undefined,
                  ctaText: e.ctaText || 'RSVP & Join',
                  tags: [e.startDate || 'Upcoming', e.location || 'Event'],
                  isSpecial: true,
                  isAvailable: true,
                  photoUrl: e.photos?.[0] || undefined,
                }))
              : [];

          if (effectiveEventsList.length === 0) {
            try {
              const initial = typeof window !== 'undefined' ? (window as any).__INITIAL_QR_PAGE__ : null;
              if (initial?.eventsQrItems && initial.eventsQrItems.length > 0) {
                effectiveEventsList = initial.eventsQrItems.map((e: any) => ({
                  id: `event-pass-${e.id}`,
                  name: e.title,
                  category: 'Our Events',
                  price: 0,
                  description: `${e.startDate ? e.startDate + ' • ' : ''}${e.location || ''}${e.description ? ' • ' + e.description : ''}`,
                  url: e.rsvpUrl || undefined,
                  ctaText: e.ctaText || 'RSVP & Join',
                  tags: [e.startDate || 'Upcoming', e.location || 'Event'],
                  isSpecial: true,
                  isAvailable: true,
                  photoUrl: e.photos?.[0] || undefined,
                }));
              } else if (initial?.menuItems && initial.menuItems.length > 0 && (initial.pageType === 'events_hub' || String(initial.id).includes('events'))) {
                effectiveEventsList = initial.menuItems;
              }
            } catch {}
          }
          if (effectiveEventsList.length === 0 && isMerchantPreview) {
            try {
              const stored = StorageService.getEventsQrItems();
              if (stored && stored.length > 0) {
                effectiveEventsList = stored.map((e: any) => ({
                  id: `event-pass-${e.id}`,
                  name: e.title,
                  category: 'Our Events',
                  price: 0,
                  description: `${e.startDate ? e.startDate + ' • ' : ''}${e.location || ''}${e.description ? ' • ' + e.description : ''}`,
                  url: e.rsvpUrl || undefined,
                  ctaText: e.ctaText || 'RSVP & Join',
                  tags: [e.startDate || 'Upcoming', e.location || 'Event'],
                  isSpecial: true,
                  isAvailable: true,
                  photoUrl: e.photos?.[0] || undefined,
                }));
              }
            } catch {}
          }

          return (
            <main className="max-w-2xl mx-auto px-4 pt-5 flex-1 w-full space-y-6">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Events</span>
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  {isEventsHub ? effectiveEventsList.length : 1} Event{isEventsHub && effectiveEventsList.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Facebook-style Card Renderer */}
              {isEventsHub ? (
                effectiveEventsList.length > 0 ? (
                  <div className="space-y-6">
                    {effectiveEventsList.map((evtItem) => {
                      const evtRsvpMsg = encodeURIComponent(
                        `👋 Hello,\nI would like to RSVP for *${evtItem.name}*!\n\nPlease confirm ticket availability and booking. Thank you!`
                      );
                      const evtWaUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${evtRsvpMsg}` : '';

                      return (
                        <div key={evtItem.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md overflow-hidden flex flex-col w-full space-y-4 pb-5">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 px-4 pt-4">
                      {page.logo ? (
                        <img src={page.logo} alt="Organizer" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {page.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {page.title}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Official Invitation • RSVP Open
                        </p>
                      </div>
                    </div>

                    {/* Image / Poster - Full Width */}
                    {evtItem.photoUrl ? (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-y border-slate-100 dark:border-slate-800 max-h-[480px]">
                        <img
                          src={evtItem.photoUrl}
                          alt={evtItem.name}
                          className="w-full h-auto object-cover max-h-[480px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/40 dark:to-slate-900 border-y border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-purple-600/60 dark:text-purple-400/50 p-6">
                        <Ticket className="w-16 h-16 stroke-[1.5] mb-2 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider">Business Event Pass</span>
                      </div>
                    )}

                    {/* Details Box */}
                    <div className="px-4 space-y-3.5">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                        {evtItem.name}
                      </h2>

                      {evtItem.description && (
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {evtItem.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        {page.address && (
                          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Venue Location</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{page.address}</p>
                            </div>
                          </div>
                        )}

                        {page.announcement && (
                          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Schedule</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{page.announcement.replace('📅 ', '')}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact Channels */}
                      {(page.phone || page.email) && (
                        <div className="p-3 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100/40 dark:border-purple-900/40 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          <span className="text-[9px] font-black text-purple-500 uppercase tracking-wider block">Inquiries & Contact</span>
                          {page.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span>Call Host: <a href={`tel:${page.phone}`} className="underline">{page.phone}</a></span>
                            </p>
                          )}
                          {page.email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span>Email: <a href={`mailto:${page.email}`} className="underline">{page.email}</a></span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        {evtWaUrl && (
                          <a
                            href={evtWaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 text-center cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Confirm RSVP on WhatsApp</span>
                          </a>
                        )}

                        {page.address && (
                          <a
                            href={page.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.address)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 text-center"
                          >
                            <MapPin className="w-4 h-4 text-rose-500" />
                            <span>Open Maps</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Events Scheduled Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upcoming events and official RSVP invitation passes will appear here.
              </p>
            </div>
          )
        ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col w-full space-y-4 pb-5">
              {/* Post Header */}
              <div className="flex items-center gap-3 px-4 pt-4">
                {page.logo ? (
                  <img src={page.logo} alt="Organizer" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {page.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {page.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Official Invitation • RSVP Open
                  </p>
                </div>
              </div>

              {/* Cover Image - Big as a Facebook post */}
              {page.coverImage ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-y border-slate-100 dark:border-slate-800 max-h-[480px]">
                  <img
                    src={page.coverImage}
                    alt={page.title}
                    className="w-full h-auto object-cover max-h-[480px] w-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-950/40 dark:to-slate-900 border-y border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-purple-600/60 dark:text-purple-400/50 p-6">
                  <Ticket className="w-16 h-16 stroke-[1.5] mb-2 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider">Business Event Pass</span>
                </div>
              )}

              {/* Details Box */}
              <div className="px-4 space-y-3.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {page.title}
                </h2>

                {page.description && cleanForbiddenWords(page.description) && (
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {cleanForbiddenWords(page.description)}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  {page.address && (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Venue Location</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{page.address}</p>
                      </div>
                    </div>
                  )}

                  {page.announcement && (
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Schedule</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{page.announcement.replace('📅 ', '')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Channels */}
                {(page.phone || page.email) && (
                  <div className="p-3 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100/40 dark:border-purple-900/40 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <span className="text-[9px] font-black text-purple-500 uppercase tracking-wider block">Inquiries & Contact</span>
                    {page.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>Call Host: <a href={`tel:${page.phone}`} className="underline">{page.phone}</a></span>
                      </p>
                    )}
                    {page.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>Email: <a href={`mailto:${page.email}`} className="underline">{page.email}</a></span>
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {waRsvpUrl && (
                    <a
                      href={waRsvpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 text-center cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Confirm RSVP on WhatsApp</span>
                    </a>
                  )}

                  {page.address && (
                    <a
                      href={page.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-98 text-center"
                    >
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>Open Maps</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 pb-4 text-center border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Powered by Brivu</p>
          </div>
        </main>
          );
        })()}

        {/* Lightbox Modal */}
        {lightboxImage && (
          <TouchZoomLightbox
            image={{
              ...lightboxImage,
              totalPhotos: page.photos.length,
            }}
            onClose={() => setLightboxImage(null)}
            onNext={
              page.photos.length > 1 && lightboxImage.photoIndex !== undefined
                ? () => {
                    const nextIdx = (lightboxImage.photoIndex! + 1) % page.photos.length;
                    const p = page.photos[nextIdx];
                    setLightboxImage({
                      url: p.url,
                      title: p.title || page.title,
                      description: p.description || p.caption,
                      category: p.category,
                      badge: p.badge,
                      photoIndex: nextIdx,
                    });
                  }
                : undefined
            }
            onPrev={
              page.photos.length > 1 && lightboxImage.photoIndex !== undefined
                ? () => {
                    const prevIdx = (lightboxImage.photoIndex! - 1 + page.photos.length) % page.photos.length;
                    const p = page.photos[prevIdx];
                    setLightboxImage({
                      url: p.url,
                      title: p.title || page.title,
                      description: p.description || p.caption,
                      category: p.category,
                      badge: p.badge,
                      photoIndex: prevIdx,
                    });
                  }
                : undefined
            }
          />
        )}
      </div>
    );
  }

  // Dedicated Standalone Websites & Apps Directory Customer View
  if (isWebsitesHub) {
    const rawWebsites =
      page.websitesQrItems && page.websitesQrItems.length > 0
        ? page.websitesQrItems
        : page.menuItems && page.menuItems.length > 0
          ? page.menuItems.map((item: any) => ({
              id: item.id,
              title: item.name || 'Official Link',
              url:
                item.url ||
                (typeof item.description === 'string' && item.description.startsWith('http')
                  ? item.description
                  : item.url) ||
                '#',
              type: (item.itemType || item.tags?.[0] || 'website') as any,
              description:
                item.description && !item.description.startsWith('http') ? item.description : undefined,
              ctaText: item.ctaText || item.tags?.[1] || 'Visit Website',
              phone: item.phone,
              phoneAction: item.phoneAction,
            }))
          : [];

    let finalWebsites = rawWebsites;
    if (finalWebsites.length === 0) {
      try {
        const initial = typeof window !== 'undefined' ? (window as any).__INITIAL_QR_PAGE__ : null;
        if (initial?.websitesQrItems && initial.websitesQrItems.length > 0) {
          finalWebsites = initial.websitesQrItems;
        } else if (initial?.menuItems && initial.menuItems.length > 0 && (initial.pageType === 'websites_hub' || String(initial.id).includes('websites'))) {
          finalWebsites = initial.menuItems.map((item: any) => ({
            id: item.id,
            title: item.name || 'Official Link',
            url: item.url || '#',
            type: (item.itemType || item.tags?.[0] || 'website') as any,
            description: item.description,
            ctaText: item.ctaText || 'Visit Website',
            phone: item.phone,
            phoneAction: item.phoneAction,
          }));
        }
      } catch {}
    }
    if (finalWebsites.length === 0) {
      try {
        const stored = StorageService.getWebsitesQrItems();
        if (stored && stored.length > 0) {
          finalWebsites = stored;
        }
      } catch {}
    }

    const filteredWebsites = finalWebsites.filter((w) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        w.url.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        (w.type && w.type.toLowerCase().includes(q))
      );
    });

    const cleanWaNumber = (page.whatsapp || page.phone || '').replace(/[^0-9]/g, '');
    const defaultDirectoryMsg = encodeURIComponent(
      `👋 Hello *${page.title}*,\nI found your official websites directory and have a quick inquiry. Thank you!`
    );
    const waDirectoryUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${defaultDirectoryMsg}` : '';

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'android_app':
          return Smartphone;
        case 'ios_app':
          return Smartphone;
        case 'web_app':
          return Globe;
        case 'phone_link':
          return Phone;
        default:
          return Globe;
      }
    };

    const getTypeBadgeStyle = (type: string) => {
      switch (type) {
        case 'android_app':
          return {
            label: 'Android App',
            style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          };
        case 'ios_app':
          return {
            label: 'iOS App',
            style: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          };
        case 'web_app':
          return {
            label: 'Web Application',
            style: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          };
        case 'phone_link':
          return {
            label: 'Call / WhatsApp',
            style: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          };
        case 'custom':
          return {
            label: 'Direct Portal',
            style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          };
        default:
          return {
            label: 'Official Website',
            style: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          };
      }
    };

    const getDomainFromUrl = (urlStr: string) => {
      try {
        const u = new URL(urlStr);
        return u.hostname.replace(/^www\./, '');
      } catch {
        return urlStr.replace(/^https?:\/\//, '').split('/')[0];
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-24">
        {/* Merchant preview top bar */}
        {isMerchantPreview && (
          <div className="bg-blue-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
              <span>Websites Directory Mode (Live Preview)</span>
            </div>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </button>
            )}
          </div>
        )}

        {/* Hero Header */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
          <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-6 sm:pt-8 sm:pb-8">
            {/* Top Actions: Share & Back */}
            <div className="flex items-center justify-between mb-4">
              {onBackToApp ? (
                <button
                  onClick={onBackToApp}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold backdrop-blur-md border border-blue-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Powered by Brivu</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleShareMenu}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-300" />
                <span>{copiedLink ? 'Link Copied!' : 'Share Directory'}</span>
              </button>
            </div>

            {/* Business Logo & Main Title */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              {page.logo ? (
                <img
                  src={page.logo}
                  alt={page.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-400/30 shadow-xl bg-slate-800 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/20 shrink-0">
                  <Globe className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {cleanForbiddenWords(page.title || 'Our Sites')}
                </h1>
                {page.tagline && cleanForbiddenWords(page.tagline) && (
                  <p className="text-xs sm:text-sm text-blue-200/90 font-medium mt-1 leading-snug">
                    {cleanForbiddenWords(page.tagline)}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
              {waDirectoryUrl ? (
                <a
                  href={waDirectoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-98 text-center shadow-sm shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4 mb-1" />
                  <span className="truncate w-full text-[11px]">WhatsApp Us</span>
                </a>
              ) : null}

              {page.phone ? (
                <a
                  href={`tel:${page.phone}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <Phone className="w-4 h-4 mb-1 text-blue-300" />
                  <span className="truncate w-full text-[11px]">Call Us</span>
                </a>
              ) : null}

              {page.address ? (
                <a
                  href={page.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(page.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <MapPin className="w-4 h-4 mb-1 text-blue-300" />
                  <span className="truncate w-full text-[11px]">Location</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-2xl mx-auto px-4 pt-5 flex-1 w-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Official Links & Websites</span>
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {finalWebsites.length} Link{finalWebsites.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search bar when more than 2 items */}
          {finalWebsites.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search websites or apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Websites Cards List */}
          {filteredWebsites.length > 0 ? (
            <div className="space-y-3.5">
              {filteredWebsites.map((item, idx) => {
                const Icon = getTypeIcon(item.type);
                const badge = getTypeBadgeStyle(item.type);
                const domain = getDomainFromUrl(item.url);
                const cleanPhone = (item.phone || '').replace(/[^0-9+]/g, '');
                const supportWaUrl = cleanPhone
                  ? item.phoneAction === 'tel'
                    ? `tel:${cleanPhone}`
                    : `https://wa.me/${cleanPhone.replace(/[^0-9]/g, '')}`
                  : '';

                return (
                  <div
                    key={item.id || idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition flex flex-col gap-3 group"
                  >
                    {/* Top Row: Type Badge + Domain + Action */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.style}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono font-medium truncate max-w-[150px] sm:max-w-[200px]">
                          {domain}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard?.writeText(item.url);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs transition cursor-pointer"
                        title="Copy direct link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Title & Description */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1.5 truncate max-w-full">
                        {item.url}
                      </p>
                    </div>

                    {/* Bottom: Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition text-center cursor-pointer"
                      >
                        <span>{item.ctaText || 'Visit Website'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {supportWaUrl && (
                        <a
                          href={supportWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition text-center shrink-0 cursor-pointer"
                          title="Contact support"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="hidden sm:inline">Support</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <Globe className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No websites found matching your search' : 'No Official Websites Added Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try clearing the search query to see all verified links.'
                  : 'Official links and verified websites configured by the merchant will appear here.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-500 transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 pb-4 text-center border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Powered by Brivu</p>
          </div>
        </main>
      </div>
    );
  }

  // Dedicated Standalone Socials & Messaging Directory Customer View
  if (isSocialsHub) {
    const rawSocials =
      page.socialsQrItems && page.socialsQrItems.length > 0
        ? page.socialsQrItems
        : page.menuItems && page.menuItems.length > 0
          ? page.menuItems.map((item: any) => ({
              id: item.id,
              platform: (item.itemType || item.tags?.[0] || 'custom') as any,
              customPlatformName: item.name,
              title: item.name || 'Social Media',
              usernameOrPhone: item.usernameOrPhone || '',
              fullUrl:
                item.url ||
                (typeof item.description === 'string' && item.description.startsWith('http')
                  ? item.description
                  : item.url) ||
                '#',
              prefilledMessage:
                item.description && !item.description.startsWith('http') ? item.description : undefined,
              ctaText: item.ctaText || item.tags?.[1] || 'Connect',
              darkColor: '#059669',
              lightColor: '#ffffff',
              createdAt: new Date().toISOString(),
            }))
          : [];

    let finalSocials = rawSocials;
    if (finalSocials.length === 0) {
      try {
        const initial = typeof window !== 'undefined' ? (window as any).__INITIAL_QR_PAGE__ : null;
        if (initial?.socialsQrItems && initial.socialsQrItems.length > 0) {
          finalSocials = initial.socialsQrItems;
        } else if (initial?.menuItems && initial.menuItems.length > 0 && (initial.pageType === 'socials_hub' || String(initial.id).includes('socials'))) {
          finalSocials = initial.menuItems.map((item: any) => ({
            id: item.id,
            platform: (item.itemType || item.tags?.[0] || 'custom') as any,
            customPlatformName: item.name,
            title: item.name || 'Social Media',
            usernameOrPhone: item.usernameOrPhone || '',
            fullUrl: item.url || '#',
            prefilledMessage: item.description,
            ctaText: item.ctaText || 'Connect',
            darkColor: '#059669',
            lightColor: '#ffffff',
            createdAt: new Date().toISOString(),
          }));
        }
      } catch {}
    }
    if (finalSocials.length === 0) {
      try {
        const stored = StorageService.getSocialsQrItems();
        if (stored && stored.length > 0) {
          finalSocials = stored;
        }
      } catch {}
    }

    const filteredSocials = finalSocials.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.fullUrl.toLowerCase().includes(q) ||
        (s.platform && s.platform.toLowerCase().includes(q)) ||
        (s.customPlatformName && s.customPlatformName.toLowerCase().includes(q)) ||
        (s.usernameOrPhone && s.usernameOrPhone.toLowerCase().includes(q)) ||
        (s.prefilledMessage && s.prefilledMessage.toLowerCase().includes(q))
      );
    });

    const cleanWaNumber = (page.whatsapp || page.phone || '').replace(/[^0-9]/g, '');
    const defaultDirectoryMsg = encodeURIComponent(
      `👋 Hello *${page.title}*,\nI found your social media platforms and would like to connect. Thank you!`
    );
    const waDirectoryUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}?text=${defaultDirectoryMsg}` : '';

    const getPlatformBrand = (platform: string) => {
      switch (platform) {
        case 'whatsapp':
          return { name: 'WhatsApp', color: '#25D366', bgClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
        case 'instagram':
          return { name: 'Instagram', color: '#E1306C', bgClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20' };
        case 'facebook':
          return { name: 'Facebook', color: '#1877F2', bgClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
        case 'tiktok':
          return { name: 'TikTok', color: '#000000', bgClass: 'bg-slate-900/10 text-slate-900 dark:text-white border-slate-700/20' };
        case 'x_twitter':
          return { name: 'X (Twitter)', color: '#000000', bgClass: 'bg-slate-900/10 text-slate-900 dark:text-white border-slate-700/20' };
        case 'youtube':
          return { name: 'YouTube', color: '#FF0000', bgClass: 'bg-red-500/10 text-red-600 border-red-500/20' };
        case 'linkedin':
          return { name: 'LinkedIn', color: '#0A66C2', bgClass: 'bg-sky-600/10 text-sky-600 border-sky-600/20' };
        case 'telegram':
          return { name: 'Telegram', color: '#229ED9', bgClass: 'bg-sky-500/10 text-sky-500 border-sky-500/20' };
        case 'snapchat':
          return { name: 'Snapchat', color: '#FFFC00', bgClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
        case 'threads':
          return { name: 'Threads', color: '#000000', bgClass: 'bg-slate-900/10 text-slate-900 dark:text-white border-slate-700/20' };
        case 'pinterest':
          return { name: 'Pinterest', color: '#BD081C', bgClass: 'bg-red-600/10 text-red-600 border-red-600/20' };
        case 'reddit':
          return { name: 'Reddit', color: '#FF4500', bgClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
        case 'discord':
          return { name: 'Discord', color: '#5865F2', bgClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
        case 'twitch':
          return { name: 'Twitch', color: '#9146FF', bgClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
        case 'spotify':
          return { name: 'Spotify', color: '#1DB954', bgClass: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20' };
        default:
          return { name: 'Social Channel', color: '#059669', bgClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white pb-24">
        {/* Merchant preview top bar */}
        {isMerchantPreview && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>Socials Hub Mode (Live Preview)</span>
            </div>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Editor</span>
              </button>
            )}
          </div>
        )}

        {/* Hero Header */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
          <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-6 sm:pt-8 sm:pb-8">
            {/* Top Actions: Share & Back */}
            <div className="flex items-center justify-between mb-4">
              {onBackToApp ? (
                <button
                  onClick={onBackToApp}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold backdrop-blur-md border border-emerald-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Official Social Hub</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleShareMenu}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>{copiedLink ? 'Link Copied!' : 'Share Hub'}</span>
              </button>
            </div>

            {/* Business Logo & Main Title */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              {page.logo ? (
                <img
                  src={page.logo}
                  alt={page.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400/30 shadow-xl bg-slate-800 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/20 shrink-0">
                  <MessageCircle className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {cleanForbiddenWords(page.title || 'our social media platforms')}
                </h1>
                {(page.tagline || 'Connect Across All Official Social Channels & Messaging Apps') && (
                  <p className="text-xs sm:text-sm text-emerald-200/90 font-medium mt-1 leading-snug">
                    {cleanForbiddenWords(page.tagline || 'Connect Across All Official Social Channels & Messaging Apps')}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
              {waDirectoryUrl ? (
                <a
                  href={waDirectoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-98 text-center shadow-sm shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4 mb-1" />
                  <span className="truncate w-full text-[11px]">Chat on WhatsApp</span>
                </a>
              ) : null}

              {page.phone ? (
                <a
                  href={`tel:${page.phone}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <Phone className="w-4 h-4 mb-1 text-emerald-300" />
                  <span className="truncate w-full text-[11px]">Call Us</span>
                </a>
              ) : null}

              {page.address ? (
                <a
                  href={page.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(page.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
                >
                  <MapPin className="w-4 h-4 mb-1 text-emerald-300" />
                  <span className="truncate w-full text-[11px]">Location</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-2xl mx-auto px-4 pt-5 flex-1 w-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Official Social Media & Messaging</span>
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {finalSocials.length} Channel{finalSocials.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Search bar when more than 2 items */}
          {finalSocials.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search social platforms or channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Social Channels List */}
          {filteredSocials.length > 0 ? (
            <div className="space-y-3.5">
              {filteredSocials.map((item, idx) => {
                const brand = getPlatformBrand(item.platform);
                const platformDisplayName = item.customPlatformName || brand.name;

                return (
                  <div
                    key={item.id || idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 hover:shadow-md transition flex flex-col gap-3 group"
                  >
                    {/* Top Row: Brand Badge + Handle/Username + Copy */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${brand.bgClass}`}
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>{platformDisplayName}</span>
                        </span>
                        {item.usernameOrPhone && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate max-w-[150px] sm:max-w-[200px]">
                            {item.usernameOrPhone}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard?.writeText(item.fullUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs transition cursor-pointer"
                        title="Copy direct link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Title & Message */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {item.title}
                      </h3>
                      {item.prefilledMessage && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {item.prefilledMessage}
                        </p>
                      )}
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 truncate max-w-full">
                        {item.fullUrl}
                      </p>
                    </div>

                    {/* Bottom: Direct Connect Action Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <a
                        href={item.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition text-center cursor-pointer"
                      >
                        <span>{item.ctaText || `Connect on ${platformDisplayName}`}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No social channels found matching your search' : 'No Official Social Channels Added Yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Try clearing the search query to see all verified channels.'
                  : 'Official social profiles and messaging channels configured by the merchant will appear here.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 pb-4 text-center border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Powered by Brivu</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-24">
      {/* Merchant preview top bar */}
      {isMerchantPreview && (
        <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Preview Mode</span>
          </div>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Editor</span>
            </button>
          )}
        </div>
      )}

      {/* Hero Header */}
      <div className="relative w-full overflow-hidden bg-slate-900 text-white">
        {page.coverImage ? (
          <div className="absolute inset-0 z-0">
            <img
              src={page.coverImage}
              alt={page.title}
              className="w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 opacity-95">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
          </div>
        )}

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-6 sm:pt-8 sm:pb-8">
          {/* Top Actions: Share, Wifi, Back */}
          <div className="flex items-center justify-between mb-4">
            {onBackToApp ? (
              <button
                onClick={onBackToApp}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition active:scale-95"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified QR Items</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {(page.wifiName || page.wifiPassword) && (
                <button
                  type="button"
                  onClick={() => setShowWifiModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition active:scale-95"
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WiFi</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareMenu}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* Business Logo & Titles */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            {page.logo ? (
              <img
                src={page.logo}
                alt={page.title}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl bg-slate-800 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white text-2xl font-black shadow-xl border-2 border-white/20 shrink-0">
                {page.title.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                {page.title}
              </h1>
              {page.tagline && (
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 line-clamp-2 leading-relaxed">
                  {page.tagline}
                </p>
              )}

              {/* Status Badge & Hours */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Open for Guests
                </span>
                {page.openingHours && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{page.openingHours}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact Buttons Bar */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
            {page.phone && (
              <a
                href={`tel:${page.phone}`}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
              >
                <Phone className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="truncate w-full text-[11px]">Call Venue</span>
              </a>
            )}

            {page.whatsapp && (
              <a
                href={`https://wa.me/${page.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
              >
                <MessageCircle className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="truncate w-full text-[11px]">WhatsApp</span>
              </a>
            )}

            {page.address && (
              <a
                href={page.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(page.address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition active:scale-98 text-center"
              >
                <MapPin className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="truncate w-full text-[11px]">Directions</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Announcement Banner */}
      {page.announcement && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="flex-1">{page.announcement}</p>
        </div>
      )}

      {/* Nav Tabs: Menu | Photos | About & Venue */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto scrollbar-none">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between min-w-max gap-3">
          <div className="flex gap-3 sm:gap-6">
            <button
              onClick={() => {
                setActiveTab('menu');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                activeTab === 'menu'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Items</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {page.menuItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('photos')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                activeTab === 'photos'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Photos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {page.photos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`py-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition ${
                activeTab === 'about'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About & Venue</span>
            </button>
          </div>

          {/* Quick tray trigger */}
          {page.allowWhatsAppOrdering && totalTrayCount > 0 && (
            <button
              onClick={() => setShowOrderTrayModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tray ({totalTrayCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="max-w-2xl mx-auto px-4 pt-4 flex-1 w-full">
        {/* TAB 1: DIGITAL MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items, products, or specials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Menu Items List */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No items found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try searching for a different item or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {filteredItems.map((item) => {
                  const inTray = trayItems[item.id]?.quantity || 0;
                  const isFavorited = !!favorites[item.id];

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition duration-300 flex flex-col overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedItemModal(item)}
                    >
                      {/* Product Image Container */}
                      <div className="relative aspect-[3/4] sm:aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                        {item.photoUrl ? (
                          <>
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                              title="Click to view details and photo"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage({
                                  url: item.photoUrl!,
                                  title: item.name,
                                  description: item.description,
                                  category: item.category,
                                });
                              }}
                              className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-md transition active:scale-90"
                              title="Pinch to zoom picture"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-4">
                            <Utensils className="w-8 h-8 opacity-40 mb-1" />
                            <span className="text-[10px] font-medium opacity-60">No Photo</span>
                          </div>
                        )}

                        {/* Top Badges Overlay inside Photo */}
                        <div className="absolute top-2 left-2 right-2 z-10 flex flex-wrap items-center gap-1">
                          {isItemPromoActive(item) && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9.5px] font-bold shadow-xs uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-xs">
                              <BadgePercent className="w-2.5 h-2.5" />
                              <span>Promo</span>
                            </span>
                          )}
                          {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9.5px] font-bold shadow-xs uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-xs"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{tag}</span>
                            </span>
                          ))}
                          {item.isSpecial && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[9.5px] font-bold shadow-xs uppercase tracking-wider flex items-center gap-0.5 backdrop-blur-xs">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Special</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Area */}
                      <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          {/* Title */}
                          <h3
                            className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            title="View full details"
                          >
                            {item.name}
                          </h3>

                          {/* Description */}
                          {item.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal line-clamp-2 mt-1 leading-normal">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Bottom Row: Price & Cart Button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                          <div className="flex items-baseline justify-between min-w-0">
                            {isItemPromoActive(item) && item.promoPrice !== undefined && item.promoPrice > 0 ? (
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] line-through text-slate-400 dark:text-slate-500 font-medium leading-none mb-0.5">
                                  {page.currency} {item.price.toLocaleString()}
                                </span>
                                <span className="text-xs sm:text-sm font-black text-amber-500 dark:text-amber-400 leading-tight truncate">
                                  {page.currency} {item.promoPrice.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight truncate">
                                {page.currency} {item.price.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Cart Add Button / Quantity Counter */}
                          {page.allowWhatsAppOrdering && (
                            <div className="w-full">
                              {inTray > 0 ? (
                                <div className="w-full flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromCart(item.id);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold shadow-xs hover:bg-slate-100 text-sm active:scale-90"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-200 text-xs px-1">
                                    <span className="font-mono font-black text-sm">{inTray}</span>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">in order</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCart(item);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs hover:bg-emerald-500 text-sm active:scale-90"
                                    title="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
                                  title="Add to Order"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>+ Add to Order</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PHOTOS */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Photos</h2>
              <span className="text-xs text-slate-400">{effectivePhotos.length} Photos</span>
            </div>

            {effectivePhotos.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No photos uploaded yet</p>
                <p className="text-xs text-slate-400 mt-0.5">The business owner can add photos in the QR Hosting editor</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {effectivePhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setLightboxImage({
                        url: photo.url,
                        title: photo.title || page.title,
                        description: photo.description || photo.caption,
                        category: photo.category,
                        badge: photo.badge,
                        photoIndex: idx,
                      });
                    }}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 transition"
                    title="Click to view with 2-finger pinch zoom"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title || 'Photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {photo.badge && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold shadow-xs backdrop-blur-xs flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{photo.badge}</span>
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSharePhoto(photo);
                        }}
                        className="p-1 rounded-md bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 transition shadow-xs active:scale-90"
                        title="Share / Copy photo link"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <span className="p-1 rounded-md bg-black/50 group-hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 transition shadow-xs">
                        <Maximize2 className="w-3 h-3" />
                      </span>
                    </div>
                    {(photo.title || photo.category || photo.description || photo.caption) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2.5 text-white">
                        <p className="text-xs font-bold truncate drop-shadow-xs">{photo.title || 'Photo'}</p>
                        {photo.category && <p className="text-[10px] text-emerald-300 font-medium truncate">{photo.category}</p>}
                        {(photo.description || photo.caption) && (
                          <p className="text-[10px] text-slate-200/90 line-clamp-2 mt-0.5 leading-snug">{photo.description || photo.caption}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ABOUT & VENUE INFO */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* Special Promo / Announcement Card if present */}
            {page.announcement && (
              <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Special Promo & Notice</span>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 leading-snug">Active Special Offer</h4>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 pl-10 leading-relaxed whitespace-pre-line">
                  {page.announcement}
                </p>
              </div>
            )}

            {/* Description Card */}
            {page.description && cleanForbiddenWords(page.description) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Our Venue</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {cleanForbiddenWords(page.description)}
                </p>
              </div>
            )}

            {/* Direct Contact & Phone Numbers Card */}
            {(page.phone || page.whatsapp || page.email) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact & Helplines</h3>

                {/* Direct Phone Number */}
                {page.phone && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400">Phone Number / Voice Call</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{page.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(page.phone || '');
                          setCopiedPhone(true);
                          setTimeout(() => setCopiedPhone(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                        title="Copy phone number"
                      >
                        {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href={`tel:${page.phone}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* WhatsApp Number */}
                {page.whatsapp && (
                  <div className={`flex items-center justify-between gap-3 ${page.phone ? 'pt-3 border-t border-slate-100 dark:border-slate-800' : ''}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400">WhatsApp Direct Support</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{page.whatsapp}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(page.whatsapp || '');
                          setCopiedWhatsApp(true);
                          setTimeout(() => setCopiedWhatsApp(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                        title="Copy WhatsApp number"
                      >
                        {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWhatsApp ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href={`https://wa.me/${page.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Email Address */}
                {page.email && (
                  <div className={`flex items-center justify-between gap-3 ${page.phone || page.whatsapp ? 'pt-3 border-t border-slate-100 dark:border-slate-800' : ''}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400">Official Email</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{page.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(page.email || '');
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                        title="Copy email address"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                      </button>

                      <a
                        href={`mailto:${page.email}`}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hours & Location Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location & Hours</h3>

              {page.address && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Physical Address</p>
                    <p className="text-slate-500 dark:text-slate-400">{page.address}</p>
                    <a
                      href={page.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(page.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1 mt-1 hover:underline"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {page.openingHours && (
                <div className="flex items-start gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Opening Hours</p>
                    <p className="text-slate-500 dark:text-slate-400">{page.openingHours}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Guest WiFi Info Card */}
            {(page.wifiName || page.wifiPassword) && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Complimentary Guest Wi-Fi
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (page.wifiPassword) {
                        navigator.clipboard.writeText(page.wifiPassword);
                        setCopiedWifi(true);
                        setTimeout(() => setCopiedWifi(false), 2000);
                      }
                    }}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition"
                  >
                    {copiedWifi ? 'Password Copied!' : 'Copy Password'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Network (SSID):</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{page.wifiName || 'Guest WiFi'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Password:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {page.wifiPassword || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Social Channels on Bottom of Business QR Page */}
        {page.customSocialLinks && page.customSocialLinks.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Connect & Follow Us
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Official social channels & online links
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {page.customSocialLinks.length} Channels
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {page.customSocialLinks.map((soc) => {
                const targetUrl =
                  soc.url.startsWith('http://') ||
                  soc.url.startsWith('https://') ||
                  soc.url.startsWith('mailto:') ||
                  soc.url.startsWith('tel:')
                    ? soc.url
                    : `https://${soc.url}`;

                return (
                  <a
                    key={soc.id || soc.name}
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-800 dark:text-slate-200 transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-emerald-300">
                        {getSocialLinkIcon(soc.name)}
                      </div>
                      <span className="text-xs font-bold truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {soc.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0">
                      <span className="text-[11px] font-semibold hidden sm:inline">Visit</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Order Bar at bottom */}
      {page.allowWhatsAppOrdering && totalTrayCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setShowOrderTrayModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3.5 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-between transition-transform active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black">
                {totalTrayCount}
              </div>
              <div className="text-left">
                <p className="text-xs text-emerald-100 font-normal">View Current Order</p>
                <p className="text-sm font-extrabold">{totalTrayCount} items selected</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black">
                {page.currency} {totalTrayPrice.toLocaleString()}
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* MODAL: ORDER TRAY & WHATSAPP CHECKOUT */}
      {showOrderTrayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Your Order Tray</h3>
                  <p className="text-[11px] text-slate-400">{totalTrayCount} items selected</p>
                </div>
              </div>

              <button
                onClick={() => setShowOrderTrayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items list */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {trayList.map((t) => (
                <div
                  key={t.item.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{t.item.name}</p>
                    <p className="text-slate-400">
                      {page.currency} {getItemEffectivePrice(t.item).toLocaleString()} each
                      {isItemPromoActive(t.item) && t.item.promoPrice !== undefined && t.item.promoPrice > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-amber-500">
                          (🔥 Promo)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => handleRemoveFromCart(t.item.id)}
                        className="w-6 h-6 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1">{t.quantity}</span>
                      <button
                        onClick={() => handleAddToCart(t.item)}
                        className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-emerald-600 dark:text-emerald-400 w-16 text-right">
                      {page.currency} {(t.quantity * t.item.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {/* Table / Details inputs */}
              <div className="pt-3 space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Table or Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4, Poolside, Room 12"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <PhoneInputField
                    id="input-customer-tray-phone"
                    label={<span className="text-[11px] font-bold text-slate-500 uppercase">Customer Phone Number (Optional)</span>}
                    value={customerPhone}
                    onChange={(val) => setCustomerPhone(val)}
                    placeholder="700 000000"
                    compact
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Order Description / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Less spicy, extra sauce, deliver to room terrace, bring cutlery..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer with checkout button */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
              <div className="flex items-center justify-between text-sm font-extrabold">
                <span className="text-slate-600 dark:text-slate-400">Total:</span>
                <span className="text-lg text-emerald-600 dark:text-emerald-400">
                  {page.currency} {totalTrayPrice.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleSendWhatsAppOrder}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Order via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULLSCREEN ITEM DETAILS (SHOWS ALL INFORMATION) */}
      {selectedItemModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedItemModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >


            {/* Scrollable Container */}
            <div className="overflow-y-auto flex-1">
              {/* Photo Display */}
              {selectedItemModal.photoUrl ? (
                <div
                  className="w-full bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 cursor-zoom-in group relative"
                  onClick={() => {
                    setLightboxImage({
                      url: selectedItemModal.photoUrl!,
                      title: selectedItemModal.name,
                      description: selectedItemModal.description,
                      category: selectedItemModal.category,
                    });
                  }}
                  title="Click to view full picture with 2-finger pinch zoom"
                >
                  <img
                    src={selectedItemModal.photoUrl}
                    alt={selectedItemModal.name}
                    className="w-full h-auto max-h-[50vh] object-contain rounded-2xl shadow-xl border border-white/10 group-hover:scale-[1.01] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* Top Badges Overlay inside Modal Photo */}
                  <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
                    {isItemPromoActive(selectedItemModal) && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold shadow-md uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                        <BadgePercent className="w-3.5 h-3.5" />
                        <span>Promo</span>
                      </span>
                    )}
                    {selectedItemModal.tags && selectedItemModal.tags.length > 0 && selectedItemModal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-xs font-bold shadow-md uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs border border-white/20"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{tag}</span>
                      </span>
                    ))}
                    {selectedItemModal.isSpecial && (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-xs font-bold shadow-md uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs border border-white/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Special</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* All Item Information */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Category & Availability */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-white/10">
                      {selectedItemModal.category}
                    </span>
                    {selectedItemModal.isAvailable !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        Currently Unavailable
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end">
                    {isItemPromoActive(selectedItemModal) &&
                    selectedItemModal.promoPrice !== undefined &&
                    selectedItemModal.promoPrice > 0 ? (
                      <>
                        <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono leading-tight">
                          {page.currency} {selectedItemModal.promoPrice.toLocaleString()}
                        </span>
                        <span className="text-xs line-through text-slate-400 font-medium">
                          {page.currency} {selectedItemModal.price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        {page.currency} {selectedItemModal.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                  {selectedItemModal.name}
                </h2>

                {/* Promo Banner if Active */}
                {isItemPromoActive(selectedItemModal) && (
                  <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <BadgePercent className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-300">Special Promotion Active</p>
                          <p className="text-[11px] text-slate-300">
                            {selectedItemModal.promoStartDate && selectedItemModal.promoEndDate
                              ? `Valid from ${selectedItemModal.promoStartDate} to ${selectedItemModal.promoEndDate}`
                              : selectedItemModal.promoEndDate
                              ? `Ends on ${selectedItemModal.promoEndDate}`
                              : 'Limited-time special offer'}
                          </p>
                        </div>
                      </div>
                      {selectedItemModal.promoPrice && selectedItemModal.promoPrice < selectedItemModal.price && (
                        <span className="shrink-0 text-[11px] font-extrabold text-amber-200 px-2 py-1 rounded-lg bg-amber-500/30 border border-amber-500/40">
                          SAVE {page.currency} {(selectedItemModal.price - selectedItemModal.promoPrice).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {selectedItemModal.promoDescription && (
                      <div className="pt-2 border-t border-amber-500/20 text-xs text-amber-200/90 font-medium">
                        "{selectedItemModal.promoDescription}"
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selectedItemModal.tags && selectedItemModal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItemModal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-slate-200 border border-white/10"
                      >
                        {tag === 'Spicy' && <Flame className="w-3 h-3 text-rose-400" />}
                        {tag === 'Vegetarian' && <Leaf className="w-3 h-3 text-emerald-400" />}
                        {tag === 'Chef Special' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Full Description */}
                {selectedItemModal.description && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Item Description & Ingredients
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed font-normal">
                      {selectedItemModal.description}
                    </p>
                  </div>
                )}

                {/* WhatsApp Order Action */}
                {page.allowWhatsAppOrdering && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      {trayItems[selectedItemModal.id]?.quantity ? (
                        <span className="text-emerald-400 font-semibold">
                          In your order ({trayItems[selectedItemModal.id]?.quantity})
                        </span>
                      ) : (
                        <span>Ready to order?</span>
                      )}
                    </div>

                    <div>
                      {trayItems[selectedItemModal.id]?.quantity ? (
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 border border-white/10">
                          <button
                            onClick={() => handleRemoveFromCart(selectedItemModal.id)}
                            className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold hover:bg-white/30 active:scale-95"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold text-emerald-300 px-2 font-mono">
                            {trayItems[selectedItemModal.id]?.quantity}
                          </span>
                          <button
                            onClick={() => handleAddToCart(selectedItemModal)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold hover:bg-emerald-500 active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(selectedItemModal)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Close Button */}
            <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => setSelectedItemModal(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULL-RESOLUTION ORIGINAL IMAGE LIGHTBOX (FOR ITEMS & PHOTOS WITH 2-FINGER PINCH ZOOM) */}
      {(lightboxImage || selectedPhoto) && (() => {
        const activeImg = lightboxImage || (selectedPhoto ? {
          url: selectedPhoto.url,
          title: selectedPhoto.title || page.title,
          description: selectedPhoto.description || selectedPhoto.caption,
          category: selectedPhoto.category,
          badge: selectedPhoto.badge,
        } : null);

        if (!activeImg) return null;

        const currentIdx = activeImg.photoIndex;
        const total = page.photos.length;

        return (
          <TouchZoomLightbox
            image={{
              ...activeImg,
              photoIndex: currentIdx,
              totalPhotos: total,
            }}
            onClose={() => {
              setLightboxImage(null);
              setSelectedPhoto(null);
            }}
            onNext={
              currentIdx !== undefined && total > 1
                ? () => {
                    const nextIdx = (currentIdx + 1) % total;
                    const p = page.photos[nextIdx];
                    setLightboxImage({
                      url: p.url,
                      title: p.title || page.title,
                      description: p.description || p.caption,
                      category: p.category,
                      badge: p.badge,
                      photoIndex: nextIdx,
                    });
                  }
                : undefined
            }
            onPrev={
              currentIdx !== undefined && total > 1
                ? () => {
                    const prevIdx = (currentIdx - 1 + total) % total;
                    const p = page.photos[prevIdx];
                    setLightboxImage({
                      url: p.url,
                      title: p.title || page.title,
                      description: p.description || p.caption,
                      category: p.category,
                      badge: p.badge,
                      photoIndex: prevIdx,
                    });
                  }
                : undefined
            }
            onShare={
              currentIdx !== undefined && page.photos[currentIdx]
                ? () => handleSharePhoto(page.photos[currentIdx])
                : undefined
            }
            isCopied={photoCopiedLink}
          />
        );
      })()}

      {/* MODAL: WI-FI INFO POPUP */}
      {showWifiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Wifi className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Guest Wi-Fi Access</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connect free during your visit</p>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-left space-y-2 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Network Name:</span>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{page.wifiName || 'Guest WiFi'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Password:</span>
                <p className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {page.wifiPassword || 'No password'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              {page.wifiPassword && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(page.wifiPassword || '');
                    setCopiedWifi(true);
                    setTimeout(() => setCopiedWifi(false), 2000);
                  }}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  {copiedWifi ? 'Copied!' : 'Copy Password'}
                </button>
              )}
              <button
                onClick={() => setShowWifiModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
