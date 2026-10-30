import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import { StorageService } from './storage';

interface MediaStorePluginInterface {
  saveToMediaStore(options: {
    filename: string;
    data: string;
    mimeType?: string;
    destination?: 'documents' | 'photos';
  }): Promise<{ success: boolean; uri: string; savedLocation: string; message: string }>;
  checkStoragePermission?(): Promise<{ granted: boolean }>;
  requestStoragePermission?(): Promise<{ granted: boolean }>;
  share(options: {
    filename?: string;
    data?: string;
    mimeType?: string;
    text?: string;
    title?: string;
    url?: string;
  }): Promise<{ success: boolean; message: string }>;
}

const MediaStore = registerPlugin<MediaStorePluginInterface>('MediaStore');

/**
 * Ensures storage permission is granted on Android devices (especially older Android versions
 * where direct file writing requires WRITE_EXTERNAL_STORAGE).
 */
export async function ensureStoragePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    if (MediaStore.checkStoragePermission) {
      const status = await MediaStore.checkStoragePermission();
      if (status && status.granted) return true;
      if (MediaStore.requestStoragePermission) {
        const req = await MediaStore.requestStoragePermission();
        return !!req?.granted;
      }
    }
    const permResult = await Filesystem.checkPermissions();
    if (permResult.publicStorage !== 'granted') {
      const req = await Filesystem.requestPermissions();
      return req.publicStorage === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('Storage permission check note:', err);
    return true;
  }
}

export interface SaveFileOptions {
  /** Blob, ArrayBuffer, text string (JSON/CSV), or base64 Data URI */
  data: Blob | ArrayBuffer | string;
  filename: string;
  mimeType?: string;
  title?: string;
  /**
   * Whether to open the Android native share sheet after saving.
   * Default is false to ensure files save directly into phone storage without opening share.
   */
  openShareSheet?: boolean;
  /** Destination folder type in phone storage ('documents' -> Download/Brivu, 'photos' -> Pictures/Brivu) */
  destination?: 'documents' | 'photos';
  /** Target Cloudflare R2 folder (e.g. 'qr_codes', 'qr_stands', 'photos', 'inventory', 'sales', 'expenses', 'debts', 'shopping', 'customers', 'agents', 'workers', 'reports') */
  folder?: string;
}

export interface SaveFileResult {
  success: boolean;
  uri?: string;
  filename: string;
  folder: string;
  message: string;
  cloudflareUrl?: string;
  cloudflareSaved?: boolean;
}

import { CloudflareService } from './cloudflareService';

/**
 * Asynchronously uploads a file to Cloudflare R2 if the worker is configured in settings.
 */
export async function tryUploadToCloudflare(
  data: Blob | ArrayBuffer | string,
  filename: string,
  mimeType = 'application/octet-stream',
  folder = 'receipts'
): Promise<{ url?: string; key?: string } | null> {
  try {
    const config = CloudflareService.getConfig();
    if (!config.workerUrl || config.autoSaveFiles === false) return null;
    const targetFolder = folder || (mimeType.includes('pdf') || filename.toLowerCase().endsWith('.pdf') ? 'receipts' : mimeType.startsWith('image/') ? 'photos' : 'documents');
    const uploadRes = await CloudflareService.uploadFile({
      data,
      filename,
      mimeType,
      folder: targetFolder,
    });
    if (uploadRes.success && uploadRes.url) {
      return { url: uploadRes.url, key: uploadRes.key };
    }
  } catch (err) {
    console.warn('Auto upload to Cloudflare R2 note:', err);
  }
  return null;
}

/**
 * Explicit helper to save any file directly to Cloudflare R2
 */
export async function saveFileToCloudflare(options: {
  data: Blob | ArrayBuffer | string;
  filename: string;
  mimeType?: string;
  folder?: string;
}): Promise<{ success: boolean; url?: string; key?: string; message: string }> {
  const { data, filename, mimeType = 'application/octet-stream', folder = 'receipts' } = options;
  const config = CloudflareService.getConfig();
  if (!config.workerUrl) {
    return {
      success: false,
      message: 'Cloudflare Worker is not configured. Please add your Worker URL in Settings.',
    };
  }

  const uploadRes = await CloudflareService.uploadFile({
    data,
    filename,
    mimeType,
    folder,
  });

  if (uploadRes.success && uploadRes.url) {
    return {
      success: true,
      url: uploadRes.url,
      key: uploadRes.key,
      message: uploadRes.message || 'File saved successfully to Cloudflare R2!',
    };
  }
  return {
    success: false,
    message: uploadRes.message || 'File saved locally. Check Cloudflare connection in Settings.',
  };
}

async function attachCloudflareUpload(
  result: SaveFileResult,
  data: Blob | ArrayBuffer | string,
  filename: string,
  mimeType: string,
  folder?: string
): Promise<SaveFileResult> {
  // Fire Cloudflare R2 upload asynchronously in background without blocking local download/UI state
  tryUploadToCloudflare(data, filename, mimeType, folder)
    .then((cf) => {
      if (cf && cf.url) {
        result.cloudflareUrl = cf.url;
        result.cloudflareSaved = true;
      }
    })
    .catch((err) => {
      console.warn('Background Cloudflare upload note:', err);
    });

  // Return local save result immediately so loading spinners reset instantly
  return result;
}

