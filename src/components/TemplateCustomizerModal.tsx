import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Check,
  Palette,
  Type,
  FileText,
  Sliders,
  Award,
  CreditCard,
  Layout,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ReceiptTemplateId,
  TemplateCustomization,
  TemplateFontFamily,
  BusinessProfile,
} from '../types';
import { TEMPLATES_CONFIG, getTemplateConfig } from '../utils/templates';
import { BRAND_COLOR_PRESETS, COLOR_AND_GRADIENT_PRESETS, isValidHex, normalizeHex, getContrastTextHex } from '../utils/colors';
import { ReceiptLayoutRenderer } from './ReceiptLayoutRenderer';

interface TemplateCustomizerModalProps {
  templateId: ReceiptTemplateId;
  initialCustomization?: TemplateCustomization;
  business: BusinessProfile;
  onSave: (customization: TemplateCustomization) => void;
  onReset: () => void;
  onClose: () => void;
}

const PRESET_FONTS: { id: TemplateFontFamily; name: string; sample: string; css: string }[] = [
  { id: 'helvetica', name: 'Modern Sans (Helvetica)', sample: 'Clean & readable', css: 'font-sans' },
  { id: 'times', name: 'Executive Serif (Times)', sample: 'Formal & traditional', css: 'font-serif' },
  { id: 'courier', name: 'Monospace Ledger (Courier)', sample: 'Thermal POS style', css: 'font-mono' },
  { id: 'playfair', name: 'Luxury Display (Playfair)', sample: 'Premium elegance', css: 'font-serif' },
  { id: 'geist', name: 'Clean Tech (Geist)', sample: 'Minimalist tech vibe', css: 'font-sans' },
];

