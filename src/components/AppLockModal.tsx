import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  X,
  AlertTriangle,
  KeyRound,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { AppLockConfig } from '../types';
import { StorageService } from '../services/storage';

interface AppLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow: () => void;
  onConfigChange?: (config: AppLockConfig | null) => void;
  initialMode?: 'setup' | 'manage' | 'reset';
}

export const AppLockModal: React.FC<AppLockModalProps> = ({
  isOpen,
  onClose,
  onLockNow,
  onConfigChange,
  initialMode = 'setup',
}) => {
  const [currentConfig, setCurrentConfig] = useState<AppLockConfig | null>(() =>
    StorageService.getAppLockConfig()
  );

  const [mode, setMode] = useState<'view' | 'setup' | 'change' | 'reset'>(() => {
    if (initialMode === 'reset') return 'reset';
    const existing = StorageService.getAppLockConfig();
    return existing && existing.isEnabled ? 'view' : 'setup';
  });

  // Form fields
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [secretWord, setSecretWord] = useState<string>('');
  const [autoLockOnExit, setAutoLockOnExit] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // When modal opens, sync current config
  useEffect(() => {
    if (isOpen) {
      const existing = StorageService.getAppLockConfig();
      setCurrentConfig(existing);
      if (initialMode === 'reset') {
        setMode('reset');
        setPin('');
        setConfirmPin('');
        setSecretWord('');
      } else if (existing && existing.isEnabled) {
        setMode('view');
        setAutoLockOnExit(existing.autoLockOnExit === true);
      } else {
        setMode('setup');
        setPin('');
        setConfirmPin('');
        setSecretWord('');
        setAutoLockOnExit(false);
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSaveLock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate PIN
    const cleanedPin = pin.trim();
    if (!/^\d{4,8}$/.test(cleanedPin)) {
      setErrorMsg('Passcode must be between 4 and 8 digits (numbers only).');
      return;
    }

    if (cleanedPin !== confirmPin.trim()) {
      setErrorMsg('Passcode and confirmation do not match. Please retype carefully.');
      return;
    }

    // Validate Secret Word / Number
    const cleanedSecret = secretWord.trim();
    if (!cleanedSecret || cleanedSecret.length < 2) {
      setErrorMsg('Please enter a recovery Secret Word or Number (at least 2 characters).');
      return;
    }

    const newConfig: AppLockConfig = {
      isEnabled: true,
      pin: cleanedPin,
      secretWord: cleanedSecret,
      autoLockOnExit: autoLockOnExit,
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveAppLockConfig(newConfig);
    StorageService.setAppLocked(false);
    setCurrentConfig(newConfig);
    if (onConfigChange) {
      onConfigChange(newConfig);
    }

    setSuccessMsg('Passcode saved! App protection is active.');
    setTimeout(() => {
      setSuccessMsg(null);
      setMode('view');
    }, 1000);
  };

  const handleDisableLock = () => {
    StorageService.saveAppLockConfig(null);
    StorageService.setAppLocked(false);
    setCurrentConfig(null);
    if (onConfigChange) {
      onConfigChange(null);
    }
    setSuccessMsg('App Lock has been turned off.');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleToggleAutoLock = (enabled: boolean) => {
    setAutoLockOnExit(enabled);
    if (currentConfig) {
      const updated: AppLockConfig = {
        ...currentConfig,
        autoLockOnExit: enabled,
      };
      StorageService.saveAppLockConfig(updated);
      setCurrentConfig(updated);
      if (onConfigChange) {
        onConfigChange(updated);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-md my-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>App Lock & Privacy Guard</span>
                {currentConfig && currentConfig.isEnabled && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    Active
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-300">
                Prevent unauthorized access to business records & sales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Notification / Toast Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE: VIEW / MANAGE CURRENT LOCK */}
          {mode === 'view' && currentConfig && currentConfig.isEnabled && (
            <div className="space-y-4">
              {/* Status Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        Digit Passcode Protected
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentConfig.pin.length}-Digit PIN & Secret Word Recovery Enabled
                      </p>
                    </div>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Auto Lock Toggle */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Auto-Lock on App Open
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Require passcode every time app starts
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoLockOnExit}
                      onChange={(e) => handleToggleAutoLock(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Primary Lock Action: Lock Immediately */}
              <button
                id="btn-lock-app-now"
                type="button"
                onClick={() => {
                  onClose();
                  StorageService.setAppLocked(true);
                  onLockNow();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Lock App Immediately</span>
              </button>

              {/* Secondary Actions: Change or Disable */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPin('');
                    setConfirmPin('');
                    setSecretWord('');
                    setMode('change');
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Change PIN / Word</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisableLock}
                  className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Turn Off Lock</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE: SETUP / CHANGE / RESET */}
          {(mode === 'setup' || mode === 'change' || mode === 'reset') && (
            <form onSubmit={handleSaveLock} className="space-y-4">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Create Security Passcode & Recovery Secret</span>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Set a numeric PIN code for rapid app unlocking, plus a secret word or number to easily reset your PIN if you ever forget it.
                </p>
              </div>

              {/* Passcode Digits */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Create Passcode (4-8 Digits):</span>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1"
                    >
                      {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPin ? 'Hide Digits' : 'Show Digits'}</span>
                    </button>
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPin(val);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g., 4589"
                    required
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Confirm Passcode:
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setConfirmPin(val);
                      setErrorMsg(null);
                    }}
                    placeholder="Re-enter same digits"
                    required
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Secret Word or Number Recovery */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Secret Word or Number (Recovery):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold"
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={secretWord}
                  onChange={(e) => {
                    setSecretWord(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. Kampala, 1995, Simba, or favorite nickname"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  If you ever forget your digits password, you can immediately reset or unlock the app using this secret word or number.
                </p>
              </div>

              {/* Auto Lock Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="chk-auto-lock"
                  type="checkbox"
                  checked={autoLockOnExit}
                  onChange={(e) => setAutoLockOnExit(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                />
                <label
                  htmlFor="chk-auto-lock"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Automatically lock app when opening or reloading
                </label>
              </div>

              {/* Form Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{currentConfig && currentConfig.isEnabled ? 'Update Passcode & Protection' : 'Save & Enable App Lock'}</span>
                </button>

                {currentConfig && currentConfig.isEnabled && (
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