/**
 * Saves and exports files directly into device phone storage via Android MediaStore API
 * (Pictures/Brivu for photos, Download/Brivu for documents/PDFs/data).
 * Does NOT pop open the Android share sheet unless explicitly requested.
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
  const {
    filename,
    mimeType = 'application/octet-stream',
    title = filename,
    openShareSheet = false,
    destination,
    folder,
  } = options;
  const { data } = options;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // 1. Convert input data to clean base64 string
      let base64Data = '';
      if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          base64Data = data.split(',')[1] || '';
        } else {
          // Plain text string (JSON, CSV, etc.)
          base64Data = btoa(unescape(encodeURIComponent(data)));
        }
      } else if (data instanceof Blob) {
        base64Data = await blobToBase64(data);
      } else if (data instanceof ArrayBuffer) {
        base64Data = arrayBufferToBase64(data);
      }

      const isPhoto =
        destination === 'photos' ||
        mimeType.startsWith('image/') ||
        /\.(png|jpg|jpeg|webp|svg)$/i.test(filename);
      const destType: 'documents' | 'photos' = isPhoto ? 'photos' : 'documents';
      const targetR2Folder = folder || (isPhoto ? 'photos' : 'documents');

      // 2. Primary native storage route: Save directly to Android phone storage via MediaStore API
      try {
        const mediaStoreResult = await MediaStore.saveToMediaStore({
          filename,
          data: base64Data,
          mimeType,
          destination: destType,
        });

        if (mediaStoreResult && mediaStoreResult.success) {
          const fileUri = mediaStoreResult.uri;
          const locationNote = mediaStoreResult.savedLocation || (isPhoto ? 'Pictures/Brivu' : 'Documents/Brivu');

          // Only open share sheet if explicitly requested
          if (openShareSheet && fileUri) {
            try {
              StorageService.markSystemActionActive(60000);
              await Share.share({
                title: title || filename,
                text: `${title || filename} saved successfully.`,
                url: fileUri,
              });
            } catch (shareErr) {
              console.log('Share sheet dismissed:', shareErr);
            }
          }

          const localResult: SaveFileResult = {
            success: true,
            uri: fileUri,
            filename,
            folder: locationNote,
            message: `Saved to your phone (${locationNote})!`,
          };
          return attachCloudflareUpload(localResult, data, filename, mimeType, targetR2Folder);
        }
      } catch (mediaStoreErr) {
        console.warn('Native MediaStore plugin call note, falling back to Filesystem:', mediaStoreErr);
      }

      // 3. Fallback: Save using Capacitor Filesystem to Public Documents / Downloads
      try {
        const permResult = await Filesystem.checkPermissions();
        if (permResult.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (permErr) {
        console.warn('Filesystem permission note:', permErr);
      }

      let savedFile;
      const targetDirectory = isPhoto ? Directory.Documents : Directory.Documents;
      try {
        savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: targetDirectory,
          recursive: true,
        });
      } catch (writeErr) {
        console.warn('Writing to Directory.Documents failed, trying Directory.Cache:', writeErr);
        savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
      }

      const fileUri = savedFile.uri;
      const targetFolder = 'Documents/Brivu';

      // Only open share sheet if explicitly requested
      if (openShareSheet) {
        try {
          StorageService.markSystemActionActive(60000);
          await Share.share({
            title: title || filename,
            text: `${title || filename} saved successfully.`,
            url: fileUri,
          });
        } catch (shareErr) {
          console.log('Native share sheet dismissed:', shareErr);
        }
      }

      const localResult: SaveFileResult = {
        success: true,
        uri: fileUri,
        filename,
        folder: targetFolder,
        message: `Saved to your phone (${targetFolder})!`,
      };
      return attachCloudflareUpload(localResult, data, filename, mimeType, targetR2Folder);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Native Android file save error, using web fallback:', errMsg);
      const webRes = fallbackWebDownload(data, filename, mimeType);
      return attachCloudflareUpload(webRes, data, filename, mimeType, folder || 'documents');
    }
  } else {
    // Web Browser fallback (direct file download without opening any share sheet)
    const webRes = fallbackWebDownload(data, filename, mimeType);
    return attachCloudflareUpload(webRes, data, filename, mimeType, folder || (destination === 'photos' ? 'photos' : 'documents'));
  }
}

/**
 * Convenience helper to export a jsPDF document directly to native phone storage (MediaStore) or web download.
 */
