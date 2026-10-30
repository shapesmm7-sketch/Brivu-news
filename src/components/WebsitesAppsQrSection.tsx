import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Smartphone,
  Plus,
  Trash2,
  Edit3,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Sparkles,
  Save,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Palette,
  Eye,
  Link2,
  AppWindow,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { BusinessProfile, WebsiteAppQrItem, QRCodeHostedPage } from '../types';
import { QRHostingService } from '../services/qrHostingService';
import { saveFile, shareContent, saveJsPdf } from '../services/fileSaver';
import { jsPDF } from 'jspdf';
import { QRCodeColorEditorScreen } from './QRCodeColorEditorScreen';
import { PhoneInputField } from './PhoneInputField';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { AdMobNativeAd } from './AdMobNativeAd';
import { ADMOB_UNITS } from '../services/admobService';

export type { WebsiteAppQrItem };

const COLOR_PRESETS = [
  { name: 'Royal Blue', dark: '#2563eb', light: '#ffffff', eye: '#1d4ed8' },
  { name: 'Emerald Green', dark: '#059669', light: '#ffffff', eye: '#047857' },
  { name: 'Indigo Purple', dark: '#4f46e5', light: '#ffffff', eye: '#4338ca' },
  { name: 'Midnight Slate', dark: '#0f172a', light: '#ffffff', eye: '#0f172a' },
  { name: 'Amber Gold', dark: '#d97706', light: '#ffffff', eye: '#b45309' },
  { name: 'Crimson Rose', dark: '#e11d48', light: '#ffffff', eye: '#be123c' },
];

const TYPE_OPTIONS = [
  { id: 'website', label: 'Website / Landing Page', icon: Globe, defaultCta: 'Scan to Visit Website' },
  { id: 'phone_link', label: 'WhatsApp / Phone Contact', icon: Phone, defaultCta: 'Scan to Chat or Call' },
  { id: 'android_app', label: 'Android App (Google Play)', icon: Smartphone, defaultCta: 'Get on Google Play' },
  { id: 'ios_app', label: 'iOS App (App Store)', icon: AppWindow, defaultCta: 'Download on App Store' },
  { id: 'web_app', label: 'Web App / Portal', icon: Link2, defaultCta: 'Open Online App' },
  { id: 'custom', label: 'Custom Booking / Order Link', icon: ExternalLink, defaultCta: 'Scan to Order / Book' },
] as const;

interface WebsitesAppsQrSectionProps {
  business: BusinessProfile;
  hostedPageId?: string;
  showToast: (msg: string) => void;
  onOpenCustomerView?: (page: QRCodeHostedPage) => void;
}

