import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Delete,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { AppLockConfig, BusinessProfile } from '../types';
import { StorageService } from '../services/storage';

interface AppLockScreenProps {
  business: BusinessProfile;
  lockConfig: AppLockConfig;
  onUnlock: () => void;
  onResetPinRequested: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  business,
  lockConfig,
  onUnlock,
  onResetPinRequested,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isForgotMode, setIsForgotMode] = useState<boolean>(false);
  const [enteredSecret, setEnteredSecret] = useState<string>('');
  const [secretError, setSecretError] = useState<string | null>(null);
  const [secretSuccess, setSecretSuccess] = useState<boolean>(false);
  const [showSecretText, setShowSecretText] = useState<boolean>(false);

  const targetPinLength = lockConfig.pin ? lockConfig.pin.length : 4;

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  const handleVerifyPin = useCallback((pinToVerify: string) => {
    if (pinToVerify === lockConfig.pin) {
      setErrorMsg(null);
      StorageService.setAppLocked(false);
      onUnlock();
    } else {
      triggerShake();
      setErrorMsg('Incorrect PIN. Please try again.');
      setEnteredPin('');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  }, [lockConfig.pin, onUnlock, triggerShake]);

  const handleDigitPress = useCallback((digit: string) => {
    if (isForgotMode) return;
    if (enteredPin.length < targetPinLength) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMsg(null);
      if (next.length === targetPinLength) {
        setTimeout(() => {
          handleVerifyPin(next);
        }, 120);
      }
    }
  }, [enteredPin, isForgotMode, targetPinLength, handleVerifyPin]);

  const handleBackspace = useCallback(() => {
    if (isForgotMode) return;
    setErrorMsg(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  }, [isForgotMode]);

  const handleClear = useCallback(() => {
    if (isForgotMode) return;
    setErrorMsg(null);
    setEnteredPin('');
  }, [isForgotMode]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isForgotMode) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isForgotMode, handleDigitPress, handleBackspace, handleClear]);

  // Secret Word / Number Verification
  const handleVerifySecretWord = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEntered = enteredSecret.trim().toLowerCase();
    const cleanActual = (lockConfig.secretWord || '').trim().toLowerCase();

    if (!cleanEntered) {
      setSecretError('Please enter your secret word or number.');
      return;
    }

    if (cleanEntered === cleanActual) {
      setSecretError(null);
      setSecretSuccess(true);
      StorageService.setAppLocked(false);
      setTimeout(() => {
        onResetPinRequested();
      }, 1200);
    } else {
      setSecretError('Secret word or number does not match. Please verify and try again.');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-6 sm:p-8 select-none animate-fadeIn overflow-y-auto">
      {/* Background Ambience Glows */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 w-full max-w-sm mx-auto text-center pt-4 sm:pt-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {business.name || 'Brivu Business Manager'}
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>App Locked • Login to Access</span>
        </p>
      </div>

      {/* Center Body: Normal PIN Pad or Secret Recovery View */}
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto py-4">
        {!isForgotMode ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest font-black text-slate-400">
                Enter {targetPinLength}-Digit Passcode to Login
              </span>

              {/* PIN Dot Indicators */}
              <div
                className={`flex items-center justify-center gap-4 py-2 ${
                  isShaking ? 'animate-shake' : ''
                }`}
              >
                {Array.from({ length: targetPinLength }).map((_, idx) => {
                  const isFilled = idx < enteredPin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-emerald-400 scale-125 shadow-md shadow-emerald-400/50'
                          : 'bg-slate-700/80 border border-slate-600'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-950/60 px-3 py-1.5 rounded-xl border border-rose-800/60 animate-bounce">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Numeric Touch Keypad */}
            <div className="grid grid-cols-3 gap-3.5 sm:gap-4 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitPress(num.toString())}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 active:bg-emerald-600/80 active:scale-95 border border-slate-700/60 text-xl font-black text-white shadow-md transition-all flex items-center justify-center cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}

              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClear}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:scale-95 border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer select-none"
              >
                Clear
              </button>

              {/* 0 Button */}
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 active:bg-emerald-600/80 active:scale-95 border border-slate-700/60 text-xl font-black text-white shadow-md transition-all flex items-center justify-center cursor-pointer select-none"
              >
                0
              </button>

              {/* Backspace Button */}
              <button
                type="button"
                onClick={handleBackspace}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:scale-95 border border-slate-800/80 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer select-none"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Forgot PIN Trigger */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true);
                  setErrorMsg(null);
                  setSecretError(null);
                }}
                className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold underline py-1 transition cursor-pointer"
              >
                Forgot Passcode? Reset with Secret Word
              </button>
            </div>
          </div>
        ) : (
          /* Forgot PIN / Secret Word Recovery Form */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Reset Passcode
                </h3>
                <p className="text-xs text-slate-400">
                  Enter your recovery Secret Word or Number
                </p>
              </div>
            </div>

            {secretSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold">Secret word verified!</p>
                <p className="text-[11px] text-emerald-300">
                  Opening passcode reset options...
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifySecretWord} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Secret Word or Number:
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretText ? 'text' : 'password'}
                      value={enteredSecret}
                      onChange={(e) => {
                        setEnteredSecret(e.target.value);
                        setSecretError(null);
                      }}
                      placeholder="e.g., favorite city, pet, or lucky number"
                      autoFocus
                      className="w-full py-3 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-hidden text-sm text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretText(!showSecretText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showSecretText ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {secretError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{secretError}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Verify & Reset Passcode</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setEnteredSecret('');
                      setSecretError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Back to PIN Entry
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Security Badges */}
      <div className="relative z-10 w-full max-w-sm mx-auto text-center pb-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local Device Protection • Encrypted Storage</span>
        </div>
      </div>
    </div>
  );
};
