import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FolderCheck, X, FileText } from 'lucide-react';

export interface DownloadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fileName?: string;
  folderName?: string;
  documentType?: 'receipt' | 'invoice' | 'file';
  documentNumber?: string;
  customMessage?: string;
}

export const DownloadSuccessModal: React.FC<DownloadSuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName,
  folderName = 'Documents/Brivu',
  documentType = 'receipt',
  documentNumber,
  customMessage,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  const docLabel = documentType === 'invoice' ? 'invoice' : documentType === 'file' ? 'file' : 'receipt';
  const defaultTitle = documentType === 'invoice'
    ? 'Invoice Saved Successfully!'
    : documentType === 'file'
    ? 'File Saved Successfully!'
    : 'Receipt Saved Successfully!';

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center relative overflow-hidden"
      >
        {/* Top Close Icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition active:scale-90"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3.5 shadow-inner border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">
          {title || defaultTitle}
        </h3>

        {/* Saved Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
          {customMessage || (
            <>
              This {docLabel}{' '}
              {documentNumber ? (
                <strong className="font-bold text-slate-900 dark:text-slate-100">
                  #{documentNumber}
                </strong>
              ) : (
                ''
              )}{' '}
              has been saved successfully in this folder:
            </>
          )}
        </p>

        {/* Folder Box */}
        <div className="my-3.5 p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs shadow-2xs">
          <FolderCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{folderName}</span>
        </div>

        {/* File Name info if provided */}
        {fileName && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 max-w-full">
            <FileText className="w-3 h-3 shrink-0 text-slate-400" />
            <span className="truncate">{fileName}</span>
          </div>
        )}

        {/* OK / Confirm Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <span>OK, Got It</span>
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
