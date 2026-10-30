import React, { useState, useEffect, useRef } from 'react';
import {
  Menu as MenuIcon,
  X,
  Receipt as ReceiptIcon,
  Store,
  LayoutTemplate,
  Settings as SettingsIcon,
  Home,
  ChevronRight,
  Bell,
  Star,
  Share2,
  Check,
  Globe,
  Crown,
  Sparkles,
  Lock,
  KeyRound,
  ShieldCheck,
  Gem,
  Cloud,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { ActiveScreen, BusinessProfile, AppLockConfig, WorkOSUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { NotificationModal } from './NotificationModal';
import { RateUsModal } from './RateUsModal';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { WorkOSGoogleAuthModal } from './WorkOSGoogleAuthModal';
import { WorkOSAuthService } from '../services/workosAuthService';
import { getLanguageByCode } from '../data/languages';
import { t } from '../utils/i18n';
import { StorageService } from '../services/storage';
import { PushNotificationService } from '../services/pushNotificationService';

interface HeaderProps {
  business: BusinessProfile;
  darkMode: boolean;
  isOnline: boolean;
  currentScreen?: ActiveScreen;
  receiptsCount?: number;
  activeTemplate?: string;
  onToggleDarkMode: () => void;
  onNavigateHome: () => void;
  onNavigate: (screen: ActiveScreen) => void;
  onUpdateBusiness?: (business: BusinessProfile) => void;
  onLockApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  darkMode,
  isOnline,
  currentScreen = 'home',
  receiptsCount = 0,
  activeTemplate = 'modern',
  onToggleDarkMode,
  onNavigateHome,
  onNavigate,
  onUpdateBusiness,
  onLockApp,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isRateUsOpen, setIsRateUsOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isWorkosModalOpen, setIsWorkosModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [workosUser, setWorkosUser] = useState<WorkOSUser | null>(() =>
    WorkOSAuthService.getCurrentUser()
  );
  const [lockConfig, setLockConfig] = useState<AppLockConfig | null>(() =>
    StorageService.getAppLockConfig()
  );

  const handleStartGoogleSignIn = async () => {
    const trial = StorageService.getTrialStatus();
    if (trial.isExpired && !trial.subscribed) {
      setIsWorkosModalOpen(true);
      return;
    }
    setIsSigningIn(true);
    try {
      const res = await WorkOSAuthService.signInWithGoogle();
      if (!res.success && res.message) {
        setToastMsg(res.message);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch {
      // Handled
    } finally {
      setTimeout(() => setIsSigningIn(false), 2500);
    }
  };

  // Process OAuth redirect callback if returning from Google / WorkOS
  useEffect(() => {
    WorkOSAuthService.handleCallbackIfPresent().then((usr) => {
      if (usr) {
        setIsSigningIn(false);
        setWorkosUser(usr);
        setIsWorkosModalOpen(false);
        setToastMsg(`Welcome, ${usr.name || usr.email}! Signed in successfully.`);
        setTimeout(() => setToastMsg(null), 3500);
      }
    });

    const handleUserUpdate = (e: any) => {
      setIsSigningIn(false);
      if (e.detail) {
        setWorkosUser(e.detail);
        setIsWorkosModalOpen(false);
        setToastMsg(`Welcome, ${e.detail.name || e.detail.email}! Signed in successfully.`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setWorkosUser(null);
        setIsWorkosModalOpen(false);
        setToastMsg('Signed out successfully.');
        setTimeout(() => setToastMsg(null), 3000);
      }
    };
    window.addEventListener('workos_user_updated', handleUserUpdate);
    return () => window.removeEventListener('workos_user_updated', handleUserUpdate);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      setLockConfig(StorageService.getAppLockConfig());
    }
  }, [isMenuOpen]);
  const currentSubscription = StorageService.getSubscription();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentLang = getLanguageByCode(business.language || 'en');
  const [unreadCount, setUnreadCount] = useState(() => {
    return PushNotificationService.getLocalAlerts().filter((a) => !a.isRead).length;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleShareApp = async () => {
    setIsMenuOpen(false);
    const shareData = {
      title: 'Brivu - Digital Receipt & Business Manager',
      text: 'Try Brivu - fast digital receipts, invoices, stock tracking, and QR menu hosting for your business!',
      url: window.location.origin,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        setToastMsg('App shared successfully!');
        setTimeout(() => setToastMsg(null), 3000);
      } catch {
        // User cancelled share
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setToastMsg('App link copied to clipboard!');
        setTimeout(() => setToastMsg(null), 3000);
      } catch {
        setToastMsg(`App link: ${shareData.url}`);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } else {
      setToastMsg(`App link: ${shareData.url}`);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Keep unread count fresh & subscribe to live updates
  useEffect(() => {
    const updateCount = () => {
      const alerts = PushNotificationService.getLocalAlerts();
      setUnreadCount(alerts.filter((a) => !a.isRead).length);
    };

    updateCount();

    const unsub = PushNotificationService.subscribeToNotifications((updatedAlerts) => {
      setUnreadCount(updatedAlerts.filter((a) => !a.isRead).length);
    });

    return () => unsub();
  }, [isNotificationOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuSelect = (screen: ActiveScreen) => {
    setIsMenuOpen(false);
    onNavigate(screen);
  };

  const lang = business.language;

  const menuSections = [
    {
      id: 'profile' as ActiveScreen,
      title: t('business_profile', lang),
      shortTitle: t('business_profile', lang),
      subtitle: t('business_profile_sub', lang),
      icon: Store,
      iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
      activeBorder: 'border-emerald-500/40 dark:border-emerald-500/40',
    },
    {
      id: 'templates' as ActiveScreen,
      title: t('receipt_templates', lang),
      shortTitle: t('receipt_templates', lang),
      subtitle: t('receipt_templates_sub', lang),
      icon: LayoutTemplate,
      iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
      activeBorder: 'border-purple-500/40 dark:border-purple-500/40',
    },
    {
      id: 'settings' as ActiveScreen,
      title: t('settings', lang),
      shortTitle: t('settings', lang),
      subtitle: t('sections_and_management', lang),
      icon: SettingsIcon,
      iconBg: 'bg-amber-600 text-white shadow-amber-500/20',
      activeBorder: 'border-amber-500/40 dark:border-amber-500/40',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 py-2.5">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Business Identity on the Left */}
          <button
            id="btn-header-home"
            onClick={onNavigateHome}
            className="flex items-center gap-3 text-left focus:outline-hidden group min-w-0"
          >
            {/* Business Logo or High-End Receipt Monogram */}
            <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden bg-slate-900 dark:bg-slate-800 text-emerald-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              {business.logo ? (
                <img
                  src={business.logo}
                  alt="Business Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ReceiptIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400 stroke-[2.2]" />
              )}
            </div>

            {/* Typography with clean visual hierarchy */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[240px]">
                  {business.name || 'Brivu'}
                </span>
                {currentSubscription && currentSubscription.status === 'active' && (
                  <span
                    id="header-pro-badge"
                    title={`Brivu Pro Account (${currentSubscription.planName})`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-xs shrink-0 ring-1 ring-amber-400/50"
                  >
                    <Gem className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                    <span>PRO</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[150px] xs:max-w-[200px]">
                <span>Business Manager</span>
              </div>
            </div>
          </button>

          {/* Right Action Tools: PWA, Google Sign-In, Upgrade, Notifications, & 3-line Hamburger Menu Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />

            {/* Google Sign-In / Account Button in Header Bar */}
            <button
              id="btn-header-google-auth"
              type="button"
              onClick={() => {
                if (workosUser) {
                  setIsWorkosModalOpen(true);
                } else {
                  handleStartGoogleSignIn();
                }
              }}
              disabled={isSigningIn}
              className={`px-2.5 h-8.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs border active:scale-95 text-xs font-bold cursor-pointer ${
                workosUser
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              aria-label={workosUser ? 'Account & Cloud Sync' : 'Sign In with Google'}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span className="hidden xs:inline sm:inline text-[11px]">
                {workosUser
                  ? 'Account'
                  : isSigningIn
                  ? 'Connecting...'
                  : 'Sign In'}
              </span>
            </button>

            {/* Quick Upgrade Button in Header Bar */}
            <button
              id="btn-header-upgrade"
              type="button"
              onClick={() => onNavigate('upgrade')}
              className={`px-2.5 h-8.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs border active:scale-95 text-xs font-black cursor-pointer ${
                currentSubscription && currentSubscription.status === 'active'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/50 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-amber-400/40 shadow-amber-500/20'
              }`}
              aria-label="Upgrade to Pro"
            >
              <Crown className="w-3.5 h-3.5 fill-white text-white shrink-0" />
              <span className="hidden xs:inline sm:inline">
                {currentSubscription && currentSubscription.status === 'active' ? 'PRO' : 'Upgrade'}
              </span>
            </button>

            {/* Notifications Button with numeric badge */}
            <button
              id="btn-header-notifications"
              onClick={() => setIsNotificationOpen(true)}
              className="px-2.5 h-8.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs border active:scale-95 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 relative"
              aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4 stroke-[2.5]" />
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white leading-none shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* 3-line Hamburger Menu Button */}
            <button
              id="btn-top-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="Open menu"
              className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all shadow-xs border active:scale-95 relative ${
                isMenuOpen
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isMenuOpen ? (
                <X className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <MenuIcon className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TOP MENU SECTION DROPDOWN / OVERLAY (When Menu is clicked) */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[53px] z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn">
          <div
            ref={menuRef}
            className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl rounded-b-3xl overflow-hidden max-h-[85vh] flex flex-col animate-slideDown"
          >
            {/* Menu Header */}
            <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Apps Menu
                </span>
                {currentSubscription && currentSubscription.status === 'active' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white leading-none shadow-xs">
                    <Gem className="w-2.5 h-2.5 fill-white text-white" />
                    <span>PRO ACTIVE</span>
                  </span>
                )}
              </div>
              <button
                id="btn-menu-close"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Sections List */}
            <div className="p-4 space-y-3 overflow-y-auto">
              {/* TOP OF APPS MENU: GOOGLE SIGN IN CARD (WORKOS AUTHKIT) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 relative z-10">
                  {workosUser ? (
                    <button
                      id="btn-menu-account"
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsWorkosModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between text-left cursor-pointer group py-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                          <UserIcon className="w-5 h-5 text-indigo-300" />
                        </div>
                        <span className="text-sm font-extrabold text-white tracking-wide">
                          Account
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-300">
                        <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-0.5 transition" />
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm p-1.5">
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
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white flex items-center gap-1">
                            <span>Sign in with Google</span>
                          </div>
                          <p className="text-[10px] text-indigo-200/90 font-medium truncate">
                            protect receipts, QR codes & avoid losing data
                          </p>
                        </div>
                      </div>

                      <button
                        id="btn-google-sign-in-top-menu"
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleStartGoogleSignIn();
                        }}
                        disabled={isSigningIn}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
                        <LogIn className="w-3.5 h-3.5 text-slate-700" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TOP OF APPS MENU: UPGRADE CARD */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-black dark:via-indigo-950 dark:to-slate-950 border border-amber-500/30 text-white shadow-xl relative overflow-hidden">
                {/* Visual Ambient Glows */}
                <div className="absolute -right-4 -top-4 w-28 h-28 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-lg pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                      <Crown className="w-5 h-5 fill-slate-950" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-white tracking-tight">
                          {currentSubscription && currentSubscription.status === 'active' ? 'Brivu Pro Member' : 'Upgrade to Pro'}
                        </span>
                        {(!currentSubscription || currentSubscription.status !== 'active') && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 leading-none">
                            Save 26%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-indigo-200/90 font-medium truncate mt-0.5">
                        {currentSubscription && currentSubscription.status === 'active'
                          ? `Active Tier: ${currentSubscription.planName}`
                          : '1 Mo $3.6 • 6 Mos $19.2 • 1 Yr $31.9'}
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-menu-upgrade"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('upgrade');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{currentSubscription && currentSubscription.status === 'active' ? 'Manage' : 'Upgrade'}</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 pt-1">
                {t('sections_and_management', lang)}
              </div>

              {menuSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = currentScreen === sec.id;
                return (
                  <button
                    key={sec.id}
                    id={`menu-item-${sec.id}`}
                    onClick={() => handleMenuSelect(sec.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3.5 group active:scale-[0.99] ${
                      isSelected
                        ? `bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-xs ${sec.activeBorder}`
                        : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ${sec.iconBg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {sec.title}
                      </span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}

              {/* APPS MENU: PIN / APP LOCK SECTION */}
              <div className="pt-1">
                {lockConfig && lockConfig.isEnabled ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 p-2.5 space-y-2">
                    <button
                      id="btn-menu-lock-app"
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onNavigate('app-lock-setup');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        <Lock className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            App PIN Security
                          </span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
                            PIN Active
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Manage passcode, secret & settings
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
                      <button
                        id="btn-menu-manage-lock"
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onNavigate('app-lock-setup');
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Manage PIN</span>
                      </button>

                      <button
                        id="btn-menu-quick-lock-now"
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          StorageService.setAppLocked(true);
                          if (onLockApp) {
                            onLockApp();
                          }
                        }}
                        className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Lock Now</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-menu-lock-app"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('app-lock-setup');
                    }}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex items-center gap-3.5 group active:scale-[0.99] cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Lock className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Create App Lock
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300">
                          Setup
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Set digit passcode & secret recovery word
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                )}
              </div>

              {/* Community & App Feedback & Language Options */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2">
                  Language & Support
                </div>

                {/* Language Selector Card */}
                <button
                  id="btn-menu-language"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsLanguageModalOpen(true);
                  }}
                  className="w-full mb-2.5 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all flex items-center justify-between group text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <Globe className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <span>Language</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                          {currentLang.flag} {currentLang.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        Select local language (177+ Countries & Languages)
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Rate Us Button */}
                  <button
                    id="btn-menu-rate-us"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsRateUsOpen(true);
                    }}
                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all flex items-center gap-3 group text-left active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <Star className="w-4.5 h-4.5 fill-white/20" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Rate Us
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        5-Star Feedback
                      </div>
                    </div>
                  </button>

                  {/* Share App Button */}
                  <button
                    id="btn-menu-share-app"
                    onClick={handleShareApp}
                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:border-sky-300 dark:hover:border-sky-700/60 transition-all flex items-center gap-3 group text-left active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <Share2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        Share App
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        Send to friends
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <button
                id="btn-menu-home"
                onClick={() => handleMenuSelect('home')}
                className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Center & Push Setup Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onAlertCountChange={(cnt) => setUnreadCount(cnt)}
      />

      {/* Rate Us Modal */}
      <RateUsModal
        isOpen={isRateUsOpen}
        onClose={() => setIsRateUsOpen(false)}
      />

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        currentLanguageCode={business.language || 'en'}
        onSelectLanguage={(lang) => {
          const updatedProfile: BusinessProfile = {
            ...business,
            language: lang.name,
          };
          StorageService.saveProfile(updatedProfile);
          if (onUpdateBusiness) {
            onUpdateBusiness(updatedProfile);
          }
          setToastMsg(`Language set to ${lang.name} (${lang.flag})`);
          setTimeout(() => setToastMsg(null), 3000);
        }}
        onClose={() => setIsLanguageModalOpen(false)}
      />

      {/* WorkOS Google Auth Modal */}
      <WorkOSGoogleAuthModal
        isOpen={isWorkosModalOpen}
        onClose={() => setIsWorkosModalOpen(false)}
        onUserChange={(usr) => {
          setWorkosUser(usr);
          if (!usr) {
            setToastMsg('Signed out successfully.');
            setTimeout(() => setToastMsg(null), 3000);
          }
        }}
        onNavigate={onNavigate}
      />

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[999999] px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700/50 dark:border-slate-300/50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </header>
  );
};
