import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { QRCodeHostedPage, QRMenuItem, QRBusinessPhoto, EventQrItem, WebsiteAppQrItem, SocialQrItem, BusinessProfile } from '../types';
import { saveJsPdf, SaveFileResult } from './fileSaver';
import { CloudflareService } from './cloudflareService';
import { StorageService } from './storage';

export class QRHostingService {
  /**
   * Resolves the public Cloudflare worker base URL for customer links
   */
  private static getWorkerBaseUrl(): string {
    try {
      const config = CloudflareService.getConfig();
      let url = (config.workerUrl || '').trim();
      if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
        url = 'https://brivu.shapesmm7.workers.dev';
      }
      return url.endsWith('/') ? url.slice(0, -1) : url;
    } catch {
      return 'https://brivu.shapesmm7.workers.dev';
    }
  }

  private static cleanText(txt: string | undefined): string {
    if (!txt) return '';
    let cleaned = txt;
    cleaned = cleaned.replace(/verified online portals/gi, '');
    cleaned = cleaned.replace(/verified official websites/gi, '');
    cleaned = cleaned.replace(/portals & mobile apps/gi, '');
    cleaned = cleaned.replace(/verified official channels/gi, '');
    cleaned = cleaned.replace(/upcoming events hub/gi, '');
    cleaned = cleaned.replace(/official websites & apps/gi, 'our sites');
    cleaned = cleaned.replace(/business events hub/gi, 'our Events');
    cleaned = cleaned.replace(/official social media hub/gi, 'our social media platforms');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
    return cleaned;
  }

  static resolveOwnerEmail(emailOverride?: string): string {
    if (emailOverride && emailOverride.includes('@')) {
      return emailOverride.toLowerCase().trim();
    }
    const user = StorageService.getWorkOSUser();
    // If the user is currently signed in, their authenticated email MUST ALWAYS BE USED for QR links
    if (user && user.email && user.email.includes('@')) {
      return user.email.toLowerCase().trim();
    }
    const profile = StorageService.getProfile();
    if (profile && profile.email && profile.email.includes('@')) {
      return profile.email.toLowerCase().trim();
    }
    const brivuId = StorageService.getBrivuUserId();
    if (brivuId && brivuId.includes('@')) {
      return brivuId.toLowerCase().trim();
    }
    return '';
  }

  static formatBusinessPageId(pageId: string): string {
    const id = (pageId || '').trim();
    if (!id || id === 'default' || id === 'latest') {
      return 'business-latest';
    }
    if (id.startsWith('business-')) return id;
    if (id.startsWith('qr-')) return id.replace(/^qr-/, 'business-');
    if (id.includes('socials') || id.includes('websites') || id.includes('events')) {
      return id;
    }
    return `business-${id}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for the unified Business Hub page with owner email
   */
  static getCustomerBusinessHubUrl(businessName?: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const cleanName = (businessName || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `business-hub-${cleanName}`;
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${base}/qr/${encodeURIComponent(hubId)}${emailParam}`;
  }

  /**
   * Generates a clean Cloudflare-hosted URL for customer scanning with optional specific tab targeting and owner email
   */
  static getCustomerPageUrl(pageId: string, targetTab?: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const email = this.resolveOwnerEmail(emailOverride);
    const queryParts: string[] = [];
    if (targetTab && targetTab !== 'all') {
      queryParts.push(`tab=${encodeURIComponent(targetTab)}`);
    }
    if (email) {
      queryParts.push(`email=${encodeURIComponent(email)}`);
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const cleanId = this.formatBusinessPageId(pageId);
    return `${base}/qr/${encodeURIComponent(cleanId)}${queryString}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for a specific Item with owner email
   */
  static getCustomerItemUrl(pageId: string, itemId: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const cleanId = this.formatBusinessPageId(pageId);
    return `${base}/qr/${encodeURIComponent(cleanId)}?tab=menu&itemId=${encodeURIComponent(itemId)}${emailParam}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for a specific Photo with owner email
   */
  static getCustomerPhotoUrl(pageId: string, photoId: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const cleanId = this.formatBusinessPageId(pageId);
    return `${base}/qr/${encodeURIComponent(cleanId)}?tab=photos&photoId=${encodeURIComponent(photoId)}${emailParam}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for an Event's own dedicated page (independent of Business QR) with owner email
   */
  static getCustomerEventUrl(eventId: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${base}/qr/${encodeURIComponent(eventId)}${emailParam}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for the unified Events Hub page with owner email
   */
  static getCustomerEventsHubUrl(businessName?: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const cleanName = (businessName || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `events-hub-${cleanName}`;
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${base}/qr/${encodeURIComponent(hubId)}${emailParam}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for the unified Websites & Apps Hub page with owner email
   */
  static getCustomerWebsitesHubUrl(businessName?: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const cleanName = (businessName || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `websites-hub-${cleanName}`;
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${base}/qr/${encodeURIComponent(hubId)}${emailParam}`;
  }

  /**
   * Generates direct Cloudflare-hosted URL for the unified Socials Hub page with owner email
   */
  static getCustomerSocialsHubUrl(businessName?: string, emailOverride?: string): string {
    const base = this.getWorkerBaseUrl();
    const cleanName = (businessName || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `socials-hub-${cleanName}`;
    const email = this.resolveOwnerEmail(emailOverride);
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    return `${base}/qr/${encodeURIComponent(hubId)}${emailParam}`;
  }

  /**
   * Converts user cloud backup data into a complete QRCodeHostedPage
   */
  static convertBackupToHostedPage(bData: any): QRCodeHostedPage {
    const pages = Array.isArray(bData?.qrHostedPages) ? bData.qrHostedPages : [];
    const populated = pages.find((p: any) =>
      p &&
      p.pageType !== 'websites_hub' &&
      p.pageType !== 'socials_hub' &&
      p.pageType !== 'events_hub' &&
      ((p?.menuItems && p.menuItems.length > 0) || (p?.photos && p.photos.length > 0))
    );
    if (populated) return populated;

    const profile = bData?.profile || {};
    const inventory = Array.isArray(bData?.inventoryProducts)
      ? bData.inventoryProducts
      : (Array.isArray(bData?.inventory) ? bData.inventory : []);
    const photos = Array.isArray(bData?.photos) ? bData.photos : [];
    const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');

    const firstBusinessPage = pages.find((p: any) =>
      p &&
      p.pageType !== 'websites_hub' &&
      p.pageType !== 'socials_hub' &&
      p.pageType !== 'events_hub'
    );
    if (inventory.length === 0 && photos.length === 0 && firstBusinessPage) {
      return firstBusinessPage;
    }

    const email = profile.email || bData?.userEmail || bData?.email || '';

    return {
      id: firstBusinessPage?.id || 'default',
      title: profile.name || 'Brivu Business',
      tagline: profile.description || 'Welcome to our official business page',
      description: profile.description || '',
      pageType: 'menu',
      accentColor: profile.themeColor || '#059669',
      theme: 'emerald',
      logo: profile.logo,
      coverImage: photos[0]?.url || (typeof photos[0] === 'string' ? photos[0] : undefined),
      phone: profile.phone || '',
      whatsapp: cleanWa,
      email,
      userEmail: email,
      address: profile.address || '',
      currency: profile.currency || 'UGX',
      openingHours: '',
      allowWhatsAppOrdering: true,
      photos: photos.map((p: any, idx: number) =>
        typeof p === 'string' ? { id: `photo-${idx}`, url: p, title: 'Photo' } : p
      ),
      menuCategories: Array.from(new Set(['All', ...inventory.map((i: any) => i.category || 'Items')])),
      menuItems: inventory.map((item: any) => ({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: item.category || 'All',
        price: item.sellingPrice || item.price || 0,
        description: item.description || '',
        photoUrl: item.image || item.photoUrl,
        isAvailable: item.inStock !== false,
      })),
      qrDarkColor: '#000000',
      qrLightColor: '#ffffff',
      qrEyeColor: '#000000',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#cbd5e1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts an EventQrItem into its own dedicated QRCodeHostedPage for standalone Cloudflare hosting
   */
  static convertEventToHostedPage(event: EventQrItem, business: BusinessProfile): QRCodeHostedPage {
    const cleanPhone = (event.contactPhone || business.phone || '').replace(/[^0-9+]/g, '');
    let cleanWa = '';
    if (event.rsvpUrl && event.rsvpUrl.includes('wa.me/')) {
      const match = event.rsvpUrl.match(/wa\.me\/([0-9]+)/);
      if (match && match[1]) {
        cleanWa = match[1];
      }
    }
    if (!cleanWa) {
      cleanWa = cleanPhone.replace(/[^0-9]/g, '');
    }

    const ownerEmail = this.resolveOwnerEmail(business.email);
    const dateParts: string[] = [];
    if (event.startDate) {
      dateParts.push(event.startDate + (event.endDate && event.endDate !== event.startDate ? ` to ${event.endDate}` : ''));
    } else if (event.eventDate) {
      dateParts.push(event.eventDate);
    }
    if (event.startTime) {
      dateParts.push(event.startTime + (event.endTime ? ` - ${event.endTime}` : ''));
    }

    const dateScheduleText = dateParts.length > 0 ? dateParts.join(' • ') : '';
    const announcementText = `📅 ${dateScheduleText || 'Upcoming Event'} • 📍 ${event.location}`;

    const cssStyle = `
      #tab-btn-photos, #tab-btn-about { display: none !important; }
      #item-search-input, .relative:has(#item-search-input), #tab-content-menu > div:first-child, [placeholder*="Search"] { display: none !important; }
      #tab-btn-menu { border-bottom: none !important; pointer-events: none !important; text-align: left !important; justify-content: flex-start !important; padding-left: 0 !important; }
      #tab-btn-menu span { font-size: 0 !important; }
      #tab-btn-menu span::before { content: "Events"; font-size: 18px !important; font-weight: 800; color: #0f172a; }
      #tab-btn-menu svg { display: none !important; }
      .text-emerald-600, .font-bold.text-emerald-600, [class*="text-emerald"], .price, :contains("UGX"), .text-xs.font-semibold.text-emerald-600 { display: none !important; }
      #tab-content-menu button, #tab-content-menu .bg-emerald-600, button:contains("+ Add to Order"), .bg-emerald-600.text-white { display: none !important; }
      .fixed.bottom-4, .bg-emerald-600.fixed, [class*="fixed"].bottom- { display: none !important; }
      #tab-content-menu .grid { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; gap: 24px !important; max-width: 600px !important; margin: 0 auto !important; }
      #tab-content-menu .grid > div { flex-direction: column !important; border-radius: 20px !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important; border: 1px solid #e2e8f0 !important; overflow: hidden !important; background-color: #ffffff !important; }
      #tab-content-menu [class*="aspect-"] { aspect-ratio: 16 / 9 !important; width: 100% !important; height: auto !important; max-height: 480px !important; }
      #tab-content-menu [class*="aspect-"] img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      #tab-content-menu .p-3 { padding: 16px !important; }
      #tab-content-menu h3 { font-size: 18px !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1.3 !important; }
      #tab-content-menu p { font-size: 13px !important; margin-top: 8px !important; color: #475569 !important; line-height: 1.5 !important; }
    `.replace(/\s+/g, ' ');

    const photos: QRBusinessPhoto[] = (event.photos || []).map((url, idx) => ({
      id: `${event.id}-photo-${idx}`,
      url,
      title: event.title,
      description: event.location,
      badge: 'Event Photo',
      caption: event.title,
    }));

    const menuItems: QRMenuItem[] = [
      {
        id: `rsvp-${event.id}`,
        name: `${event.title} - Entry & RSVP Pass`,
        category: 'Event Pass & RSVP',
        price: 0,
        description: `${event.description ? event.description + ' • ' : ''}Venue: ${event.location}. Click to RSVP!`,
        tags: ['RSVP', 'Invitation', 'Entry Pass'],
        isSpecial: true,
        isAvailable: true,
        photoUrl: event.photos?.[0] || undefined,
      },
    ];

    const injectedAccentColor = (event.darkColor || '#7c3aed') + '; } ' + cssStyle + ' /*';

    return {
      id: event.id,
      title: this.cleanText(event.title),
      tagline: this.cleanText(event.ctaText || 'Official Event Invitation & RSVP Pass'),
      description: this.cleanText(event.description || `Event Venue: ${event.location}`),
      pageType: 'event',
      accentColor: injectedAccentColor,
      theme: 'indigo',
      coverImage: event.photos?.[0] || undefined,
      logo: event.photos?.[0] || business.logo || undefined,
      phone: event.contactPhone || business.phone || '',
      whatsapp: cleanWa,
      email: event.contactEmail || ownerEmail || business.email || '',
      userEmail: ownerEmail || business.email || '',
      address: event.location,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`,
      currency: business.currency || 'UGX',
      announcement: announcementText,
      allowWhatsAppOrdering: true,
      photos,
      menuCategories: ['Event Pass & RSVP'],
      menuItems,
      qrDarkColor: event.darkColor || '#7c3aed',
      qrLightColor: event.lightColor || '#ffffff',
      qrEyeColor: event.eyeColor || event.darkColor || '#6d28d9',
      qrBoxBgColor: event.boxBgColor || '#ffffff',
      qrBoxBorderColor: (event.boxBorderColor || '#cbd5e1') + '</script><style>' + cssStyle + '</style><script>',
      createdAt: event.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts all EventQrItems into an Events Hub QRCodeHostedPage
   */
  static convertEventsHubToHostedPage(events: EventQrItem[], business: BusinessProfile): QRCodeHostedPage {
    const cleanName = (business.name || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `events-hub-${cleanName}`;
    const cleanPhone = (business.phone || '').replace(/[^0-9+]/g, '');
    const cleanWa = cleanPhone.replace(/[^0-9]/g, '');
    const ownerEmail = this.resolveOwnerEmail(business.email);

    const photos: QRBusinessPhoto[] = events.flatMap((evt) =>
      (evt.photos || []).map((url, idx) => ({
        id: `${evt.id}-photo-${idx}`,
        url,
        title: evt.title,
        description: evt.location,
        badge: 'Event Photo',
        caption: evt.title,
      }))
    );

    const menuItems: QRMenuItem[] = events.map((evt) => ({
      id: `rsvp-${evt.id}`,
      name: evt.title,
      category: 'Our Events',
      price: 0,
      description: `${evt.startDate ? '📅 ' + evt.startDate + ' • ' : ''}📍 ${evt.location}. ${evt.description || ''}`,
      photoUrl: evt.photos?.[0] || undefined,
      tags: ['RSVP', 'Invitation', 'Entry Pass'],
      isSpecial: true,
      isAvailable: true,
    }));

    const cssStyle = `
      #tab-btn-photos, #tab-btn-about { display: none !important; }
      #item-search-input, .relative:has(#item-search-input), #tab-content-menu > div:first-child, [placeholder*="Search"] { display: none !important; }
      #tab-btn-menu { border-bottom: none !important; pointer-events: none !important; text-align: left !important; justify-content: flex-start !important; padding-left: 0 !important; }
      #tab-btn-menu span { font-size: 0 !important; }
      #tab-btn-menu span::before { content: "Events"; font-size: 18px !important; font-weight: 800; color: #0f172a; }
      #tab-btn-menu svg { display: none !important; }
      .text-emerald-600, .font-bold.text-emerald-600, [class*="text-emerald"], .price, :contains("UGX"), .text-xs.font-semibold.text-emerald-600 { display: none !important; }
      #tab-content-menu button, #tab-content-menu .bg-emerald-600, button:contains("+ Add to Order"), .bg-emerald-600.text-white { display: none !important; }
      .fixed.bottom-4, .bg-emerald-600.fixed, [class*="fixed"].bottom- { display: none !important; }
      #tab-content-menu .grid { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; gap: 24px !important; max-width: 600px !important; margin: 0 auto !important; }
      #tab-content-menu .grid > div { flex-direction: column !important; border-radius: 20px !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important; border: 1px solid #e2e8f0 !important; overflow: hidden !important; background-color: #ffffff !important; }
      #tab-content-menu [class*="aspect-"] { aspect-ratio: 16 / 9 !important; width: 100% !important; height: auto !important; max-height: 480px !important; }
      #tab-content-menu [class*="aspect-"] img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
      #tab-content-menu .p-3 { padding: 16px !important; }
      #tab-content-menu h3 { font-size: 18px !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1.3 !important; }
      #tab-content-menu p { font-size: 13px !important; margin-top: 8px !important; color: #475569 !important; line-height: 1.5 !important; }
    `.replace(/\s+/g, ' ');

    const injectedAccentColor = '#7c3aed; } ' + cssStyle + ' /*';

    return {
      id: hubId,
      title: 'Our Events',
      tagline: undefined,
      description: this.cleanText(`Official events, ticket invitations, and RSVP directory for ${business.name || 'our venue'}.`),
      pageType: 'events_hub',
      accentColor: injectedAccentColor,
      theme: 'indigo',
      coverImage: photos[0]?.url || undefined,
      logo: business.logo || photos[0]?.url || undefined,
      phone: business.phone || '',
      whatsapp: cleanWa,
      email: ownerEmail || business.email || '',
      userEmail: ownerEmail || business.email || '',
      address: business.address || '',
      googleMapsUrl: business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}` : undefined,
      currency: business.currency || 'UGX',
      announcement: `🎉 ${events.length} Upcoming Event${events.length === 1 ? '' : 's'} Available`,
      allowWhatsAppOrdering: true,
      photos,
      menuCategories: ['Our Events'],
      menuItems,
      qrDarkColor: '#7c3aed',
      qrLightColor: '#ffffff',
      qrEyeColor: '#6d28d9',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#cbd5e1' + '</script><style>' + cssStyle + '</style><script>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts all WebsiteAppQrItem links into a dedicated unified Websites Hub hosted page
   */
  static convertWebsitesHubToHostedPage(websites: WebsiteAppQrItem[], business: BusinessProfile): QRCodeHostedPage {
    const cleanName = (business.name || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `websites-hub-${cleanName}`;
    const cleanPhone = (business.phone || '').replace(/[^0-9+]/g, '');
    const cleanWa = cleanPhone.replace(/[^0-9]/g, '');

    const menuItems: QRMenuItem[] = websites.map((web) => ({
      id: `web-${web.id}`,
      name: web.title,
      category: 'Our Sites',
      price: 0,
      description: web.description || web.url,
      url: web.url,
      ctaText: web.ctaText || 'Visit Website',
      itemType: web.type,
      phone: web.phone,
      phoneAction: web.phoneAction,
      tags: [web.type, web.ctaText || 'Visit Website'],
      isSpecial: true,
      isAvailable: true,
    }));

    const ownerEmail = this.resolveOwnerEmail(business.email);

    return {
      id: hubId,
      title: 'Our Sites',
      tagline: undefined,
      description: this.cleanText(`Official web links and verified online apps directory for ${business.name || 'our company'}.`),
      pageType: 'websites_hub',
      accentColor: '#2563eb',
      theme: 'indigo',
      coverImage: undefined,
      logo: business.logo || undefined,
      phone: business.phone || '',
      whatsapp: cleanWa,
      email: ownerEmail || business.email || '',
      userEmail: ownerEmail || business.email || '',
      address: business.address || '',
      googleMapsUrl: business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}` : undefined,
      currency: business.currency || 'USD',
      announcement: `🌐 ${websites.length} Official Link${websites.length === 1 ? '' : 's'} Available`,
      allowWhatsAppOrdering: false,
      photos: [],
      menuCategories: ['Our Sites'],
      menuItems,
      websitesQrItems: websites,
      qrDarkColor: '#2563eb',
      qrLightColor: '#ffffff',
      qrEyeColor: '#1d4ed8',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#cbd5e1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Syncs the websites hub page to local storage and Cloudflare
   */
  static async syncAllWebsitesPages(websites: WebsiteAppQrItem[], business: BusinessProfile): Promise<void> {
    try {
      const ownerEmail = this.resolveOwnerEmail(business.email);
      const hubPage = this.convertWebsitesHubToHostedPage(websites, business);
      await CloudflareService.saveSingleQrPage(hubPage, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'websites-hub-all' }, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'websites' }, ownerEmail).catch(() => {});
      await CloudflareService.syncAllToCloudflare().catch(() => {});
    } catch (err) {
      console.warn('Failed to sync websites hub page to Cloudflare:', err);
    }
  }

  /**
   * Converts all SocialQrItem links into a dedicated unified Socials Hub hosted page
   */
  static convertSocialsHubToHostedPage(socials: SocialQrItem[], business: BusinessProfile): QRCodeHostedPage {
    const cleanName = (business.name || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
    const hubId = `socials-hub-${cleanName}`;
    const cleanPhone = (business.phone || '').replace(/[^0-9+]/g, '');
    const cleanWa = cleanPhone.replace(/[^0-9]/g, '');

    const menuItems: QRMenuItem[] = socials.map((soc) => ({
      id: `social-${soc.id}`,
      name: soc.title || soc.customPlatformName || soc.platform,
      category: 'Official Social Media & Messaging',
      price: 0,
      description: soc.prefilledMessage || soc.fullUrl,
      url: soc.fullUrl,
      ctaText: soc.ctaText || 'Connect',
      itemType: soc.platform,
      tags: [soc.platform, soc.ctaText || 'Connect'],
      isSpecial: true,
      isAvailable: true,
    }));

    const ownerEmail = this.resolveOwnerEmail(business.email);

    return {
      id: hubId,
      title: 'our social media platforms',
      tagline: this.cleanText('Connect Across All Official Social Channels & Messaging Apps'),
      description: this.cleanText(`Official verified social media profiles, chat channels, and community links for ${business.name || 'our brand'}.`),
      pageType: 'socials_hub',
      accentColor: '#059669',
      theme: 'emerald',
      coverImage: undefined,
      logo: business.logo || undefined,
      phone: business.phone || '',
      whatsapp: cleanWa,
      email: ownerEmail || business.email || '',
      userEmail: ownerEmail || business.email || '',
      address: business.address || '',
      googleMapsUrl: business.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}` : undefined,
      currency: business.currency || 'USD',
      announcement: `💬 ${socials.length} Official Channel${socials.length === 1 ? '' : 's'} Connected`,
      allowWhatsAppOrdering: false,
      photos: [],
      menuCategories: ['Official Social Media & Messaging'],
      menuItems,
      socialsQrItems: socials,
      qrDarkColor: '#059669',
      qrLightColor: '#ffffff',
      qrEyeColor: '#047857',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#cbd5e1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Syncs the socials hub page to local storage and Cloudflare
   */
  static async syncAllSocialsPages(socials: SocialQrItem[], business: BusinessProfile): Promise<void> {
    try {
      const ownerEmail = this.resolveOwnerEmail(business.email);
      const hubPage = this.convertSocialsHubToHostedPage(socials, business);
      await CloudflareService.saveSingleQrPage(hubPage, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'socials-hub-all' }, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'socials' }, ownerEmail).catch(() => {});
      await CloudflareService.syncAllToCloudflare().catch(() => {});
    } catch (err) {
      console.warn('Failed to sync socials hub page to Cloudflare:', err);
    }
  }

  /**
   * Syncs an individual event page to local storage and Cloudflare D1
   */
  static async syncEventPage(event: EventQrItem, business: BusinessProfile): Promise<void> {
    try {
      const ownerEmail = this.resolveOwnerEmail(business.email);
      const page = this.convertEventToHostedPage(event, business);
      await CloudflareService.saveSingleQrPage(page, ownerEmail).catch(() => {});
      // Also update the Events Hub page
      const allEvents = StorageService.getEventsQrItems();
      const updatedList = [event, ...allEvents.filter((e) => e.id !== event.id)];
      const hubPage = this.convertEventsHubToHostedPage(updatedList, business);
      await CloudflareService.saveSingleQrPage(hubPage, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'events-hub-all' }, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'events' }, ownerEmail).catch(() => {});
      // Trigger Cloudflare D1 full backup sync
      await CloudflareService.syncAllToCloudflare().catch(() => {});
    } catch (err) {
      console.warn('Failed to sync event page to Cloudflare:', err);
    }
  }

  /**
   * Syncs all events and events hub to local storage and Cloudflare D1
   */
  static async syncAllEventsPages(events: EventQrItem[], business: BusinessProfile): Promise<void> {
    try {
      const ownerEmail = this.resolveOwnerEmail(business.email);
      for (const evt of events) {
        const page = this.convertEventToHostedPage(evt, business);
        await CloudflareService.saveSingleQrPage(page, ownerEmail).catch(() => {});
      }
      const hubPage = this.convertEventsHubToHostedPage(events, business);
      await CloudflareService.saveSingleQrPage(hubPage, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'events-hub-all' }, ownerEmail).catch(() => {});
      await CloudflareService.saveSingleQrPage({ ...hubPage, id: 'events' }, ownerEmail).catch(() => {});
      await CloudflareService.syncAllToCloudflare().catch(() => {});
    } catch (err) {
      console.warn('Failed to sync all event pages to Cloudflare:', err);
    }
  }

  /**
   * Removes an event's dedicated page when deleted
   */
  static async removeEventPage(eventId: string, business: BusinessProfile): Promise<void> {
    try {
      const allPages = StorageService.getHostedQRPages();
      const remainingPages = allPages.filter((p) => p.id !== eventId);
      StorageService.saveHostedQRPages(remainingPages);
      // Update Hub page
      const remainingEvents = StorageService.getEventsQrItems().filter((e) => e.id !== eventId);
      const hubPage = this.convertEventsHubToHostedPage(remainingEvents, business);
      StorageService.saveHostedQRPage(hubPage);
      await CloudflareService.syncAllToCloudflare().catch(() => {});
    } catch (err) {
      console.warn('Failed to remove event page from Cloudflare:', err);
    }
  }

  /**
   * Helper to copy general customer page URL to clipboard with owner email
   */
  static async copyCustomerUrl(pageId: string, targetTab?: string, emailOverride?: string): Promise<boolean> {
    try {
      const url = this.getCustomerPageUrl(pageId, targetTab, emailOverride);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generates high-res QR Code Data URL (PNG) with support for custom 3 corner finder eye colors
   */
  static async generateQrCodeDataUrl(
    url: string,
    options?: {
      color?: { dark?: string; light?: string; eyeColor?: string };
      width?: number;
      margin?: number;
    }
  ): Promise<string> {
    try {
      const darkColor = options?.color?.dark || '#000000';
      const lightColor = options?.color?.light || '#ffffff';
      const eyeColor = options?.color?.eyeColor || darkColor;
      const targetWidth = options?.width || 512;
      const margin = options?.margin ?? 2;

      // In browser runtime, render onto canvas to support independent corner finder box colors
      if (typeof document !== 'undefined') {
        const qr = QRCode.create(url, {
          errorCorrectionLevel: 'H',
        });
        const moduleCount = qr.modules.size;
        const totalModules = moduleCount + margin * 2;
        const cellSize = targetWidth / totalModules;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetWidth;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Fill background
          ctx.fillStyle = lightColor;
          ctx.fillRect(0, 0, targetWidth, targetWidth);

          // Draw modules
          for (let r = 0; r < moduleCount; r++) {
            for (let c = 0; c < moduleCount; c++) {
              if (qr.modules.get(r, c)) {
                // Check if this module is in the 3 standard corner finder patterns (7x7 squares)
                // 1. Top-Left: row 0..6, col 0..6
                // 2. Top-Right: row 0..6, col (moduleCount-7)..moduleCount-1
                // 3. Bottom-Left: row (moduleCount-7)..moduleCount-1, col 0..6
                const isTopLeftEye = r < 7 && c < 7;
                const isTopRightEye = r < 7 && c >= moduleCount - 7;
                const isBottomLeftEye = r >= moduleCount - 7 && c < 7;
                const isEye = isTopLeftEye || isTopRightEye || isBottomLeftEye;

                ctx.fillStyle = isEye ? eyeColor : darkColor;
                ctx.fillRect(
                  (c + margin) * cellSize,
                  (r + margin) * cellSize,
                  cellSize + 0.15,
                  cellSize + 0.15
                );
              }
            }
          }

          return canvas.toDataURL('image/png');
        }
      }

      return await QRCode.toDataURL(url, {
        width: targetWidth,
        margin: margin,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: 'H',
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      throw err;
    }
  }

  /**
   * Generates and downloads a printable Table & Wall QR Code Poster PDF (A4)
   */
  static async downloadPrintableTableStand(
    page: QRCodeHostedPage,
    options?: {
      tableNumber?: string;
      targetTab?: 'all' | 'menu' | 'about' | 'photos' | string;
      tabLabel?: string;
    }
  ): Promise<SaveFileResult> {
    const tableNumber = typeof options === 'string' ? options : options?.tableNumber;
    const targetTab = typeof options === 'object' ? options?.targetTab : undefined;
    const _tabLabel = typeof options === 'object' ? options?.tabLabel : undefined;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background styling
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer decorative border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1.5);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, 'S');

    // Inner card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 4, 4, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 4, 4, 'S');

    // Header banner bar (Accent color)
    const accent = page.accentColor || '#059669';
    // Convert hex to rgb
    const r = parseInt(accent.slice(1, 3), 16) || 5;
    const g = parseInt(accent.slice(3, 5), 16) || 150;
    const b = parseInt(accent.slice(5, 7), 16) || 105;

    doc.setFillColor(r, g, b);
    doc.roundedRect(24, 24, pageWidth - 48, 28, 3, 3, 'F');

    // Header text
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    const titleText = (page.title || 'Welcome to our Venue').toUpperCase();
    doc.text(titleText, pageWidth / 2, 38, { align: 'center', maxWidth: pageWidth - 60 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(240, 253, 244);
    
    let subText = page.tagline || 'Scan to view our items, special offers & business info';
    if (targetTab === 'menu') {
      subText = 'Scan to explore our items & special offers instantly';
    } else if (targetTab === 'about') {
      subText = 'Scan to view our business location, contact details & operating hours';
    } else if (targetTab === 'photos') {
      subText = 'Scan to view our business photos & details';
    }

    if (subText) {
      subText = subText
        .replace(/photos?\s*only/gi, '')
        .replace(/items?\s*only/gi, '')
        .replace(/business\s*info\s*only/gi, '')
        .trim();
    }
    doc.text(subText, pageWidth / 2, 46, { align: 'center', maxWidth: pageWidth - 60 });

    let currentY = 58;

    // High-Visibility QR Code Name Tag
    if (tableNumber && tableNumber.trim()) {
      let badgeText = tableNumber.trim()
        .replace(/photos?\s*only/gi, '')
        .replace(/items?\s*only/gi, '')
        .replace(/business\s*info\s*only/gi, '')
        .trim();

      if (badgeText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const textWidth = doc.getTextWidth(badgeText);
        const boxWidth = Math.min(pageWidth - 48, Math.max(70, textWidth + 30));
        const boxHeight = 13.5;
        const boxX = pageWidth / 2 - boxWidth / 2;
        const boxY = currentY;

        // Tag Background (Warm golden amber tag for high visibility)
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'F');

        // Tag Border
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(1.2);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'S');

        // Tag eyelet / hole circle on left for an authentic physical tag look
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.8);
        doc.circle(boxX + 6.5, boxY + boxHeight / 2, 2, 'FD');

        // Tag Name Text (Increased size & high-contrast deep amber color)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(146, 64, 14);
        doc.text(badgeText, boxX + (boxWidth + 6.5) / 2, boxY + 9.2, {
          align: 'center',
          maxWidth: boxWidth - 18,
        });

        currentY += boxHeight + 5;
      } else {
        currentY += 2;
      }
    } else {
      currentY += 2;
    }

    // "Scan to View" Callout
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    const scanCallout = targetTab === 'menu' 
      ? 'SCAN TO VIEW ITEMS'
      : targetTab === 'about'
      ? 'SCAN TO VIEW BUSINESS INFO & CONTACTS'
      : targetTab === 'photos'
      ? 'SCAN TO VIEW DETAILS'
      : 'SCAN WITH YOUR PHONE CAMERA';
    doc.text(scanCallout, pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    // QR Code generation for specific target URL with custom colors
    const customerUrl = this.getCustomerPageUrl(page.id, targetTab, page.userEmail || page.email);
    const darkColor = page.qrDarkColor || '#000000';
    const lightColor = page.qrLightColor || '#ffffff';
    const eyeColor = page.qrEyeColor || darkColor;
    const qrDataUrl = await this.generateQrCodeDataUrl(customerUrl, {
      width: 800,
      margin: 1,
      color: { dark: darkColor, light: lightColor, eyeColor },
    });

    // Increased QR Code Frame to 120mm to fill A4 poster vertically and remove blank bottom space
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;

    // Box background and border color resolution
    const boxBg = page.qrBoxBgColor && page.qrBoxBgColor.startsWith('#') ? page.qrBoxBgColor : '#ffffff';
    const boxBorder = page.qrBoxBorderColor && page.qrBoxBorderColor.startsWith('#') && page.qrBoxBorderColor.length <= 9 ? page.qrBoxBorderColor : '#e2e8f0';

    const parseHex = (hex: string) => {
      const clean = hex.replace('#', '');
      if (clean.length === 3) {
        return [
          parseInt(clean[0] + clean[0], 16),
          parseInt(clean[1] + clean[1], 16),
          parseInt(clean[2] + clean[2], 16),
        ];
      }
      return [
        parseInt(clean.slice(0, 2), 16) || 255,
        parseInt(clean.slice(2, 4), 16) || 255,
        parseInt(clean.slice(4, 6), 16) || 255,
      ];
    };

    const [bgR, bgG, bgB] = parseHex(boxBg);
    const [brR, brG, brB] = parseHex(boxBorder);

    doc.setFillColor(bgR, bgG, bgB);
    doc.setDrawColor(brR, brG, brB);
    doc.setLineWidth(1.2);
    doc.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 4, 4, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);

    currentY += qrSize + 10;

    // Instruction pill
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth / 2 - 42, currentY, 84, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('POINT CAMERA AT CODE TO SCAN', pageWidth / 2, currentY + 5.5, { align: 'center' });

    currentY += 12;

    // WiFi info box if available
    if (page.wifiName || page.wifiPassword) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(26, currentY, pageWidth - 52, 15, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text('FREE GUEST WI-FI AVAILABLE', pageWidth / 2, currentY + 5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const wifiText = `Network: ${page.wifiName || 'Guest WiFi'}   |   Password: ${page.wifiPassword || 'None'}`;
      doc.text(wifiText, pageWidth / 2, currentY + 11, { align: 'center' });

      currentY += 18;
    } else {
      currentY += 4;
    }

    // Contact and Ordering Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    const contactLineParts = [];
    if (page.phone) contactLineParts.push(`Tel: ${page.phone}`);
    if (page.whatsapp) contactLineParts.push(`WhatsApp: ${page.whatsapp}`);
    if (page.openingHours) contactLineParts.push(`Hours: ${page.openingHours}`);

    if (contactLineParts.length > 0) {
      doc.text(contactLineParts.join('   •   '), pageWidth / 2, currentY, {
        align: 'center',
        maxWidth: pageWidth - 60,
      });
      currentY += 5;
    }

    if (page.address) {
      doc.text(page.address, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 60 });
    }

    // Footer branding
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Brivu QR Hosting', pageWidth / 2, pageHeight - 20, { align: 'center' });

    const tabSuffix = targetTab && targetTab !== 'all' ? `_${targetTab}` : '';
    const safeTitle = (page.title || 'QR_Poster').replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `${safeTitle}${tabSuffix}_QR_Poster.pdf`;
    return await saveJsPdf(doc, pdfFilename, 'QR Code Poster', { folder: 'qr_stands' });
  }

  /**
   * Universal Table Stand & Wall Poster PDF Generator for all QR Types
   * (Business QR, Websites QR, Socials QR, Events QR)
   */
  static async downloadGenericTableStand(options: {
    businessName: string;
    headline: string;
    subline?: string;
    qrNameOrTableNumber?: string;
    qrDataUrl: string;
    calloutText: string;
    urlOrHandleText?: string;
    description?: string;
    accentColor: string;
    filename: string;
    documentTitle: string;
  }): Promise<SaveFileResult> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background styling
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Outer decorative border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1.5);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, 'S');

    // Inner card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 4, 4, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 4, 4, 'S');

    // Header banner bar (Accent color)
    const accent = options.accentColor || '#059669';
    const r = parseInt(accent.slice(1, 3), 16) || 5;
    const g = parseInt(accent.slice(3, 5), 16) || 150;
    const b = parseInt(accent.slice(5, 7), 16) || 105;

    doc.setFillColor(r, g, b);
    doc.roundedRect(24, 24, pageWidth - 48, 28, 3, 3, 'F');

    // Header text
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    const titleText = (options.businessName || 'Official QR Hub').toUpperCase();
    doc.text(titleText, pageWidth / 2, 38, { align: 'center', maxWidth: pageWidth - 60 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(240, 253, 244);
    const subText = options.headline || options.subline || 'Scan with your smartphone camera to connect';
    doc.text(subText, pageWidth / 2, 46, { align: 'center', maxWidth: pageWidth - 60 });

    let currentY = 58;

    // High-Visibility QR Code Name / Table Tag
    if (options.qrNameOrTableNumber && options.qrNameOrTableNumber.trim()) {
      const badgeText = options.qrNameOrTableNumber.trim();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      const textWidth = doc.getTextWidth(badgeText);
      const boxWidth = Math.min(pageWidth - 48, Math.max(70, textWidth + 30));
      const boxHeight = 13.5;
      const boxX = pageWidth / 2 - boxWidth / 2;
      const boxY = currentY;

      // Tag Background (Warm golden amber tag for high visibility)
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'F');

      // Tag Border
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1.2);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'S');

      // Tag eyelet / hole circle
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.8);
      doc.circle(boxX + 6.5, boxY + boxHeight / 2, 2, 'FD');

      // Tag text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(146, 64, 14);
      doc.text(badgeText, boxX + (boxWidth + 6.5) / 2, boxY + 9.2, {
        align: 'center',
        maxWidth: boxWidth - 18,
      });

      currentY += boxHeight + 5;
    } else {
      currentY += 2;
    }

    // Callout text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text((options.calloutText || 'SCAN WITH YOUR PHONE CAMERA').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    // QR Code Frame Box
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1.2);
    doc.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 4, 4, 'FD');
    doc.addImage(options.qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);

    currentY += qrSize + 10;

    // Instruction pill
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth / 2 - 42, currentY, 84, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('POINT CAMERA AT CODE TO SCAN', pageWidth / 2, currentY + 5.5, { align: 'center' });

    currentY += 13;

    // URL or Handle text
    if (options.urlOrHandleText) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(options.urlOrHandleText, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 60 });
      currentY += 6;
    }

    if (options.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(options.description, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 60 });
      currentY += 5;
    }

    // Footer branding
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Powered by Brivu • ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

    return await saveJsPdf(doc, options.filename, options.documentTitle, { folder: 'qr_stands' });
  }

  /**
   * Helper to copy Item URL to clipboard with owner email
   */
  static async copyItemUrl(pageId: string, itemId: string, emailOverride?: string): Promise<boolean> {
    try {
      const url = this.getCustomerItemUrl(pageId, itemId, emailOverride);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Helper to copy Photo URL to clipboard with owner email
   */
  static async copyPhotoUrl(pageId: string, photoId: string, emailOverride?: string): Promise<boolean> {
    try {
      const url = this.getCustomerPhotoUrl(pageId, photoId, emailOverride);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generates and downloads a printable Item Promo Poster PDF (A4)
   */
  static async downloadPrintableItemStand(
    page: QRCodeHostedPage,
    item: QRMenuItem,
    tableNumber?: string
  ): Promise<SaveFileResult> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Theme color parsing
    const hex = page.accentColor || '#059669';
    let r = 5, g = 150, b = 105;
    if (hex.startsWith('#') && hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }

    // Outer Decorative Border
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.2);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, 'D');

    // Header Background Banner
    doc.setFillColor(r, g, b);
    doc.roundedRect(18, 18, pageWidth - 36, 28, 3, 3, 'F');

    // Business Title & Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(page.title || 'Special Featured Item', pageWidth / 2, 32, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(240, 253, 244);
    doc.text('Scan below to view item details, pricing & place your order', pageWidth / 2, 41, { align: 'center' });

    let currentY = 52;

    // Item Category Pill
    if (item.category) {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 25, currentY, 50, 7, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(item.category.toUpperCase(), pageWidth / 2, currentY + 4.8, { align: 'center' });
      currentY += 10;
    }

    // Item Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(item.name, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 50 });
    currentY += 7;

    // Price / Promo Tag
    const currency = page.currency || '$';
    const hasActivePromo = item.hasPromo && item.promoPrice && item.promoPrice < item.price;
    
    if (hasActivePromo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(220, 38, 38);
      doc.text(`${currency}${item.promoPrice?.toFixed(2)}`, pageWidth / 2 - 12, currentY, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(148, 163, 184);
      doc.text(`${currency}${item.price.toFixed(2)}`, pageWidth / 2 + 16, currentY, { align: 'center' });

      const promoBadge = item.promoDescription || 'PROMO';
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(pageWidth / 2 + 28, currentY - 5, 26, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text(promoBadge.slice(0, 10).toUpperCase(), pageWidth / 2 + 41, currentY - 0.7, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(5, 150, 105);
      doc.text(`${currency}${item.price.toFixed(2)}`, pageWidth / 2, currentY, { align: 'center' });
    }
    currentY += 7;

    // High-Visibility QR Code Name Tag
    if (tableNumber && tableNumber.trim()) {
      const badgeText = tableNumber.trim();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      const textWidth = doc.getTextWidth(badgeText);
      const boxWidth = Math.min(pageWidth - 48, Math.max(65, textWidth + 28));
      const boxHeight = 12.5;
      const boxX = pageWidth / 2 - boxWidth / 2;
      const boxY = currentY;

      // Tag Background (Warm golden amber tag for high visibility)
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'F');

      // Tag Border
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1.2);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'S');

      // Tag eyelet / hole circle on left
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.8);
      doc.circle(boxX + 6.5, boxY + boxHeight / 2, 1.8, 'FD');

      // Tag Name Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(146, 64, 14);
      doc.text(badgeText, boxX + (boxWidth + 6.5) / 2, boxY + 8.6, {
        align: 'center',
        maxWidth: boxWidth - 18,
      });

      currentY += boxHeight + 4;
    } else {
      currentY += 2;
    }

    // Callout box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('SCAN TO ORDER / VIEW ITEM', pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    // QR Code generation for this item
    const itemUrl = this.getCustomerItemUrl(page.id, item.id);
    const qrDataUrl = await this.generateQrCodeDataUrl(itemUrl, {
      width: 800,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    // Enlarge QR size to 120mm to match full poster
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 4, 4, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);

    currentY += qrSize + 10;

    // Instruction pill
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth / 2 - 42, currentY, 84, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('POINT CAMERA AT CODE TO SCAN', pageWidth / 2, currentY + 5.5, { align: 'center' });

    currentY += 12;

    // Wi-Fi or Contact note
    if (page.wifiName || page.phone) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const note = page.wifiName ? `Free Wi-Fi: ${page.wifiName} | Pass: ${page.wifiPassword || 'None'}` : `Call: ${page.phone}`;
      doc.text(note, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 60 });
    }

    // Footer branding
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Brivu QR Hosting', pageWidth / 2, pageHeight - 20, { align: 'center' });

    const safeItemName = item.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `${safeItemName}_Item_QR_Poster.pdf`;
    return await saveJsPdf(doc, pdfFilename, `${item.name} QR Poster`, { folder: 'qr_stands' });
  }

  /**
   * Generates and downloads a printable Photo Spotlight Poster PDF (A4)
   */
  static async downloadPrintablePhotoStand(
    page: QRCodeHostedPage,
    photo: QRBusinessPhoto,
    tableNumber?: string
  ): Promise<SaveFileResult> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Theme color parsing
    const hex = page.accentColor || '#059669';
    let r = 5, g = 150, b = 105;
    if (hex.startsWith('#') && hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }

    // Outer Decorative Border
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.2);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, 'D');

    // Header Background Banner
    doc.setFillColor(r, g, b);
    doc.roundedRect(18, 18, pageWidth - 36, 28, 3, 3, 'F');

    // Business Title & Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(page.title || 'Photo Spotlight', pageWidth / 2, 32, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(240, 253, 244);
    doc.text('Scan below to explore our photos and details', pageWidth / 2, 41, { align: 'center' });

    let currentY = 52;

    // Photo Category Pill
    if (photo.category) {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth / 2 - 25, currentY, 50, 7, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(photo.category.toUpperCase(), pageWidth / 2, currentY + 4.8, { align: 'center' });
      currentY += 10;
    }

    const photoHeadline = photo.title || photo.description;
    if (photoHeadline) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(photoHeadline, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 50 });
      currentY += 8;
    }

    // High-Visibility QR Code Name Tag
    if (tableNumber && tableNumber.trim()) {
      let badgeText = tableNumber.trim()
        .replace(/photos?\s*only/gi, '')
        .replace(/items?\s*only/gi, '')
        .replace(/business\s*info\s*only/gi, '')
        .trim();

      if (badgeText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        const textWidth = doc.getTextWidth(badgeText);
        const boxWidth = Math.min(pageWidth - 48, Math.max(65, textWidth + 28));
        const boxHeight = 12.5;
        const boxX = pageWidth / 2 - boxWidth / 2;
        const boxY = currentY;

        // Tag Background (Warm golden amber tag for high visibility)
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'F');

        // Tag Border
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(1.2);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3.5, 3.5, 'S');

        // Tag eyelet / hole circle on left
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.8);
        doc.circle(boxX + 6.5, boxY + boxHeight / 2, 1.8, 'FD');

        // Tag Name Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(146, 64, 14);
        doc.text(badgeText, boxX + (boxWidth + 6.5) / 2, boxY + 8.6, {
          align: 'center',
          maxWidth: boxWidth - 18,
        });

        currentY += boxHeight + 4;
      } else {
        currentY += 2;
      }
    } else {
      currentY += 2;
    }

    // Callout box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('SCAN TO VIEW DETAILS', pageWidth / 2, currentY, { align: 'center' });

    currentY += 8;

    // QR Code generation for this photo
    const photoUrl = this.getCustomerPhotoUrl(page.id, photo.id);
    const qrDataUrl = await this.generateQrCodeDataUrl(photoUrl, {
      width: 800,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    // Enlarge QR size to 120mm to match full poster
    const qrSize = 120;
    const qrX = (pageWidth - qrSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(qrX - 5, currentY - 5, qrSize + 10, qrSize + 10, 4, 4, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);

    currentY += qrSize + 10;

    // Instruction pill
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth / 2 - 42, currentY, 84, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('POINT CAMERA AT CODE TO SCAN', pageWidth / 2, currentY + 5.5, { align: 'center' });

    currentY += 12;

    // Wi-Fi or Contact note
    if (page.wifiName || page.phone) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const note = page.wifiName ? `Free Wi-Fi: ${page.wifiName} | Pass: ${page.wifiPassword || 'None'}` : `Call: ${page.phone}`;
      doc.text(note, pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 60 });
    }

    // Footer branding
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Brivu QR Hosting', pageWidth / 2, pageHeight - 20, { align: 'center' });

    const safePhotoName = (photo.title || photo.description || 'Photo').replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `${safePhotoName}_Photo_QR_Poster.pdf`;
    return await saveJsPdf(doc, pdfFilename, 'Photo QR Poster', { folder: 'qr_stands' });
  }

  /**
   * Generates a high-resolution PNG image with the QR Code and its Name prominently displayed on top
   */
  static async generateNamedQrPng(options: {
    qrDataUrl: string;
    name: string;
    subtitle?: string;
    tag?: string;
    urlOrHandle?: string;
    boxBgColor?: string;
    boxBorderColor?: string;
    darkColor?: string;
    lightColor?: string;
    accentColor?: string;
  }): Promise<string> {
    if (typeof document === 'undefined') {
      return options.qrDataUrl;
    }

    try {
      // 1. Load QR image
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = (e) => reject(e);
        qrImg.src = options.qrDataUrl;
      });

      const canvasWidth = 1080;
      const primaryColor = options.darkColor || '#0f172a';
      const accent = options.accentColor || '#059669';
      const lightBg = options.lightColor || '#ffffff';
      const boxBg = options.boxBgColor || lightBg;
      const boxBorder = options.boxBorderColor && options.boxBorderColor !== 'transparent'
        ? options.boxBorderColor
        : null;

      // Create measurement canvas
      const testCanvas = document.createElement('canvas');
      testCanvas.width = canvasWidth;
      testCanvas.height = 1200;
      const testCtx = testCanvas.getContext('2d');
      if (!testCtx) return options.qrDataUrl;

      // Word wrapping helper for title
      const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let cur = '';
        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(test).width > maxWidth && cur) {
            lines.push(cur);
            cur = w;
          } else {
            cur = test;
          }
        }
        if (cur) lines.push(cur);
        return lines.length > 0 ? lines : [text];
      };

      // Measure Title Lines
      testCtx.font = 'bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      const titleLines = wrapText(testCtx, options.name || 'QR Code', 900);
      const titleLineHeight = 56;
      const titleBlockHeight = titleLines.length * titleLineHeight;

      // Layout coordinates
      let curY = 60;

      // Optional Tag Badge
      const hasTag = Boolean(options.tag && options.tag.trim());
      const tagHeight = hasTag ? 46 : 0;
      if (hasTag) {
        curY += tagHeight + 16;
      }

      const titleY = curY;
      curY += titleBlockHeight + 12;

      // Subtitle
      const hasSubtitle = Boolean(options.subtitle && options.subtitle.trim());
      const subY = curY;
      if (hasSubtitle) {
        curY += 34 + 32;
      } else {
        curY += 24;
      }

      // QR Box Dimensions
      const qrSize = 720;
      const boxPadding = 30;
      const boxSize = qrSize + boxPadding * 2; // 780
      const boxX = (canvasWidth - boxSize) / 2; // 150
      const boxY = curY;
      curY += boxSize + 36;

      // Bottom URL / Note
      const hasUrl = Boolean(options.urlOrHandle && options.urlOrHandle.trim());
      const urlY = curY;
      if (hasUrl) {
        curY += 30 + 16;
      }

      // Footer brand
      const footerY = curY;
      curY += 40 + 40; // bottom padding

      const canvasHeight = Math.max(1260, Math.ceil(curY));

      // 2. Render Main Canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return options.qrDataUrl;

      // Canvas background (pure white for crisp print & digital share)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Rounded rectangle drawing helper
      const drawRoundRect = (
        c: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
      };

      // Draw Top Tag Badge if present
      if (hasTag && options.tag) {
        testCtx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const tagText = options.tag.toUpperCase();
        const tagTextWidth = testCtx.measureText(tagText).width;
        const tagW = Math.max(140, tagTextWidth + 36);
        const tagX = (canvasWidth - tagW) / 2;
        const tagBadgeY = 56;

        ctx.fillStyle = `${accent}14`;
        drawRoundRect(ctx, tagX, tagBadgeY, tagW, 40, 20);
        ctx.fill();

        ctx.strokeStyle = `${accent}40`;
        ctx.lineWidth = 2;
        drawRoundRect(ctx, tagX, tagBadgeY, tagW, 40, 20);
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, canvasWidth / 2, tagBadgeY + 20);
      }

      // Draw QR Code Name on Top (Primary Title)
      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      titleLines.forEach((line, idx) => {
        ctx.fillText(line, canvasWidth / 2, titleY + idx * titleLineHeight);
      });

      // Draw Subtitle / Description if present
      if (hasSubtitle && options.subtitle) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(options.subtitle, canvasWidth / 2, subY);
      }

      // Draw QR Code Outer Frame Box
      // Soft shadow
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;

      ctx.fillStyle = boxBg;
      drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 32);
      ctx.fill();
      ctx.restore();

      // Box Border
      if (boxBorder) {
        ctx.strokeStyle = boxBorder;
        ctx.lineWidth = 6;
        drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 32);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, boxX, boxY, boxSize, boxSize, 32);
        ctx.stroke();
      }

      // Draw QR Code Image inside Box
      ctx.drawImage(qrImg, boxX + boxPadding, boxY + boxPadding, qrSize, qrSize);

      // Draw Bottom URL / Note
      if (hasUrl && options.urlOrHandle) {
        ctx.fillStyle = '#475569';
        ctx.font = '600 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const displayUrl = options.urlOrHandle.length > 55
          ? options.urlOrHandle.slice(0, 52) + '...'
          : options.urlOrHandle;
        ctx.fillText(displayUrl, canvasWidth / 2, urlY);
      }

      // Subtle Footer instruction
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Point camera at code to scan • Brivu', canvasWidth / 2, footerY);

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to generate named QR PNG:', err);
      return options.qrDataUrl;
    }
  }
}