export const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = ({
  templateId,
  initialCustomization = {} as TemplateCustomization,
  business,
  onSave,
  onReset,
  onClose,
}) => {
  const baseConfig = getTemplateConfig(templateId);

  const [headerBgColor, setHeaderBgColor] = useState<string>(
    initialCustomization.headerBgColor || ''
  );
  const [headerNameColor, setHeaderNameColor] = useState<string>(
    initialCustomization.headerNameColor || ''
  );
  const [headerDescColor, setHeaderDescColor] = useState<string>(
    initialCustomization.headerDescColor || ''
  );
  const [headerAddressColor, setHeaderAddressColor] = useState<string>(
    initialCustomization.headerAddressColor || ''
  );
  const [receiptTextColor, setReceiptTextColor] = useState<string>(
    initialCustomization.receiptTextColor || ''
  );
  const [headerTextColor, setHeaderTextColor] = useState<string>(
    initialCustomization.headerTextColor || ''
  );
  const [accentColor, setAccentColor] = useState<string>(
    initialCustomization.accentColor || ''
  );
  const [totalBgColor, setTotalBgColor] = useState<string>(
    initialCustomization.totalBgColor || ''
  );
  const [totalTextColor, setTotalTextColor] = useState<string>(
    initialCustomization.totalTextColor || ''
  );
  const [paperBgColor, setPaperBgColor] = useState<string>(
    initialCustomization.paperBgColor || '#FFFFFF'
  );
  const [fontFamily, setFontFamily] = useState<TemplateFontFamily>(
    initialCustomization.fontFamily || 'helvetica'
  );
  const [badgeText, setBadgeText] = useState<string>(
    initialCustomization.badgeText || ''
  );
  const [badgeBgColor, setBadgeBgColor] = useState<string>(
    initialCustomization.badgeBgColor || ''
  );
  const [badgeTextColor, setBadgeTextColor] = useState<string>(
    initialCustomization.badgeTextColor || ''
  );

  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'badge'>('colors');

  const currentCustomization: TemplateCustomization = {
    headerBgColor: headerBgColor || undefined,
    headerNameColor: headerNameColor || undefined,
    headerDescColor: headerDescColor || undefined,
    headerAddressColor: headerAddressColor || undefined,
    receiptTextColor: receiptTextColor || undefined,
    headerTextColor: headerTextColor || undefined,
    accentColor: accentColor || undefined,
    totalBgColor: totalBgColor || undefined,
    totalTextColor: totalTextColor || undefined,
    paperBgColor: paperBgColor || undefined,
    fontFamily: fontFamily || undefined,
    badgeText: badgeText || undefined,
    badgeBgColor: badgeBgColor || undefined,
    badgeTextColor: badgeTextColor || undefined,
  };

  const handleReset = () => {
    setHeaderBgColor('');
    setHeaderNameColor('');
    setHeaderDescColor('');
    setHeaderAddressColor('');
    setReceiptTextColor('');
    setHeaderTextColor('');
    setAccentColor('');
    setTotalBgColor('');
    setTotalTextColor('');
    setPaperBgColor('#FFFFFF');
    setFontFamily('helvetica');
    setBadgeText('');
    setBadgeBgColor('');
    setBadgeTextColor('');
    setOpenSectionId(null);
    onReset();
  };

  const handleSave = () => {
    onSave(currentCustomization);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Customize Theme: {baseConfig.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tailor header background, fonts, accent highlights, badge labels & paper styles
              </p>
            </div>
          </div>
          <button
            id="btn-close-customizer-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MAIN BODY: 2 COLUMN RESPONSIVE GRID */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: LIVE RECEIPT PREVIEW PANEL */}
          <div className="lg:col-span-6 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                Live Preview
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Real-Time Render
              </span>
            </div>

            <div
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden transition-colors duration-200"
              style={{ background: paperBgColor || '#FFFFFF' }}
            >
              <ReceiptLayoutRenderer
                data={{
                  storeName: business.name || 'Kampala Quick Mart',
                  businessDescription: business.description || 'Dealers in all types of merchandise',
                  phone: business.phone || '+256 700 123 456',
                  email: business.email || 'sales@quickmart.ug',
                  address: business.address || 'Plot 22 Kampala Road',
                  taxNumber: business.taxNumber || 'TIN-104928371',
                  logo: business.logo,
                  signature: business.signature,
                  customFooter: business.customFooter,
                  receiptNumber: 'REC-000088',
                  createdAt: new Date().toISOString(),
                  customerName: 'Sarah Namubiru',
                  customerPhone: '+256 772 889 900',
                  paymentMethod: 'Mobile Money',
                  paymentStatus: 'paid',
                  items: [
                    { id: '1', name: 'Super Basmati Rice 5kg', quantity: 2, unitPrice: 45000, subtotal: 90000 },
                    { id: '2', name: 'Cooking Oil 3L', quantity: 1, unitPrice: 32000, subtotal: 32000 },
                  ],
                  subtotal: 122000,
                  discountAmount: 2000,
                  total: 120000,
                  amountPaid: 120000,
                  balance: 0,
                  currency: business.currency || 'UGX',
                  template: templateId,
                  customTheme: currentCustomization,
                  isSample: true,
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: CONTROLS & PICKERS */}
          <div className="lg:col-span-6 space-y-5">
            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                id="tab-customizer-colors"
                onClick={() => setActiveTab('colors')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'colors'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-emerald-500" />
                Colors
              </button>
              <button
                type="button"
                id="tab-customizer-typography"
                onClick={() => setActiveTab('typography')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'typography'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-blue-500" />
                Fonts
              </button>
              <button
                type="button"
                id="tab-customizer-badge"
                onClick={() => setActiveTab('badge')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'badge'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Badge & Text
              </button>
            </div>

            {/* TAB 1: COLORS */}
            {activeTab === 'colors' && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Click any heading below to expand its color list & palette:
                </p>

                {[
                  {
                    id: 'headerBg',
                    label: 'Header Background Color',
                    subtitle: 'Top header container background fill',
                    value: headerBgColor,
                    setter: setHeaderBgColor,
                    defaultFallback: '#0F172A',
                    Icon: Layout,
                  },
                  {
                    id: 'headerName',
                    label: 'Header Business Name Color',
                    subtitle: 'Store / business name title text color',
                    value: headerNameColor,
                    setter: setHeaderNameColor,
                    defaultFallback: '#0F172A',
                    Icon: Type,
                  },
                  {
                    id: 'headerDesc',
                    label: 'Header Business Description Color',
                    subtitle: 'Business tagline or description text color',
                    value: headerDescColor,
                    setter: setHeaderDescColor,
                    defaultFallback: '#64748B',
                    Icon: FileText,
                  },
                  {
                    id: 'headerAddress',
                    label: 'Header Address Color',
                    subtitle: 'Street address, phone & email contact text color',
                    value: headerAddressColor,
                    setter: setHeaderAddressColor,
                    defaultFallback: '#64748B',
                    Icon: Sliders,
                  },
                  {
                    id: 'receiptText',
                    label: 'Receipt Text Color',
                    subtitle: 'Body text color for items, table info & receipt details',
                    value: receiptTextColor,
                    setter: setReceiptTextColor,
                    defaultFallback: '#0F172A',
                    Icon: FileText,
                  },
                  {
                    id: 'totalBg',
                    label: 'Grand Total Box Background Color',
                    subtitle: 'Background fill color for the grand total settlement box',
                    value: totalBgColor,
                    setter: setTotalBgColor,
                    defaultFallback: '#059669',
                    Icon: CreditCard,
                  },
                  {
                    id: 'paperBg',
                    label: 'Paper Canvas Background Color',
                    subtitle: 'Background fill color of the main paper receipt canvas',
                    value: paperBgColor,
                    setter: setPaperBgColor,
                    defaultFallback: '#FFFFFF',
                    Icon: FileText,
                  },
                ].map((item) => {
                  const isOpen = openSectionId === item.id;
                  const activeVal = item.value || '';
                  const isGradient = activeVal.includes('gradient');
                  const activeHex = !isGradient && isValidHex(activeVal) ? normalizeHex(activeVal) : null;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs transition"
                    >
                      {/* HEADING CLICKABLE ACCORDION HEADER */}
                      <button
                        type="button"
                        id={`btn-customizer-accordion-${item.id}`}
                        onClick={() => setOpenSectionId(isOpen ? null : item.id)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            <item.Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.label}
                            </h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Selected Color Badge */}
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs shrink-0"
                              style={{ background: isGradient ? activeVal : (activeHex || item.defaultFallback) }}
                            />
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[65px]">
                              {isGradient ? 'Gradient' : (activeHex ? activeHex : 'Default')}
                            </span>
                          </div>

                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* EXPANDABLE COLOR SELECTION PANEL */}
                      {isOpen && (
                        <div className="p-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={activeHex || (isValidHex(item.defaultFallback) ? item.defaultFallback : '#0F172A')}
                                onChange={(e) => item.setter(e.target.value)}
                                className="w-8 h-8 rounded-xl cursor-pointer border-0 p-0 shadow-xs"
                              />
                              <input
                                type="text"
                                value={item.value}
                                onChange={(e) => item.setter(e.target.value)}
                                placeholder="HEX code or CSS gradient"
                                className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 w-44 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                              />
                            </div>

                            {item.value && (
                              <button
                                type="button"
                                onClick={() => item.setter('')}
                                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 underline shrink-0"
                              >
                                Clear Custom
                              </button>
                            )}
                          </div>

                          {/* Swatches List */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {COLOR_AND_GRADIENT_PRESETS.length}+ Swatches (Scroll Horizontally)
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                Scroll →
                              </span>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner no-scrollbar">
                              {COLOR_AND_GRADIENT_PRESETS.map((swatch, idx) => {
                                const isSwatchGradient = swatch.includes('gradient');
                                const isSelected = item.value === swatch || (!isSwatchGradient && isValidHex(item.value) && isValidHex(swatch) && normalizeHex(item.value) === normalizeHex(swatch));
                                
                                const swatchStyle = { background: swatch };

                                return (
                                  <button
                                    key={`swatch-${item.id}-${idx}`}
                                    type="button"
                                    onClick={() => item.setter(swatch)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black/10 shadow-xs shrink-0 cursor-pointer transition-all hover:scale-115 active:scale-95 flex items-center justify-center relative ${
                                      isSelected
                                        ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105 z-10'
                                        : 'hover:border-slate-400'
                                    }`}
                                    style={swatchStyle}
                                    title={isSwatchGradient ? 'Gradient Swatch' : swatch}
                                  >
                                    {isSelected && (
                                      <Check className="w-4 h-4 stroke-[3] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: TYPOGRAPHY & FONTS */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                {/* Font Selection */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Font Family Pairing
                  </label>
                  <div className="space-y-2">
                    {PRESET_FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition active:scale-98 ${
                          fontFamily === f.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-slate-900 dark:text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className={`font-bold text-sm ${f.css}`}>{f.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                            {f.sample}
                          </div>
                        </div>
                        {fontFamily === f.id && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BADGE & TEXT */}
            {activeTab === 'badge' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Custom Receipt Stamp / Badge Label
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Override the default badge text (e.g., RECEIPT) with your custom seal
                  </p>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. OFFICIAL RECEIPT, TAX INVOICE, PAID IN FULL"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Common Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['OFFICIAL RECEIPT', 'PAID IN FULL', 'TAX INVOICE', 'ORIGINAL COPY', 'VERIFIED'].map(
                    (txt) => (
                      <button
                        key={txt}
                        type="button"
                        onClick={() => setBadgeText(txt)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                      >
                        + {txt}
                      </button>
                    )
                  )}
                </div>

                {/* Badge Colors */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Badge Colors
                  </h4>
                  
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Badge Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={badgeBgColor || '#10b981'}
                        onChange={(e) => setBadgeBgColor(e.target.value)}
                        className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={badgeBgColor}
                        onChange={(e) => setBadgeBgColor(e.target.value)}
                        placeholder="Auto (e.g. #10B981)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium text-slate-800 dark:text-white"
                      />
                      {badgeBgColor && (
                        <button
                          type="button"
                          onClick={() => setBadgeBgColor('')}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Badge Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={badgeTextColor || '#ffffff'}
                        onChange={(e) => setBadgeTextColor(e.target.value)}
                        className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={badgeTextColor}
                        onChange={(e) => setBadgeTextColor(e.target.value)}
                        placeholder="Auto (e.g. #FFFFFF)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium text-slate-800 dark:text-white"
                      />
                      {badgeTextColor && (
                        <button
                          type="button"
                          onClick={() => setBadgeTextColor('')}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            type="button"
            id="btn-reset-template-customization"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-customizer"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-save-template-customizer"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Custom Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
