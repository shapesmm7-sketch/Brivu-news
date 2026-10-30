import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  QrCode,
  Scan,
  Zap,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { InventoryProduct } from '../types';
import { StorageService } from '../services/storage';
import { formatCurrency } from '../utils/currencies';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  currency: string;
  onClose: () => void;
  onScanResult: (productOrCode: {
    scannedCode: string;
    matchedProduct?: InventoryProduct;
  }) => void;
  instantScan?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  currency,
  onClose,
  onScanResult,
  instantScan = false,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [matchedProduct, setMatchedProduct] = useState<InventoryProduct | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [showLightWarning, setShowLightWarning] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef<boolean>(false);
  const scanBufferRef = useRef<{ code: string; count: number; lastTime: number }>({ code: '', count: 0, lastTime: 0 });
  const scannerStartTimeRef = useRef<number>(0);
  const warningIntervalRef = useRef<number | null>(null);
  
  const containerId = 'barcode-scanner-viewport';

  // Play audio beep when barcode is successfully scanned
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz pitch
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // ignore audio context failures
    }
  };

  const handleBarcodeFound = (code: string) => {
    if (!code || hasScannedRef.current) return;
    
    const now = Date.now();
    const cleanCode = code.trim();

    // Verify scan by requiring the same code to be read 2 consecutive times within a short window
    // This dramatically reduces false positives from noise in low light
    if (now - scanBufferRef.current.lastTime > 1000) {
      scanBufferRef.current = { code: cleanCode, count: 1, lastTime: now };
      return;
    } else {
      if (scanBufferRef.current.code === cleanCode) {
        scanBufferRef.current.count++;
        scanBufferRef.current.lastTime = now;
      } else {
        scanBufferRef.current = { code: cleanCode, count: 1, lastTime: now };
        return;
      }
    }

    if (scanBufferRef.current.count < 2) {
      return; // Need one more matching frame to confirm
    }

    hasScannedRef.current = true;
    setShowLightWarning(false);
    
    if (scannerRef.current) {
      try {
        scannerRef.current.pause(true);
      } catch {
        // ignore pause error
      }
    }

    setScannedCode(cleanCode);
    playBeep();

    // Look up in inventory by itemId or barcode or name
    const products = StorageService.getInventoryProducts();
    const match = products.find((p) => {
      const pCode = (p.itemId || '').toLowerCase();
      const target = cleanCode.toLowerCase();
      return pCode === target || p.id.toLowerCase() === target || p.name.toLowerCase() === target;
    });

    if (instantScan) {
      onScanResult({ scannedCode: cleanCode, matchedProduct: match || undefined });
      return;
    }

    if (match) {
      setMatchedProduct(match);
    } else {
      setMatchedProduct(null);
    }
  };

  // Start Scanner
  const startScanner = async () => {
    setCameraError(null);
    hasScannedRef.current = false;
    scanBufferRef.current = { code: '', count: 0, lastTime: 0 };
    setShowLightWarning(false);
    
    try {
      // Explicitly request video permission first to trigger OS/Browser permission dialog
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          // Stop stream tracks so Html5Qrcode can bind to camera
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr) {
          console.warn('Camera permission check note:', permErr);
        }
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore stop error
        }
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
        },
        (decodedText) => {
          handleBarcodeFound(decodedText);
        },
        () => {
          // ignore frame decode errors
        }
      );

      setIsScanning(true);
      scannerStartTimeRef.current = Date.now();
      
      // Start a checker to see if we've been scanning for > 5 seconds without success
      if (warningIntervalRef.current) {
        window.clearInterval(warningIntervalRef.current);
      }
      warningIntervalRef.current = window.setInterval(() => {
        if (!hasScannedRef.current && Date.now() - scannerStartTimeRef.current > 5000) {
          setShowLightWarning(true);
        }
      }, 1000);

      // Check flashlight/torch availability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as unknown as { torch?: boolean }).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.warn('Camera barcode scanner error:', err);
      setIsScanning(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access device camera. Please check camera permissions or enter barcode manually.';
      setCameraError(msg);
    }
  };

  const stopScanner = async () => {
    if (warningIntervalRef.current) {
      window.clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      setScannedCode('');
      setMatchedProduct(null);
      setManualCode('');
      setCameraError(null);
      // Give DOM time to mount viewport container
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
      });
      setIsTorchOn(nextState);
    } catch {
      // torch failed
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeFound(manualCode.trim());
  };

  const handleConfirmAdd = () => {
    if (!scannedCode) return;
    onScanResult({
      scannedCode,
      matchedProduct: matchedProduct || undefined,
    });
    stopScanner();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={() => {
        stopScanner();
        onClose();
      }}
    >
      <div
        className="bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden text-white animate-scaleUp max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                Barcode / QR Scanner
              </h2>
              <p className="text-xs text-slate-400">
                Point camera at barcode to auto-fill inventory item
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Mute Beep Sound' : 'Enable Beep Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Torch Toggle if available */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition ${
                  isTorchOn
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Toggle Flashlight"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-close-barcode-scanner"
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCANNER CAMERA VIEWPORT AREA */}
        <div className="relative bg-black min-h-[260px] sm:min-h-[290px] flex items-center justify-center overflow-hidden">
          {/* HTML5 QRCODE CONTAINER */}
          <div
            id={containerId}
            className="w-full h-full min-h-[260px] max-h-[320px] object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Scanning Frame Overlay & Laser Line */}
          {isScanning && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
              {/* Low Light Warning */}
              {showLightWarning && !scannedCode && (
                <div className="mt-6 px-4 py-2 rounded-xl bg-amber-950/80 border border-amber-500/50 backdrop-blur-md animate-fadeIn max-w-[280px] text-center">
                  <p className="text-[11px] font-bold text-amber-300">Having trouble scanning?</p>
                  <p className="text-[10px] text-amber-200/80 mt-0.5 leading-tight">Make sure there is enough light and the camera is steady to avoid misreads. {hasTorch ? 'Try turning on the flashlight (⚡).' : ''}</p>
                </div>
              )}
            </div>
          )}

          {/* Camera Error Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-bold text-slate-200">Camera Access Issue</p>
                <p className="text-xs text-slate-400">{cameraError}</p>
              </div>
              <button
                type="button"
                onClick={startScanner}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* MANUAL INPUT FALLBACK / SCANNED RESULT CARD */}
        <div className="p-4 space-y-3 bg-slate-900 border-t border-slate-800">
          {/* SCANNED CODE MATCH BANNER */}
          {scannedCode ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-400">
                      Scanned Barcode
                    </span>
                    <div className="text-sm font-mono font-extrabold text-white">
                      #{scannedCode}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannedCode('');
                    setMatchedProduct(null);
                    hasScannedRef.current = false;
                    if (scannerRef.current) {
                      try {
                        scannerRef.current.resume();
                      } catch {
                        // ignore resume error
                      }
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Scan another
                </button>
              </div>

              {/* Matched Product Preview Card */}
              {matchedProduct ? (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {matchedProduct.image ? (
                        <img
                          src={matchedProduct.image}
                          alt={matchedProduct.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {matchedProduct.name}
                      </div>
                      <div className="text-xs font-mono font-extrabold text-emerald-400">
                        {formatCurrency(matchedProduct.sellingPrice || 0, currency)}
                        <span className="text-[10px] text-slate-400 font-sans ml-1 font-normal">
                          ({matchedProduct.quantity} in stock)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    id="btn-confirm-add-scanned-product"
                    type="button"
                    onClick={handleConfirmAdd}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <span>Add Item</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <span className="font-bold text-slate-200">Product not in stock inventory yet</span>
                    <p className="text-[11px] text-slate-400">
                      You can add barcode #{scannedCode} directly as item name.
                    </p>
                  </div>
                  <button
                    id="btn-confirm-add-unmatched-code"
                    type="button"
                    onClick={handleConfirmAdd}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition active:scale-95 shrink-0"
                  >
                    Add #{scannedCode}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MANUAL BARCODE INPUT FORM */
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Or type barcode / item ID manually:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-manual-barcode"
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter barcode e.g. 60012345678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <button
                  id="btn-submit-manual-barcode"
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 font-bold text-xs border border-slate-700 transition"
                >
                  Search
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
