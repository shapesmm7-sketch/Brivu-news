import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdOptions,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import { StorageService } from './storage';
import { NativeAdBridge } from './nativeAdBridge';

/**
 * User Live Google AdMob Ad Unit IDs for Android
 * App ID: ca-app-pub-8582659585800553~8957324812
 * Interstitial ID: ca-app-pub-8582659585800553/1482159477
 * Native Advanced ID: ca-app-pub-8582659585800553/9630358215
 */
export const ADMOB_LIVE_UNITS = {
  APP_ID: 'ca-app-pub-8582659585800553~8957324812',
  INTERSTITIAL: 'ca-app-pub-8582659585800553/1482159477',
  NATIVE_ADVANCED: 'ca-app-pub-8582659585800553/9630358215',
} as const;

export const ADMOB_UNITS = ADMOB_LIVE_UNITS;

class AdMobManager {
  private isInitialized = false;
  private lastInterstitialTime = 0;
  private userTapCount = 0;

  constructor() {
    this.initNativeAdMob();
    if (typeof window !== 'undefined') {
      this.preloadNativeAdvanced().catch(() => {});
      setTimeout(() => {
        this.pingAdMobRequests().catch(() => {});
      }, 100);
      this.startAdMobHeartbeat();
    }
  }

  startAdMobHeartbeat() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      if (Capacitor.isNativePlatform() && this.shouldShowAds()) {
        this.preloadInterstitial().catch(() => {});
        this.preloadNativeAdvanced().catch(() => {});
      }
    }, 30000);
  }

  async pingAdMobRequests() {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeAdMob();
        await this.preloadInterstitial();
        await this.preloadNativeAdvanced();
      } catch (_) {}
    }
  }

  async preloadInterstitial() {
    if (!Capacitor.isNativePlatform() || !this.shouldShowAds()) return;
    try {
      await this.initNativeAdMob();
      await AdMob.prepareInterstitial({
        adId: ADMOB_UNITS.INTERSTITIAL,
        isTesting: false,
      });
    } catch (err) {
      console.warn('[AdMob Native] Preload interstitial note:', err);
    }
  }

  async preloadNativeAdvanced() {
    if (!Capacitor.isNativePlatform() || !this.shouldShowAds()) return;
    try {
      await NativeAdBridge.loadNativeAd({
        adUnitId: ADMOB_UNITS.NATIVE_ADVANCED,
      });
      console.info(`[AdMob Native] Live AdMob Native Advanced Ad Unit registered: ${ADMOB_UNITS.NATIVE_ADVANCED}`);
    } catch (err) {
      console.warn('[AdMob Native] Preload native advanced note:', err);
    }
  }

  async requestNativeAd(unitId: string = ADMOB_UNITS.NATIVE_ADVANCED) {
    if (!Capacitor.isNativePlatform() || !this.shouldShowAds()) return;
    try {
      await NativeAdBridge.showNativeAd();
      console.info(`[AdMob Native] Live AdMob Native Advanced ad requested via NativeAdBridge: ${unitId}`);
    } catch (err) {
      console.warn('[AdMob Native] Native ad request note:', err);
    }
  }

  recordInteraction() {
    if (!this.shouldShowAds()) return;
    this.userTapCount++;
    if (this.userTapCount >= 25) {
      this.userTapCount = 0;
      this.showInterstitial('25_taps_milestone');
    }
  }

  getTapCount(): number {
    return this.userTapCount;
  }

  async initNativeAdMob() {
    if (this.isInitialized) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await AdMob.initialize({
          initializeForTesting: false,
        });
        this.isInitialized = true;

        try {
          AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            console.info('[AdMob Live] Interstitial Ad loaded from Google AdMob servers');
          });
          AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            this.preloadInterstitial().catch(() => {});
          });
          AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
            console.warn('[AdMob Live] Interstitial load note:', err);
          });
        } catch (_) {}

        await this.preloadInterstitial();
      } catch (err) {
        console.warn('[AdMob Native] Initialization note:', err);
      }
    }
  }

  shouldShowAds(): boolean {
    const isSubscribed = StorageService.isSubscribed();
    return !isSubscribed;
  }

  async showInterstitial(actionSource = 'save', onClosed?: () => void): Promise<boolean> {
    if (!this.shouldShowAds()) {
      onClosed?.();
      return false;
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < 1500) {
      onClosed?.();
      return false;
    }
    this.lastInterstitialTime = now;

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeAdMob();
        const options: AdOptions = {
          adId: ADMOB_UNITS.INTERSTITIAL,
          isTesting: false,
        };
        await AdMob.prepareInterstitial(options);
        await AdMob.showInterstitial();
        onClosed?.();
        setTimeout(() => {
          this.preloadInterstitial().catch(() => {});
        }, 1500);
        return true;
      } catch (err) {
        console.warn('[AdMob Native] Interstitial display note:', err);
      }
    }

    // On web / preview, execute callback directly without any mock HTML overlay
    onClosed?.();
    return true;
  }

  closeAd() {
    // No-op for web preview since no mock overlays exist
  }
}

export const AdMobService = new AdMobManager();
