import React, { useState } from 'react';
import {
  Check,
  ArrowLeft,
  CheckCircle2,
  Maximize2,
  X,
  Sliders,
} from 'lucide-react';
import { BusinessProfile, ReceiptTemplateId } from '../types';
import { StorageService } from '../services/storage';
import { TEMPLATES_CONFIG } from '../utils/templates';
import { ReceiptLayoutRenderer } from './ReceiptLayoutRenderer';
import { TemplateCustomizerModal } from './TemplateCustomizerModal';

interface TemplatesScreenProps {
  currentDefault: ReceiptTemplateId;
  onSetDefault: (templateId: ReceiptTemplateId) => void;
  onBack: () => void;
  business?: BusinessProfile;
  onUpdateBusiness?: (business: BusinessProfile) => void;
}

export const TemplatesScreen: React.FC<TemplatesScreenProps> = ({
  currentDefault,
  onSetDefault,
  onBack,
  business: propBusiness,
}) => {
  const [business] = useState<BusinessProfile>(
    propBusiness || StorageService.getProfile()
  );
  const [selectedDefault, setSelectedDefault] = useState<ReceiptTemplateId>(currentDefault);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewModalId, setPreviewModalId] = useState<ReceiptTemplateId | null>(null);
  const [customizingTemplateId, setCustomizingTemplateId] = useState<ReceiptTemplateId | null>(null);

  const currency = business.currency || 'UGX';
  const storeName = business.name || 'QuickMart Store';

  const handleSelect = (id: ReceiptTemplateId) => {
    setSelectedDefault(id);
    const settings = StorageService.getSettings();
    settings.defaultTemplate = id;
    StorageService.saveSettings(settings);
    onSetDefault(id);

    const chosen = TEMPLATES_CONFIG.find((t) => t.id === id);
    setToastMessage(`"${chosen?.name || id}" set as default receipt theme`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Render Sample Receipt for each theme using its unique custom layout architecture
  const renderSampleReceipt = (id: ReceiptTemplateId, isModal: boolean = false) => {
    const customTheme = StorageService.getCustomTemplate(id);

    return (
      <ReceiptLayoutRenderer
        data={{
          storeName,
          logo: business.logo,
          phone: '+256 700 123 456',
          email: 'sales@' + storeName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
          address: 'Plot 22 Kampala Road, Uganda',
          taxNumber: '104928371',
          receiptNumber: 'REC-00084',
          createdAt: new Date().toISOString(),
          customerName: 'Sarah Namubiru',
          customerPhone: '+256 772 987 654',
          paymentMethod: 'Mobile Money',
          paymentStatus: 'paid',
          items: [
            { id: '1', name: 'Basmati Rice (5kg)', quantity: 2, unitPrice: 45000, subtotal: 90000 },
            { id: '2', name: 'Cooking Oil (3L)', quantity: 1, unitPrice: 32000, subtotal: 32000 },
            { id: '3', name: 'White Sugar (2kg)', quantity: 2, unitPrice: 9500, subtotal: 19000 },
          ],
          subtotal: 141000,
          discountAmount: 0,
          total: 141000,
          amountPaid: 150000,
          balance: 9000,
          currency,
          template: id,
          accentColor: business.accentColor,
          customTheme,
          isSample: true,
        }}
      />
    );
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn max-w-2xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-templates-back"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            Receipt & Invoice Themes
          </h1>
        </div>

        <div className="w-12" aria-hidden="true" />
      </div>

      {/* Visual Sample Receipts Grid */}
      <div className="space-y-4">
        {TEMPLATES_CONFIG.map((tpl) => {
          const isCurrent = selectedDefault === tpl.id;

          return (
            <div
              key={tpl.id}
              id={`template-card-${tpl.id}`}
              className={`rounded-2xl border transition-all p-3.5 sm:p-4 ${
                isCurrent
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 shadow-md ring-2 ring-emerald-500/25'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Action Bar of the Card */}
              <div className="flex items-center justify-end gap-1.5 mb-3">
                <button
                  id={`btn-customize-template-${tpl.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomizingTemplateId(tpl.id);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 shadow-xs"
                  title="Customize template colors, fonts, and styling"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Customize</span>
                </button>

                <button
                  id={`btn-inspect-${tpl.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewModalId(tpl.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition"
                  title="Enlarge receipt preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`btn-select-template-${tpl.id}`}
                  onClick={() => handleSelect(tpl.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </>
                  ) : (
                    <span>Use Theme</span>
                  )}
                </button>
              </div>

              {/* Interactive Visual Sample Receipt Card */}
              <div
                onClick={() => handleSelect(tpl.id)}
                className="cursor-pointer group relative"
                title="Tap to select theme"
              >
                {renderSampleReceipt(tpl.id)}

                {/* Subtle Hover Selection Cue */}
                {!isCurrent && (
                  <div className="absolute inset-0 rounded-xl bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-2 border-emerald-500/30" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enlarged Modal Preview when Maximize is clicked */}
      {previewModalId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Receipt Preview
              </h3>
              <button
                id="btn-close-preview-modal"
                onClick={() => setPreviewModalId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render sample receipt enlarged */}
            <div className="my-3">
              {renderSampleReceipt(previewModalId, true)}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                PDF & Print output will mirror this layout
              </span>

              <div className="flex items-center gap-2">
                <button
                  id="btn-modal-close"
                  onClick={() => setPreviewModalId(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
                <button
                  id="btn-modal-select"
                  onClick={() => {
                    handleSelect(previewModalId);
                    setPreviewModalId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition"
                >
                  Set as Default
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Template Customizer Modal */}
      {customizingTemplateId && (
        <TemplateCustomizerModal
          templateId={customizingTemplateId}
          initialCustomization={StorageService.getCustomTemplate(customizingTemplateId)}
          business={business}
          onSave={(customization) => {
            StorageService.saveCustomTemplate(customizingTemplateId, customization);
            const tName = TEMPLATES_CONFIG.find((t) => t.id === customizingTemplateId)?.name || customizingTemplateId;
            setToastMessage(`Saved custom theme settings for ${tName}`);
            setCustomizingTemplateId(null);
            setTimeout(() => setToastMessage(null), 3000);
          }}
          onReset={() => {
            StorageService.resetCustomTemplate(customizingTemplateId);
            const tName = TEMPLATES_CONFIG.find((t) => t.id === customizingTemplateId)?.name || customizingTemplateId;
            setToastMessage(`Reset ${tName} to default styles`);
            setCustomizingTemplateId(null);
            setTimeout(() => setToastMessage(null), 3000);
          }}
          onClose={() => setCustomizingTemplateId(null)}
        />
      )}
    </div>
  );
};
