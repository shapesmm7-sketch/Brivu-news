import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Download,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Save,
  X,
  Sparkles,
  Ticket,
  Image as ImageIcon,
  Camera,
  Upload,
  Loader2,
  Palette,
  Phone,
  MessageCircle,
  Mail,
  Layers,
  Eye,
} from 'lucide-react';
import { BusinessProfile, EventQrItem, QRCodeHostedPage } from '../types';
import { QRHostingService } from '../services/qrHostingService';
import { saveFile, shareContent, saveJsPdf } from '../services/fileSaver';
import { compressImageFile } from '../utils/imageCompressor';
import { jsPDF } from 'jspdf';
import { QRCodeColorEditorScreen } from './QRCodeColorEditorScreen';
import { PhoneInputField } from './PhoneInputField';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { AdMobNativeAd } from './AdMobNativeAd';
import { ADMOB_UNITS } from '../services/admobService';

export type { EventQrItem };

interface EventsQrSectionProps {
  business: BusinessProfile;
  hostedPageId?: string;
  showToast: (msg: string) => void;
  onOpenCustomerView?: (page: QRCodeHostedPage) => void;
}

export const EventsQrSection: React.FC<EventsQrSectionProps> = ({
  business,
  hostedPageId,
  showToast,
  onOpenCustomerView,
}) => {
  const [items, setItems] = useState<EventQrItem[]>(() => {
    return StorageService.getEventsQrItems();
  });

  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<EventQrItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('');
  const [formEndTime, setFormEndTime] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [rsvpMode, setRsvpMode] = useState<'phone' | 'url'>('phone');
  const [formRsvpPhone, setFormRsvpPhone] = useState<string>('');
  const [formRsvpUrl, setFormRsvpUrl] = useState<string>('https://');
  const [formContactPhone, setFormContactPhone] = useState<string>('');
  const [formContactEmail, setFormContactEmail] = useState<string>('');
  const [formCta, setFormCta] = useState<string>('Scan to RSVP & Join Event');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [tableNumberForPrint, setTableNumberForPrint] = useState<string>('');
  const [isEditingQrColors, setIsEditingQrColors] = useState<boolean>(false);

  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    const stored = StorageService.getEventsQrItems();
    return stored.length > 0 ? stored[0].id : '';
  });
  const [allQrColors, setAllQrColors] = useState<{
    darkColor: string;
    eyeColor: string;
    lightColor: string;
    boxBgColor: string;
    boxBorderColor: string;
  }>({
    darkColor: '#7c3aed',
    eyeColor: '#6d28d9',
    lightColor: '#ffffff',
    boxBgColor: '#ffffff',
    boxBorderColor: '#cbd5e1',
  });

  const isAllSelected = selectedItemId === 'all';
  const activeItem = items.find((i) => i.id === selectedItemId) || null;

  const eventsHubUrl = useMemo(() => {
    return QRHostingService.getCustomerEventsHubUrl(business.name, business.email);
  }, [business.name, business.email]);

  const activeUrl = isAllSelected
    ? eventsHubUrl
    : (activeItem ? QRHostingService.getCustomerEventUrl(activeItem.id, business.email) : '');
  const activeDarkColor = isAllSelected ? allQrColors.darkColor : (activeItem?.darkColor || '#7c3aed');
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

  // Persistence & Cloudflare Sync
  useEffect(() => {
    StorageService.saveEventsQrItems(items);
    if (items.length > 0) {
      QRHostingService.syncAllEventsPages(items, business);
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  }, [items, business]);

  // Cloudflare sync on mount
  useEffect(() => {
    if (items.length > 0) {
      QRHostingService.syncAllEventsPages(items, business);
    } else {
      CloudflareService.syncAllToCloudflare().catch(() => {});
    }
  }, []);

  // Generate QR
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
    setFormTitle(`${business.name || 'Business'} Event`);
    setFormStartDate('');
    setFormEndDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormLocation(business.address || '');
    const defaultPhone = (business.whatsapp || business.phone || '').trim();
    setFormRsvpPhone(defaultPhone);
    setFormRsvpUrl(business.website || 'https://');
    setRsvpMode(defaultPhone ? 'phone' : 'url');
    setFormContactPhone(defaultPhone);
    setFormContactEmail(business.email || '');
    setFormCta('Scan to RSVP & Join Event');
    setFormDesc('');
    setFormPhotos([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: EventQrItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormStartDate(item.startDate || (item.eventDate ? item.eventDate.split('T')[0] : ''));
    setFormEndDate(item.endDate || '');
    setFormStartTime(item.startTime || (item.eventDate && item.eventDate.includes('T') ? item.eventDate.split('T')[1] : ''));
    setFormEndTime(item.endTime || '');
    setFormLocation(item.location);
    if (item.rsvpUrl && (item.rsvpUrl.includes('wa.me') || /^\+?[0-9\s-]+$/.test(item.rsvpUrl))) {
      setRsvpMode('phone');
      let phoneMatch = item.rsvpUrl;
      const waMatch = item.rsvpUrl.match(/wa\.me\/([0-9]+)/);
      if (waMatch) {
        phoneMatch = waMatch[1];
      }
      setFormRsvpPhone(phoneMatch);
      setFormRsvpUrl('https://');
    } else {
      setRsvpMode('url');
      setFormRsvpUrl(item.rsvpUrl || 'https://');
      setFormRsvpPhone(item.contactPhone || '');
    }
    setFormContactPhone(item.contactPhone || '');
    setFormContactEmail(item.contactEmail || '');
    setFormCta(item.ctaText);
    setFormDesc(item.description || '');
    setFormPhotos(item.photos || []);
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 3 - formPhotos.length;
    if (availableSlots <= 0) {
      showToast('Maximum of 3 photos allowed.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const filesToProcess = Array.from(files).slice(0, availableSlots);
      const newPhotoUrls: string[] = [];
      for (const file of filesToProcess) {
        const compressed = await compressImageFile(file, {
          maxDimension: 1200,
          quality: 0.85,
        });
        if (compressed) {
          let photoUrl = compressed;
          try {
            const uploadRes = await CloudflareService.uploadFile({
              data: compressed,
              filename: `event_photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`,
              mimeType: 'image/jpeg',
              folder: 'photos',
            });
            if (uploadRes.success && uploadRes.url) {
              photoUrl = uploadRes.url;
            }
          } catch (cfErr) {
            console.warn('Cloudflare event photo upload note:', cfErr);
          }
          newPhotoUrls.push(photoUrl);
        }
      }
      setFormPhotos((prev) => [...prev, ...newPhotoUrls].slice(0, 3));
      showToast(`${newPhotoUrls.length} photo(s) saved to Cloudflare!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to process image.');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter an Event Title');
      return;
    }

    let cleanRsvp = '';
    if (rsvpMode === 'phone') {
      if (!formRsvpPhone.trim()) {
        showToast('Please enter an RSVP phone number');
        return;
      }
      const cleanPhone = formRsvpPhone.replace(/[^0-9]/g, '');
      cleanRsvp = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello, I would like to RSVP for ${formTitle.trim()}!`)}`;
    } else {
      if (!formRsvpUrl.trim()) {
        showToast('Please enter an RSVP or registration URL');
        return;
      }
      cleanRsvp = formRsvpUrl.trim();
      if (!/^https?:\/\//i.test(cleanRsvp)) {
        cleanRsvp = `https://${cleanRsvp}`;
      }
    }

    if (editingItem) {
      const updatedItem: EventQrItem = {
        ...editingItem,
        title: formTitle.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        startTime: formStartTime,
        endTime: formEndTime,
        eventDate: formStartDate || editingItem.eventDate || '',
        location: formLocation.trim() || 'Venue Location',
        rsvpUrl: cleanRsvp,
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        ctaText: formCta.trim() || 'Scan to RSVP',
        description: formDesc.trim(),
        photos: formPhotos,
      };
      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? updatedItem : i))
      );
      QRHostingService.syncEventPage(updatedItem, business);
      showToast('Event QR updated & hosted on Cloudflare!');
    } else {
      const newItem: EventQrItem = {
        id: `event-qr-${Date.now()}`,
        title: formTitle.trim(),
        startDate: formStartDate,
        endDate: formEndDate,
        startTime: formStartTime,
        endTime: formEndTime,
        eventDate: formStartDate || '',
        location: formLocation.trim() || 'Venue Location',
        rsvpUrl: cleanRsvp,
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        ctaText: formCta.trim() || 'Scan to RSVP',
        description: formDesc.trim(),
        photos: formPhotos,
        darkColor: '#7c3aed',
        lightColor: '#ffffff',
        eyeColor: '#6d28d9',
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setSelectedItemId(newItem.id);
      QRHostingService.syncEventPage(newItem, business);
      showToast('New Event QR created & hosted on Cloudflare!');
    }
    setShowModal(false);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = items.filter((i) => i.id !== id);
    setItems(remaining);
    QRHostingService.removeEventPage(id, business);
    if (selectedItemId === id) {
      if (remaining[0]) {
        setSelectedItemId(remaining[0].id);
      } else {
        setSelectedItemId('');
      }
    }
    showToast('Event QR deleted.');
  };

  const handleCopyLink = async () => {
    if (!activeUrl) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        showToast(isAllSelected ? 'Our Events link copied!' : 'Event page link copied to clipboard!');
      }
    } catch {
      showToast('Failed to copy link.');
    }
  };

  const handleShare = async () => {
    if (!activeUrl) return;
    const title = isAllSelected ? 'Our Events' : (activeItem?.title || 'Event Page');
    await shareContent({
      title,
      text: `${title}: ${activeUrl}`,
      url: activeUrl,
      dialogTitle: `Share ${title}`,
    });
  };

  const formatEventDateTime = (item: EventQrItem) => {
    const parts: string[] = [];

    // Date range
    if (item.startDate) {
      try {
        const startStr = new Date(item.startDate).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        if (item.endDate && item.endDate !== item.startDate) {
          const endStr = new Date(item.endDate).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          parts.push(`${startStr} - ${endStr}`);
        } else {
          parts.push(startStr);
        }
      } catch {
        parts.push(item.startDate);
      }
    } else if (item.eventDate) {
      try {
        parts.push(new Date(item.eventDate).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }));
      } catch {
        parts.push(item.eventDate);
      }
    }

    // Time range
    if (item.startTime) {
      if (item.endTime) {
        parts.push(`${item.startTime} - ${item.endTime}`);
      } else {
        parts.push(`Starts at ${item.startTime}`);
      }
    } else if (item.endTime) {
      parts.push(`Ends at ${item.endTime}`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const handleDownloadPng = async () => {
    if (!activeQrDataUrl) return;
    const defaultTitle = isAllSelected ? 'Our Events' : (activeItem?.title || 'Event QR');
    const qrName = tableNumberForPrint
      ? `${defaultTitle} - ${tableNumberForPrint}`
      : defaultTitle;
    const dtFormatted = activeItem ? formatEventDateTime(activeItem) : null;
    const subtitle = isAllSelected
      ? `Our Events (${items.length})`
      : (dtFormatted
        ? `${dtFormatted}${activeItem?.location ? ` • ${activeItem.location}` : ''}`
        : (activeItem?.location || activeItem?.ctaText || 'Scan to RSVP'));

    const finalPngUrl = await QRHostingService.generateNamedQrPng({
      qrDataUrl: activeQrDataUrl,
      name: qrName,
      subtitle: subtitle || 'Scan to RSVP & Join Event',
      tag: tableNumberForPrint || (isAllSelected ? 'OUR EVENTS' : 'EVENT INVITATION'),
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
      filename: `${safeName}_Event_QRCode.png`,
      mimeType: 'image/png',
      title: `${qrName} QR Code`,
      destination: 'photos',
      folder: 'qr_codes',
    });
    showToast('Event QR code image with name saved!');
  };

  const handleDownloadTableStandPdf = async () => {
    if (!activeQrDataUrl) return;
    setIsGeneratingPdf(true);
    try {
      const headline = isAllSelected ? 'Our Events' : (activeItem?.title || 'Event Pass');
      const safeName = headline.replace(/[^a-zA-Z0-9]/g, '_');
      const dtFormatted = activeItem ? formatEventDateTime(activeItem) : null;
      const sublineParts: string[] = [];
      if (isAllSelected) {
        sublineParts.push(`Our Events (${items.length})`);
      } else {
        if (dtFormatted) sublineParts.push(dtFormatted);
        if (activeItem?.location) sublineParts.push(`📍 ${activeItem.location}`);
      }
      const subline = sublineParts.length > 0 ? sublineParts.join(' • ') : 'Scan to RSVP and view event details';

      const res = await QRHostingService.downloadGenericTableStand({
        businessName: business.name || 'Official Events',
        headline,
        subline,
        qrNameOrTableNumber: tableNumberForPrint || undefined,
        qrDataUrl: activeQrDataUrl,
        calloutText: isAllSelected ? 'SCAN FOR OUR EVENTS & RSVP' : (activeItem?.ctaText || 'SCAN FOR EVENT PASS & RSVP'),
        urlOrHandleText: activeUrl,
        description: isAllSelected
          ? `Access event schedule, ticket RSVP, venue locations & calendar passes`
          : (activeItem?.description || (activeItem?.location ? `Venue: ${activeItem.location}` : undefined)),
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
    const editorTitle = isAllSelected ? 'Our Events' : (activeItem?.title || 'Event QR');
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
          handleUpdateItemColors(isAllSelected ? 'all' : (activeItem?.id || ''), updates);
          showToast('QR Code & Box colors saved!');
        }}
        onBack={() => setIsEditingQrColors(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-md">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-400/30 border border-purple-300/40 text-purple-100">
                  Host Events & Invitations
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Host Events QR</h1>
              <p className="text-xs sm:text-sm text-purple-100/90 font-medium mt-1 leading-snug">
                Host conferences, sales events, parties & meetups. Generate scannable QR codes for invitations & flyers.
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
              ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ALL Events & Invitations</span>
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
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Single Event QR Code</span>
        </button>
      </div>

      {/* Single Event Selector Bar when Single mode is active */}
      {!isAllSelected && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Active Event ({items.length})
            </span>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          {items.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title} ({it.startDate || 'Upcoming'})
                  </option>
                ))}
              </select>

              {activeItem && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeItem)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                    title="Edit Event"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(activeItem.id, e)}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
              No events created yet.
            </p>
          )}
        </div>
      )}

      {/* Active Event Showcase Card */}
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
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">Included on PNG</span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. Main Gate, Event Poster, Reception, Entrance"
                    value={tableNumberForPrint}
                    onChange={(e) => setTableNumberForPrint(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
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
                  <span className="mb-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                    {tableNumberForPrint}
                  </span>
                )}
                {activeQrDataUrl ? (
                  <img
                    src={activeQrDataUrl}
                    alt={isAllSelected ? 'ALL Events QR Code' : (activeItem?.title || 'Event QR')}
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>QR Code & Box Editor</span>
                </button>
              </div>

              {!isAllSelected && activeItem?.ctaText && (
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/60">
                  {activeItem.ctaText}
                </span>
              )}
            </div>

            {/* Info & Action Controls */}
            <div className="flex-1 min-w-0 space-y-4 w-full text-left">
              {isAllSelected ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 mb-1.5">
                    <Layers className="w-3 h-3" />
                    OUR EVENTS HUB {items.length > 0 ? `(${items.length})` : ''}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Our Events
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    A directory displaying your upcoming events, schedules, and ticket RSVP links.
                  </p>

                  {items.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Upcoming Events ({items.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs">
                            <span className="font-bold truncate text-slate-800 dark:text-slate-200">{it.title}</span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold shrink-0">{it.startDate || 'Upcoming'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeItem ? (
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 mb-1.5">
                    <Calendar className="w-3 h-3" />
                    Event Invitation
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {activeItem.title}
                  </h2>
                </div>
              ) : null}

              {!isAllSelected && (
                <>
                  {/* Event Photos Showcase Gallery */}
                    {activeItem?.photos && activeItem.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 my-3">
                        {activeItem.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="aspect-video sm:aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100 dark:bg-slate-900">
                            <img src={photo} alt={`Event Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5 space-y-1.5">
                      {activeItem && formatEventDateTime(activeItem) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>{formatEventDateTime(activeItem)}</span>
                        </div>
                      )}

                      {activeItem?.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>{activeItem.location}</span>
                        </div>
                      )}

                      {activeItem?.contactPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span>Inquiries: {activeItem.contactPhone}</span>
                        </div>
                      )}

                      {activeItem?.contactEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                          <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <a href={`mailto:${activeItem.contactEmail}`} className="hover:underline text-purple-600 dark:text-purple-400">
                            Email: {activeItem.contactEmail}
                          </a>
                        </div>
                      )}
                    </div>

                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium mt-2 break-all"
                    >
                      <span>Event Page Link: {activeUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>

                    {activeItem?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {activeItem.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                      const page = isAllSelected || !activeItem
                        ? QRHostingService.convertEventsHubToHostedPage(items, business)
                        : QRHostingService.convertEventToHostedPage(activeItem, business);
                      onOpenCustomerView(page);
                    }}
                    className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                    <span>Open Event Page</span>
                  </a>
                )}

                {!isAllSelected && activeItem && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeItem)}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Event</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Printable Table Stand / Wall Poster Generator Card */}
          <div className="bg-purple-50/70 dark:bg-purple-950/30 rounded-3xl p-5 border border-purple-200 dark:border-purple-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  Print Table & Wall QR Code Poster (PDF)
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-400">
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
                  placeholder="e.g. Main Gate, Event Poster, Reception, Entrance"
                  value={tableNumberForPrint}
                  onChange={(e) => setTableNumberForPrint(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleDownloadTableStandPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50 cursor-pointer"
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
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              No Event QR Codes Created
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Add your upcoming event or conference to generate an invitation and RSVP QR code.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-700/20 active:scale-95 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
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
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingItem ? 'Edit Event QR' : 'Create Event QR'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure event title, dates, photos & RSVP details
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

            <form id="event-qr-form" onSubmit={handleSaveForm} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {/* Event Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Event Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Summit, Grand Opening, Wedding"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Event Dates (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Event Dates (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">Start Date</span>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">End Date</span>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Event Times (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Event Times (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">Start Time</span>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">End Time</span>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Event Photos Upload (Up to 3 Photos, Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Event Photos (Up to 3 Photos, Optional)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formPhotos.length}/3 photos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {formPhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group bg-slate-100 dark:bg-slate-800">
                      <img src={photo} alt={`Event Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {formPhotos.length < 3 && (
                    <label className={`aspect-square rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-purple-600 dark:text-purple-400 ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                      />
                      {isUploadingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Add Photo</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Venue / Location */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Venue / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium, City Center, Kampala"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* RSVP Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  RSVP & Ticket Registration *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setRsvpMode('phone')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      rsvpMode === 'phone'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp / Phone RSVP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpMode('url')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      rsvpMode === 'url'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Online Link / Tickets</span>
                  </button>
                </div>

                {rsvpMode === 'phone' ? (
                  <PhoneInputField
                    id="event-rsvp-phone"
                    label="RSVP WhatsApp or Mobile Phone *"
                    icon={MessageCircle}
                    value={formRsvpPhone}
                    onChange={(val) => setFormRsvpPhone(val)}
                    placeholder="700 123 456"
                    required
                    defaultCountryCode="+256"
                    helpText="Select your country flag & code, then enter phone number for direct WhatsApp RSVP"
                  />
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Event Website, Registration or Tickets URL *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://event.com/rsvp or https://forms.gle/..."
                      value={formRsvpUrl}
                      onChange={(e) => setFormRsvpUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Event Inquiries / Organizer Contact Phone */}
              <PhoneInputField
                id="event-contact-phone"
                label="Organizer Inquiries / Support Phone (Optional)"
                icon={Phone}
                value={formContactPhone}
                onChange={(val) => setFormContactPhone(val)}
                placeholder="700 123 456"
                defaultCountryCode="+256"
                helpText="Direct phone with country flag for attendees to call or message with event inquiries"
              />

              {/* Event Inquiries / Organizer Contact Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Organizer Contact Email (Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. events@yourbrand.com or info@domain.com"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Email address for attendee inquiries, RSVP questions, or partnership details
                </p>
              </div>

              {/* Call-To-Action Text */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Call-To-Action Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scan to RSVP & Join Event"
                  value={formCta}
                  onChange={(e) => setFormCta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Description / Agenda */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Optional Description / Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Join us for guest speakers, live demos, and networking."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2.5 shrink-0 z-10">
              <button
                type="submit"
                form="event-qr-form"
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingItem ? 'Save Changes' : 'Create Event QR'}</span>
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
