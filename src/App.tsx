import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TopNavSwitcher } from './components/TopNavSwitcher';
import { NewsScreen } from './components/NewsScreen';
import { HomeScreen } from './components/HomeScreen';
import { CreateReceiptScreen } from './components/CreateReceiptScreen';
import { CreateInvoiceScreen } from './components/CreateInvoiceScreen';
import { ReceiptPreviewScreen } from './components/ReceiptPreviewScreen';
import { ReceiptsHistoryScreen } from './components/ReceiptsHistoryScreen';
import { BusinessProfileScreen } from './components/BusinessProfileScreen';

import { TemplatesScreen } from './components/TemplatesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { QRCodeHostingScreen } from './components/QRCodeHostingScreen';
import { QRCustomerViewScreen } from './components/QRCustomerViewScreen';
import { ReceiptsInvoicesScreen } from './components/ReceiptsInvoicesScreen';
import { UpgradeScreen } from './components/UpgradeScreen';
import { AppLockScreen } from './components/AppLockScreen';
import { AppLockSetupScreen } from './components/AppLockSetupScreen';
import { CloudBackupScreen } from './components/CloudBackupScreen';
import { DownloadSuccessModal } from './components/DownloadSuccessModal';
import { GoogleAuthPopupPage } from './components/GoogleAuthPopupPage';
import { AdMobModalOverlay } from './components/AdMobModalOverlay';
import { AdMobService, ADMOB_UNITS } from './services/admobService';
import { StorageService } from './services/storage';
import { CloudflareService } from './services/cloudflareService';
import { QRHostingService } from './services/qrHostingService';
import { PdfGenerator } from './services/pdfGenerator';
import { PushNotificationService } from './services/pushNotificationService';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { WorkOSAuthService } from './services/workosAuthService';
import { AlertCircle, Ticket, Sparkles, Loader2 } from 'lucide-react';
import {
  ActiveScreen,
  AppSettings,
  BusinessProfile,
  Receipt,
  ReceiptTemplateId,
  InventoryTab,
  QRCodeHostedPage,
  AppLockConfig,
} from './types';

export function getQrPageIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check query parameters
  const params = new URLSearchParams(window.location.search);
  const fromQuery =
    params.get('qr') ||
    params.get('event') ||
    params.get('eventId') ||
    (params.get('events') ? 'events-hub-all' : null) ||
    params.get('website') ||
    params.get('websiteId') ||
    (params.get('websites') ? 'websites-hub-all' : null) ||
    params.get('social') ||
    params.get('socialId') ||
    (params.get('socials') ? 'socials-hub-all' : null);
  if (fromQuery) return fromQuery;

  if (params.get('tab') === 'websites' || params.get('tab') === 'website') {
    return 'websites-hub-all';
  }

  if (params.get('tab') === 'socials' || params.get('tab') === 'social') {
    return 'socials-hub-all';
  }

  if (params.get('tab') === 'events' || params.get('tab') === 'event') {
    return 'events-hub-all';
  }

  // 2. Check pathname: /qr/:pageId
  const pathname = window.location.pathname || '';
  if (pathname.includes('/qr/')) {
    const afterQr = pathname.split('/qr/')[1];
    if (afterQr) {
      const pageId = afterQr.split('/')[0].split('?')[0].split('#')[0].trim();
      if (pageId) return decodeURIComponent(pageId);
    }
  }

  // 3. Check for owner email parameter
  if (params.get('email') || params.get('u') || params.get('user')) {
    return 'latest';
  }

  return null;
}

export function isCustomerPathFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (
    params.get('qr') ||
    params.get('email') ||
    params.get('u') ||
    params.get('user') ||
    params.get('photoId') ||
    params.get('photo') ||
    params.get('itemId') ||
    params.get('item') ||
    params.get('tab') ||
    params.get('event') ||
    params.get('eventId') ||
    params.get('events') ||
    params.get('website') ||
    params.get('websiteId') ||
    params.get('websites') ||
    params.get('social') ||
    params.get('socialId') ||
    params.get('socials')
  ) {
    return true;
  }
  const pathname = window.location.pathname || '';
  return Boolean(pathname.includes('/qr/') || pathname === '/qr' || pathname.startsWith('/qr/'));
}

export function hasCustomerQrItems(p: any): boolean {
  if (!p) return false;
  if (Array.isArray(p.websitesQrItems) && p.websitesQrItems.length > 0) return true;
  if (Array.isArray(p.socialsQrItems) && p.socialsQrItems.length > 0) return true;
  if (Array.isArray(p.eventsQrItems) && p.eventsQrItems.length > 0) return true;
  if (Array.isArray(p.menuItems) && p.menuItems.length > 0) return true;
  if (Array.isArray(p.photos) && p.photos.length > 0) return true;
  return false;
}

