import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Share2,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Sparkles,
  Smartphone,
  Globe,
  MapPin,
  CheckCircle2,
  Palette,
  PlusCircle,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { BusinessProfile, SocialQrItem, SocialPlatform, QRCodeHostedPage } from '../types';
import { QRHostingService } from '../services/qrHostingService';
import { saveFile, shareContent, saveJsPdf } from '../services/fileSaver';
import { jsPDF } from 'jspdf';
import { QRCodeColorEditorScreen } from './QRCodeColorEditorScreen';
import { PhoneInputField } from './PhoneInputField';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { AdMobNativeAd } from './AdMobNativeAd';
import { ADMOB_UNITS } from '../services/admobService';

export type SocialPlatformType = SocialPlatform;

export type { SocialQrItem };

export const PLATFORMS_CONFIG: Record<
  SocialPlatformType,
  {
    name: string;
    brandColor: string;
    lightColor: string;
    prefix: string;
    placeholder: string;
    defaultCta: string;
    helperText: string;
    buildUrl: (value: string, message?: string) => string;
  }
> = {
  whatsapp: {
    name: 'WhatsApp',
    brandColor: '#25D366',
    lightColor: '#ffffff',
    prefix: '+',
    placeholder: '256700000000',
    defaultCta: 'Chat on WhatsApp',
    helperText: 'Enter phone number with country code (e.g. 256700123456)',
    buildUrl: (val, msg) => {
      const cleanPhone = val.replace(/[^0-9]/g, '');
      const textParam = msg ? `?text=${encodeURIComponent(msg)}` : '';
      return `https://wa.me/${cleanPhone}${textParam}`;
    },
  },
  instagram: {
    name: 'Instagram',
    brandColor: '#E1306C',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourbusiness',
    defaultCta: 'Follow on Instagram',
    helperText: 'Enter your Instagram username handle or profile link',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://instagram.com/${clean}`;
    },
  },
  tiktok: {
    name: 'TikTok',
    brandColor: '#000000',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourbusiness',
    defaultCta: 'Watch on TikTok',
    helperText: 'Enter your TikTok username or profile link',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://tiktok.com/@${clean}`;
    },
  },
  facebook: {
    name: 'Facebook',
    brandColor: '#1877F2',
    lightColor: '#ffffff',
    prefix: '/',
    placeholder: 'yourpagename',
    defaultCta: 'Like us on Facebook',
    helperText: 'Enter your Facebook page name or profile URL',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://facebook.com/${clean}`;
    },
  },
  youtube: {
    name: 'YouTube',
    brandColor: '#FF0000',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourchannel',
    defaultCta: 'Subscribe on YouTube',
    helperText: 'Enter your YouTube handle (@channel) or link',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://youtube.com/${clean.startsWith('@') ? clean : `@${clean}`}`;
    },
  },
  telegram: {
    name: 'Telegram',
    brandColor: '#229ED9',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourchannel',
    defaultCta: 'Join our Telegram',
    helperText: 'Enter Telegram username or channel link',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://t.me/${clean}`;
    },
  },
  x_twitter: {
    name: 'X (Twitter)',
    brandColor: '#0f172a',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourhandle',
    defaultCta: 'Follow us on X',
    helperText: 'Enter your X / Twitter handle',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://x.com/${clean}`;
    },
  },
  linkedin: {
    name: 'LinkedIn',
    brandColor: '#0A66C2',
    lightColor: '#ffffff',
    prefix: 'in/',
    placeholder: 'company/yourbusiness',
    defaultCta: 'Connect on LinkedIn',
    helperText: 'Enter LinkedIn profile name or full URL',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://linkedin.com/in/${clean}`;
    },
  },
  snapchat: {
    name: 'Snapchat',
    brandColor: '#FFFC00',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourusername',
    defaultCta: 'Add on Snapchat',
    helperText: 'Enter your Snapchat username',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://snapchat.com/add/${clean}`;
    },
  },
  pinterest: {
    name: 'Pinterest',
    brandColor: '#BD081C',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourusername',
    defaultCta: 'Follow on Pinterest',
    helperText: 'Enter your Pinterest username',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://pinterest.com/${clean}`;
    },
  },
  google_maps: {
    name: 'Google Maps / Reviews',
    brandColor: '#EA4335',
    lightColor: '#ffffff',
    prefix: 'https://',
    placeholder: 'g.page/r/yourbusiness',
    defaultCta: 'Review us on Google',
    helperText: 'Enter Google Maps business link or review URL',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://${clean}`;
    },
  },
  threads: {
    name: 'Threads',
    brandColor: '#000000',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourhandle',
    defaultCta: 'Follow on Threads',
    helperText: 'Enter your Threads username or link',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://threads.net/@${clean}`;
    },
  },
  discord: {
    name: 'Discord',
    brandColor: '#5865F2',
    lightColor: '#ffffff',
    prefix: 'invite/',
    placeholder: 'discord.gg/yourserver',
    defaultCta: 'Join our Discord',
    helperText: 'Enter your Discord server invite link or code',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://discord.gg/${clean.replace(/^discord\.gg\//, '')}`;
    },
  },
  twitch: {
    name: 'Twitch',
    brandColor: '#9146FF',
    lightColor: '#ffffff',
    prefix: '/',
    placeholder: 'yourchannel',
    defaultCta: 'Watch on Twitch',
    helperText: 'Enter your Twitch channel name or link',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://twitch.tv/${clean}`;
    },
  },
  reddit: {
    name: 'Reddit',
    brandColor: '#FF4500',
    lightColor: '#ffffff',
    prefix: 'r/',
    placeholder: 'r/yourcommunity',
    defaultCta: 'Join on Reddit',
    helperText: 'Enter subreddit (e.g. r/community) or username (u/user)',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://reddit.com/${clean}`;
    },
  },
  wechat: {
    name: 'WeChat',
    brandColor: '#07C160',
    lightColor: '#ffffff',
    prefix: 'ID:',
    placeholder: 'yourwechatid',
    defaultCta: 'Connect on WeChat',
    helperText: 'Enter your WeChat ID or link',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `weixin://dl/chat?${clean}`;
    },
  },
  spotify: {
    name: 'Spotify',
    brandColor: '#1DB954',
    lightColor: '#ffffff',
    prefix: 'https://',
    placeholder: 'open.spotify.com/artist/...',
    defaultCta: 'Listen on Spotify',
    helperText: 'Enter your Spotify artist, playlist, or show link',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://${clean}`;
    },
  },
  yelp: {
    name: 'Yelp',
    brandColor: '#D32323',
    lightColor: '#ffffff',
    prefix: 'biz/',
    placeholder: 'yelp.com/biz/yourbusiness',
    defaultCta: 'Review on Yelp',
    helperText: 'Enter your Yelp business URL or page name',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://${clean}`;
    },
  },
  patreon: {
    name: 'Patreon',
    brandColor: '#FF424D',
    lightColor: '#ffffff',
    prefix: '/',
    placeholder: 'patreon.com/yourpage',
    defaultCta: 'Support on Patreon',
    helperText: 'Enter your Patreon profile link or page handle',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http') ? clean : `https://patreon.com/${clean.replace(/^patreon\.com\//, '')}`;
    },
  },
  github: {
    name: 'GitHub',
    brandColor: '#24292e',
    lightColor: '#ffffff',
    prefix: '@',
    placeholder: 'yourusername',
    defaultCta: 'Follow on GitHub',
    helperText: 'Enter your GitHub username or repository link',
    buildUrl: (val) => {
      const clean = val.replace(/^@/, '').trim();
      return clean.startsWith('http') ? clean : `https://github.com/${clean}`;
    },
  },
  custom: {
    name: 'Other / Custom Platform',
    brandColor: '#0f766e',
    lightColor: '#ffffff',
    prefix: 'https://',
    placeholder: 'https://yourplatform.com/profile',
    defaultCta: 'Visit Our Page',
    helperText: 'Enter full web address or custom profile link',
    buildUrl: (val) => {
      const clean = val.trim();
      return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
    },
  },
};