export async function saveJsPdf(
  doc: jsPDF,
  filename: string,
  title?: string,
  options?: { openShareSheet?: boolean; folder?: string }
): Promise<SaveFileResult> {
  const arrayBuffer = doc.output('arraybuffer');
  const targetFolder = options?.folder || 'documents';
  if (Capacitor.isNativePlatform()) {
    return saveFile({
      data: arrayBuffer,
      filename,
      mimeType: 'application/pdf',
      title: title || filename,
      openShareSheet: options?.openShareSheet || false,
      destination: 'documents',
      folder: targetFolder,
    });
  } else {
    doc.save(filename);
    const baseResult: SaveFileResult = {
      success: true,
      filename,
      folder: 'Documents/Brivu',
      message: `Saved to your phone's Documents/Brivu folder!`,
    };
    return attachCloudflareUpload(baseResult, arrayBuffer, filename, 'application/pdf', targetFolder);
  }
}

export interface ShareContentOptions {
  filename?: string;
  data?: Blob | ArrayBuffer | string;
  mimeType?: string;
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Explicitly triggers the native Android Share Sheet (via MediaStorePlugin or @capacitor/share),
 * or Web Share API on modern browsers.
 * ONLY triggered when the user explicitly taps a dedicated "Share" button.
 */
export async function shareContent(
  options: ShareContentOptions
): Promise<{ shared: boolean; method: string; message: string }> {
  const {
    filename,
    data,
    mimeType = 'application/octet-stream',
    title = 'Share',
    text = '',
    url = '',
    dialogTitle = 'Share via',
  } = options;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // 1. Process base64 file data if attached
    let base64Data = '';
    if (data) {
      if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          base64Data = data.split(',')[1] || '';
        } else {
          base64Data = btoa(unescape(encodeURIComponent(data)));
        }
      } else if (data instanceof Blob) {
        base64Data = await blobToBase64(data);
      } else if (data instanceof ArrayBuffer) {
        base64Data = arrayBufferToBase64(data);
      }
    }

    // Direct Intent.ACTION_SEND chooser with FileProvider via native MediaStorePlugin
    try {
      const res = await MediaStore.share({
        filename: filename || (data ? 'document.pdf' : undefined),
        data: base64Data || undefined,
        mimeType,
        text,
        title,
        url,
      });
      if (res && res.success) {
        return { shared: true, method: 'android_native_share_sheet', message: 'Shared via Android Share Sheet' };
      }
    } catch (pluginErr) {
      console.warn('MediaStore native share note, trying @capacitor/share fallback:', pluginErr);
    }

    // Secondary fallback: @capacitor/share
    try {
      StorageService.markSystemActionActive(60000);
      if (base64Data && filename) {
        const savedCache = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        await Share.share({
          title,
          text: text || undefined,
          files: [savedCache.uri],
          dialogTitle: dialogTitle || title,
        });
      } else {
        await Share.share({
          title,
          text: text || undefined,
          url: url || undefined,
          dialogTitle: dialogTitle || title,
        });
      }
      return { shared: true, method: 'capacitor_share_sheet', message: 'Shared via Android Share Sheet' };
    } catch (shareErr: unknown) {
      const errMsg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (errMsg.toLowerCase().includes('cancel')) {
        return { shared: false, method: 'cancelled', message: 'Share sheet dismissed' };
      }
      console.warn('Capacitor Share fallback note:', errMsg);
    }
  }

  // Web Browser flow
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      if (data && filename) {
        let blob: Blob;
        if (data instanceof Blob) {
          blob = data;
        } else if (data instanceof ArrayBuffer) {
          blob = new Blob([data], { type: mimeType });
        } else {
          blob = new Blob([data], { type: mimeType });
        }
        const file = new File([blob], filename, { type: mimeType });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title,
            text,
            files: [file],
          });
          return { shared: true, method: 'web_share_file', message: 'Shared via Share Sheet' };
        }
      }

      await navigator.share({
        title,
        text,
        url: url || undefined,
      });
      return { shared: true, method: 'web_share_text', message: 'Shared via Share Sheet' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { shared: false, method: 'cancelled', message: 'Share sheet dismissed' };
      }
      console.warn('Web navigator.share note:', err);
    }
  }

  // Web fallback if navigator.share is unavailable
  if (url) {
    try {
      await navigator.clipboard.writeText(url);
      return { shared: true, method: 'clipboard_copy', message: 'Link copied to clipboard!' };
    } catch (copyErr) {
      console.warn('Clipboard write note:', copyErr);
    }
  }

  return { shared: false, method: 'fallback', message: 'Sharing not supported on this browser' };
}

/**
 * Web anchor tag fallback download.
 */
function fallbackWebDownload(data: Blob | ArrayBuffer | string, filename: string, mimeType: string): SaveFileResult {
  try {
    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        const parts = data.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || mimeType;
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        blob = new Blob([data], { type: mimeType });
      }
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

    return {
      success: true,
      filename,
      folder: 'Documents/Brivu',
      message: `Saved to your phone's Documents/Brivu folder!`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Web download failed:', errMsg);
    return {
      success: false,
      filename,
      folder: 'Documents/Brivu',
      message: `Download failed: ${errMsg}`,
    };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
