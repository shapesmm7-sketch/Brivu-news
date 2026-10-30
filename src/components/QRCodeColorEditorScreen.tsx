import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Palette,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { QRCodeHostedPage } from '../types';
import { QRHostingService } from '../services/qrHostingService';

interface QRCodeColorEditorScreenProps {
  page?: QRCodeHostedPage;
  title?: string;
  url?: string;
  initialDarkColor?: string;
  initialEyeColor?: string;
  initialLightColor?: string;
  initialBoxBgColor?: string;
  initialBoxBorderColor?: string;
  accentColor?: string;
  onSave: (updates: {
    qrDarkColor: string;
    qrEyeColor: string;
    qrLightColor: string;
    qrBoxBgColor: string;
    qrBoxBorderColor: string;
  }) => void;
  onBack: () => void;
}

const QR_COLOR_PRESETS = [
  { name: 'Pure Black', value: '#000000' },
  { name: 'Slate Dark', value: '#0f172a' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Crimson', value: '#b91c1c' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'White', value: '#ffffff' },
];

const QR_EYE_COLOR_PRESETS = [
  { name: 'Pure Black', value: '#000000' },
  { name: 'Slate Dark', value: '#0f172a' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Rose Red', value: '#f43f5e' },
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

export const QRCodeColorEditorScreen: React.FC<QRCodeColorEditorScreenProps> = ({
  page,
  title,
  url,
  initialDarkColor,
  initialEyeColor,
  initialLightColor,
  initialBoxBgColor,
  initialBoxBorderColor,
  accentColor = '#059669',
  onSave,
  onBack,
}) => {
  const displayTitle = title || page?.title || 'QR Code';
  const targetUrl = url || (page ? QRHostingService.getCustomerPageUrl(page.id) : '');

  const [darkColor, setDarkColor] = useState<string>(initialDarkColor || page?.qrDarkColor || '#000000');
  const [eyeColor, setEyeColor] = useState<string>(initialEyeColor || page?.qrEyeColor || initialDarkColor || page?.qrDarkColor || '#000000');
  const [lightColor, setLightColor] = useState<string>(initialLightColor || page?.qrLightColor || '#ffffff');
  const [boxBgColor, setBoxBgColor] = useState<string>(initialBoxBgColor || page?.qrBoxBgColor || '#ffffff');
  const [boxBorderColor, setBoxBorderColor] = useState<string>(initialBoxBorderColor || page?.qrBoxBorderColor || '#e2e8f0');
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!targetUrl) return;
    QRHostingService.generateQrCodeDataUrl(targetUrl, {
      width: 600,
      margin: 1.5,
      color: {
        dark: darkColor,
        light: lightColor,
        eyeColor: eyeColor,
      },
    })
      .then((data) => setPreviewQrUrl(data))
      .catch((err) => console.error(err));
  }, [targetUrl, darkColor, lightColor, eyeColor]);

  const handleResetDefaults = () => {
    setDarkColor('#000000');
    setEyeColor('#000000');
    setLightColor('#ffffff');
    setBoxBgColor('#ffffff');
    setBoxBorderColor('#e2e8f0');
  };

  const handleSave = () => {
    onSave({
      qrDarkColor: darkColor,
      qrEyeColor: eyeColor,
      qrLightColor: lightColor,
      qrBoxBgColor: boxBgColor,
      qrBoxBorderColor: boxBorderColor,
    });
    setSavedNotice(true);
    setTimeout(() => {
      onBack();
    }, 400);
  };

  return (
    <div className="space-y-5 pt-2 pb-24 animate-fadeIn max-w-2xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-6 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, #0f172a 100%)`,
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-white/80">
                Visual Customizer
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                Live Preview
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">QR Code & Box Editor</h1>
            <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5 leading-snug">
              Customize scannable pattern dots, 3 corner square boxes, background, and stand frame for{' '}
              <span className="text-white font-bold">{displayTitle}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Scannable Test</span>
        </div>
        <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Interactive QR Code Preview
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md mx-auto">
          Verify contrast and scan responsiveness in real-time before saving.
        </p>

        {/* QR Code Container */}
        <div
          className="mt-5 inline-block p-4 sm:p-5 rounded-3xl shadow-xl transition-all duration-300 relative"
          style={{
            backgroundColor: boxBgColor,
            borderColor: boxBorderColor === 'transparent' ? 'transparent' : boxBorderColor,
            borderWidth: boxBorderColor === 'transparent' ? '0px' : '4px',
            borderStyle: 'solid',
          }}
        >
          {previewQrUrl ? (
            <img
              src={previewQrUrl}
              alt="QR Code Preview"
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain transition-transform"
              style={{
                backgroundColor: lightColor,
                borderRadius: '16px',
                padding: '8px',
              }}
            />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs">
              Generating Preview...
            </div>
          )}
        </div>
      </div>

      {/* Editor Controls Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs text-left space-y-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Color & Styling Controls</span>
        </h3>

        {/* 1. QR Code Pattern Color (Inner Dots) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                1. QR Code Pattern Color (Inner Dots & Data Grid)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Colors the small data dots and modules inside the code.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <input
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5 bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500 uppercase">{darkColor}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {QR_COLOR_PRESETS.map((color) => {
              const isSelected = darkColor.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setDarkColor(color.value)}
                  title={color.name}
                  className={`w-7 h-7 rounded-xl border transition flex items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 border-white'
                      : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#ffffff' ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. QR Code Corner Square Boxes (3 Finder Eyes) */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. Corner Square Boxes Color (3 Finder Eye Markers)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                The 3 corner target square boxes (two on top and one on bottom-left).
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <input
                type="color"
                value={eyeColor}
                onChange={(e) => setEyeColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5 bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500 uppercase">{eyeColor}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {QR_EYE_COLOR_PRESETS.map((color) => {
              const isSelected = eyeColor.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setEyeColor(color.value)}
                  title={color.name}
                  className={`w-7 h-7 rounded-xl border transition flex items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 border-white'
                      : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#ffffff' ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. QR Code Background Color */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                3. QR Code Inner Background (Paper Contrast)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Background surface behind the QR code pattern.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <input
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5 bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500 uppercase">{lightColor}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {QR_LIGHT_PRESETS.map((color) => {
              const isSelected = lightColor.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setLightColor(color.value)}
                  title={color.name}
                  className={`w-7 h-7 rounded-xl border transition flex items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 border-white'
                      : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#ffffff' ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Outer QR Stand Box Color */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                4. Stand Card Box Background Fill
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Color for the outer stand / tent container card.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <input
                type="color"
                value={boxBgColor}
                onChange={(e) => setBoxBgColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5 bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500 uppercase">{boxBgColor}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {BOX_BG_PRESETS.map((color) => {
              const isSelected = boxBgColor.toLowerCase() === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setBoxBgColor(color.value)}
                  title={color.name}
                  className={`w-7 h-7 rounded-xl border transition flex items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 border-white'
                      : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#ffffff' ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Outer Box Border & Frame Color */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                5. Stand Card Outer Border / Frame Color
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Decorative frame outline border around the stand card.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <input
                type="color"
                value={boxBorderColor === 'transparent' ? '#ffffff' : boxBorderColor}
                onChange={(e) => setBoxBorderColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600 p-0.5 bg-transparent"
              />
              <span className="text-[11px] font-mono text-slate-500 uppercase">
                {boxBorderColor === 'transparent' ? 'None' : boxBorderColor}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {BOX_BORDER_PRESETS.map((color) => {
              const isSelected =
                boxBorderColor.toLowerCase() === color.value.toLowerCase() ||
                (boxBorderColor === 'transparent' && color.value === 'transparent');
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setBoxBorderColor(color.value)}
                  title={color.name}
                  className={`w-7 h-7 rounded-xl border transition flex items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110 border-white'
                      : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: color.value === 'transparent' ? '#ffffff' : color.value,
                    backgroundImage:
                      color.value === 'transparent'
                        ? 'linear-gradient(45deg, #f87171 25%, transparent 25%, transparent 75%, #f87171 75%), linear-gradient(45deg, #f87171 25%, transparent 25%, transparent 75%, #f87171 75%)'
                        : undefined,
                    backgroundSize: color.value === 'transparent' ? '8px 8px' : undefined,
                    backgroundPosition: color.value === 'transparent' ? '0 0, 4px 4px' : undefined,
                  }}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        color.value === '#ffffff' || color.value === 'transparent'
                          ? 'text-slate-900'
                          : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition text-center"
        >
          Cancel & Discard
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md hover:opacity-95"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-4 h-4" />
            <span>Save Colors</span>
          </button>
        </div>
      </div>
    </div>
  );
};
