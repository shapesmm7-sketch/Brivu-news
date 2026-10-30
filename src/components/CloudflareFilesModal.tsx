import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cloud,
  FileText,
  Download,
  Trash2,
  Copy,
  Check,
  Upload,
  RefreshCw,
  X,
  ExternalLink,
  HardDrive,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import { CloudflareService } from '../services/cloudflareService';
import { CloudflareFileRecord } from '../types';

interface CloudflareFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareFilesModal: React.FC<CloudflareFilesModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<CloudflareFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const records = await CloudflareService.listFiles();
      setFiles(records);
    } catch {
      showToast('Failed to load files from cloud storage');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const handleCopyUrl = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      showToast('File link copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showToast('Failed to copy URL');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this file from cloud storage?')) return;
    try {
      const success = await CloudflareService.deleteFile(key);
      if (success) {
        setFiles((prev) => prev.filter((f) => f.key !== key));
        showToast('File deleted from cloud storage');
      } else {
        showToast('Failed to delete file');
      }
    } catch {
      showToast('Delete operation failed');
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await CloudflareService.uploadFile({
        data: file,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        folder: 'manual_uploads',
        force: true,
      });

      if (res.success) {
        showToast(`"${file.name}" uploaded to cloud storage!`);
        await loadFiles();
      } else {
        showToast(`Upload failed: ${res.message}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(`Upload error: ${errMsg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mime?: string, name?: string) => {
    const filename = (name || '').toLowerCase();
    const type = (mime || '').toLowerCase();

    if (type.includes('pdf') || filename.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (type.startsWith('image/') || /\.(png|jpg|jpeg|webp|svg)$/i.test(filename)) {
      return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    }
    if (filename.endsWith('.json') || filename.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-amber-500" />;
    }
    return <HardDrive className="w-5 h-5 text-indigo-500" />;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cloud Storage Files</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400">
                  {files.length} saved
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receipts, invoices, images & backups saved in cloud storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadFiles}
              disabled={isLoading}
              title="Refresh"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Upload & Filter) */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Saved Cloud Documents
          </span>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleDirectUpload}
            className="hidden"
            id="input-cf-upload-file"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="px-4 py-2 bg-slate-900 text-white text-xs font-medium flex items-center gap-2 border-b border-slate-800">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading && files.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-orange-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading files from cloud storage...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto">
                <Cloud className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No files in cloud storage yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  When you download receipts, invoices, or export backups, they will automatically be stored here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            files
              .filter((file) => {
                const name = (file.filename || '').toLowerCase();
                return !name.endsWith('.pem') && !name.includes('certificate');
              })
              .map((file) => (
              <div
                key={file.key}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-orange-300 dark:hover:border-orange-500/40 transition flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
                    {getFileIcon(file.mimeType, file.filename)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      {file.folder && (
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                          {file.folder}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Copy URL */}
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(file.url, file.key)}
                    title="Copy File URL"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    {copiedKey === file.key ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Open / Download */}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open / Download"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(file.key)}
                    title="Delete File"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Backed by Secure Cloud Object Storage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