export const WebsitesAppsQrSection: React.FC<WebsitesAppsQrSectionProps> = ({
  business,
  hostedPageId,
  showToast,
  onOpenCustomerView,
}) => {
  const [items, setItems] = useState<WebsiteAppQrItem[]>(() => {
    return StorageService.getWebsitesQrItems();
  });

  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const stored = StorageService.getWebsitesQrItems();
    return stored.length > 0 ? stored[0].id : '';
  });
  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<WebsiteAppQrItem | null>(null);

  // Colors for ALL Hub QR
  const [allQrColors, setAllQrColors] = useState({
    darkColor: '#2563eb',
    eyeColor: '#1d4ed8',
    lightColor: '#ffffff',
    boxBgColor: '#ffffff',
    boxBorderColor: '#cbd5e1',
  });

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formType, setFormType] = useState<WebsiteAppQrItem['type']>('website');
  const [formPhone, setFormPhone] = useState<string>('');
  const [phoneAction, setPhoneAction] = useState<'whatsapp' | 'tel'>('whatsapp');
  const [formCta, setFormCta] = useState<string>('Scan to Visit Website');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formDarkColor, setFormDarkColor] = useState<string>('#2563eb');
  const [formLightColor, setFormLightColor] = useState<string>('#ffffff');
  const [formEyeColor, setFormEyeColor] = useState<string>('#1d4ed8');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [tableNumberForPrint, setTableNumberForPrint] = useState<string>('');
  const [isEditingQrColors, setIsEditingQrColors] = useState<boolean>(false);

  const isAllSelected = selectedItemId === 'all';
  const activeItem = items.find((i) => i.id === selectedItemId) || null;

  const allHubUrl = useMemo(() => {
    return QRHostingService.getCustomerWebsitesHubUrl(business.name, business.email);
  }, [business.name, business.email]);

  const activeUrl = isAllSelected ? allHubUrl : (activeItem?.url || '');
  const activeDarkColor = isAllSelected ? allQrColors.darkColor : (activeItem?.darkColor || '#2563eb');
  const activeLightColor = isAllSelected ? allQrColors.lightColor : (activeItem?.lightColor || '#ffffff');
  const activeEyeColor = isAllSelected ? allQrColors.eyeColor : (activeItem?.eyeColor || activeDarkColor);
  const activeBoxBgColor = isAllSelected ? allQrColors.boxBgColor : (activeItem?.boxBgColor || '#ffffff');
  const activeBoxBorderColor = isAllSelected ? allQrColors.boxBorderColor : (activeItem?.boxBorderColor || '#cbd5e1');

  const handleUpdateItemColors = (
    itemId: string,
    updates: {
      qrDarkColor: string;
      qrEyeColor: string;
      qrLightColor: string;
      qrBoxBgColor: string;
      qrBoxBorderColor: string;
    }
  ) => {
    if (itemId === 'all') {
      setAllQrColors({
        darkColor: updates.qrDarkColor,
        eyeColor: updates.qrEyeColor,
        lightColor: updates.qrLightColor,
        boxBgColor: updates.qrBoxBgColor,
        boxBorderColor: updates.qrBoxBorderColor,
      });
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              darkColor: updates.qrDarkColor,
              eyeColor: updates.qrEyeColor,
              lightColor: updates.qrLightColor,
              boxBgColor: updates.qrBoxBgColor,
              boxBorderColor: updates.qrBoxBorderColor,
            }
          : it
      )
    );
  };

  // Save to storage & Cloudflare on update
  useEffect(() => {
    StorageService.saveWebsitesQrItems(items);
    if (items.length > 0) {
      QRHostingService.syncAllWebsitesPages(items, business);
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  }, [items, business]);

  // Cloudflare sync on mount
  useEffect(() => {
    if (items.length > 0) {
      QRHostingService.syncAllWebsitesPages(items, business);
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  }, [business]);

  // Generate QR for active item or ALL hub
  useEffect(() => {
    if (!activeUrl) return;
    QRHostingService.generateQrCodeDataUrl(activeUrl, {
      width: 600,
      margin: 1.5,
      color: {
        dark: activeDarkColor,
        light: activeLightColor,
        eyeColor: activeEyeColor,
      },
    })
      .then((data) => setActiveQrDataUrl(data))
      .catch((err) => console.error(err));
  }, [activeUrl, activeDarkColor, activeLightColor, activeEyeColor]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormUrl('https://');
    setFormType('website');
    const defaultPhone = (business.whatsapp || business.phone || '').trim();
    setFormPhone(defaultPhone);
    setPhoneAction('whatsapp');
    setFormCta('Scan to Visit Website');
    setFormDesc('');
    setFormDarkColor('#2563eb');
    setFormLightColor('#ffffff');
    setFormEyeColor('#1d4ed8');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: WebsiteAppQrItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormType(item.type);
    let p = item.phone || '';
    if (!p && (item.url.includes('wa.me') || item.url.startsWith('tel:'))) {
      const waMatch = item.url.match(/wa\.me\/([0-9]+)/);
      const telMatch = item.url.match(/tel:([+0-9]+)/);
      if (waMatch) p = waMatch[1];
      else if (telMatch) p = telMatch[1];
    }
    setFormPhone(p);
    setPhoneAction(item.url.startsWith('tel:') ? 'tel' : 'whatsapp');
    setFormCta(item.ctaText);
    setFormDesc(item.description || '');
    setFormDarkColor(item.darkColor);
    setFormLightColor(item.lightColor);
    setFormEyeColor(item.eyeColor || item.darkColor);
    setShowModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter Title');
      return;
    }

    let cleanUrl = formUrl.trim();
    if (formType === 'phone_link') {
      if (!formPhone.trim()) {
        showToast('Please enter a phone number');
        return;
      }
      const cleanDigits = formPhone.replace(/[^0-9]/g, '');
      cleanUrl = phoneAction === 'tel' ? `tel:+${cleanDigits}` : `https://wa.me/${cleanDigits}`;
    } else {
      if (!formUrl.trim()) {
        showToast('Please enter Destination URL');
        return;
      }
      if (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('tel:')) {
        cleanUrl = `https://${cleanUrl}`;
      }
    }

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                title: formTitle.trim(),
                url: cleanUrl,
                type: formType,
                phone: formPhone.trim() || undefined,
                ctaText: formCta.trim() || 'Scan to Open',
                description: formDesc.trim(),
                darkColor: formDarkColor,
                lightColor: formLightColor,
                eyeColor: formEyeColor,
              }
            : i
        )
      );
      showToast('Website / App QR updated!');
    } else {
      const newItem: WebsiteAppQrItem = {
        id: `web-app-qr-${Date.now()}`,
        title: formTitle.trim(),
        url: cleanUrl,
        type: formType,
        phone: formPhone.trim() || undefined,
        ctaText: formCta.trim() || 'Scan to Open',
        description: formDesc.trim(),
        darkColor: formDarkColor,
        lightColor: formLightColor,
        eyeColor: formEyeColor,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setSelectedItemId(newItem.id);
      showToast('New Website / App QR created!');
    }
    setShowModal(false);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = items.filter((i) => i.id !== id);
    setItems(remaining);
    if (selectedItemId === id) {
      if (remaining[0]) {
        setSelectedItemId(remaining[0].id);
      } else {
        setSelectedItemId('');
      }
    }
    showToast('QR Code deleted.');
  };

  const handleCopyLink = async () => {
    if (!activeUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        showToast(isAllSelected ? 'ALL Websites Hub link copied!' : 'Link copied to clipboard!');
      }
    } catch {
      showToast('Failed to copy link.');
    }
  };

  const handleShare = async () => {
    if (!activeUrl) return;
    const shareTitle = isAllSelected
      ? `${business.name || 'Business'} Websites & Apps Hub`
      : (activeItem?.title || 'Website / App QR');
    const shareText = isAllSelected
      ? `Access all official websites & online apps for ${business.name || 'us'}: ${activeUrl}`
      : `${activeItem?.ctaText || 'Visit'}: ${activeUrl}`;
    await shareContent({
      title: shareTitle,
      text: shareText,
      url: activeUrl,
      dialogTitle: 'Share Website / App QR',
    });
  };

  const handleDownloadPng = async () => {
    if (!activeQrDataUrl) return;
    const defaultTitle = isAllSelected
      ? `${business.name || 'Business'} Websites & Apps Hub`
      : (activeItem?.title || 'Website QR');
    const qrName = tableNumberForPrint
      ? `${defaultTitle} - ${tableNumberForPrint}`
      : defaultTitle;
    const defaultSubtitle = isAllSelected
      ? `All ${items.length} Websites, Apps & Online Booking Portals`
      : (activeItem?.ctaText || 'Scan to Visit Website / App');
    const defaultTag = tableNumberForPrint || (isAllSelected ? 'ALL IN ONE DIRECTORY' : (activeItem?.type.replace('_', ' ').toUpperCase() || 'WEBSITE'));

    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl: activeQrDataUrl,
      name: qrName,
      subtitle: defaultSubtitle,
      tag: defaultTag,
      urlOrHandle: activeUrl,
      boxBgColor: activeBoxBgColor,
      boxBorderColor: activeBoxBorderColor,
      darkColor: activeDarkColor,
      lightColor: activeLightColor,
      accentColor: activeDarkColor,
    });

    const safeName = qrName.replace(/[^a-zA-Z0-9]/g, '_');
    await saveFile({
      data: finalPngUrl,
      filename: `${safeName}_QRCode.png`,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    showToast('High-resolution QR code with name saved!');
  };

  const handleDownloadTableStandPdf = async () => {
    if (!activeQrDataUrl) return;
    setIsGeneratingPdf(true);
    try {
      const headline = isAllSelected
        ? `${business.name || 'Official'} Websites & Apps Directory`
        : (activeItem?.title || 'Official Website & App');
      const safeName = headline.replace(/[^a-zA-Z0-9]/g, '_');
      const subline = isAllSelected
        ? `Scan to browse all our ${items.length} official websites, mobile apps & online booking portals`
        : (activeItem?.description || 'Scan with your smartphone camera to visit');
      const calloutText = isAllSelected
        ? 'SCAN TO ACCESS ALL WEBSITES & APPS'
        : (activeItem?.ctaText || 'SCAN TO VISIT WEBSITE / APP');

      const res = await QRHostingService.downloadGenericTableStand({
        businessName: business.name || 'Official Website & App',
        headline,
        subline,
        qrNameOrTableNumber: tableNumberForPrint || undefined,
        qrDataUrl: activeQrDataUrl,
        calloutText,
        urlOrHandleText: activeUrl,
        description: isAllSelected
          ? `Includes: ${items.map((it) => it.title).join(' • ')}`
          : activeItem?.description,
        accentColor: activeDarkColor,
        filename: `${safeName}_Table_Wall_Poster.pdf`,
        documentTitle: `${headline} Poster`,
      });
      if (res.success) {
        showToast('Table & Wall QR Code Poster (PDF) downloaded!');
      } else {
        showToast('Saved Table & Wall QR Code Poster.');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to generate poster PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isEditingQrColors) {
    const editorTitle = isAllSelected
      ? `${business.name || 'Business'} ALL Websites Hub`
      : (activeItem?.title || 'Website QR');
    return (
      <QRCodeColorEditorScreen
        title={editorTitle}
        url={activeUrl}
        initialDarkColor={activeDarkColor}
        initialEyeColor={activeEyeColor}
        initialLightColor={activeLightColor}
        initialBoxBgColor={activeBoxBgColor}
        initialBoxBorderColor={activeBoxBorderColor}
        accentColor={activeDarkColor}
        onSave={(updates) => {
          handleUpdateItemColors(selectedItemId, updates);
          showToast('QR Code & Box colors saved!');
        }}
        onBack={() => setIsEditingQrColors(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-md">
              <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-400/30 border border-blue-300/40 text-blue-100">
                  Websites & Apps QR Hub
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Websites / Apps QR</h1>
              <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1 leading-snug">
                Generate high-resolution scannable QR codes for your websites, mobile apps, booking links & web apps.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Generation Mode Selector (ALL vs SINGLE) */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setSelectedItemId('all')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            isAllSelected
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ALL Websites & Apps</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isAllSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isAllSelected) {
              setSelectedItemId(items.length > 0 ? items[0].id : '');
            }
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            !isAllSelected
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Single Link QR Code</span>
        </button>
      </div>

      {/* Single Website / App Selector Bar when Single mode is active */}
      {!isAllSelected && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Active Link ({items.length})
            </span>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add New Link</span>
            </button>
          </div>

          {items.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title} - {it.url}
                  </option>
                ))}
              </select>

              {activeItem && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeItem)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    title="Edit Link"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(activeItem.id, e)}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                    title="Delete Link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
              No links added yet.
            </p>
          )}
        </div>
      )}

      {/* Active QR Code Showcase Card */}
      {(activeItem || isAllSelected) ? (
        <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
            {/* Live QR Image Box */}
            <div className="flex flex-col items-center gap-2.5 shrink-0 w-full sm:w-auto">
              {/* QR Code Name Input on Top */}
              <div className="w-full max-w-[240px] sm:max-w-[260px] text-left mb-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                  <span>QR Code Name</span>
                  {tableNumberForPrint && (
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">Included on PNG</span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Main Desk, Website Poster, Reception, Entrance"
                    value={tableNumberForPrint}
                    onChange={(e) => setTableNumberForPrint(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  {tableNumberForPrint && (
                    <button
                      type="button"
                      onClick={() => setTableNumberForPrint('')}
                      className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl shadow-xl transition-all flex flex-col items-center justify-center"
                style={{
                  backgroundColor: activeBoxBgColor,
                  borderColor:
                    activeBoxBorderColor && activeBoxBorderColor !== 'transparent'
                      ? activeBoxBorderColor
                      : `${activeDarkColor}40`,
                  borderWidth: activeBoxBorderColor === 'transparent' ? '0px' : '4px',
                  borderStyle: 'solid',
                }}
              >
                {tableNumberForPrint && (
                  <span className="mb-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                    {tableNumberForPrint}
                  </span>
                )}
                {activeQrDataUrl ? (
                  <img
                    src={activeQrDataUrl}
                    alt={isAllSelected ? 'ALL Websites Hub' : (activeItem?.title || 'Website QR')}
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                    style={{
                      backgroundColor: activeLightColor,
                      padding: '4px',
                      borderRadius: '12px',
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Dedicated QR Code & Box Editor Button Near QR Code */}
              <div className="mt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsEditingQrColors(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>QR Code & Box Editor</span>
                </button>
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAllSelected ? `Connects to all ${items.length} links` : (activeItem?.ctaText || 'Scan to Open')}
              </span>
            </div>

            {/* Info & Action Controls */}
            <div className="flex-1 min-w-0 space-y-4 w-full text-left">
              {isAllSelected ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 mb-1.5">
                    <Layers className="w-3 h-3" />
                    OUR SITES HUB ({items.length})
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Our Sites
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    A QR code that opens an online directory with all your official websites, mobile app downloads & direct booking portals.
                  </p>

                  {/* Quick Directory Preview of Included Links */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Included Links ({items.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {items.map((it, idx) => {
                        const typeObj = TYPE_OPTIONS.find((t) => t.id === it.type) || TYPE_OPTIONS[0];
                        const Icon = typeObj.icon;
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 font-mono">{idx + 1}.</span>
                              <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{it.title}</span>
                            </div>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium shrink-0">{it.ctaText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeItem ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 mb-1.5">
                    <Globe className="w-3 h-3" />
                    {activeItem.type.replace('_', ' ')}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {activeItem.title}
                  </h2>
                  <a
                    href={activeItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium mt-1 break-all"
                  >
                    <span>{activeItem.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  {activeItem.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {activeItem.description}
                    </p>
                  )}
                  {activeItem.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>Support / Contact: {activeItem.phone}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                {onOpenCustomerView && (
                  <button
                    type="button"
                    onClick={() => {
                      const page = QRHostingService.convertWebsitesHubToHostedPage(items, business);
                      onOpenCustomerView(page);
                    }}
                    className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                )}

                {!isAllSelected && activeUrl && (
                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Link</span>
                  </a>
                )}

                {!isAllSelected && activeItem && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeItem)}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit QR</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Printable Table Stand / Wall Poster Generator Card */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-3xl p-5 border border-blue-200 dark:border-blue-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Print Table & Wall QR Code Poster (PDF)
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400">
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
                  placeholder="e.g. Main Desk, Website Poster, Reception, Entrance"
                  value={tableNumberForPrint}
                  onChange={(e) => setTableNumberForPrint(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleDownloadTableStandPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Table & Wall Poster (PDF)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No Website or App QR Codes Created
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Add your first website, web application, or custom link to generate a scannable QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Link</span>
          </button>
        </div>
      )}

      {/* Native Advanced Ad */}
      <AdMobNativeAd
        context="qr"
        variant="card"
        unitId={ADMOB_UNITS.NATIVE_ADVANCED}
      />

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 pb-28 sm:p-4 sm:pb-8 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingItem ? 'Edit Website / App QR' : 'Create Website / App QR'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure destination link, call to action & details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="website-qr-form" onSubmit={handleSaveForm} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {/* Link Type Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Link Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSel = formType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setFormType(opt.id);
                          if (!editingItem) {
                            setFormCta(opt.defaultCta);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Title / Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Website, Download App, Book Online"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Destination URL or Phone Input */}
              {formType === 'phone_link' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPhoneAction('whatsapp')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        phoneAction === 'whatsapp'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneAction('tel')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        phoneAction === 'tel'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Direct Phone Call</span>
                    </button>
                  </div>

                  <PhoneInputField
                    id="website-phone-field"
                    label={phoneAction === 'whatsapp' ? 'WhatsApp Phone Number *' : 'Direct Call Phone Number *'}
                    icon={phoneAction === 'whatsapp' ? MessageCircle : Phone}
                    value={formPhone}
                    onChange={(val) => setFormPhone(val)}
                    placeholder="700 123 456"
                    required
                    defaultCountryCode="+256"
                    helpText="Select your country flag and code, then enter phone number"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Destination URL *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://example.com/myapp"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Optional Support / Inquiries Phone for any website */}
              {formType !== 'phone_link' && (
                <PhoneInputField
                  id="website-support-phone"
                  label="Customer Support / Inquiries Phone (Optional)"
                  icon={Phone}
                  value={formPhone}
                  onChange={(val) => setFormPhone(val)}
                  placeholder="700 123 456"
                  defaultCountryCode="+256"
                  helpText="Optional contact phone with country flag for customers to reach you"
                />
              )}

              {/* CTA Badge Text */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Call-To-Action Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scan to Visit Website, Download App Now"
                  value={formCta}
                  onChange={(e) => setFormCta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Optional Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discover our latest items, products and contact channels"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2.5 shrink-0 z-10">
              <button
                type="submit"
                form="website-qr-form"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingItem ? 'Save Changes' : 'Create QR Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