export function App() {
  const [lockConfig, setLockConfig] = useState<AppLockConfig | null>(() =>
    StorageService.getAppLockConfig()
  );
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    if (isCustomerPathFromUrl()) {
      return false;
    }
    return StorageService.isAppLocked();
  });

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    if (isCustomerPathFromUrl()) {
      return 'qr-customer-view';
    }
    return 'news';
  });
  const [previousScreen, setPreviousScreen] = useState<ActiveScreen>('news');
  const [appLockInitialMode, setAppLockInitialMode] = useState<'view' | 'form'>('view');
  const [inventoryInitialTab, setInventoryInitialTab] = useState<InventoryTab>('stock');
  const [inventoryShowAddInline, setInventoryShowAddInline] = useState<boolean>(false);
  const [inventoryCategory, setInventoryCategory] = useState<'products' | 'money' | 'people' | null>(null);

  const [isCustomerDataResolving, setIsCustomerDataResolving] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname || '';
    return Boolean(
      isCustomerPathFromUrl() ||
      params.get('qr') ||
      params.get('page') ||
      params.get('email') ||
      params.get('tab') ||
      params.get('events') ||
      params.get('event') ||
      params.get('itemId') ||
      params.get('item') ||
      params.get('photoId') ||
      params.get('photo') ||
      pathname.includes('/qr/')
    );
  });

  const [activeCustomerPage, setActiveCustomerPage] = useState<QRCodeHostedPage | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname || '';
      const hasQrLink = Boolean(
        isCustomerPathFromUrl() ||
        params.get('qr') ||
        params.get('page') ||
        params.get('email') ||
        params.get('tab') ||
        params.get('events') ||
        params.get('event') ||
        pathname.includes('/qr/')
      );
      if (hasQrLink) {
        return null;
      }
      const emailParam = params.get('email')?.toLowerCase().trim();
      const initialPage = (window as any).__INITIAL_QR_PAGE__;
      if (initialPage && initialPage.id) {
        if (emailParam && !initialPage.userEmail) {
          initialPage.userEmail = emailParam;
        }
        return initialPage;
      }

      const qrPageId = getQrPageIdFromUrl();
      if (qrPageId) {
        const found = StorageService.getHostedQRPage(qrPageId);
        if (found) {
          const foundEmail = (found.userEmail || found.email || '').toLowerCase().trim();
          if (!emailParam || foundEmail === emailParam) {
            return found;
          }
        }
      }
      if (
        params.get('tab') === 'socials' ||
        params.get('tab') === 'social' ||
        params.get('socials') ||
        params.get('social') ||
        pathname.includes('/qr/socials') ||
        pathname.includes('/qr/socials-hub') ||
        qrPageId?.startsWith('socials-hub') ||
        qrPageId === 'socials' ||
        qrPageId === 'socials-hub-all'
      ) {
        const socials = StorageService.getSocialsQrItems();
        const business = StorageService.getProfile();
        return QRHostingService.convertSocialsHubToHostedPage(socials, business);
      }
      if (
        params.get('tab') === 'websites' ||
        params.get('tab') === 'website' ||
        params.get('websites') ||
        params.get('website') ||
        pathname.includes('/qr/websites') ||
        pathname.includes('/qr/websites-hub') ||
        qrPageId?.startsWith('websites-hub') ||
        qrPageId === 'websites' ||
        qrPageId === 'websites-hub-all'
      ) {
        const websites = StorageService.getWebsitesQrItems();
        const business = StorageService.getProfile();
        return QRHostingService.convertWebsitesHubToHostedPage(websites, business);
      }
      if (
        params.get('tab') === 'events' ||
        params.get('tab') === 'event' ||
        params.get('events') ||
        params.get('event') ||
        pathname.includes('/qr/events') ||
        pathname.includes('/qr/event-') ||
        qrPageId?.startsWith('event') ||
        qrPageId?.includes('events')
      ) {
        const events = StorageService.getEventsQrItems();
        const business = StorageService.getProfile();
        if (qrPageId?.startsWith('event-') && !qrPageId?.startsWith('events-hub')) {
          const singleEvt = events.find(e => e.id === qrPageId);
          if (singleEvt) return QRHostingService.convertEventToHostedPage(singleEvt, business);
        }
        return QRHostingService.convertEventsHubToHostedPage(events, business);
      }

      if (emailParam) {
        const pages = StorageService.getHostedQRPages();
        const userPage = pages.find((p) => (p.userEmail || p.email || '').toLowerCase().trim() === emailParam);
        if (userPage) return userPage;
        const prefix = emailParam.split('@')[0] || 'My Business';
        return {
          id: qrPageId || 'default',
          title: prefix.charAt(0).toUpperCase() + prefix.slice(1),
          pageType: 'business_showcase',
          menuItems: [],
          menuCategories: [],
          photos: [],
          email: emailParam,
          userEmail: emailParam,
          currency: 'UGX',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as QRCodeHostedPage;
      }
    }
    const pages = StorageService.getHostedQRPages();
    return pages[0] || ({
      id: 'default',
      title: 'Brivu Business',
      pageType: 'business_showcase',
      menuItems: [],
      menuCategories: [],
      photos: [],
      currency: 'UGX',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as QRCodeHostedPage);
  });
  const [customerInitialTab, setCustomerInitialTab] = useState<'menu' | 'photos' | 'about'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('photo') || params.get('photoId')) return 'photos';
      if (params.get('item') || params.get('itemId')) return 'menu';
      const tabParam = params.get('tab');
      if (tabParam === 'photos' || tabParam === 'gallery') return 'photos';
      if (tabParam === 'about' || tabParam === 'info') return 'about';
      if (tabParam === 'menu' || tabParam === 'items') return 'menu';
    }
    return 'menu';
  });
  const [customerInitialItemId, setCustomerInitialItemId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('item') || params.get('itemId') || undefined;
    }
    return undefined;
  });
  const [customerInitialPhotoId, setCustomerInitialPhotoId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('photo') || params.get('photoId') || undefined;
    }
    return undefined;
  });
  const [isCustomerViewMode, setIsCustomerViewMode] = useState<boolean>(() => {
    return isCustomerPathFromUrl();
  });

  const [business, setBusiness] = useState<BusinessProfile>(() => StorageService.getProfile());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [receipts, setReceipts] = useState<Receipt[]>(() => StorageService.getReceipts());
  const [stats, setStats] = useState(() => StorageService.getStats());
  const [inventoryCount, setInventoryCount] = useState<number>(() => StorageService.getInventoryProducts().length);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Current receipt or invoice for preview or editing
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<Receipt | null>(null);

  // Dedicated News Footer Navigation state
  const [newsFooterTab, setNewsFooterTab] = useState<'feed' | 'favorites' | 'history'>('feed');
  const [newsFavoritesCount, setNewsFavoritesCount] = useState<number>(0);
  const [newsHistoryCount, setNewsHistoryCount] = useState<number>(0);
  const [appDownloadModal, setAppDownloadModal] = useState<{
    isOpen: boolean;
    fileName?: string;
    folderName?: string;
    documentType?: 'receipt' | 'invoice';
    documentNumber?: string;
  }>({ isOpen: false });

  // Check URL params for QR Code scanning (e.g. ?qr=page-id&tab=events...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qrPageId = getQrPageIdFromUrl();
      const photoIdParam = params.get('photo') || params.get('photoId');
      const itemIdParam = params.get('item') || params.get('itemId');
      const tabParam = params.get('tab');

      const hasCustomerParam = Boolean(qrPageId || photoIdParam || itemIdParam || tabParam || isCustomerPathFromUrl());

      if (hasCustomerParam) {
        if (photoIdParam) {
          setCustomerInitialPhotoId(photoIdParam);
          setCustomerInitialTab('photos');
        } else if (itemIdParam) {
          setCustomerInitialItemId(itemIdParam);
          setCustomerInitialTab('menu');
        } else if (tabParam === 'photos' || tabParam === 'gallery') {
          setCustomerInitialTab('photos');
        } else if (tabParam === 'about' || tabParam === 'info') {
          setCustomerInitialTab('about');
        } else {
          setCustomerInitialTab('menu');
        }

        let found: QRCodeHostedPage | undefined;
        if (qrPageId) {
          found = StorageService.getHostedQRPage(qrPageId);
        }

        setIsCustomerDataResolving(true);
        setIsCustomerViewMode(true);
        setActiveScreen('qr-customer-view');

        const emailFromUrl = (params.get('email') || params.get('u') || params.get('user') || '').toLowerCase().trim();
        const fetchId = qrPageId || 'default';
        const normFetchId = fetchId.toLowerCase();
        const isWebsites = normFetchId.includes('website') || normFetchId.includes('web-hub');
        const isSocials = !isWebsites && normFetchId.includes('social');
        const isEvents = !isWebsites && !isSocials && normFetchId.includes('event');
        const isBiz = !isWebsites && !isSocials && !isEvents;

        const hasItems = (p: any) => {
          if (!p) return false;
          if (Array.isArray(p.websitesQrItems) && p.websitesQrItems.length > 0) return true;
          if (Array.isArray(p.socialsQrItems) && p.socialsQrItems.length > 0) return true;
          if (Array.isArray(p.eventsQrItems) && p.eventsQrItems.length > 0) return true;
          if (Array.isArray(p.menuItems) && p.menuItems.length > 0) return true;
          if (Array.isArray(p.photos) && p.photos.length > 0) return true;
          return false;
        };

        if (fetchId || emailFromUrl) {
          setIsCustomerDataResolving(true);
          setIsCustomerViewMode(true);
          setActiveScreen('qr-customer-view');

          CloudflareService.getHostedQrPage(fetchId, emailFromUrl).then(async (remotePage) => {
            if (remotePage && hasCustomerQrItems(remotePage)) {
              setActiveCustomerPage(remotePage);
              setIsCustomerDataResolving(false);
              return;
            }

            // Fallback recovery: fetch the user's complete cloud backup from Cloudflare and populate the requested hub/page
            if (emailFromUrl) {
              try {
                const bData = await CloudflareService.fetchUserBackupData(emailFromUrl);
                if (bData) {
                  const profile = bData.profile || { name: 'Business', currency: 'UGX', phone: '', address: '' };
                  if (isWebsites) {
                    const websites = Array.isArray(bData.websitesQrItems) ? bData.websitesQrItems : [];
                    if (websites.length > 0) {
                      setActiveCustomerPage(QRHostingService.convertWebsitesHubToHostedPage(websites, profile));
                      setIsCustomerDataResolving(false);
                      return;
                    }
                  } else if (isSocials) {
                    const socials = Array.isArray(bData.socialsQrItems) ? bData.socialsQrItems : [];
                    if (socials.length > 0) {
                      setActiveCustomerPage(QRHostingService.convertSocialsHubToHostedPage(socials, profile));
                      setIsCustomerDataResolving(false);
                      return;
                    }
                  } else if (isEvents) {
                    const events = Array.isArray(bData.eventsQrItems) ? bData.eventsQrItems : [];
                    if (events.length > 0) {
                      if (normFetchId.includes('event') && !normFetchId.includes('events-hub') && normFetchId !== 'events') {
                        const rawTarget = fetchId.toLowerCase().replace(/^event-/, '').replace(/^qr-/, '');
                        const singleEvt = events.find((e: any) => {
                          const eId = String(e.id || '').toLowerCase();
                          const eRaw = eId.replace(/^event-/, '').replace(/^qr-/, '');
                          return eId === fetchId.toLowerCase() || eRaw === rawTarget || `event-${eId}` === fetchId.toLowerCase();
                        });
                        if (singleEvt) {
                          setActiveCustomerPage(QRHostingService.convertEventToHostedPage(singleEvt, profile));
                          setIsCustomerDataResolving(false);
                          return;
                        }
                      }
                      setActiveCustomerPage(QRHostingService.convertEventsHubToHostedPage(events, profile));
                      setIsCustomerDataResolving(false);
                      return;
                    }
                  } else if (isBiz) {
                    const bizPage = QRHostingService.convertBackupToHostedPage(bData);
                    if (bizPage) {
                      setActiveCustomerPage({ ...bizPage, id: fetchId });
                      setIsCustomerDataResolving(false);
                      return;
                    }
                  }
                }
              } catch (_) {}
            }

            if (remotePage) {
              setActiveCustomerPage(remotePage);
            } else if (found) {
              setActiveCustomerPage(found);
            }
            setIsCustomerDataResolving(false);
          }).catch(() => {
            if (found) {
              setActiveCustomerPage(found);
            }
            setIsCustomerDataResolving(false);
          });
        } else if (found) {
          setActiveCustomerPage(found);
          setIsCustomerDataResolving(false);
        }
      }
    }
  }, []);

  // Sync dark mode class on <html> and <body>
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Google AdMob SDK on app mount and request native advanced ads immediately on startup
  useEffect(() => {
    // Immediate startup request for Native Advanced ad
    AdMobService.preloadNativeAdvanced().catch(() => {});

    const timer = setTimeout(() => {
      AdMobService.initNativeAdMob()
        .then(() => {
          AdMobService.preloadNativeAdvanced().catch(() => {});
          AdMobService.preloadInterstitial().catch(() => {});
        })
        .catch(console.error);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // Setup global interaction tracking on mount
  useEffect(() => {
    // Track user clicks / taps to trigger an ad popup every 25 interactions
    const handleGlobalInteraction = () => {
      AdMobService.recordInteraction();
    };

    window.addEventListener('click', handleGlobalInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleGlobalInteraction);
    };
  }, []);

  // Free Trial (7 Days) and Grace Period (7 Days) lifecycle management
  useEffect(() => {
    const handleSubscriptionLifecycle = async () => {
      try {
        const status = StorageService.getTrialStatus();
        
        // 1. If subscribed, nothing to restrict or alert about
        if (status.subscribed) return;

        // 2. Handle Grace Period Expiry (wipe cloud completely)
        if (status.isGracePeriodExpired) {
          const alreadyWiped = localStorage.getItem('quickreceipt_cloud_wiped_v1') === 'true';
          if (!alreadyWiped) {
            console.warn('Grace Period Expired! Purging all Cloudflare database records and backups...');
            await StorageService.purgeAllCloudData();
            
            // Trigger a business alert notification in notification box only
            PushNotificationService.triggerBusinessAlert({
              title: '⚠️ Grace Period Expired: Files Deleted',
              body: 'Your 7-day grace period is over. All files have been safely wiped from Cloud but remain secure on your phone local storage!',
              type: 'debt_reminder',
            }).catch(() => {});
          }
          return;
        }

        // 3. Handle reminder triggers for active 7-day free trial or 7-day grace period
        const daysSinceInstall = status.daysSinceInstall;
        // Trigger reminder on days 0, 2, 4, 6, 7 (Trial) and days 8, 10, 12, 14 (Grace Period)
        const isReminderDay = [0, 2, 4, 6, 7, 8, 10, 12, 14].includes(daysSinceInstall);
        if (isReminderDay) {
          const lastAlertDay = localStorage.getItem('quickreceipt_last_alert_day_v1');
          if (lastAlertDay !== String(daysSinceInstall)) {
            // Mark alert shown for this day
            localStorage.setItem('quickreceipt_last_alert_day_v1', String(daysSinceInstall));

            if (status.isFreeTrial) {
              const remaining = status.remainingTrialDays;
              const title = 'Free Trial Remaining';
              const message = `Your Brivu 7-Day Free Trial is remaining with ${remaining} days! Subscribe to a paid plan to keep your automatic cloud backup and keep qr code and business info hosting working.`;

              // Send native local notification alert to notification box only
              PushNotificationService.triggerBusinessAlert({
                title: `🎁 ${title}: ${remaining} Days Left`,
                body: message,
                type: 'sale',
              }).catch(() => {});
            } else if (status.isGracePeriod) {
              const remaining = status.remainingGraceDays;
              const title = 'Grace Period Warning';
              const message = `You have ${remaining} remaining days for your grace period. If you don't subscribe, all your files will be deleted from the cloud, but they will stay perfectly safe in your local storage in the app.`;

              // Send native local notification alert to notification box only
              PushNotificationService.triggerBusinessAlert({
                title: `⚠️ ${title}: ${remaining} Days Left`,
                body: message,
                type: 'debt_reminder',
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Subscription lifecycle handler error:', err);
      }
    };

    // Delay checking slightly to ensure smooth main UI load
    const timer = setTimeout(() => {
      handleSubscriptionLifecycle();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle notification click navigation
  useEffect(() => {
    const handleAlertNavigate = (e: Event) => {
      try {
        const customEvent = e as CustomEvent<string>;
        const url = customEvent.detail;
        if (!url) return;

        if (url.includes('inventory')) {
          handleNavigate('inventory');
        } else if (url.includes('receipt') || url.includes('invoice')) {
          handleNavigate('receipts');
        } else if (url.includes('upgrade') || url.includes('pro')) {
          handleNavigate('upgrade');
        } else if (url.includes('setting')) {
          handleNavigate('settings');
        } else if (url.includes('qr')) {
          handleNavigate('qr-hosting');
        }
      } catch (err) {
        console.warn('[App] Error navigating from notification event:', err);
      }
    };

    window.addEventListener('brivu_navigate_alert', handleAlertNavigate);
    return () => {
      window.removeEventListener('brivu_navigate_alert', handleAlertNavigate);
    };
  }, []);

  // Reload data from storage
  const refreshData = useCallback(() => {
    setBusiness(StorageService.getProfile());
    setSettings(StorageService.getSettings());
    const all = StorageService.getReceipts();
    setReceipts(all);
    setStats(StorageService.getStats());
    setInventoryCount(StorageService.getInventoryProducts().length);
    setLockConfig(StorageService.getAppLockConfig());
  }, []);

  // App Lock Lifecycle: automatically enforce auto-lock on app launch, background/resume, reload, or visibility change
  useEffect(() => {
    let lastBackgroundTimestamp = 0;

    const handleAppGoingBackground = () => {
      lastBackgroundTimestamp = Date.now();
      const currentCfg = StorageService.getAppLockConfig();
      if (currentCfg?.isEnabled && currentCfg?.autoLockOnExit !== false) {
        StorageService.setAppLocked(true);
      }
    };

    const handleAppResuming = async () => {
      // 0. Instant resume check: if an OAuth session was completed in browser, log the user in immediately!
      try {
        const pendingSessionId = localStorage.getItem('workos_session_id') || sessionStorage.getItem('workos_session_id');
        if (pendingSessionId) {
          const check = await CloudflareService.checkAuthSessionStatus(pendingSessionId);
          if (check.status === 'completed' && check.user) {
            try {
              localStorage.removeItem('workos_session_id');
              sessionStorage.removeItem('workos_session_id');
            } catch (_) {}
            await WorkOSAuthService.saveAndSyncUser(check.user);
            refreshData();
            window.dispatchEvent(new CustomEvent('workos_user_updated', { detail: check.user }));
            try {
              await Browser.close();
            } catch (_) {}
          }
        }
      } catch (resumeAuthErr) {
        console.warn('OAuth resume check note:', resumeAuthErr);
      }

      const currentCfg = StorageService.getAppLockConfig();
      setLockConfig(currentCfg);

      // Check if the customer QR public view is active
      const isPublic = isCustomerPathFromUrl();

      if (isPublic) return;

      if (currentCfg?.isEnabled && currentCfg.pin && currentCfg.autoLockOnExit !== false) {
        // If returning from system dialog (e.g. file picker / share sheet), do not lock
        if (StorageService.consumeSystemActionActive()) {
          return;
        }

        // If the app was backgrounded for more than 300ms or resumed
        if (lastBackgroundTimestamp > 0 && Date.now() - lastBackgroundTimestamp > 300) {
          StorageService.setAppLocked(true);
          setIsAppLocked(true);
        }
      }
    };

    // 1. Web visibility change (works across browsers, PWAs, WebViews)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleAppGoingBackground();
      } else if (document.visibilityState === 'visible') {
        handleAppResuming();
      }
    };

    // 2. Native Capacitor App State Change
    let capListenerHandle: any = null;
    let urlOpenHandle: any = null;
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          handleAppGoingBackground();
        } else {
          handleAppResuming();
        }
      }).then((handle) => {
        capListenerHandle = handle;
      }).catch((err) => {
        console.warn('[AppLock] CapApp listener note:', err);
      });
    } catch (capErr) {
      console.warn('[AppLock] CapApp setup note:', capErr);
    }

    // 2b. Native Capacitor Deep Link listener for OAuth callback
    try {
      CapApp.addListener('appUrlOpen', async (data) => {
        if (data && data.url) {
          const urlStr = data.url;
          if (urlStr.includes('code=') || urlStr.includes('/callback') || urlStr.includes('auth_session=') || urlStr.includes('user=')) {
            try {
              // Close system browser / Custom Tab if open
              try {
                await Browser.close();
              } catch (_) {}

              const dummyUrl = new URL(urlStr.replace(/^[a-zA-Z0-9_.-]+:\/\//, 'https://dummy.host/'));
              
              // 1. If direct user JSON was passed in deep link, log in immediately
              const userRaw = dummyUrl.searchParams.get('user');
              if (userRaw) {
                try {
                  const parsedUser = JSON.parse(decodeURIComponent(userRaw));
                  if (parsedUser && (parsedUser.email || parsedUser.id)) {
                    await WorkOSAuthService.saveAndSyncUser(parsedUser);
                    refreshData();
                    window.dispatchEvent(new CustomEvent('workos_user_updated', { detail: parsedUser }));
                    return;
                  }
                } catch (_) {}
              }

              // 2. If auth_session is passed, resolve via session status
              const sId = dummyUrl.searchParams.get('auth_session') || localStorage.getItem('workos_session_id') || sessionStorage.getItem('workos_session_id');
              if (sId) {
                const check = await CloudflareService.checkAuthSessionStatus(sId);
                if (check.status === 'completed' && check.user) {
                  try {
                    localStorage.removeItem('workos_session_id');
                    sessionStorage.removeItem('workos_session_id');
                  } catch (_) {}
                  await WorkOSAuthService.saveAndSyncUser(check.user);
                  refreshData();
                  window.dispatchEvent(new CustomEvent('workos_user_updated', { detail: check.user }));
                  return;
                }
              }

              // 3. Fallback: authenticate code if not yet exchanged
              const code = dummyUrl.searchParams.get('code');
              if (code) {
                const res = await WorkOSAuthService.authenticateCode(code);
                if (res.success && res.user) {
                  refreshData();
                  window.dispatchEvent(new CustomEvent('workos_user_updated', { detail: res.user }));
                }
              }
            } catch (err) {
              console.warn('[OAuth] Deep link parsing error:', err);
            }
          }
        }
      }).then((handle) => {
        urlOpenHandle = handle;
      }).catch(() => {});
    } catch (_) {}

    const handleUserUpdatedSync = () => {
      refreshData();
    };
    window.addEventListener('workos_user_updated', handleUserUpdatedSync);
    window.addEventListener('brivu_data_refreshed', handleUserUpdatedSync);
    window.addEventListener('storage', handleUserUpdatedSync);

    // 2a. Global OAuth popup message listener
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        try {
          const { code, user } = event.data;
          if (user) {
            await WorkOSAuthService.saveAndSyncUser(user);
            refreshData();
          } else if (code) {
            const res = await WorkOSAuthService.authenticateCode(code);
            if (res.success) {
              refreshData();
            }
          }
        } catch (err) {
          console.warn('[OAuth] Popup message handling error:', err);
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);

    // 2b. Process web OAuth callback code or session if returning from Google / WorkOS
    if (typeof window !== 'undefined' && (window.location.search.includes('code=') || window.location.search.includes('auth_session='))) {
      WorkOSAuthService.handleCallbackIfPresent().then((usr) => {
        if (usr) {
          refreshData();
        }
      });
    }

    // 3. Pagehide / beforeunload listeners (clean web unload)
    const handlePageHide = () => {
      handleAppGoingBackground();
    };

    // 4. File input click interceptor to prevent file picking from triggering app lock on return
    const handleFileInputClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'file' ||
         target.closest('input[type="file"]') ||
         target.getAttribute('type') === 'file')
      ) {
        StorageService.markSystemActionActive(60000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('click', handleFileInputClick, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('click', handleFileInputClick, true);
      window.removeEventListener('message', handleOAuthMessage);
      window.removeEventListener('workos_user_updated', handleUserUpdatedSync);
      window.removeEventListener('brivu_data_refreshed', handleUserUpdatedSync);
      window.removeEventListener('storage', handleUserUpdatedSync);
      if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
        capListenerHandle.remove();
      }
    };
  }, []);

  // Hardware Back Button handling on Android / Capacitor devices
  useEffect(() => {
    let backListenerHandle: any = null;
    try {
      CapApp.addListener('backButton', () => {
        if (activeScreen === 'news') {
          CapApp.exitApp();
        } else if (activeScreen === 'home') {
          handleNavigate('news');
        } else if (
          [
            'create-receipt',
            'create-invoice',
            'preview-receipt',
            'templates',
            'settings',
            'profile',
            'inventory',
            'qr-hosting',
            'upgrade',
            'app-lock-setup',
            'cloud-backup',
            'receipts-invoices',
          ].includes(activeScreen)
        ) {
          handleNavigate('home');
        } else if (previousScreen && previousScreen !== activeScreen) {
          handleNavigate(previousScreen);
        } else {
          handleNavigate('news');
        }
      }).then((handle) => {
        backListenerHandle = handle;
      }).catch((err) => {
        console.warn('[App] BackButton listener note:', err);
      });
    } catch (err) {
      console.warn('[App] BackButton setup note:', err);
    }

    return () => {
      if (backListenerHandle && typeof backListenerHandle.remove === 'function') {
        backListenerHandle.remove();
      }
    };
  }, [activeScreen, previousScreen]);

  // Handler to navigate
  const handleNavigate = (screen: ActiveScreen) => {
    if (activeScreen !== screen && activeScreen !== 'upgrade') {
      setPreviousScreen(activeScreen);
    }
    if (screen !== 'preview-receipt') {
      setSelectedReceipt(null);
      setDuplicateSeed(null);
    }
    if (screen === 'inventory') {
      setInventoryInitialTab('stock');
      setInventoryShowAddInline(false);
      setInventoryCategory(null);
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToInventory = (tab: InventoryTab = 'stock', showAddInline: boolean = false) => {
    setInventoryInitialTab(tab);
    setInventoryShowAddInline(showAddInline);
    setSelectedReceipt(null);
    setDuplicateSeed(null);
    if (tab === 'expense' || tab === 'debts' || tab === 'report') {
      setInventoryCategory('money');
    } else if (tab === 'customers' || tab === 'agents' || tab === 'workers') {
      setInventoryCategory('people');
    } else if (tab === 'sales' || tab === 'shoppingList') {
      setInventoryCategory('products');
    } else {
      setInventoryCategory(null);
    }
    setActiveScreen('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler when user creates or updates a receipt or invoice
  const handleReceiptSaved = (savedReceipt: Receipt) => {
    refreshData();
    setSelectedReceipt(savedReceipt);
    setDuplicateSeed(null);
    setActiveScreen('preview-receipt');
    // Pop up AdMob Interstitial Ad immediately after save
    AdMobService.showInterstitial('receipt_or_invoice_saved');
  };

  // Handler to open an existing receipt/invoice in preview
  const handleOpenReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setActiveScreen('preview-receipt');
  };

  // Handler to edit a receipt or invoice
  const handleEditReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setDuplicateSeed(null);
    if (receipt.documentType === 'invoice') {
      setActiveScreen('create-invoice');
    } else {
      setActiveScreen('create-receipt');
    }
  };

  // Handler to duplicate a receipt or invoice
  const handleDuplicateReceipt = (receipt: Receipt) => {
    setDuplicateSeed(receipt);
    setSelectedReceipt(null);
    if (receipt.documentType === 'invoice') {
      setActiveScreen('create-invoice');
    } else {
      setActiveScreen('create-receipt');
    }
  };

  // Direct share from history or preview
  const handleShareReceipt = async (receipt: Receipt) => {
    try {
      await PdfGenerator.shareReceiptPdf(receipt);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  // Direct download from history
  const handleDownloadReceipt = async (receipt: Receipt) => {
    try {
      const res = await PdfGenerator.downloadPdf(receipt);
      setAppDownloadModal({
        isOpen: true,
        fileName: res.filename,
        folderName: res.folder || 'Documents/Brivu',
        documentType: receipt.documentType === 'invoice' ? 'invoice' : 'receipt',
        documentNumber: receipt.receiptNumber,
      });
      // Pop up AdMob Interstitial Ad immediately on download
      AdMobService.showInterstitial('receipt_downloaded');
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Delete receipt or invoice permanently from local & cloud
  const handleDeleteReceipt = async (id: string) => {
    // 1. Delete locally & immediately update UI state
    StorageService.deleteReceipt(id);
    refreshData();

    // 2. Await cloud wipe
    try {
      await StorageService.deleteReceiptAsync(id);
      refreshData();
    } catch (err) {
      console.warn('Cloud delete background note:', err);
    }
  };

  // Business profile updated
  const handleUpdateBusiness = (updated: BusinessProfile) => {
    StorageService.saveProfile(updated);
    setBusiness(updated);
    refreshData();
  };

  // Settings updated
  const handleUpdateSettings = (updated: AppSettings) => {
    StorageService.saveSettings(updated);
    setSettings(updated);
    refreshData();
  };

  // Template set as default
  const handleSetDefaultTemplate = (templateId: ReceiptTemplateId) => {
    const updated = { ...settings, defaultTemplate: templateId };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Dark mode toggle in Header
  const handleToggleDarkMode = () => {
    const updated = { ...settings, darkMode: !settings.darkMode };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  // Check if we are inside an OAuth popup window or dedicated callback route
  const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  const isOauthPopup = typeof window !== 'undefined' && !isNative && (
    (Boolean(window.opener) && (window.location.search.includes('code=') || window.location.search.includes('error='))) ||
    window.location.pathname.includes('/auth/callback') ||
    window.location.pathname.endsWith('/callback')
  );

  if (isOauthPopup) {
    return <GoogleAuthPopupPage />;
  }

  const isPublicCustomerView = isCustomerPathFromUrl();

  // If App PIN is active and app is locked, lock the WHOLE APP completely
  if (!isPublicCustomerView && isAppLocked && lockConfig && lockConfig.isEnabled) {
    return (
      <AppLockScreen
        business={business}
        lockConfig={lockConfig}
        onUnlock={() => {
          setIsAppLocked(false);
          StorageService.setAppLocked(false);
        }}
        onResetPinRequested={() => {
          setIsAppLocked(false);
          setAppLockInitialMode('form');
          setActiveScreen('app-lock-setup');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header - shown on all screens except Inventory and QR Customer View */}
      {activeScreen !== 'inventory' && activeScreen !== 'qr-customer-view' && (
        <Header
          business={business}
          darkMode={settings.darkMode}
          isOnline={isOnline}
          currentScreen={activeScreen}
          receiptsCount={receipts.length}
          activeTemplate={settings.defaultTemplate}
          onToggleDarkMode={handleToggleDarkMode}
          onNavigateHome={() => handleNavigate('news')}
          onNavigate={handleNavigate}
          onUpdateBusiness={handleUpdateBusiness}
          onLockApp={() => {
            setLockConfig(StorageService.getAppLockConfig());
            setIsAppLocked(true);
          }}
        />
      )}

      {/* Prominent Two-Option Tab Switcher: NEWS | HOME */}
      {(activeScreen === 'news' || activeScreen === 'home') && (
        <TopNavSwitcher
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Screen Content */}
      <main className={`flex-1 w-full ${activeScreen === 'inventory' || activeScreen === 'qr-customer-view' ? 'max-w-none p-0' : 'max-w-2xl mx-auto px-4 pt-2.5 sm:pt-4'}`}>
        {activeScreen === 'news' && (
          <NewsScreen
            business={business}
            activeFooterTab={newsFooterTab}
            onSelectFooterTab={setNewsFooterTab}
            onUpdateCounts={(favs, hist) => {
              setNewsFavoritesCount(favs);
              setNewsHistoryCount(hist);
            }}
          />
        )}

        {activeScreen === 'home' && (
          <HomeScreen
            business={business}
            stats={stats}
            activeTemplate={settings.defaultTemplate}
            onNavigate={handleNavigate}
            onNavigateToInventory={handleNavigateToInventory}
            onSelectReceipt={handleOpenReceipt}
            onShareReceipt={handleShareReceipt}
            onOpenCustomerView={(page) => {
              setActiveCustomerPage(page);
              setIsCustomerViewMode(false);
              setActiveScreen('qr-customer-view');
            }}
          />
        )}

        {activeScreen === 'receipts-invoices' && (
          <ReceiptsInvoicesScreen
            business={business}
            stats={stats}
            onNavigate={handleNavigate}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {activeScreen === 'create-receipt' && (
          <CreateReceiptScreen
            business={business}
            defaultTemplate={settings.defaultTemplate}
            defaultPaymentMethod={settings.defaultPaymentMethod}
            editingReceipt={selectedReceipt}
            duplicateFromReceipt={duplicateSeed}
            onCancel={() => handleNavigate('home')}
            onSaveOnly={() => {
              refreshData();
              setSelectedReceipt(null);
              setDuplicateSeed(null);
              setActiveScreen('receipts');
            }}
            onSaveAndPreview={handleReceiptSaved}
            onQuickDownload={async (rcpt) => {
              handleReceiptSaved(rcpt);
              try {
                const res = await PdfGenerator.downloadPdf(rcpt);
                setAppDownloadModal({
                  isOpen: true,
                  fileName: res.filename,
                  folderName: res.folder || 'Documents/Brivu',
                  documentType: 'receipt',
                  documentNumber: rcpt.receiptNumber,
                });
              } catch (err) {
                console.error('Download error:', err);
              }
            }}
            onQuickShare={async (rcpt) => {
              handleReceiptSaved(rcpt);
              await handleShareReceipt(rcpt);
            }}
          />
        )}

        {activeScreen === 'create-invoice' && (
          <CreateInvoiceScreen
            business={business}
            defaultTemplate={settings.defaultTemplate}
            defaultPaymentMethod={settings.defaultPaymentMethod}
            editingInvoice={selectedReceipt}
            duplicateFromInvoice={duplicateSeed}
            onCancel={() => handleNavigate('home')}
            onSaveOnly={() => {
              refreshData();
              setSelectedReceipt(null);
              setDuplicateSeed(null);
              setActiveScreen('invoices');
            }}
            onSaveAndPreview={handleReceiptSaved}
            onQuickDownload={async (inv) => {
              handleReceiptSaved(inv);
              try {
                const res = await PdfGenerator.downloadPdf(inv);
                setAppDownloadModal({
                  isOpen: true,
                  fileName: res.filename,
                  folderName: res.folder || 'Documents/Brivu',
                  documentType: 'invoice',
                  documentNumber: inv.receiptNumber,
                });
              } catch (err) {
                console.error('Download error:', err);
              }
            }}
            onQuickShare={async (inv) => {
              handleReceiptSaved(inv);
              await handleShareReceipt(inv);
            }}
          />
        )}

        {activeScreen === 'preview-receipt' && (
          selectedReceipt ? (
            <ReceiptPreviewScreen
              receipt={selectedReceipt}
              onBack={() =>
                handleNavigate(
                  selectedReceipt.documentType === 'invoice' ? 'invoices' : 'receipts'
                )
              }
              onEdit={handleEditReceipt}
              onDuplicate={handleDuplicateReceipt}
            />
          ) : (
            <ReceiptsHistoryScreen
              receipts={receipts}
              business={business}
              mode="receipts"
              onOpenReceipt={handleOpenReceipt}
              onEditReceipt={handleEditReceipt}
              onShareReceipt={handleShareReceipt}
              onDuplicateReceipt={handleDuplicateReceipt}
              onDownloadReceipt={handleDownloadReceipt}
              onDeleteReceipt={handleDeleteReceipt}
              onOpenTemplates={() => handleNavigate('templates')}
              onCreateNew={() => {
                setSelectedReceipt(null);
                setDuplicateSeed(null);
                setActiveScreen('create-receipt');
              }}
              onEditProfile={() => handleNavigate('profile')}
            />
          )
        )}

        {activeScreen === 'receipts' && (
          <ReceiptsHistoryScreen
            receipts={receipts}
            business={business}
            mode="receipts"
            onOpenReceipt={handleOpenReceipt}
            onEditReceipt={handleEditReceipt}
            onShareReceipt={handleShareReceipt}
            onDuplicateReceipt={handleDuplicateReceipt}
            onDownloadReceipt={handleDownloadReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onOpenTemplates={() => handleNavigate('templates')}
            onCreateNew={() => {
              setSelectedReceipt(null);
              setDuplicateSeed(null);
              setActiveScreen('create-receipt');
            }}
            onEditProfile={() => handleNavigate('profile')}
          />
        )}

        {activeScreen === 'invoices' && (
          <ReceiptsHistoryScreen
            receipts={receipts}
            business={business}
            mode="invoices"
            onOpenReceipt={handleOpenReceipt}
            onEditReceipt={handleEditReceipt}
            onShareReceipt={handleShareReceipt}
            onDuplicateReceipt={handleDuplicateReceipt}
            onDownloadReceipt={handleDownloadReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onOpenTemplates={() => handleNavigate('templates')}
            onCreateNew={() => {
              setSelectedReceipt(null);
              setDuplicateSeed(null);
              setActiveScreen('create-invoice');
            }}
            onCreateInvoice={() => {
              setSelectedReceipt(null);
              setDuplicateSeed(null);
              setActiveScreen('create-invoice');
            }}
            onEditProfile={() => handleNavigate('profile')}
          />
        )}

        {activeScreen === 'profile' && (
          <BusinessProfileScreen
            initialProfile={business}
            onSave={handleUpdateBusiness}
            onBack={() => handleNavigate('home')}
          />
        )}

        {activeScreen === 'inventory' && (
          <InventoryScreen
            business={business}
            initialTab={inventoryInitialTab}
            initialShowAddInline={inventoryShowAddInline}
            onNavigateHome={() => handleNavigate('home')}
            onCategoryChange={setInventoryCategory}
            onCreateReceiptWithItem={(item) => {
              const draftReceipt: Partial<Receipt> = {
                items: [
                  {
                    id: `item-${Date.now()}`,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.unitPrice * item.quantity,
                  },
                ],
                subtotal: item.unitPrice * item.quantity,
                total: item.unitPrice * item.quantity,
              };
              setDuplicateSeed(draftReceipt as Receipt);
              setActiveScreen('create-receipt');
            }}
            onCreateInvoiceWithItem={(item) => {
              const draftInvoice: Partial<Receipt> = {
                items: [
                  {
                    id: `item-${Date.now()}`,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.unitPrice * item.quantity,
                  },
                ],
                subtotal: item.unitPrice * item.quantity,
                total: item.unitPrice * item.quantity,
              };
              setDuplicateSeed(draftInvoice as Receipt);
              setActiveScreen('create-invoice');
            }}
          />
        )}

        {activeScreen === 'templates' && (
          <TemplatesScreen
            currentDefault={settings.defaultTemplate}
            onSetDefault={handleSetDefaultTemplate}
            onBack={() => handleNavigate('home')}
            business={business}
            onUpdateBusiness={handleUpdateBusiness}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={handleNavigate}
            onDataRestored={refreshData}
            onLockApp={() => {
              setLockConfig(StorageService.getAppLockConfig());
              setIsAppLocked(true);
            }}
          />
        )}

        {activeScreen === 'qr-hosting' && (
          <QRCodeHostingScreen
            business={business}
            onNavigateHome={() => handleNavigate('home')}
            onOpenCustomerView={(page, initialTab, initialItemId, initialPhotoId) => {
              setActiveCustomerPage(page);
              setCustomerInitialTab(initialTab || 'menu');
              setCustomerInitialItemId(initialItemId);
              setCustomerInitialPhotoId(initialPhotoId);
              setIsCustomerViewMode(false);
              setActiveScreen('qr-customer-view');
            }}
          />
        )}

        {activeScreen === 'qr-customer-view' && (
          isCustomerDataResolving ? (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-pulse">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Loading...</h2>
              <div className="w-full max-w-sm mt-6 space-y-3">
                <div className="h-16 bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl"></div>
                <div className="h-16 bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl"></div>
                <div className="h-16 bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl"></div>
              </div>
            </div>
          ) : (
            <QRCustomerViewScreen
              page={activeCustomerPage || StorageService.getHostedQRPages()[0]}
              initialTab={customerInitialTab}
              initialItemId={customerInitialItemId}
              initialPhotoId={customerInitialPhotoId}
              onBackToApp={() => {
                if (isCustomerViewMode) {
                  if (typeof window !== 'undefined' && window.history) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                  setIsCustomerViewMode(false);
                  handleNavigate('home');
                } else {
                  handleNavigate('qr-hosting');
                }
              }}
              isMerchantPreview={!isCustomerViewMode}
            />
          )
        )}

        {activeScreen === 'upgrade' && (
          <UpgradeScreen
            onBack={() => handleNavigate(previousScreen !== 'upgrade' ? previousScreen : 'home')}
          />
        )}

        {activeScreen === 'app-lock-setup' && (
          <AppLockSetupScreen
            initialMode={appLockInitialMode}
            onBack={() => {
              setAppLockInitialMode('view');
              handleNavigate(previousScreen !== 'app-lock-setup' ? previousScreen : 'home');
            }}
            onLockNow={() => {
              setLockConfig(StorageService.getAppLockConfig());
              setIsAppLocked(true);
            }}
            onConfigChange={(newCfg) => {
              setLockConfig(newCfg);
            }}
          />
        )}

        {activeScreen === 'cloud-backup' && (
          <CloudBackupScreen
            onBack={() => handleNavigate('settings')}
            onDataRestored={refreshData}
          />
        )}

        {/* Safety Catch-All Screen: Guarantees the UI never renders empty white space */}
        {![
          'news',
          'home',
          'receipts-invoices',
          'create-receipt',
          'create-invoice',
          'preview-receipt',
          'receipts',
          'invoices',
          'profile',
          'inventory',
          'templates',
          'settings',
          'qr-hosting',
          'qr-customer-view',
          'upgrade',
          'app-lock-setup',
          'cloud-backup',
        ].includes(activeScreen) && (
          <HomeScreen
            business={business}
            stats={stats}
            activeTemplate={settings.defaultTemplate}
            onNavigate={handleNavigate}
            onNavigateToInventory={handleNavigateToInventory}
            onSelectReceipt={handleOpenReceipt}
            onShareReceipt={handleShareReceipt}
            onOpenCustomerView={(page) => {
              setActiveCustomerPage(page);
              setIsCustomerViewMode(false);
              setActiveScreen('qr-customer-view');
            }}
          />
        )}
      </main>



      {/* Google AdMob Modal Overlays (Interstitial, Rewarded, App Open) */}
      <AdMobModalOverlay />

      {/* Bottom Navigation - Renders News Footer when in news mode, and Business Manager Footer when in management mode */}
      {!['create-receipt', 'create-invoice', 'preview-receipt', 'qr-customer-view', 'app-lock-setup'].includes(activeScreen) && (
        <BottomNav
          currentScreen={activeScreen}
          onNavigate={handleNavigate}
          receiptsCount={receipts.filter((r) => (r.documentType || 'receipt') === 'receipt').length}
          invoicesCount={receipts.filter((r) => r.documentType === 'invoice').length}
          inventoryCount={inventoryCount}
          newsFooterTab={newsFooterTab}
          onSelectNewsTab={setNewsFooterTab}
          favoritesCount={newsFavoritesCount}
          historyCount={newsHistoryCount}
        />
      )}

      <DownloadSuccessModal
        isOpen={appDownloadModal.isOpen}
        onClose={() => setAppDownloadModal({ isOpen: false })}
        fileName={appDownloadModal.fileName}
        folderName={appDownloadModal.folderName}
        documentType={appDownloadModal.documentType}
        documentNumber={appDownloadModal.documentNumber}
      />

    </div>
  );
}

export default App;
