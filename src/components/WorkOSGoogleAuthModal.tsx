import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Browser } from '@capacitor/browser';
import {
  X,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Sparkles,
  QrCode,
  Crown,
} from 'lucide-react';
import { WorkOSUser } from '../types';
import { WorkOSAuthService, generatePKCE } from '../services/workosAuthService';
import { CloudflareService } from '../services/cloudflareService';
import { StorageService } from '../services/storage';

interface WorkOSGoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange?: (user: WorkOSUser | null) => void;
  onNavigate?: (screen: any) => void;
}

export const WorkOSGoogleAuthModal: React.FC<WorkOSGoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onUserChange,
  onNavigate,
}) => {
  const [currentUser, setCurrentUser] = useState<WorkOSUser | null>(() =>
    WorkOSAuthService.getCurrentUser()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const u = WorkOSAuthService.getCurrentUser();
      setCurrentUser(u);
      setIsSubmitting(false);
      setIsSyncing(false);
      setStatusMsg(null);
    }
  }, [isOpen]);

  // Listen for native deep link auth updates
  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
        if (onUserChange) onUserChange(e.detail);
        // Immediately close the modal so user lands straight into the app
        onClose();
      } else {
        setCurrentUser(null);
        setIsSubmitting(false);
        setIsSyncing(false);
        setStatusMsg(null);
        if (onUserChange) onUserChange(null);
        onClose();
      }
    };

    window.addEventListener('workos_user_updated', handleUserUpdate);
    return () => window.removeEventListener('workos_user_updated', handleUserUpdate);
  }, [onUserChange, onClose]);

  // Set up window listener for popup responses
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin is from same origin, run.app, or Cloudflare workers.dev
      const origin = event.origin;
      const isAllowedOrigin =
        origin.endsWith('.run.app') ||
        origin.includes('workers.dev') ||
        origin.includes('localhost') ||
        origin === window.location.origin;

      if (!isAllowedOrigin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { code, user } = event.data;
        setIsSubmitting(true);
        setStatusMsg({ type: 'info', text: 'Signing in...' });
        try {
          let resolvedUser = user;
          if (!resolvedUser && code) {
            const authRes = await WorkOSAuthService.authenticateCode(code);
            if (authRes.success && authRes.user) {
              resolvedUser = authRes.user;
            }
          }
          if (resolvedUser) {
            await WorkOSAuthService.saveAndSyncUser(resolvedUser);
            setCurrentUser(resolvedUser);
            if (onUserChange) onUserChange(resolvedUser);
            // Immediately close the modal so user lands straight into the app with zero delay
            onClose();
          } else {
            setStatusMsg({
              type: 'error',
              text: 'WorkOS authentication failed. Please retry.',
            });
          }
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: err?.message || 'Authentication error' });
        } finally {
          setIsSubmitting(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUserChange, onClose]);

  if (!isOpen) return null;

  const trialStatus = StorageService.getTrialStatus();
  const isTrialExpiredAndNotSubscribed = trialStatus.isExpired && !trialStatus.subscribed;

  const handleGoogleSignInDirectly = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // Enforce 7-day free trial & subscription requirement
    const trial = StorageService.getTrialStatus();
    if (trial.isExpired && !trial.subscribed) {
      setStatusMsg({
        type: 'error',
        text: 'Your 7-day free trial has ended. Please upgrade to Brivu Pro in order to log in and sync your data to the cloud.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ type: 'info', text: 'Connecting to Google...' });

    try {
      // 1. Generate secure PKCE challenge
      const { codeVerifier, codeChallenge } = await generatePKCE();
      try {
        localStorage.setItem('workos_pkce_verifier', codeVerifier);
        sessionStorage.setItem('workos_pkce_verifier', codeVerifier);
      } catch (_) {}

      // 2. Generate a unique session ID for web polling (enables instant web & Android login)
      const sessionId = 'auth_session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem('workos_session_id', sessionId);
        sessionStorage.setItem('workos_session_id', sessionId);
      } catch (_) {}

      const config = await CloudflareService.getWorkOSConfig(codeChallenge);
      const clientId = config.clientId || 'client_01M4BGNT60CPMEA9P83WD6NRSB';

      const isNative = typeof window !== 'undefined' && (
        Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
        window.location.protocol === 'file:' ||
        window.location.protocol === 'capacitor:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
      const cloudflareBaseUrl = 'https://brivu.shapesmm7.workers.dev';
      const redirectUri = 'https://brivu.shapesmm7.workers.dev/callback';

      let returnUrl = typeof window !== 'undefined' ? (window.location.origin + window.location.pathname) : '';
      if (returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1') || returnUrl.startsWith('capacitor:') || returnUrl.startsWith('file:') || isNative) {
        returnUrl = 'https://brivu.shapesmm7.workers.dev/';
      }
      try {
        localStorage.setItem('workos_web_return_url', returnUrl);
        sessionStorage.setItem('workos_web_return_url', returnUrl);
      } catch (_) {}

      // Handle OAuth callback routing with target platform detection
      const stateObj = {
        sessionId,
        platform: isNative ? 'android' : 'web',
        returnUrl: returnUrl,
      };
      const stateParam = encodeURIComponent(JSON.stringify(stateObj));

      let authUrl = `https://api.workos.com/user_management/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&provider=GoogleOAuth&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&state=${stateParam}`;

      // Background session poller: checks session status every 1.2s for zero-delay instant login
      let pollTimer: any = null;
      let isCompleted = false;

      const stopSessionPolling = () => {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      };

      const handleSuccessfulLogin = async (user: any) => {
        if (isCompleted) return;
        isCompleted = true;
        stopSessionPolling();

        if (isNative) {
          try {
            await Browser.close();
          } catch (_) {}
        }

        setIsSubmitting(true);
        setStatusMsg({ type: 'info', text: 'Welcome! Setting up your account...' });
        await WorkOSAuthService.saveAndSyncUser(user);
        setCurrentUser(user);
        if (onUserChange) onUserChange(user);
        setIsSubmitting(false);
        onClose();
      };

      const startSessionPolling = () => {
        stopSessionPolling();
        pollTimer = setInterval(async () => {
          if (isCompleted) {
            stopSessionPolling();
            return;
          }
          try {
            const check = await CloudflareService.checkAuthSessionStatus(sessionId);
            if (check.status === 'completed' && check.user) {
              await handleSuccessfulLogin(check.user);
            }
          } catch (_) {}
        }, 1200);
      };

      if (isNative) {
        setStatusMsg({ type: 'info', text: 'Opening Google Sign-In in web browser...' });
        // Use Chrome Custom Tab with pure web callback handling on Android
        try {
          await Browser.open({ url: authUrl, presentationStyle: 'popover' });
        } catch (openErr) {
          window.location.href = authUrl;
        }

        startSessionPolling();

        try {
          Browser.addListener('browserFinished', async () => {
            try {
              const sId = localStorage.getItem('workos_session_id') || sessionStorage.getItem('workos_session_id') || sessionId;
              if (sId) {
                const check = await CloudflareService.checkAuthSessionStatus(sId);
                if (check.status === 'completed' && check.user) {
                  await handleSuccessfulLogin(check.user);
                  return;
                }
              }
            } catch (_) {}

            setTimeout(() => {
              if (!isCompleted) {
                stopSessionPolling();
                setIsSubmitting(false);
                setStatusMsg((prev) => (prev?.type === 'info' ? null : prev));
              }
            }, 1000);
          });
        } catch (_) {}
      } else {
        // Set popup options for desktop web
        const width = 500;
        const height = 620;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        setStatusMsg({ type: 'info', text: 'Opening Google Sign-In window...' });

        const popup = window.open(
          authUrl,
          'google_signin_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );

        if (!popup) {
          // If popup was blocked by browser, redirect current window directly
          window.location.href = authUrl;
          return;
        }

        setIsSubmitting(true);
        setStatusMsg({ type: 'info', text: 'Completing Google Sign-In in popup window...' });

        // Start session polling in parallel as a guaranteed fallback
        startSessionPolling();

        // Poll in case user manually closes the popup window without completing sign-in
        const popupWatcher = setInterval(() => {
          if (popup.closed) {
            clearInterval(popupWatcher);
            setTimeout(() => {
              if (!isCompleted) {
                stopSessionPolling();
                setIsSubmitting(false);
                setStatusMsg((prev) => (prev?.type === 'info' ? null : prev));
              }
            }, 1500);
          }
        }, 1000);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Google Sign-In connection failed' });
      setIsSubmitting(false);
    }
  };

  const handleSyncToCloudNow = async () => {
    if (!currentUser) return;
    if (isTrialExpiredAndNotSubscribed) {
      setStatusMsg({
        type: 'error',
        text: 'Your 7-day free trial has expired. Please upgrade to Brivu Pro in order to sync your data to the cloud.',
      });
      return;
    }
    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'Syncing profile & emails to Cloud...' });

    try {
      const res = await WorkOSAuthService.saveAndSyncUser(currentUser);
      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Profile, email & all user data synced to Cloud!' });
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Sync failed' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Sync error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = () => {
    setIsSubmitting(false);
    setIsSyncing(false);
    setStatusMsg(null);
    setCurrentUser(null);
    WorkOSAuthService.signOut();
    if (onUserChange) onUserChange(null);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex justify-center items-start sm:items-center p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slideUp my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-md p-2">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                {currentUser ? 'Account & Cloud Sync' : 'Sign In with Google'}
              </h3>
              <p className="text-[11px] text-indigo-200/90 font-medium">
                {currentUser ? 'manage profile and cloud backups' : 'avoid losing data on app uninstall • sync receipts & QR codes'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Alert Banner */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
              <span className="flex-1">{statusMsg.text}</span>
            </div>
          )}

          {/* LOGGED IN USER PROFILE DISPLAY */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 border-2 border-white dark:border-slate-800">
                    {currentUser.profilePictureUrl ? (
                      <img
                        src={currentUser.profilePictureUrl}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{(currentUser.name || currentUser.email)[0].toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {currentUser.name || 'Google User'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Google Verified</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                {/* Badges / Storage Info */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                  <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Sync Status
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        Securely Synced
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Encryption
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        Verified Secure
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {isTrialExpiredAndNotSubscribed && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <Crown className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider">7-Day Free Trial Expired</span>
                    </div>
                    <p className="text-[11px] text-amber-950/90 dark:text-amber-200/90 font-medium leading-relaxed">
                      Cloud sync is paused. Only subscribed users can continue syncing receipts, invoices, and QR codes to the cloud after the 7-day trial.
                    </p>
                    <button
                      id="btn-account-upgrade-pro"
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onNavigate) onNavigate('upgrade');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
                    >
                      <Crown className="w-4 h-4 fill-slate-950" />
                      <span>Upgrade to Pro to Continue Syncing</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSyncToCloudNow}
                  disabled={isSyncing}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Profile & Emails Online'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* NOT LOGGED IN / ONE-CLICK GOOGLE SIGN IN */
            <div className="space-y-4">
              {/* TRIAL EXPIRATION BANNER IF PAST 7 DAYS AND NOT SUBSCRIBED */}
              {isTrialExpiredAndNotSubscribed && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-500/50 dark:border-amber-500/40 space-y-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                      <Crown className="w-5 h-5 fill-slate-950" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                        7-Day Free Trial Expired
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Upgrade required to log in & sync to cloud
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    All users are allowed to log in and sync their data to the cloud during the first 7 free trial days. Because your 7-day trial has completed, only subscribed users can log in to sync data to the cloud.
                  </p>

                  <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-800 text-[11px] text-amber-950 dark:text-amber-200 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Please upgrade to Brivu Pro in order to log in and sync your data to the cloud.</span>
                  </div>

                  {/* Direct Upgrade Button */}
                  <button
                    id="btn-modal-upgrade-page"
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigate) {
                        onNavigate('upgrade');
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Crown className="w-4 h-4 fill-slate-950" />
                    <span>Upgrade to Pro (Go to Upgrade Page)</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* SECURE CLOUD ACCOUNT CARD WITH QR CODE & DATA LOSS PREVENTION */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-3">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-black">Secure Cloud Account</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                    <QrCode className="w-3 h-3" />
                    <span>Receipts & QR Codes</span>
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Sign in with your Google Account to automatically sync and safeguard your digital receipts, invoices, customers, inventory, and hosted QR code menus in your Cloudflare storage.
                </p>

                {/* Highlight: QR Code & Receipt Cloud Protection */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>QR Codes & Digital Receipts Safe</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Cloud Synced
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 font-medium">
                      Your published QR code menus, customer links, and business receipts are backed up under your email.
                    </p>
                  </div>
                </div>

                {/* Warning: Avoid losing data when you uninstall the app */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-black block text-amber-950 dark:text-amber-100 mb-0.5">
                      Avoid losing your data when uninstalling the app:
                    </strong>
                    When you uninstall the app or switch devices, any data saved only to local storage will be erased by the device. Signing into your account saves all your receipts, invoices, products, and QR codes safely to the cloud. Whenever you reinstall the app or log in again using your email, all your records are restored instantly!
                  </div>
                </div>
              </div>

              {/* Main Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignInDirectly}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm border-2 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-60 ${
                  isTrialExpiredAndNotSubscribed
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300 dark:border-slate-700'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {isSubmitting
                    ? 'Connecting...'
                    : statusMsg?.type === 'error'
                    ? 'Retry Google Sign-In'
                    : isTrialExpiredAndNotSubscribed
                    ? 'Sign in with Google (Upgrade Required)'
                    : 'Sign in with Google'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
