import { registerPlugin } from '@capacitor/core';

export interface NativeAdPluginInterface {
  loadNativeAd(options?: { adUnitId?: string }): Promise<{ success: boolean }>;
  showNativeAd(options?: { marginBottom?: number }): Promise<{ success: boolean }>;
  hideNativeAd(): Promise<{ success: boolean }>;
  isAdLoaded(): Promise<{ loaded: boolean; visible: boolean }>;
  updatePosition(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }): Promise<{ success: boolean }>;
}

/**
 * NativeAdBridge:
 * Connects React UI to the Android NativeAdPlugin.
 * On web / preview, methods safely resolve without creating any fake HTML/CSS cards.
 */
export const NativeAdBridge = registerPlugin<NativeAdPluginInterface>('NativeAdPlugin', {
  web: () => ({
    loadNativeAd: async () => ({ success: false }),
    showNativeAd: async () => ({ success: false }),
    hideNativeAd: async () => ({ success: false }),
    isAdLoaded: async () => ({ loaded: false, visible: false }),
    updatePosition: async () => ({ success: false }),
  }),
});