const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#059669' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Dark Slate', hex: '#0f172a' },
  { name: 'Amber Gold', hex: '#d97706' },
];

interface SocialsQrSectionProps {
  business: BusinessProfile;
  hostedPageId?: string;
  showToast: (msg: string) => void;
  onOpenCustomerView?: (page: QRCodeHostedPage) => void;
}

export const SocialsQrSection: React.FC<SocialsQrSectionProps> = ({
  business,
  hostedPageId,
  showToast,
  onOpenCustomerView,
}) => {
  const [items, setItems] = useState<SocialQrItem[]>(() => {
    return StorageService.getSocialsQrItems();
  });

  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const stored = StorageService.getSocialsQrItems();
    return stored.length > 0 ? stored[0].id : '';
  });
  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<SocialQrItem | null>(null);

  // Colors for ALL Socials Hub QR
  const [allQrColors, setAllQrColors] = useState({
    darkColor: '#059669',
    eyeColor: '#047857',
    lightColor: '#ffffff',
    boxBgColor: '#ffffff',
    boxBorderColor: '#cbd5e1',
  });

  // Form State
  const [formPlatform, setFormPlatform] = useState<SocialPlatformType>('whatsapp');
  const [formCustomName, setFormCustomName] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formInputVal, setFormInputVal] = useState<string>('');
  const [formMessage, setFormMessage] = useState<string>('');
  const [formCta, setFormCta] = useState<string>('Chat on WhatsApp');
  const [formDarkColor, setFormDarkColor] = useState<string>('#059669');
  const [formLightColor, setFormLightColor] = useState<string>('#ffffff');
  const [formEyeColor, setFormEyeColor] = useState<string>('#047857');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [tableNumberForPrint, setTableNumberForPrint] = useState<string>('');
  const [isEditingQrColors, setIsEditingQrColors] = useState<boolean>(false);

  const isAllSelected = selectedItemId === 'all';
  const activeItem = items.find((i) => i.id === selectedItemId) || null;

  const allHubUrl = useMemo(() => {
    return QRHostingService.getCustomerSocialsHubUrl(business.name, business.email);
  }, [business.name, business.email]);

  const activeUrl = isAllSelected ? allHubUrl : (activeItem?.fullUrl || '');
  const activeDarkColor = isAllSelected ? allQrColors.darkColor : (activeItem?.darkColor || '#059669');
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

  // Save to storage & Cloudflare
  useEffect(() => {
    StorageService.saveSocialsQrItems(items);
    if (items.length > 0) {
      QRHostingService.syncAllSocialsPages(items, business);
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  }, [items, business]);

  // Cloudflare sync on mount
  useEffect(() => {
    if (items.length > 0) {
      QRHostingService.syncAllSocialsPages(items, business);
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

  const handleOpenCreateModal = (platform: SocialPlatformType = 'whatsapp', defaultCustomName?: string) => {
    setEditingItem(null);
    const cfg = PLATFORMS_CONFIG[platform] || PLATFORMS_CONFIG.custom;
    setFormPlatform(platform);
    const customName = defaultCustomName || (platform === 'custom' ? 'Custom Platform' : cfg.name);
    setFormCustomName(customName);
    setFormTitle(`${business.name || 'Our'} ${platform === 'custom' ? customName : cfg.name}`);
    const defaultPhone = (business.whatsapp || business.phone || '').trim();
    setFormInputVal(platform === 'whatsapp' ? defaultPhone : '');
    setFormMessage(
      platform === 'whatsapp'
        ? `Hello ${business.name || 'there'}, I would like to inquire about your services!`
        : ''
    );
    setFormCta(cfg.defaultCta);
    const brandCol = cfg.brandColor === '#000000' || cfg.brandColor === '#0f172a' ? '#0f172a' : cfg.brandColor;
    setFormDarkColor(brandCol);
    setFormLightColor('#ffffff');
    setFormEyeColor(brandCol);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: SocialQrItem) => {
    setEditingItem(item);
    setFormPlatform(item.platform);
    setFormCustomName(item.customPlatformName || PLATFORMS_CONFIG[item.platform]?.name || 'Platform');
    setFormTitle(item.title);
    setFormInputVal(item.usernameOrPhone || '');
    setFormMessage(item.prefilledMessage || '');
    setFormCta(item.ctaText);
    setFormDarkColor(item.darkColor);
    setFormLightColor(item.lightColor);
    setFormEyeColor(item.eyeColor || item.darkColor);
    setShowModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formInputVal.trim()) {
      showToast('Please fill in all required fields');
      return;
    }

    const cfg = PLATFORMS_CONFIG[formPlatform] || PLATFORMS_CONFIG.custom;
    const generatedUrl = cfg.buildUrl(formInputVal.trim(), formMessage.trim());
    const displayPlatformName = formPlatform === 'custom' ? (formCustomName.trim() || 'Custom') : cfg.name;

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                platform: formPlatform,
                customPlatformName: displayPlatformName,
                title: formTitle.trim(),
                usernameOrPhone: formInputVal.trim(),
                prefilledMessage: formMessage.trim(),
                fullUrl: generatedUrl,
                ctaText: formCta.trim() || cfg.defaultCta,
                darkColor: formDarkColor,
                lightColor: formLightColor,
                eyeColor: formEyeColor,
              }
            : i
        )
      );
      showToast('Social QR updated!');
    } else {
      const newItem: SocialQrItem = {
        id: `social-qr-${Date.now()}`,
        platform: formPlatform,
        customPlatformName: displayPlatformName,
        title: formTitle.trim(),
        usernameOrPhone: formInputVal.trim(),
        prefilledMessage: formMessage.trim(),
        fullUrl: generatedUrl,
        ctaText: formCta.trim() || cfg.defaultCta,
        darkColor: formDarkColor,
        lightColor: formLightColor,
        eyeColor: formEyeColor,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setSelectedItemId(newItem.id);
      showToast(`New ${displayPlatformName} QR created!`);
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
    showToast('Social QR deleted.');
  };

  const handleCopyLink = async () => {
    if (!activeUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        showToast(isAllSelected ? 'ALL Socials Hub link copied!' : 'Social link copied to clipboard!');
      }
    } catch {
      showToast('Failed to copy link.');
    }
  };

  const handleShare = async () => {
    if (!activeUrl) return;
    const shareTitle = isAllSelected
      ? 'our social media platforms'
      : (activeItem?.title || 'Social QR');
    const shareText = isAllSelected
      ? `Connect with ${business.name || 'us'} on our social media platforms: ${activeUrl}`
      : `${activeItem?.ctaText || 'Connect'}: ${activeUrl}`;
    await shareContent({
      title: shareTitle,
      text: shareText,
      url: activeUrl,
      dialogTitle: `Share ${shareTitle}`,
    });
  };

  const handleDownloadPng = async () => {
    if (!activeQrDataUrl) return;
    const defaultTitle = isAllSelected
      ? 'our social media platforms'
      : (activeItem?.title || 'Social QR');
    const qrName = tableNumberForPrint
      ? `${defaultTitle} - ${tableNumberForPrint}`
      : defaultTitle;
    const defaultSubtitle = isAllSelected
      ? `Connect on all ${items.length} social channels`
      : (activeItem?.usernameOrPhone || activeItem?.ctaText || 'Scan to Connect');
    const defaultTag = tableNumberForPrint || (isAllSelected ? 'ALL SOCIAL CHANNELS' : (activeItem?.customPlatformName || PLATFORMS_CONFIG[activeItem?.platform || 'whatsapp']?.name || 'SOCIAL').toUpperCase());

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
      filename: `${safeName}_Social_QRCode.png`,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    showToast('Social QR code image with name saved!');
  };

  const handleDownloadTableStandPdf = async () => {
    if (!activeQrDataUrl) return;
    setIsGeneratingPdf(true);
    try {
      const headline = isAllSelected
        ? 'our social media platforms'
        : (activeItem?.title || 'Official Socials');
      const safeName = headline.replace(/[^a-zA-Z0-9]/g, '_');
      const subline = isAllSelected
        ? `Scan to follow and chat with us on all ${items.length} social channels`
        : (activeItem?.usernameOrPhone ? `${activeItem.usernameOrPhone}` : 'Scan to follow and connect with us online');
      const calloutText = isAllSelected
        ? 'SCAN TO CONNECT ON SOCIAL MEDIA'
        : (activeItem?.ctaText || 'SCAN TO CONNECT ONLINE');

      const res = await QRHostingService.downloadGenericTableStand({
        businessName: business.name || 'Official Socials',
        headline,
        subline,
        qrNameOrTableNumber: tableNumberForPrint || undefined,
        qrDataUrl: activeQrDataUrl,
        calloutText,
        urlOrHandleText: activeUrl,
        description: isAllSelected
          ? `Connected Channels: ${items.map((it) => it.customPlatformName || PLATFORMS_CONFIG[it.platform]?.name || it.title).join(' • ')}`
          : (activeItem?.prefilledMessage || 'Follow our official channel for updates, inquiries & offers.'),
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

  const getPlatformDisplay = (item: SocialQrItem) => {
    const cfg = PLATFORMS_CONFIG[item.platform] || PLATFORMS_CONFIG.custom;
    const name = item.customPlatformName || cfg?.name || 'Platform';
    const color = item.darkColor || cfg?.brandColor || '#059669';
    return { name, color };
  };

  if (isEditingQrColors) {
    const editorTitle = isAllSelected
      ? `${business.name || 'Business'} ALL Socials Hub`
      : (activeItem?.title || 'Social QR');
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
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-md">
              <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/40 text-emerald-100">
                  Social Channels & Chat QR
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Socials QR</h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1 leading-snug">
                Connect customers directly to your WhatsApp, Instagram, TikTok, Facebook & custom social channels with one scan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Platform Triggers Bar */}
      <div className="space-y-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
          Popular Platforms
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {(
            [
              'whatsapp',
              'instagram',
              'tiktok',
              'facebook',
              'youtube',
              'telegram',
              'x_twitter',
              'linkedin',
              'snapchat',
              'pinterest',
              'google_maps',
            ] as SocialPlatformType[]
          ).map((pKey) => {
            const cfg = PLATFORMS_CONFIG[pKey] || PLATFORMS_CONFIG.custom;
            return (
              <button
                key={pKey}
                type="button"
                onClick={() => handleOpenCreateModal(pKey)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 text-xs font-bold shrink-0 flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.brandColor }}
                />
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* QR Generation Mode Selector (ALL vs SINGLE) */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setSelectedItemId('all')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            isAllSelected
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ALL Social Accounts</span>
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
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Single Platform QR Code</span>
        </button>
      </div>

      {/* Single Social Platform Selector Bar when Single mode is active */}
      {!isAllSelected && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Active Channel ({items.length})
            </span>
            <button
              type="button"
              onClick={() => handleOpenCreateModal('whatsapp')}
              className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Social Channel</span>
            </button>
          </div>

          {items.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {items.map((it) => {
                  const { name } = getPlatformDisplay(it);
                  return (
                    <option key={it.id} value={it.id}>
                      {it.title} ({name}) - {it.usernameOrPhone}
                    </option>
                  );
                })}
              </select>

              {activeItem && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeItem)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    title="Edit Channel"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(activeItem.id, e)}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                    title="Delete Channel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
              No channels added yet.
            </p>
          )}
        </div>
      )}

      {/* Active Social Showcase */}
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
                    <span className="text-[9px] text-pink-600 dark:text-pink-400 font-medium">Included on PNG</span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Front Desk, Social Poster, Reception, Entrance"
                    value={tableNumberForPrint}
                    onChange={(e) => setTableNumberForPrint(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-pink-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
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
                  <span className="mb-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                    {tableNumberForPrint}
                  </span>
                )}
                {activeQrDataUrl ? (
                  <img
                    src={activeQrDataUrl}
                    alt={isAllSelected ? 'ALL Socials QR Code' : (activeItem?.title || 'Social QR')}
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>QR Code & Box Editor</span>
                </button>
              </div>

              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isAllSelected ? `Scan to Connect on All ${items.length} Socials` : activeItem?.ctaText}
              </span>
            </div>

            {/* Info & Action Controls */}
            <div className="flex-1 min-w-0 space-y-4 w-full text-left">
              <div>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white mb-1.5 shadow-2xs"
                  style={{ backgroundColor: activeDarkColor }}
                >
                  {isAllSelected ? `SOCIALS HUB (${items.length} CHANNELS)` : (activeItem?.customPlatformName || PLATFORMS_CONFIG[activeItem?.platform || 'whatsapp']?.name || 'Social')}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {isAllSelected ? `${business.name || 'Official'} Social Media & Messaging Hub` : activeItem?.title}
                </h2>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium mt-1 break-all"
                >
                  <span>{activeUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                {/* Interactive Connected Social Accounts Preview when ALL is selected */}
                {isAllSelected ? (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                      Connected Channels ({items.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {items.map((it) => {
                        const { name, color } = getPlatformDisplay(it);
                        return (
                          <a
                            key={it.id}
                            href={it.fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-emerald-500 transition cursor-pointer shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span>{it.title || name}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : activeItem?.prefilledMessage ? (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                      Prefilled Greeting Message:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 italic">
                      "{activeItem.prefilledMessage}"
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                      const page = QRHostingService.convertSocialsHubToHostedPage(items, business);
                      onOpenCustomerView(page);
                    }}
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="bg-pink-50/70 dark:bg-pink-950/30 rounded-3xl p-5 border border-pink-200 dark:border-pink-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-pink-950 dark:text-pink-200">
                  Print Table & Wall QR Code Poster (PDF)
                </h3>
                <p className="text-xs text-pink-700 dark:text-pink-400">
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
                  placeholder="e.g. Front Desk, Social Poster, Reception, Entrance"
                  value={tableNumberForPrint}
                  onChange={(e) => setTableNumberForPrint(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-pink-300 dark:border-pink-800 text-xs font-semibold focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleDownloadTableStandPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50 cursor-pointer"
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
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No Social QR Codes Created
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Select one of the popular platforms above or tap below to create your first scannable social channel QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreateModal('whatsapp')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Social Channel</span>
          </button>
        </div>
      )}

      {/* Native Advanced Ad */}
      <AdMobNativeAd
        context="qr"
        variant="card"
        unitId={ADMOB_UNITS.NATIVE_ADVANCED}
      />

      {/* CREATE / EDIT SOCIAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 pb-28 sm:p-4 sm:pb-8 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingItem ? 'Edit Social QR' : 'Create Social Media QR'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect customers instantly with direct chat & profiles
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

            <form id="socials-qr-form" onSubmit={handleSaveForm} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {/* Platform Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Platform
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Choose preset or custom
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(Object.keys(PLATFORMS_CONFIG) as SocialPlatformType[]).map((pKey) => {
                    const cfg = PLATFORMS_CONFIG[pKey] || PLATFORMS_CONFIG.custom;
                    const isSelected = formPlatform === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => {
                          setFormPlatform(pKey);
                          if (!editingItem) {
                            const nameToUse = pKey === 'custom' ? (formCustomName || 'Custom Platform') : cfg.name;
                            setFormCustomName(nameToUse);
                            setFormTitle(`${business.name || 'Our'} ${nameToUse}`);
                            setFormCta(cfg.defaultCta);
                            const bColor = cfg.brandColor === '#000000' || cfg.brandColor === '#0f172a' ? '#0f172a' : cfg.brandColor;
                            setFormDarkColor(bColor);
                            setFormEyeColor(bColor);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.brandColor }}
                        />
                        <span className="truncate">{cfg.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Platform Name if custom or manual */}
              {formPlatform === 'custom' && (
                <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 block">
                    Custom Platform Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Threads, Discord, WeChat, Substack, Yelp"
                    value={formCustomName}
                    onChange={(e) => {
                      setFormCustomName(e.target.value);
                      if (!editingItem && (!formTitle || formTitle.includes(business.name || ''))) {
                        setFormTitle(`${business.name || 'Our'} ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">
                    Type any social network name or community name.
                  </p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  QR Title / Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chat on WhatsApp, Follow on Instagram"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Username / Phone / Link */}
              {formPlatform === 'whatsapp' ? (
                <div>
                  <PhoneInputField
                    id="social-whatsapp-phone"
                    label="WhatsApp Phone Number *"
                    icon={MessageCircle}
                    value={formInputVal}
                    onChange={(val) => setFormInputVal(val)}
                    placeholder="700 123 456"
                    required
                    defaultCountryCode="+256"
                    helpText="Select your country flag & code, then enter your WhatsApp phone number"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    {formPlatform === 'custom'
                      ? 'Profile URL, Server Link or Username *'
                      : 'Username Handle / Link *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={PLATFORMS_CONFIG[formPlatform]?.placeholder || 'https://...'}
                    value={formInputVal}
                    onChange={(e) => setFormInputVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {PLATFORMS_CONFIG[formPlatform]?.helperText || 'Enter full URL or profile link'}
                  </p>
                </div>
              )}

              {/* Prefilled message for WhatsApp */}
              {formPlatform === 'whatsapp' && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Prefilled Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Hello, I want to inquire about..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* CTA Badge Text */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Call-To-Action Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chat on WhatsApp, Follow on TikTok"
                  value={formCta}
                  onChange={(e) => setFormCta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2.5 shrink-0 z-10">
              <button
                type="submit"
                form="socials-qr-form"
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingItem ? 'Save Changes' : 'Create Social QR'}</span>
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
