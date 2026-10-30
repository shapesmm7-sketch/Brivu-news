import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  Upload,
  Trash2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  FileCheck,
  Globe,
  Coins,
  Check,
  ArrowLeft,
  Image as ImageIcon,
  PenTool,
  RotateCcw,
  Sparkles,
  Palette,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { SUPPORTED_CURRENCIES, getCurrencyFlag } from '../utils/currencies';
import { StorageService } from '../services/storage';
import { CloudflareService } from '../services/cloudflareService';
import { AdMobService } from '../services/admobService';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { PhoneInputField } from './PhoneInputField';
import { getLanguageByCode } from '../data/languages';
import { t } from '../utils/i18n';
import {
  BRAND_COLOR_PRESETS,
  COLOR_AND_GRADIENT_PRESETS,
  isValidHex,
  isValidColorOrGradient,
  normalizeHex,
  getContrastTextHex,
} from '../utils/colors';

interface BusinessProfileScreenProps {
  initialProfile: BusinessProfile;
  onSave: (updatedProfile: BusinessProfile) => void;
  onBack: () => void;
}

export const BusinessProfileScreen: React.FC<BusinessProfileScreenProps> = ({
  initialProfile,
  onSave,
  onBack,
}) => {
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);
  const [savedToast, setSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Signature drawing state
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Accordion state for Brand Accent & Theme Colors
  const [isAccentColorOpen, setIsAccentColorOpen] = useState(false);
  const [activeColorTarget, setActiveColorTarget] = useState<
    'accentColor' | 'headerBgColor' | 'headerTextColor' | 'totalBgColor' | 'totalTextColor' | 'paperBgColor'
  >('accentColor');

  // Currency modal & search state
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');

  // Language modal state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find((c) => c.code === (profile.currency || 'UGX')) || SUPPORTED_CURRENCIES[0];
  const selectedLanguageObj = getLanguageByCode(profile.language || 'en');

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((c) => {
    const q = currencySearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      (c.flag && c.flag.includes(q))
    );
  });

  const handleChange = (field: keyof BusinessProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Setup canvas when drawing pad is opened
  useEffect(() => {
    if (!isDrawingOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#0f172a'; // dark navy / ink black
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear background (transparent PNG)
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }, [isDrawingOpen]);

  // Coordinate helper for both touch and mouse
  const getCanvasPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const handleStartDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    setHasDrawn(true);
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleStopDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
  };

  const handleClearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    handleChange('signature', dataUrl);
    setIsDrawingOpen(false);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const maxW = 400;
        const maxH = 160;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/png');
          handleChange('signature', dataUrl);
          // Upload to Cloudflare R2 first
          CloudflareService.uploadFile({
            data: dataUrl,
            filename: `signature_${Date.now()}.png`,
            mimeType: 'image/png',
            folder: 'signatures',
          }).then((res) => {
            if (res.success && res.url) {
              handleChange('signature', res.url);
            }
          }).catch(() => {});
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setProfile((prev) => ({ ...prev, signature: undefined }));
    if (sigFileInputRef.current) {
      sigFileInputRef.current.value = '';
    }
  };

  // Image upload and client-side compression to avoid storage limits
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Canvas compression to max 300x300
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          handleChange('logo', dataUrl);
          // Upload to Cloudflare R2 first
          CloudflareService.uploadFile({
            data: dataUrl,
            filename: `logo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            folder: 'photos',
          }).then((res) => {
            if (res.success && res.url) {
              handleChange('logo', res.url);
            }
          }).catch(() => {});
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setProfile((prev) => ({ ...prev, logo: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await StorageService.saveProfileAsync(profile);
      onSave(profile);
      setSavedToast(true);
      AdMobService.showInterstitial('profile_saved');
      setTimeout(() => setSavedToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn max-w-2xl mx-auto">
      {/* Toast Alert */}
      {savedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>Business Profile saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-profile-back"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h1 className="text-base font-bold text-slate-900 dark:text-white">
          Business Profile
        </h1>

        <button
          id="btn-profile-save-top"
          onClick={handleSave}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition"
        >
          Save
        </button>
      </div>

      {/* Main Profile Form Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Business Logo Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Business Logo (Appears on all receipts & PDFs)
          </label>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt="Business Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-7 h-7 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="upload-business-logo"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{profile.logo ? 'Change Logo' : 'Upload Logo'}</span>
                </button>

                {profile.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Recommended: Square image (PNG or JPG). Resized automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Business Signature Section (Automatic on PDF) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <PenTool className="w-3.5 h-3.5 text-emerald-500" />
              <span>Authorized Signature (Auto-added to Receipt PDFs)</span>
            </label>
            {profile.signature && !isDrawingOpen && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                <Sparkles className="w-3 h-3" />
                Active on Receipts
              </span>
            )}
          </div>

          <input
            ref={sigFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            className="hidden"
            id="upload-business-signature"
          />

          {/* If drawing mode is OPEN: Interactive Canvas Pad */}
          {isDrawingOpen ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/50 dark:border-emerald-500/40 shadow-inner space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-emerald-500" />
                  Draw Signature with Finger or Mouse
                </span>
                <span className="text-[10px] text-slate-400">Smooth ink • Transparent background</span>
              </div>

              {/* Drawing Surface */}
              <div className="relative w-full h-36 bg-white rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs cursor-crosshair touch-none select-none">
                {/* Subtle Signature Baseline Guide */}
                <div className="absolute bottom-7 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none flex justify-between items-end pb-0.5">
                  <span className="text-[9px] text-slate-300 font-sans tracking-wide">Sign above line</span>
                  <span className="text-[9px] text-slate-300 font-sans">✕</span>
                </div>

                <canvas
                  ref={canvasRef}
                  onMouseDown={handleStartDraw}
                  onMouseMove={handleDraw}
                  onMouseUp={handleStopDraw}
                  onMouseLeave={handleStopDraw}
                  onTouchStart={handleStartDraw}
                  onTouchMove={handleDraw}
                  onTouchEnd={handleStopDraw}
                  onTouchCancel={handleStopDraw}
                  className="w-full h-full block"
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearSignatureCanvas}
                    className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-save-drawn-signature"
                  disabled={!hasDrawn}
                  onClick={handleSaveDrawnSignature}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use This Signature</span>
                </button>
              </div>
            </div>
          ) : profile.signature ? (
            /* If signature EXISTS: Show Saved Preview & Controls */
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-56 h-20 bg-white rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col items-center justify-center relative shadow-xs">
                <img
                  src={profile.signature}
                  alt="Saved Signature"
                  className="max-h-12 w-auto max-w-full object-contain"
                />
                <div className="w-28 border-b border-slate-300 my-0.5" />
                <span className="text-[8px] font-sans text-slate-400 font-semibold uppercase tracking-wider">
                  Authorized Sign
                </span>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <div className="text-[11px] text-slate-500">
                  This signature will be automatically placed on every receipt PDF and print layout.
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <button
                    type="button"
                    id="btn-profile-redraw-sig"
                    onClick={() => setIsDrawingOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Redraw Signature</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sigFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    id="btn-profile-remove-sig"
                    onClick={handleRemoveSignature}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                    title="Remove Signature"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* If NO signature yet: Prominent Call-to-action */
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    No Signature Saved Yet
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Draw your signature once to have it automatically stamped on all receipt PDFs.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-profile-open-sig-pad"
                  onClick={() => setIsDrawingOpen(true)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Draw Signature</span>
                </button>

                <button
                  type="button"
                  onClick={() => sigFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  title="Upload transparent PNG / JPEG of your signature"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Business Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span>Business / Shop Name *</span>
          </label>
          <input
            id="input-profile-name"
            type="text"
            value={profile.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Kampala Fresh Mart, Elite Boutique"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Business Description / What We Deal In */}
        <div>
          <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Business Details & Description / What We Deal In</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Appears on receipts & PDFs</span>
          </label>
          <textarea
            id="input-profile-description"
            rows={2}
            value={profile.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="e.g. We deal in all types of clothes, footwear, textiles & fashion accessories"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none leading-relaxed"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            State your specialties or products (e.g. "Dealers in all types of men & women clothes", "Wholesale & Retail General Merchandise", "Phone repair & electronics").
          </p>
        </div>

        {/* Phone & WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PhoneInputField
            id="input-profile-phone"
            label="Phone Number"
            required
            value={profile.phone}
            onChange={(val) => handleChange('phone', val)}
            placeholder="700 123 456"
          />

          <PhoneInputField
            id="input-profile-whatsapp"
            label="WhatsApp Number"
            icon={MessageSquare}
            value={profile.whatsapp || ''}
            onChange={(val) => handleChange('whatsapp', val)}
            placeholder="700 123 456"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Email Address</span>
          </label>
          <input
            id="input-profile-email"
            type="email"
            value={profile.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="e.g. contact@yourbusiness.com"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Physical Address */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Physical Address *</span>
          </label>
          <input
            id="input-profile-address"
            type="text"
            value={profile.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="e.g. Plot 14 Kampala Road, Shop #3"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Tax / VAT Number & Website */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Tax / TIN / VAT Number (Optional)</span>
            </label>
            <input
              id="input-profile-tax"
              type="text"
              value={profile.taxNumber || ''}
              onChange={(e) => handleChange('taxNumber', e.target.value)}
              placeholder="e.g. TIN-10492837"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Website / Social (Optional)</span>
            </label>
            <input
              id="input-profile-website"
              type="text"
              value={profile.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="e.g. www.mybusiness.ug"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Brand & Receipt Theme Colors (Multi-Color Collapsible Accordion) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {(() => {
            const targets = [
              { id: 'accentColor', label: 'Primary Accent', shortLabel: 'Accent', desc: 'Badges, icons, borders, & default highlights' },
              { id: 'headerBgColor', label: 'Header Fill', shortLabel: 'Header BG', desc: 'Top receipt header banner background fill' },
              { id: 'headerTextColor', label: 'Header Text', shortLabel: 'Header Text', desc: 'Business store name & description text color' },
              { id: 'totalBgColor', label: 'Total Box Fill', shortLabel: 'Total BG', desc: 'Grand total summary box fill color' },
              { id: 'totalTextColor', label: 'Total Text', shortLabel: 'Total Text', desc: 'Grand total number and label color' },
              { id: 'paperBgColor', label: 'Paper Canvas', shortLabel: 'Paper BG', desc: 'Receipt background paper canvas fill' },
            ] as const;

            const activeTargetObj = targets.find((t) => t.id === activeColorTarget) || targets[0];
            const currentVal = profile[activeColorTarget] || '';
            const isGradient = currentVal.includes('gradient');
            const activeHex = !isGradient && isValidHex(currentVal) ? normalizeHex(currentVal) : null;

            // Check if any custom colors are active
            const activeColorCount = [
              profile.accentColor,
              profile.headerBgColor,
              profile.headerTextColor,
              profile.totalBgColor,
              profile.totalTextColor,
              profile.paperBgColor,
            ].filter(Boolean).length;

            return (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs transition">
                {/* Accordion Heading Button */}
                <button
                  type="button"
                  id="btn-toggle-accent-colors"
                  onClick={() => setIsAccentColorOpen(!isAccentColorOpen)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <span>Brand & Receipt Theme Colors</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Optional
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        Customize header, text & total colors, or leave blank to use template defaults
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Active Colors Badges Preview */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {activeColorCount > 0 ? (
                        <>
                          {profile.accentColor && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0"
                              style={{
                                background: isValidColorOrGradient(profile.accentColor)
                                  ? (isValidHex(profile.accentColor) ? normalizeHex(profile.accentColor) : profile.accentColor)
                                  : '#059669',
                              }}
                              title="Primary Accent"
                            />
                          )}
                          {profile.headerBgColor && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0"
                              style={{
                                background: isValidColorOrGradient(profile.headerBgColor)
                                  ? (isValidHex(profile.headerBgColor) ? normalizeHex(profile.headerBgColor) : profile.headerBgColor)
                                  : '#059669',
                              }}
                              title="Header Fill"
                            />
                          )}
                          {profile.totalBgColor && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0"
                              style={{
                                background: isValidColorOrGradient(profile.totalBgColor)
                                  ? (isValidHex(profile.totalBgColor) ? normalizeHex(profile.totalBgColor) : profile.totalBgColor)
                                  : '#059669',
                              }}
                              title="Total Box Fill"
                            />
                          )}
                          {profile.paperBgColor && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0"
                              style={{
                                background: isValidColorOrGradient(profile.paperBgColor)
                                  ? (isValidHex(profile.paperBgColor) ? normalizeHex(profile.paperBgColor) : profile.paperBgColor)
                                  : '#FFFFFF',
                              }}
                              title="Paper Canvas Fill"
                            />
                          )}
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
                            {activeColorCount} Custom
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-0.5">
                          Default (Standard Themes)
                        </span>
                      )}
                    </div>

                    {isAccentColorOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expandable Palette Panel */}
                {isAccentColorOpen && (
                  <div className="p-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3.5">
                    {/* Optional Informational Banner & Reset All Button */}
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-sm shrink-0">💡</span>
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold">This section is completely optional.</span> If ignored, Brivu automatically renders your receipts using standard layout template themes or custom receipt editor styles.
                        </div>
                      </div>

                      {activeColorCount > 0 && (
                        <button
                          type="button"
                          id="btn-reset-all-brand-colors"
                          onClick={() => {
                            setProfile((prev) => ({
                              ...prev,
                              accentColor: '',
                              headerBgColor: '',
                              headerTextColor: '',
                              totalBgColor: '',
                              totalTextColor: '',
                              paperBgColor: '',
                            }));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-rose-600 dark:text-rose-400 font-bold text-[10px] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer shadow-2xs self-end sm:self-auto"
                        >
                          Reset All to Template Defaults
                        </button>
                      )}
                    </div>

                    {/* Element Selector Tabs (6 Target Areas) */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        1. Choose Receipt Element to Customize
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {targets.map((target) => {
                          const val = profile[target.id] || '';
                          const isTargetGradient = val.includes('gradient');
                          const isSelected = activeColorTarget === target.id;

                          return (
                            <button
                              key={target.id}
                              type="button"
                              id={`btn-target-${target.id}`}
                              onClick={() => setActiveColorTarget(target.id)}
                              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/30'
                                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {target.shortLabel}
                                </span>
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                                  style={{
                                    background: val && isValidColorOrGradient(val)
                                      ? (isValidHex(val) ? normalizeHex(val) : val)
                                      : '#cbd5e1',
                                  }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 truncate uppercase">
                                {val ? (isTargetGradient ? 'Grad' : normalizeHex(val)) : 'Default'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Customizer Box */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Editing: {activeTargetObj.label}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {activeTargetObj.desc}
                          </p>
                        </div>
                        {currentVal && (
                          <button
                            type="button"
                            id="btn-reset-target-color"
                            onClick={() => handleChange(activeColorTarget, '')}
                            className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 underline shrink-0 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Native Color Picker + Hex / Gradient Input */}
                      <div className="flex items-center gap-2">
                        {/* Native Color Eyedropper */}
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs">
                          <input
                            id="input-color-picker"
                            type="color"
                            value={activeHex || '#059669'}
                            onChange={(e) => handleChange(activeColorTarget, e.target.value)}
                            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-100 border-0 p-0"
                          />
                        </div>

                        {/* Hex or Gradient Text Input */}
                        <div className="flex-1">
                          <input
                            id="input-hex-color"
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleChange(activeColorTarget, e.target.value)}
                            placeholder="HEX code or CSS gradient (e.g. #059669)"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Scrollable Swatches Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            2. Choose Color or Gradient Swatch (Scroll Horizontally →)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 no-scrollbar">
                          {COLOR_AND_GRADIENT_PRESETS.map((swatch, idx) => {
                            const isSwatchGradient = swatch.includes('gradient');
                            const isSelected =
                              currentVal === swatch ||
                              (!isSwatchGradient &&
                                isValidHex(currentVal) &&
                                isValidHex(swatch) &&
                                normalizeHex(currentVal) === normalizeHex(swatch));

                            const swatchStyle = { background: swatch };

                            return (
                              <button
                                key={idx}
                                type="button"
                                id={`btn-profile-swatch-${idx}`}
                                onClick={() => handleChange(activeColorTarget, swatch)}
                                className={`w-8 h-8 rounded-lg shrink-0 border transition-all cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105 shadow-md'
                                    : 'border-black/10 dark:border-white/10 hover:scale-105 hover:border-slate-400'
                                }`}
                                style={swatchStyle}
                                title={isSwatchGradient ? 'Linear Gradient' : swatch}
                              >
                                {isSelected && (
                                  <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Live Multi-Color Receipt Mockup */}
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 font-mono text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans flex justify-between items-center">
                        <span>3. Live Receipt Multi-Color Preview</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {activeColorCount > 0 ? `${activeColorCount} Custom Colors` : 'Template Defaults'}
                        </span>
                      </div>

                      <div
                        className="rounded-xl p-3 shadow-xs border border-slate-200 dark:border-slate-800 transition-all space-y-2.5 overflow-hidden"
                        style={{
                          background: profile.paperBgColor && isValidColorOrGradient(profile.paperBgColor)
                            ? (isValidHex(profile.paperBgColor) ? normalizeHex(profile.paperBgColor) : profile.paperBgColor)
                            : '#FFFFFF',
                          color: profile.paperBgColor && isValidHex(profile.paperBgColor) ? getContrastTextHex(profile.paperBgColor) : undefined,
                        }}
                      >
                        {/* Header Fill & Header Text */}
                        <div
                          className="p-2.5 rounded-lg transition-all flex items-center justify-between gap-2"
                          style={{
                            background: profile.headerBgColor && isValidColorOrGradient(profile.headerBgColor)
                              ? (isValidHex(profile.headerBgColor) ? normalizeHex(profile.headerBgColor) : profile.headerBgColor)
                              : (profile.accentColor && isValidColorOrGradient(profile.accentColor) ? (isValidHex(profile.accentColor) ? normalizeHex(profile.accentColor) : profile.accentColor) : '#059669'),
                            color: profile.headerTextColor && isValidColorOrGradient(profile.headerTextColor) ? (isValidHex(profile.headerTextColor) ? normalizeHex(profile.headerTextColor) : profile.headerTextColor) : '#FFFFFF',
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold tracking-widest uppercase block opacity-80">*** RECEIPT ***</span>
                            <h5 className="font-bold text-xs truncate">{profile.name || 'Your Store Name'}</h5>
                          </div>
                          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/20 bg-white/10 shrink-0">
                            OFFICIAL
                          </div>
                        </div>

                        {/* Primary Accent Badges & Line */}
                        <div className="flex items-center justify-between text-[10px] pb-1 border-b border-dashed border-slate-300 dark:border-slate-700">
                          <span
                            className="px-2 py-0.5 rounded-md font-bold text-[9px]"
                            style={{
                              background: profile.accentColor && isValidColorOrGradient(profile.accentColor)
                                ? (isValidHex(profile.accentColor) ? normalizeHex(profile.accentColor) : profile.accentColor)
                                : '#059669',
                              color: profile.accentColor && isValidHex(profile.accentColor) ? getContrastTextHex(profile.accentColor) : '#FFFFFF',
                            }}
                          >
                            PAID CASH
                          </span>
                          <span className="text-slate-400 text-[10px]">REC-01</span>
                        </div>

                        {/* Item List */}
                        <div className="text-[10px] space-y-1">
                          <div className="flex justify-between">
                            <span>1x Item Sample A</span>
                            <span>50,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2x Item Sample B</span>
                            <span>100,000</span>
                          </div>
                        </div>

                        {/* Total Banner Fill & Total Text */}
                        <div
                          className="p-2.5 rounded-lg flex justify-between items-center font-bold text-xs transition-all shadow-xs"
                          style={{
                            background: profile.totalBgColor && isValidColorOrGradient(profile.totalBgColor)
                              ? (isValidHex(profile.totalBgColor) ? normalizeHex(profile.totalBgColor) : profile.totalBgColor)
                              : (profile.accentColor && isValidColorOrGradient(profile.accentColor) ? (isValidHex(profile.accentColor) ? normalizeHex(profile.accentColor) : profile.accentColor) : '#059669'),
                            color: profile.totalTextColor && isValidColorOrGradient(profile.totalTextColor) ? (isValidHex(profile.totalTextColor) ? normalizeHex(profile.totalTextColor) : profile.totalTextColor) : '#FFFFFF',
                          }}
                        >
                          <span>TOTAL DUE</span>
                          <span>{profile.currency || 'UGX'} 150,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Default Currency */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Default Currency (Default: UGX)</span>
          </label>
          <button
            id="btn-open-currency-modal"
            type="button"
            onClick={() => setIsCurrencyModalOpen(true)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white hover:border-emerald-500 transition flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none shrink-0" aria-hidden="true">
                {selectedCurrencyObj.flag || getCurrencyFlag(selectedCurrencyObj.code)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-[11px] shrink-0">
                {selectedCurrencyObj.code}
              </span>
              <span className="truncate">
                {selectedCurrencyObj.name} ({selectedCurrencyObj.symbol})
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
          <p className="text-[11px] text-slate-400 mt-1">
            All prices and totals on receipts and PDFs will be formatted in this currency.
          </p>
        </div>

        {/* App & Business Language */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Business & App Language (177+ World Languages)</span>
          </label>
          <button
            id="btn-open-language-modal"
            type="button"
            onClick={() => setIsLanguageModalOpen(true)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white hover:border-indigo-500 transition flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none shrink-0">{selectedLanguageObj.flag}</span>
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-extrabold text-slate-900 dark:text-white">{selectedLanguageObj.name}</span>
                <span className="text-[11px] font-semibold text-slate-400 truncate">({selectedLanguageObj.nativeName})</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
          <p className="text-[11px] text-slate-400 mt-1">
            Select your preferred local or international language for receipts, business details and menus.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        id="btn-profile-save-bottom"
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-[0.99] transition flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        <span>{t('save_business_profile', profile.language)}</span>
      </button>

      {/* Compact Currency Picker Modal */}
      {isCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full h-[88vh] max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Select Currency
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Search and pick your business currency
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyModalOpen(false);
                  setCurrencySearchQuery('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, e.g. USD, EUR, UGX..."
                  value={currencySearchQuery}
                  onChange={(e) => setCurrencySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Scrollable Currency Options (Tall List) */}
            <div className="p-2 flex-1 overflow-y-auto space-y-1">
              {filteredCurrencies.map((c) => {
                const isSelected = profile.currency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      handleChange('currency', c.code);
                      setIsCurrencyModalOpen(false);
                      setCurrencySearchQuery('');
                    }}
                    className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2.5 text-xs ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl leading-none shrink-0" aria-hidden="true">
                        {c.flag || getCurrencyFlag(c.code)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
                        {c.code}
                      </span>
                      <span className="truncate text-xs">
                        {c.name}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-xs shrink-0">
                        ({c.symbol})
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {filteredCurrencies.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No currency matching "{currencySearchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        currentLanguageCode={profile.language || 'en'}
        onSelectLanguage={(lang) => {
          const updated = { ...profile, language: lang.name };
          setProfile(updated);
          StorageService.saveProfile(updated);
          onSave(updated);
          setIsLanguageModalOpen(false);
        }}
        onClose={() => setIsLanguageModalOpen(false)}
      />
    </div>
  );
};
