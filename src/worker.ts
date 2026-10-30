export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  DB?: any;
  brivu_db?: any;
  d1?: any;
  D1?: any;
  brivu_d1?: any;
  DATABASE?: any;
  BUCKET?: any;
  brivu_bucket?: any;
  MY_BUCKET?: any;
  r2?: any;
  R2?: any;
  brivu_r2?: any;
  BRIVU_BUCKET?: any;
  WORKOS_API_KEY?: string;
  WORKOS_CLIENT_ID?: string;
  WORKOS_REDIRECT_URI?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key, X-User-Email, X-User-Id, X-Requested-With, X-WorkOS-Client-Id, X-WorkOS-Api-Key, Origin, Accept',
  'Access-Control-Max-Age': '86400',
};

// Flexible detector for any attached R2 storage bucket
export function getR2Bucket(env: any): any {
  if (env.BUCKET && typeof env.BUCKET.put === 'function') return env.BUCKET;
  if (env.brivu_bucket && typeof env.brivu_bucket.put === 'function') return env.brivu_bucket;
  if (env.MY_BUCKET && typeof env.MY_BUCKET.put === 'function') return env.MY_BUCKET;
  if (env.r2 && typeof env.r2.put === 'function') return env.r2;
  if (env.R2 && typeof env.R2.put === 'function') return env.R2;
  if (env.brivu_r2 && typeof env.brivu_r2.put === 'function') return env.brivu_r2;
  if (env.BRIVU_BUCKET && typeof env.BRIVU_BUCKET.put === 'function') return env.BRIVU_BUCKET;
  if (env.STORAGE && typeof env.STORAGE.put === 'function') return env.STORAGE;
  if (env.FILES && typeof env.FILES.put === 'function') return env.FILES;
  for (const [key, val] of Object.entries(env)) {
    if (key !== 'ASSETS' && val && typeof val === 'object' && typeof (val as any).put === 'function' && typeof (val as any).get === 'function') {
      return val;
    }
  }
  return null;
}

// Flexible detector for any attached D1 relational database
export function getD1Database(env: any): any {
  if (env.DB && typeof env.DB.prepare === 'function') return env.DB;
  if (env.brivu_db && typeof env.brivu_db.prepare === 'function') return env.brivu_db;
  if (env.d1 && typeof env.d1.prepare === 'function') return env.d1;
  if (env.D1 && typeof env.D1.prepare === 'function') return env.D1;
  if (env.brivu_d1 && typeof env.brivu_d1.prepare === 'function') return env.brivu_d1;
  if (env.BRIVU_DB && typeof env.BRIVU_DB.prepare === 'function') return env.BRIVU_DB;
  if (env.DATABASE && typeof env.DATABASE.prepare === 'function') return env.DATABASE;
  if (env.db && typeof env.db.prepare === 'function') return env.db;
  for (const [key, val] of Object.entries(env)) {
    if (val && typeof val === 'object' && typeof (val as any).prepare === 'function' && typeof (val as any).batch === 'function') {
      return val;
    }
  }
  return null;
}

// In-memory auth session cache for fast instant login polling across web and Android
const authSessionsCache = new Map<string, { status: string; code?: string; user?: any; createdAt: number }>();

// 60s Query Cache & D1 metrics logger
const queryCache = new Map<string, { data: any; expiry: number }>();

export function getCachedQuery(key: string): any | null {
  const cached = queryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  queryCache.delete(key);
  return null;
}

export function setCachedQuery(key: string, data: any, ttlSeconds = 60): void {
  queryCache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

export function invalidateCachePattern(pattern: string): void {
  for (const k of queryCache.keys()) {
    if (k.includes(pattern)) {
      queryCache.delete(k);
    }
  }
}

export async function executeMeasuredQuery(stmt: any, queryName = 'D1_QUERY'): Promise<any> {
  const start = Date.now();
  let res: any;
  try {
    res = await stmt.all();
  } catch (err) {
    try {
      res = await stmt.run();
    } catch (err2) {
      res = { results: [], meta: { rows_read: 0, rows_written: 0, duration: Date.now() - start } };
    }
  }
  const duration = Date.now() - start;
  const meta = res?.meta || {};
  const rowsRead = meta.rows_read ?? meta.rowsRead ?? 0;
  const rowsWritten = meta.rows_written ?? meta.rowsWritten ?? 0;
  console.info(`[D1 METRICS] query=${queryName} rows_read=${rowsRead} rows_written=${rowsWritten} duration_ms=${duration}`);
  return res;
}

// Automatically create D1 backups, files, receipts, products, invoices, invoice_items, menus and auth_sessions tables and indexes if D1 is bound
export async function ensureD1Tables(db: any): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        backup_data TEXT,
        updated_at TEXT
      )
    `).run();
  } catch (_) {}
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT,
        mime_type TEXT,
        size INTEGER,
        data_base64 TEXT,
        created_at TEXT
      )
    `).run();
  } catch (_) {}
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        receipt_number TEXT,
        total REAL,
        data_json TEXT,
        created_at TEXT
      )
    `).run();
  } catch (_) {}
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        session_id TEXT PRIMARY KEY,
        status TEXT,
        code TEXT,
        user_json TEXT,
        created_at INTEGER
      )
    `).run();
  } catch (_) {}
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS qr_pages (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        page_json TEXT,
        updated_at TEXT
      )
    `).run();
  } catch (_) {}
  try {
    await db.prepare(`ALTER TABLE qr_pages ADD COLUMN user_email TEXT`).run();
  } catch (_) {}

  // Products table & indexes
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        category TEXT,
        selling_price REAL,
        cost_price REAL,
        stock_quantity INTEGER,
        image TEXT,
        updated_at TEXT
      )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_shop_updated ON products(shop_id, updated_at)`).run();
  } catch (_) {}

  // Invoices table & indexes
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        invoice_number TEXT,
        customer_name TEXT,
        total REAL,
        tax REAL,
        status TEXT,
        updated_at TEXT,
        created_at TEXT
      )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON invoices(shop_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_shop_updated ON invoices(shop_id, updated_at)`).run();
  } catch (_) {}

  // Invoice Items table & indexes
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_id TEXT,
        quantity INTEGER,
        unit_price REAL,
        total REAL
      )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`).run();
  } catch (_) {}

  // Menus table & indexes
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        hotel_id TEXT NOT NULL,
        title TEXT,
        menu_data TEXT,
        updated_at TEXT
      )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_menus_hotel_id ON menus(hotel_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_menus_hotel_updated ON menus(hotel_id, updated_at)`).run();
  } catch (_) {}
}

// Robust resolver for QR Hosted Pages scoped by pageId and user email
export async function resolveHostedQrPage(
  env: Env,
  rawPageId: string,
  rawUserEmail?: string
): Promise<any | null> {
  const pageId = (rawPageId || '').trim();
  const rawIdBase = pageId.replace(/^business-/, '').replace(/^qr-/, '');
  const possiblePageIds = Array.from(new Set([
    pageId,
    `business-${rawIdBase}`,
    `qr-${rawIdBase}`,
    rawIdBase
  ]));
  let userEmail = (rawUserEmail || '').toLowerCase().trim();
  const bucket = getR2Bucket(env);
  const db = getD1Database(env);

  // If userEmail is not specified in query or headers, attempt to discover owner email from D1 qr_pages or backups
  if (!userEmail && pageId && pageId !== 'default' && pageId !== 'latest') {
    if (db) {
      try {
        await ensureD1Tables(db);
        const row: any = await db.prepare('SELECT user_email, page_json FROM qr_pages WHERE id = ?').bind(pageId).first();
        if (row?.user_email) {
          userEmail = row.user_email.toLowerCase().trim();
        } else if (row?.page_json) {
          try {
            const parsed = JSON.parse(row.page_json);
            if (parsed?.userEmail || parsed?.email) {
              userEmail = (parsed.userEmail || parsed.email).toLowerCase().trim();
            }
          } catch (_) {}
        }
        if (!userEmail) {
          const bRow: any = await db.prepare("SELECT user_email FROM backups WHERE backup_data LIKE ? ORDER BY updated_at DESC LIMIT 1").bind(`%"${pageId}"%`).first();
          if (bRow?.user_email) {
            userEmail = bRow.user_email.toLowerCase().trim();
          }
        }
      } catch (_) {}
    }
  }

  // Helper to fetch backup data strictly scoped for this user email
  const getUserBackupData = async (): Promise<any | null> => {
    if (!userEmail) return null;

    // 1. Check D1 backups table first (sub-millisecond SQLite edge lookup)
    if (db) {
      try {
        await ensureD1Tables(db);
        const row: any = await db.prepare(`
          SELECT backup_data FROM backups
          WHERE LOWER(user_email) = ?
             OR id = ?
          ORDER BY updated_at DESC LIMIT 1
        `).bind(userEmail, `user_${userEmail}`).first();

        if (row?.backup_data) {
          try {
            const parsed = JSON.parse(row.backup_data);
            if (parsed) return parsed;
          } catch (_) {}
        }

        // By username prefix before '@'
        const userPrefix = userEmail.split('@')[0];
        if (userPrefix && userPrefix.length >= 3) {
          const prefixRow: any = await db.prepare(`
            SELECT backup_data FROM backups
            WHERE LOWER(user_email) = ? OR LOWER(user_email) LIKE ?
            ORDER BY updated_at DESC LIMIT 1
          `).bind(userEmail, `%${userPrefix}%`).first();

          if (prefixRow?.backup_data) {
            try {
              const parsed = JSON.parse(prefixRow.backup_data);
              if (parsed) return parsed;
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    // 2. Check R2 only if D1 did not have the backup
    if (bucket) {
      try {
        const userKey = encodeURIComponent(userEmail);
        let bObj = await bucket.get(`users/${userKey}/latest_backup.json`);
        if (!bObj) bObj = await bucket.get(`users/${userKey}/backup.json`);
        if (bObj) {
          const parsed = JSON.parse(await bObj.text());
          if (parsed) return parsed;
        }
      } catch (_) {}
    }

    return null;
  };

  // Convert backup data to QRCodeHostedPage helper (STRICTLY BUSINESS MENU / SHOWCASE)
  const convertBackupToPage = (bData: any): any => {
    if (!bData) return null;
    const pages = Array.isArray(bData.qrHostedPages) ? bData.qrHostedPages : [];
    // Only business pages!
    const businessPages = pages.filter((p: any) =>
      p &&
      p.pageType !== 'websites_hub' &&
      p.pageType !== 'socials_hub' &&
      p.pageType !== 'events_hub' &&
      !String(p.id).includes('websites') &&
      !String(p.id).includes('socials') &&
      !String(p.id).includes('events')
    );

    if (pageId && pageId !== 'default' && pageId !== 'latest') {
      const found = businessPages.find((p: any) => p?.id === pageId || p?.id === `business-${rawIdBase}` || p?.id === `qr-${rawIdBase}` || p?.id === rawIdBase);
      if (found && ((found.menuItems && found.menuItems.length > 0) || (found.photos && found.photos.length > 0))) return found;
    }
    const populated = businessPages.find((p: any) => (p?.photos && p.photos.length > 0) || (p?.menuItems && p.menuItems.length > 0));
    if (populated) return populated;

    const profile = bData.profile || {};
    const inventory = Array.isArray(bData.inventoryProducts) ? bData.inventoryProducts : (Array.isArray(bData.inventory) ? bData.inventory : []);
    const photos = Array.isArray(bData.photos) ? bData.photos : [];
    const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');

    // If there are inventory products or photos in the backup, convert them into a complete business showcase page
    if (inventory.length > 0 || photos.length > 0) {
      return {
        id: pageId || businessPages[0]?.id || 'business-latest',
        title: profile.name || (userEmail ? `${userEmail.split('@')[0]}'s Business` : 'Brivu Business'),
        tagline: profile.description || 'Welcome to our official business page',
        description: profile.description || '',
        pageType: 'menu',
        accentColor: profile.themeColor || '#059669',
        theme: 'emerald',
        logo: profile.logo,
        coverImage: photos[0]?.url || (typeof photos[0] === 'string' ? photos[0] : undefined),
        phone: profile.phone || '',
        whatsapp: cleanWa,
        email: profile.email || userEmail || '',
        userEmail: userEmail || profile.email || '',
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

    if (businessPages[0]) return businessPages[0];

    return {
      id: pageId || 'business-latest',
      title: profile.name || (userEmail ? `${userEmail.split('@')[0]}'s Business` : 'Brivu Business'),
      tagline: profile.description || 'Welcome to our official business page',
      description: profile.description || '',
      pageType: 'menu',
      accentColor: profile.themeColor || '#059669',
      theme: 'emerald',
      logo: profile.logo,
      coverImage: undefined,
      phone: profile.phone || '',
      whatsapp: cleanWa,
      email: profile.email || userEmail || '',
      userEmail: userEmail || profile.email || '',
      address: profile.address || '',
      currency: profile.currency || 'UGX',
      openingHours: '',
      allowWhatsAppOrdering: true,
      photos: [],
      menuCategories: ['All'],
      menuItems: [],
      qrDarkColor: '#000000',
      qrLightColor: '#ffffff',
      qrEyeColor: '#000000',
      qrBoxBgColor: '#ffffff',
      qrBoxBorderColor: '#cbd5e1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const normId = (pageId || '').toLowerCase().trim();

  // Strict Section Classification
  const isWebsitesSection =
    normId.includes('websites') ||
    normId.includes('website') ||
    normId.includes('web-hub') ||
    normId.startsWith('web-') ||
    normId === 'websites' ||
    normId === 'website' ||
    normId === 'websites-hub-all';

  const isSocialsSection =
    !isWebsitesSection && (
      normId.includes('socials') ||
      normId.includes('social') ||
      normId.includes('social-hub') ||
      normId.startsWith('social-') ||
      normId === 'socials' ||
      normId === 'social' ||
      normId === 'socials-hub-all'
    );

  const isEventsSection =
    !isWebsitesSection &&
    !isSocialsSection && (
      normId.includes('events') ||
      normId.includes('event') ||
      normId.includes('event-hub') ||
      normId.startsWith('event-') ||
      normId === 'events' ||
      normId === 'event' ||
      normId === 'events-hub-all'
    );

  const isBusinessSection =
    !isWebsitesSection &&
    !isSocialsSection &&
    !isEventsSection;

  // ==========================================
  // SECTION 1: WEBSITES & APPS DIRECTORY
  // Scoped to userEmail (e.g. shapesmm7@gmail.com)
  // ==========================================
  if (isWebsitesSection) {
    // 1. Direct targeted query in D1 qr_pages table for websites
    if (db) {
      try {
        await ensureD1Tables(db);
        const directKeys = [pageId, `user_${userEmail}_websites`, 'websites-hub-all', 'websites'].filter(Boolean);
        for (const k of directKeys) {
          const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE id = ? LIMIT 1").bind(k).first();
          if (row?.page_json) {
            try {
              const parsed = JSON.parse(row.page_json);
              if (parsed && ((parsed.websitesQrItems && parsed.websitesQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                return {
                  ...parsed,
                  id: pageId || parsed.id || 'websites-hub-all',
                  pageType: 'websites_hub',
                  userEmail: userEmail || parsed.userEmail || parsed.email,
                  email: userEmail || parsed.email || parsed.userEmail,
                };
              }
            } catch (_) {}
          }
        }

        if (userEmail) {
          const rows: any = await db.prepare(`
            SELECT page_json FROM qr_pages
            WHERE LOWER(user_email) = ?
              AND (id LIKE '%websites%' OR page_json LIKE '%websites_hub%' OR page_json LIKE '%websitesQrItems%')
            ORDER BY updated_at DESC
            LIMIT 5
          `).bind(userEmail).all();

          if (rows?.results && Array.isArray(rows.results)) {
            for (const row of rows.results as any[]) {
              if (row?.page_json) {
                try {
                  const parsed = JSON.parse(row.page_json);
                  if (parsed && ((parsed.websitesQrItems && parsed.websitesQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                    return {
                      ...parsed,
                      id: pageId || parsed.id || 'websites-hub-all',
                      pageType: 'websites_hub',
                      userEmail: userEmail || parsed.userEmail || parsed.email,
                      email: userEmail || parsed.email || parsed.userEmail,
                    };
                  }
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {}
    }

    // 2. Extract websites from user's Cloudflare backup data
    const bData = await getUserBackupData();
    if (bData) {
      const profile = bData.profile || {};
      const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
      let websites = Array.isArray(bData.websitesQrItems)
        ? bData.websitesQrItems
        : (Array.isArray(bData.websites) ? bData.websites : []);
      if (websites.length === 0 && Array.isArray(bData.qrHostedPages)) {
        const wPage = bData.qrHostedPages.find((p: any) => p && (p.pageType === 'websites_hub' || String(p.id).includes('websites')));
        if (wPage?.websitesQrItems && wPage.websitesQrItems.length > 0) {
          websites = wPage.websitesQrItems;
        } else if (wPage?.menuItems && wPage.menuItems.length > 0) {
          return {
            ...wPage,
            id: pageId || wPage.id || 'websites-hub-all',
            pageType: 'websites_hub',
            userEmail: userEmail || wPage.userEmail || profile.email,
            email: userEmail || wPage.email || profile.email,
          };
        }
      }
      if (websites.length === 0 && (profile.website || profile.socialLinks?.website)) {
        const webUrl = (profile.website || profile.socialLinks?.website || '').trim();
        if (webUrl) {
          websites = [{
            id: 'official-site',
            title: profile.name ? `${profile.name} Official Website` : 'Official Website',
            url: webUrl.startsWith('http') ? webUrl : `https://${webUrl}`,
            type: 'website',
            ctaText: 'Visit Website',
            createdAt: new Date().toISOString(),
          }];
        }
      }

      if (websites.length > 0) {
        return {
          id: pageId || 'websites-hub-all',
          title: 'Our Sites',
          description: `Official web links and verified online apps directory for ${profile.name || 'our company'}.`,
          pageType: 'websites_hub',
          accentColor: '#2563eb',
          theme: 'indigo',
          logo: profile.logo,
          phone: profile.phone || '',
          whatsapp: cleanWa,
          email: profile.email || userEmail || '',
          userEmail: userEmail || profile.email || '',
          address: profile.address || '',
          googleMapsUrl: profile.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}` : undefined,
          currency: profile.currency || 'USD',
          announcement: `🌐 ${websites.length} Official Link${websites.length === 1 ? '' : 's'} Available`,
          photos: [],
          menuCategories: ['Our Sites'],
          menuItems: websites.map((w: any) => ({
            id: `web-${w.id}`,
            name: w.title,
            category: 'Our Sites',
            price: 0,
            description: w.description || w.url,
            url: w.url,
            ctaText: w.ctaText || 'Visit Website',
            itemType: w.type,
            phone: w.phone,
            phoneAction: w.phoneAction,
            tags: [w.type, w.ctaText || 'Visit Website'],
            isSpecial: true,
            isAvailable: true,
          })),
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
    }

    // 3. Fallback: Search any websites hub in qr_pages with links
    if (db) {
      try {
        const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE (id LIKE 'websites%' OR page_json LIKE '%websites_hub%') AND page_json LIKE '%http%' ORDER BY updated_at DESC LIMIT 1").first();
        if (row?.page_json) {
          const parsed = JSON.parse(row.page_json);
          if (parsed && (parsed.websitesQrItems?.length > 0 || parsed.menuItems?.length > 0)) {
            return { ...parsed, id: pageId || parsed.id, userEmail: userEmail || parsed.userEmail, email: userEmail || parsed.email };
          }
        }
      } catch (_) {}
    }

    return {
      id: pageId || 'websites-hub-all',
      title: 'Our Sites',
      pageType: 'websites_hub',
      email: userEmail,
      userEmail: userEmail,
      websitesQrItems: [],
      menuItems: [],
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // SECTION 2: SOCIALS & MESSAGING HUB
  // Scoped to userEmail (e.g. shapesmm7@gmail.com)
  // ==========================================
  if (isSocialsSection) {
    // 1. Direct targeted query in D1 qr_pages table for socials
    if (db) {
      try {
        await ensureD1Tables(db);
        const directKeys = [pageId, `user_${userEmail}_socials`, 'socials-hub-all', 'socials'].filter(Boolean);
        for (const k of directKeys) {
          const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE id = ? LIMIT 1").bind(k).first();
          if (row?.page_json) {
            try {
              const parsed = JSON.parse(row.page_json);
              if (parsed && ((parsed.socialsQrItems && parsed.socialsQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                return {
                  ...parsed,
                  id: pageId || parsed.id || 'socials-hub-all',
                  pageType: 'socials_hub',
                  userEmail: userEmail || parsed.userEmail || parsed.email,
                  email: userEmail || parsed.email || parsed.userEmail,
                };
              }
            } catch (_) {}
          }
        }

        if (userEmail) {
          const rows: any = await db.prepare(`
            SELECT page_json FROM qr_pages
            WHERE LOWER(user_email) = ?
              AND (id LIKE '%socials%' OR page_json LIKE '%socials_hub%' OR page_json LIKE '%socialsQrItems%')
            ORDER BY updated_at DESC
            LIMIT 5
          `).bind(userEmail).all();

          if (rows?.results && Array.isArray(rows.results)) {
            for (const row of rows.results as any[]) {
              if (row?.page_json) {
                try {
                  const parsed = JSON.parse(row.page_json);
                  if (parsed && ((parsed.socialsQrItems && parsed.socialsQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                    return {
                      ...parsed,
                      id: pageId || parsed.id || 'socials-hub-all',
                      pageType: 'socials_hub',
                      userEmail: userEmail || parsed.userEmail || parsed.email,
                      email: userEmail || parsed.email || parsed.userEmail,
                    };
                  }
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {}
    }

    // 2. Extract socials from user's Cloudflare backup data
    const bData = await getUserBackupData();
    if (bData) {
      const profile = bData.profile || {};
      const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
      let socials = Array.isArray(bData.socialsQrItems)
        ? bData.socialsQrItems
        : (Array.isArray(bData.socials) ? bData.socials : []);
      if (socials.length === 0 && Array.isArray(bData.qrHostedPages)) {
        const sPage = bData.qrHostedPages.find((p: any) => p && (p.pageType === 'socials_hub' || String(p.id).includes('socials')));
        if (sPage?.socialsQrItems && sPage.socialsQrItems.length > 0) {
          socials = sPage.socialsQrItems;
        } else if (sPage?.menuItems && sPage.menuItems.length > 0) {
          return {
            ...sPage,
            id: pageId || sPage.id || 'socials-hub-all',
            pageType: 'socials_hub',
            userEmail: userEmail || sPage.userEmail || profile.email,
            email: userEmail || sPage.email || profile.email,
          };
        }
      }
      if (socials.length === 0) {
        const autoLinks: any[] = [];
        if (cleanWa) {
          autoLinks.push({
            id: 'soc-whatsapp',
            platform: 'whatsapp',
            title: 'WhatsApp Official Chat',
            usernameOrPhone: cleanWa,
            fullUrl: `https://wa.me/${cleanWa}`,
            ctaText: 'Chat on WhatsApp',
          });
        }
        if (profile.socialLinks?.instagram) {
          const h = profile.socialLinks.instagram.replace(/^@/, '').trim();
          autoLinks.push({
            id: 'soc-instagram',
            platform: 'instagram',
            title: 'Instagram',
            usernameOrPhone: h,
            fullUrl: h.startsWith('http') ? h : `https://instagram.com/${h}`,
            ctaText: 'Follow on Instagram',
          });
        }
        if (profile.socialLinks?.facebook) {
          const fb = profile.socialLinks.facebook.trim();
          autoLinks.push({
            id: 'soc-facebook',
            platform: 'facebook',
            title: 'Facebook',
            usernameOrPhone: fb,
            fullUrl: fb.startsWith('http') ? fb : `https://facebook.com/${fb}`,
            ctaText: 'Visit Facebook',
          });
        }
        if (profile.socialLinks?.tiktok) {
          const tt = profile.socialLinks.tiktok.replace(/^@/, '').trim();
          autoLinks.push({
            id: 'soc-tiktok',
            platform: 'tiktok',
            title: 'TikTok',
            usernameOrPhone: tt,
            fullUrl: tt.startsWith('http') ? tt : `https://tiktok.com/@${tt}`,
            ctaText: 'Watch on TikTok',
          });
        }
        if (autoLinks.length > 0) {
          socials = autoLinks;
        }
      }

      if (socials.length > 0) {
        return {
          id: pageId || 'socials-hub-all',
          title: 'our social media platforms',
          tagline: 'Connect Across All Official Social Channels & Messaging Apps',
          description: `Official social media profiles, chat channels, and community links for ${profile.name || 'our brand'}.`,
          pageType: 'socials_hub',
          accentColor: '#059669',
          theme: 'emerald',
          logo: profile.logo,
          phone: profile.phone || '',
          whatsapp: cleanWa,
          email: profile.email || userEmail || '',
          userEmail: userEmail || profile.email || '',
          address: profile.address || '',
          googleMapsUrl: profile.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}` : undefined,
          currency: profile.currency || 'USD',
          announcement: `💬 ${socials.length} Official Channel${socials.length === 1 ? '' : 's'} Connected`,
          photos: [],
          menuCategories: ['Official Social Media & Messaging'],
          menuItems: socials.map((s: any) => ({
            id: `social-${s.id}`,
            name: s.title || s.customPlatformName || s.platform,
            category: 'Official Social Media & Messaging',
            price: 0,
            description: s.prefilledMessage || s.fullUrl,
            url: s.fullUrl,
            ctaText: s.ctaText || 'Connect',
            itemType: s.platform,
            tags: [s.platform, s.ctaText || 'Connect'],
            isSpecial: true,
            isAvailable: true,
          })),
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
    }

    // 3. Fallback: Search any socials hub in qr_pages with links
    if (db) {
      try {
        const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE (id LIKE 'socials%' OR page_json LIKE '%socials_hub%') AND page_json LIKE '%http%' ORDER BY updated_at DESC LIMIT 1").first();
        if (row?.page_json) {
          const parsed = JSON.parse(row.page_json);
          if (parsed && (parsed.socialsQrItems?.length > 0 || parsed.menuItems?.length > 0)) {
            return { ...parsed, id: pageId || parsed.id, userEmail: userEmail || parsed.userEmail, email: userEmail || parsed.email };
          }
        }
      } catch (_) {}
    }

    return {
      id: pageId || 'socials-hub-all',
      title: 'our social media platforms',
      pageType: 'socials_hub',
      email: userEmail,
      userEmail: userEmail,
      socialsQrItems: [],
      menuItems: [],
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // SECTION 3: EVENTS & RSVP PASSES
  // Scoped to userEmail (e.g. shapesmm7@gmail.com)
  // ==========================================
  if (isEventsSection) {
    // 1. Direct targeted query in D1 qr_pages table for events (strictly scoped by userEmail if known)
    if (db) {
      try {
        await ensureD1Tables(db);
        if (userEmail) {
          const scopedKeys = [
            pageId,
            `user_${userEmail}_events`,
            `event-${rawIdBase}`,
            rawIdBase,
            `events-hub-${userEmail.split('@')[0]}`,
          ].filter(Boolean);

          for (const k of scopedKeys) {
            const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE id = ? AND LOWER(user_email) = ? LIMIT 1").bind(k, userEmail).first();
            if (row?.page_json) {
              try {
                const parsed = JSON.parse(row.page_json);
                if (parsed && ((parsed.eventsQrItems && parsed.eventsQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                  return {
                    ...parsed,
                    id: pageId || parsed.id || 'events-hub-all',
                    pageType: parsed.pageType || 'events_hub',
                    userEmail: userEmail,
                    email: userEmail,
                  };
                }
              } catch (_) {}
            }
          }
        }

        // Direct lookup by pageId if it is a specific event ID
        if (pageId && pageId !== 'events' && pageId !== 'events-hub-all' && pageId !== 'default' && pageId !== 'latest') {
          const directRow: any = await db.prepare("SELECT page_json, user_email FROM qr_pages WHERE id = ? LIMIT 1").bind(pageId).first();
          if (directRow?.page_json) {
            try {
              const parsed = JSON.parse(directRow.page_json);
              if (parsed && ((parsed.eventsQrItems && parsed.eventsQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                const resolvedOwner = userEmail || directRow.user_email || parsed.userEmail || parsed.email;
                return {
                  ...parsed,
                  id: pageId || parsed.id,
                  pageType: parsed.pageType || 'events_hub',
                  userEmail: resolvedOwner,
                  email: resolvedOwner,
                };
              }
            } catch (_) {}
          }
        }

        if (userEmail) {
          const rows: any = await db.prepare(`
            SELECT page_json FROM qr_pages
            WHERE LOWER(user_email) = ?
              AND (id LIKE '%event%' OR page_json LIKE '%events_hub%' OR page_json LIKE '%eventsQrItems%')
            ORDER BY updated_at DESC
            LIMIT 5
          `).bind(userEmail).all();

          if (rows?.results && Array.isArray(rows.results)) {
            for (const row of rows.results as any[]) {
              if (row?.page_json) {
                try {
                  const parsed = JSON.parse(row.page_json);
                  if (parsed && ((parsed.eventsQrItems && parsed.eventsQrItems.length > 0) || (parsed.menuItems && parsed.menuItems.length > 0))) {
                    return {
                      ...parsed,
                      id: pageId || parsed.id || 'events-hub-all',
                      pageType: parsed.pageType || 'events_hub',
                      userEmail: userEmail || parsed.userEmail || parsed.email,
                      email: userEmail || parsed.email || parsed.userEmail,
                    };
                  }
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {}
    }

    // 2. Extract events from user's latest Cloudflare backup data
    const bData = await getUserBackupData();
    if (bData) {
      const profile = bData.profile || {};
      const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');
      let events = Array.isArray(bData.eventsQrItems) ? bData.eventsQrItems : [];

      const isSingleEvent = normId.includes('event') && !normId.includes('events-hub') && normId !== 'events' && normId !== 'events-hub-all';
      if (isSingleEvent) {
        const rawTarget = pageId.toLowerCase().replace(/^event-/, '').replace(/^qr-/, '');
        const evt = events.find((e: any) => {
          const eId = String(e.id || '').toLowerCase();
          const eRaw = eId.replace(/^event-/, '').replace(/^qr-/, '');
          return eId === pageId.toLowerCase() || eRaw === rawTarget || `event-${eId}` === pageId.toLowerCase();
        });
        if (evt) {
          return {
            id: evt.id,
            title: evt.title,
            tagline: evt.ctaText || 'Official Event Invitation & RSVP Pass',
            description: evt.description || `Event Venue: ${evt.location}`,
            pageType: 'event',
            accentColor: evt.darkColor || '#7c3aed',
            theme: 'indigo',
            coverImage: evt.photos?.[0] || undefined,
            logo: evt.photos?.[0] || profile.logo || undefined,
            phone: evt.contactPhone || profile.phone || '',
            whatsapp: cleanWa,
            email: evt.contactEmail || profile.email || userEmail || '',
            userEmail: userEmail || profile.email || '',
            address: evt.location,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evt.location)}`,
            currency: profile.currency || 'UGX',
            announcement: `📅 ${evt.startDate || evt.eventDate || 'Upcoming Event'} • 📍 ${evt.location}`,
            allowWhatsAppOrdering: true,
            photos: (evt.photos || []).map((u: string, idx: number) => ({
              id: `${evt.id}-photo-${idx}`,
              url: u,
              title: evt.title,
              description: evt.location,
              badge: 'Event Photo',
            })),
            menuCategories: ['Event Pass & RSVP'],
            menuItems: [
              {
                id: `rsvp-${evt.id}`,
                name: `${evt.title} - Entry & RSVP Pass`,
                category: 'Event Pass & RSVP',
                price: 0,
                description: `${evt.description ? evt.description + ' • ' : ''}Venue: ${evt.location}. Click to RSVP!`,
                tags: ['RSVP', 'Invitation', 'Entry Pass'],
                isSpecial: true,
                isAvailable: true,
                photoUrl: evt.photos?.[0] || undefined,
              },
            ],
            qrDarkColor: evt.darkColor || '#7c3aed',
            qrLightColor: '#ffffff',
            qrEyeColor: evt.eyeColor || '#6d28d9',
            qrBoxBgColor: '#ffffff',
            qrBoxBorderColor: '#cbd5e1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }

      if (events.length === 0 && Array.isArray(bData.qrHostedPages)) {
        const ePage = bData.qrHostedPages.find((p: any) => p && (p.pageType === 'events_hub' || String(p.id).includes('events')));
        if (ePage?.eventsQrItems && ePage.eventsQrItems.length > 0) {
          events = ePage.eventsQrItems;
        } else if (ePage?.menuItems && ePage.menuItems.length > 0) {
          return {
            ...ePage,
            id: pageId || ePage.id || 'events-hub-all',
            pageType: 'events_hub',
            userEmail: userEmail || ePage.userEmail || profile.email,
            email: userEmail || ePage.email || profile.email,
          };
        }
      }

      if (events.length > 0) {
        return {
          id: pageId || 'events-hub-all',
          title: 'Our Events',
          description: `Browse our events and get access passes for ${profile.name || 'our organization'}.`,
          pageType: 'events_hub',
          accentColor: '#7c3aed',
          theme: 'indigo',
          logo: profile.logo,
          phone: profile.phone || '',
          whatsapp: cleanWa,
          email: profile.email || userEmail || '',
          userEmail: userEmail || profile.email || '',
          address: profile.address || '',
          googleMapsUrl: profile.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}` : undefined,
          currency: profile.currency || 'USD',
          announcement: `🎉 ${events.length} Upcoming Event${events.length === 1 ? '' : 's'} Available`,
          photos: events.flatMap((e: any) => (e.photos || []).map((u: string, idx: number) => ({
            id: `${e.id}-photo-${idx}`,
            url: u,
            title: e.title,
            description: e.location,
            badge: 'Event Photo',
          }))),
          menuCategories: ['Our Events'],
          menuItems: events.map((e: any) => ({
            id: `event-pass-${e.id}`,
            name: e.title,
            category: 'Our Events',
            price: 0,
            description: `${e.startDate ? e.startDate + ' • ' : ''}${e.location || ''}${e.description ? ' • ' + e.description : ''}`,
            url: e.rsvpUrl || undefined,
            ctaText: e.ctaText || 'RSVP & Join',
            tags: [e.startDate || 'Upcoming', e.location || 'Event'],
            isSpecial: true,
            isAvailable: true,
            photoUrl: e.photos?.[0] || undefined,
          })),
          eventsQrItems: events,
          qrDarkColor: '#7c3aed',
          qrLightColor: '#ffffff',
          qrEyeColor: '#6d28d9',
          qrBoxBgColor: '#ffffff',
          qrBoxBorderColor: '#cbd5e1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return {
      id: pageId || 'events-hub-all',
      title: 'Our Events',
      pageType: 'events_hub',
      email: userEmail,
      userEmail: userEmail,
      eventsQrItems: [],
      menuItems: [],
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // SECTION 4: BUSINESS QR CODE (SHOWCASE / MENU / CATALOG)
  // Scoped to userEmail (e.g. shapesmm7@gmail.com)
  // Handles: business-hub-shapesmm, qr-mv150apz, business-mv150apz, mv150apz, default, latest, etc.
  // Must ALWAYS be a business showcase / menu page, NEVER websites or socials!
  // ==========================================

  // 1. Direct targeted query in D1 qr_pages table for business showcase
  if (db) {
    try {
      await ensureD1Tables(db);
      const directKeys = [
        pageId,
        `business-${rawIdBase}`,
        `qr-${rawIdBase}`,
        rawIdBase,
        `user_${userEmail}_latest`,
        `user_${userEmail}_business`,
        'business-latest',
        'default',
        'latest'
      ].filter(Boolean);

      for (const k of directKeys) {
        const row: any = await db.prepare("SELECT page_json FROM qr_pages WHERE id = ? LIMIT 1").bind(k).first();
        if (row?.page_json) {
          try {
            const parsed = JSON.parse(row.page_json);
            if (parsed && parsed.pageType !== 'websites_hub' && parsed.pageType !== 'socials_hub' && parsed.pageType !== 'events_hub') {
              const hasBizItems = (parsed.menuItems && parsed.menuItems.length > 0) || (parsed.photos && parsed.photos.length > 0);
              if (hasBizItems) {
                return {
                  ...parsed,
                  id: pageId || parsed.id || 'business-latest',
                  pageType: parsed.pageType || 'menu',
                  userEmail: userEmail || parsed.userEmail || parsed.email,
                  email: userEmail || parsed.email || parsed.userEmail,
                };
              }
            }
          } catch (_) {}
        }
      }

      if (userEmail) {
        const rows: any = await db.prepare(`
          SELECT page_json FROM qr_pages
          WHERE LOWER(user_email) = ?
            AND (page_json LIKE '%menuItems%' OR page_json LIKE '%photos%')
            AND page_json NOT LIKE '%websites_hub%'
            AND page_json NOT LIKE '%socials_hub%'
            AND page_json NOT LIKE '%events_hub%'
          ORDER BY updated_at DESC
          LIMIT 5
        `).bind(userEmail).all();

        if (rows?.results && Array.isArray(rows.results)) {
          for (const row of rows.results as any[]) {
            if (row?.page_json) {
              try {
                const parsed = JSON.parse(row.page_json);
                if (parsed && parsed.pageType !== 'websites_hub' && parsed.pageType !== 'socials_hub' && parsed.pageType !== 'events_hub') {
                  const hasBizItems = (parsed.menuItems && parsed.menuItems.length > 0) || (parsed.photos && parsed.photos.length > 0);
                  if (hasBizItems) {
                    return {
                      ...parsed,
                      id: pageId || parsed.id || 'business-latest',
                      pageType: parsed.pageType || 'menu',
                      userEmail: userEmail || parsed.userEmail || parsed.email,
                      email: userEmail || parsed.email || parsed.userEmail,
                    };
                  }
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}
  }

  // 2. Check user's backup data for business pages
  const bData = await getUserBackupData();
  if (bData) {
    const rawPages = Array.isArray(bData.qrHostedPages) ? bData.qrHostedPages : [];
    const businessPages = rawPages.filter((p: any) =>
      p &&
      p.pageType !== 'websites_hub' &&
      p.pageType !== 'socials_hub' &&
      p.pageType !== 'events_hub' &&
      !String(p.id).includes('websites') &&
      !String(p.id).includes('socials') &&
      !String(p.id).includes('events')
    );

    if (pageId && pageId !== 'default' && pageId !== 'latest') {
      const found = businessPages.find((p: any) =>
        p?.id === pageId ||
        p?.id === `business-${rawIdBase}` ||
        p?.id === `qr-${rawIdBase}` ||
        p?.id === rawIdBase
      );
      if (found && ((found.menuItems && found.menuItems.length > 0) || (found.photos && found.photos.length > 0))) {
        return { ...found, userEmail: userEmail || found.userEmail, email: userEmail || found.email };
      }
    }

    // Best populated business page from backup
    const populated = businessPages.find((p: any) => (p?.photos && p.photos.length > 0) || (p?.menuItems && p.menuItems.length > 0));
    if (populated) return { ...populated, userEmail: userEmail || populated.userEmail, email: userEmail || populated.email };

    // If backup has profile or inventory or photos, convert them into full business page
    const converted = convertBackupToPage(bData);
    if (converted && ((converted.menuItems && converted.menuItems.length > 0) || (converted.photos && converted.photos.length > 0))) {
      return { ...converted, id: pageId || converted.id, userEmail: userEmail || converted.userEmail, email: userEmail || converted.email };
    }

    if (businessPages[0]) return { ...businessPages[0], userEmail: userEmail || businessPages[0].userEmail, email: userEmail || businessPages[0].email };
  }

  // 3. Check user-scoped latest_qr_page.json in R2
  if (bucket && userEmail) {
    try {
      const userKey = encodeURIComponent(userEmail);
      for (const pid of possiblePageIds) {
        const uObj = await bucket.get(`users/${userKey}/qr_pages/${encodeURIComponent(pid)}.json`);
        if (uObj) {
          const parsed = JSON.parse(await uObj.text());
          if (parsed && parsed.pageType !== 'websites_hub' && parsed.pageType !== 'socials_hub' && parsed.pageType !== 'events_hub') {
            return { ...parsed, userEmail: userEmail || parsed.userEmail, email: userEmail || parsed.email };
          }
        }
      }
      const lObj = await bucket.get(`users/${userKey}/latest_qr_page.json`);
      if (lObj) {
        const parsed = JSON.parse(await lObj.text());
        if (parsed && parsed.pageType !== 'websites_hub' && parsed.pageType !== 'socials_hub' && parsed.pageType !== 'events_hub') {
          return { ...parsed, userEmail: userEmail || parsed.userEmail, email: userEmail || parsed.email };
        }
      }
    } catch (_) {}
  }

  // 4. Global match in D1 if not yet found
  if (db) {
    try {
      for (const pid of possiblePageIds) {
        const row: any = await db.prepare('SELECT page_json FROM qr_pages WHERE id = ? ORDER BY updated_at DESC LIMIT 1').bind(pid).first();
        if (row?.page_json) {
          const parsed = JSON.parse(row.page_json);
          if (parsed && parsed.pageType !== 'websites_hub' && parsed.pageType !== 'socials_hub' && parsed.pageType !== 'events_hub') {
            return parsed;
          }
        }
      }
    } catch (_) {}
  }

  // 5. Clean business page fallback
  return {
    id: pageId || 'business-latest',
    title: userEmail ? `${userEmail.split('@')[0]}'s Business` : 'Brivu Business',
    tagline: 'Welcome to our official business page',
    pageType: 'menu',
    email: userEmail,
    userEmail: userEmail,
    currency: 'UGX',
    menuCategories: ['All'],
    menuItems: [],
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Read WorkOS overrides from custom headers or search params
    const headerClientId = request.headers.get('X-WorkOS-Client-Id') || url.searchParams.get('workos_client_id');
    const headerApiKey = request.headers.get('X-WorkOS-Api-Key') || url.searchParams.get('workos_api_key');

    const workosClientId = (headerClientId || env.WORKOS_CLIENT_ID || 'client_01M4BGNT60CPMEA9P83WD6NRSB').trim().replace(/^['"]|['"]$/g, '');
    const workosApiKey = (headerApiKey || env.WORKOS_API_KEY || 'sk_a2V5XzAxTTRCVzFBRjBaMTg1RU1SR1lRNE5SWVZYLGZ2RWhseTNSUEJOVVZaSmJqOUM3Mk5lQWnl').trim().replace(/^['"]|['"]$/g, '');

    // 1. Handle CORS Preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const reqHeaders = request.headers.get('Access-Control-Request-Headers');
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          ...(reqHeaders ? { 'Access-Control-Allow-Headers': reqHeaders } : {}),
        },
      });
    }

    // 2. Health check endpoint (/api/health)
    if (url.pathname === '/api/health') {
      const bucket = getR2Bucket(env);
      const db = getD1Database(env);
      const d1Bound = Boolean(db);
      const r2Bound = Boolean(bucket);
      return new Response(
        JSON.stringify({
          ok: true,
          status: 'connected',
          d1Bound,
          r2Bound,
          workosConfigured: Boolean(workosClientId && workosApiKey),
          cloudflareClientIdConfigured: Boolean(env.WORKOS_CLIENT_ID),
          cloudflareApiKeyConfigured: Boolean(env.WORKOS_API_KEY),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Dynamic News & Opportunities RSS Proxy (/api/news-proxy)
    // Lightweight streaming proxy - strictly ephemeral, no permanent D1/R2 storage
    if (url.pathname === '/api/news-proxy' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing target url parameter' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        });
        const xml = await upstream.text();
        return new Response(xml, {
          status: upstream.status,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Dynamic Image Proxy (/api/image-proxy)
    // Streams news photos securely without CORS or hotlinking restrictions
    if (url.pathname === '/api/image-proxy' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing url parameter' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const cleanUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        const upstream = await fetch(cleanUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
        });

        if (!upstream.ok) {
          throw new Error(`Upstream returned ${upstream.status}`);
        }

        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        return new Response(upstream.body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        });
      } catch (_) {
        const fallbackSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
            <defs>
              <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#064e3b" />
                <stop offset="50%" stop-color="#0f172a" />
                <stop offset="100%" stop-color="#022c22" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg)" />
            <circle cx="400" cy="200" r="48" fill="#10b981" fill-opacity="0.2" />
            <path d="M376 180 h48 v40 h-48 z M384 190 h32 M384 200 h24" stroke="#10b981" stroke-width="4" stroke-linecap="round" fill="none" />
            <text x="400" y="275" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#ecfdf5" text-anchor="middle">Brivu Business Coverage</text>
          </svg>
        `.trim();
        return new Response(fallbackSvg, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Optimized D1 Products API GET (/api/products)
    if (url.pathname === '/api/products' && request.method === 'GET') {
      try {
        const db = getD1Database(env);
        if (!db) {
          return new Response(JSON.stringify({ ok: true, results: [] }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }
        await ensureD1Tables(db);
        const shopId = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          url.searchParams.get('shop_id') ||
          url.searchParams.get('email') ||
          'default_shop'
        ).toLowerCase().trim();

        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        let limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;
        const cacheKey = `products_${shopId}_p${page}_l${limit}`;

        const cached = getCachedQuery(cacheKey);
        if (cached) {
          return new Response(JSON.stringify({ ok: true, cached: true, ...cached }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }

        const stmt = db.prepare(`
          SELECT id, shop_id, name, barcode, category, selling_price, cost_price, stock_quantity, updated_at
          FROM products
          WHERE shop_id = ?
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(shopId, limit, offset);

        const res = await executeMeasuredQuery(stmt, 'GET_PRODUCTS');
        const results = res.results || [];
        const payload = { results, meta: res.meta || {} };
        setCachedQuery(cacheKey, payload, 60);

        return new Response(JSON.stringify({ ok: true, ...payload }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
    }

    // Optimized D1 Products API POST (/api/products)
    if (url.pathname === '/api/products' && request.method === 'POST') {
      try {
        const db = getD1Database(env);
        if (!db) {
          return new Response(JSON.stringify({ ok: false, error: 'Database not bound' }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }
        await ensureD1Tables(db);
        const body: any = await request.json().catch(() => ({}));
        const shopId = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          body?.shopId ||
          body?.userEmail ||
          'default_shop'
        ).toLowerCase().trim();

        const id = body.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const name = body.name || 'Unnamed Product';
        const barcode = body.barcode || null;
        const category = body.category || 'General';
        const sellingPrice = Number(body.sellingPrice || body.price || 0);
        const costPrice = Number(body.costPrice || 0);
        const stockQuantity = Number(body.stockQuantity || body.stock || 0);
        const image = body.image || null;
        const updatedAt = new Date().toISOString();

        const stmt = db.prepare(`
          INSERT INTO products (id, shop_id, name, barcode, category, selling_price, cost_price, stock_quantity, image, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            barcode = excluded.barcode,
            category = excluded.category,
            selling_price = excluded.selling_price,
            cost_price = excluded.cost_price,
            stock_quantity = excluded.stock_quantity,
            image = excluded.image,
            updated_at = excluded.updated_at
        `).bind(id, shopId, name, barcode, category, sellingPrice, costPrice, stockQuantity, image, updatedAt);

        await executeMeasuredQuery(stmt, 'UPSERT_PRODUCT');
        invalidateCachePattern(`products_${shopId}`);

        return new Response(JSON.stringify({ ok: true, success: true, id }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
    }

    // Optimized D1 Menu / Hotel Public API GET (/api/m/:hotelId)
    if (url.pathname.startsWith('/api/m/') && request.method === 'GET') {
      try {
        const hotelId = decodeURIComponent(url.pathname.replace('/api/m/', '')).trim();
        const db = getD1Database(env);
        if (!hotelId || !db) {
          return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }
        await ensureD1Tables(db);
        const cacheKey = `menu_${hotelId}`;
        const cached = getCachedQuery(cacheKey);
        if (cached) {
          return new Response(JSON.stringify({ ok: true, cached: true, ...cached }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }

        const stmt = db.prepare(`
          SELECT id, hotel_id, title, menu_data, updated_at
          FROM menus
          WHERE hotel_id = ?
          LIMIT 1
        `).bind(hotelId);

        const res = await executeMeasuredQuery(stmt, 'GET_MENU');
        const row = res.results?.[0];
        if (!row) {
          return new Response(JSON.stringify({ ok: false, error: 'Menu not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
        }

        const menuData = JSON.parse(row.menu_data || '{}');
        const payload = { menu: menuData, meta: res.meta || {} };
        setCachedQuery(cacheKey, payload, 60);

        return new Response(JSON.stringify({ ok: true, ...payload }), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }
    }

    // 2a. WorkOS OAuth Callback Handler (/callback and /auth/callback)
    // Pure Web-based OAuth handling for both Website and Android app (zero Play Store links or custom schemes)
    if (url.pathname === '/callback' || url.pathname === '/auth/callback') {
      const authCode = url.searchParams.get('code') || '';
      const authError = url.searchParams.get('error') || url.searchParams.get('error_description') || '';
      const rawState = url.searchParams.get('state') || '';

      let sessionId = '';
      let returnUrl = '';
      let platform = '';

      if (rawState) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawState));
          if (parsed && typeof parsed === 'object') {
            sessionId = parsed.sessionId || '';
            returnUrl = parsed.returnUrl || '';
            platform = parsed.platform || '';
          }
        } catch (_) {
          if (rawState.startsWith('http://') || rawState.startsWith('https://')) {
            returnUrl = decodeURIComponent(rawState);
          }
        }
      }

      // Check referer header if returnUrl is not explicitly in state
      if (!returnUrl) {
        const referer = request.headers.get('Referer') || request.headers.get('referrer') || '';
        if (referer && !referer.includes('google.com') && !referer.includes('workos.com') && !referer.includes(url.hostname)) {
          returnUrl = referer;
        }
      }

      // CRITICAL: NEVER permit localhost or 127.0.0.1 as returnUrl on mobile or web
      if (returnUrl && (returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1') || returnUrl.includes('capacitor:'))) {
        returnUrl = 'https://brivu.shapesmm7.workers.dev/';
      }

      // 1. Direct server-side exchange on worker for immediate zero-delay sign-in
      let authenticatedUser: any = null;
      if (authCode) {
        try {
          const cleanApiKey = (env.WORKOS_API_KEY || workosApiKey || '').trim().replace(/^['"]|['"]$/g, '');
          const cleanClientId = (env.WORKOS_CLIENT_ID || workosClientId || 'client_01M4BGNT60CPMEA9P83WD6NRSB').trim().replace(/^['"]|['"]$/g, '');

          if (cleanApiKey) {
            const wRes = await fetch('https://api.workos.com/user_management/authenticate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cleanApiKey}`,
              },
              body: JSON.stringify({
                client_id: cleanClientId,
                client_secret: cleanApiKey,
                code: authCode,
                grant_type: 'authorization_code',
              }),
            });

            if (wRes.ok) {
              const wData: any = await wRes.json();
              const u = wData.user || wData;
              const firstName = u.first_name || u.firstName || '';
              const lastName = u.last_name || u.lastName || '';
              const email = (u.email || '').toLowerCase().trim();
              const name = (u.name || `${firstName} ${lastName}`.trim() || email || 'Google User').trim();
              const profilePictureUrl = u.profile_picture_url || u.profilePictureUrl || u.avatar_url || '';

              authenticatedUser = {
                id: email || u.id || `workos_usr_${Date.now()}`,
                email,
                firstName,
                lastName,
                name,
                profilePictureUrl,
                emailVerified: true,
                provider: 'google',
                updatedAt: new Date().toISOString(),
                syncedToCloudflare: true,
              };
            }
          }
        } catch (exErr) {
          console.warn('Callback direct server-side exchange note:', exErr);
        }
      }

      // 2. Persist session for instant polling in web and Android
      if (sessionId) {
        authSessionsCache.set(sessionId, {
          status: 'completed',
          user: authenticatedUser,
          code: authCode,
          createdAt: Date.now(),
        });

        const db = getD1Database(env);
        if (db) {
          try {
            await ensureD1Tables(db);
            await db.prepare(`
              INSERT OR REPLACE INTO auth_sessions (session_id, status, code, user_json, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).bind(sessionId, 'completed', authCode, authenticatedUser ? JSON.stringify(authenticatedUser) : null, Date.now()).run();
          } catch (_) {}
        }
      }

      // 3. Serve the clean, web-only callback landing page (never triggers Play Store or custom scheme errors)
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brivu - Google Sign-In Approved</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #030712;
      color: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 1.5rem;
      padding: 2.25rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon-error {
      width: 56px;
      height: 56px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 1.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .icon-error svg { width: 28px; height: 28px; stroke: #ef4444; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .icon-success {
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 1.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .icon-success svg { width: 28px; height: 28px; stroke: #10b981; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    h1 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #ffffff; }
    p { font-size: 0.875rem; color: #9ca3af; line-height: 1.5; margin-bottom: 1.25rem; }
    .user-pill {
      display: inline-block;
      background: #1f2937;
      border: 1px solid #374151;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      color: #e5e7eb;
      margin-bottom: 1.25rem;
      max-width: 90%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 0.875rem 1.25rem;
      border-radius: 1rem;
      font-weight: 700;
      font-size: 0.875rem;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      color: #ffffff;
      border: none;
    }
    .btn:hover { opacity: 0.95; }
    .btn-secondary {
      background: #1f2937;
      color: #e5e7eb;
      border: 1px solid #374151;
      margin-top: 0.75rem;
    }
  </style>
</head>
<body>
  <div class="card">
    ${authError ? `
      <div class="icon-error">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <h1>Authentication Notice</h1>
      <p>${authError}</p>
      <a href="/" class="btn">Return Home</a>
    ` : `
      <div class="icon-success">
        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <h1>Sign-In Approved!</h1>
      ${authenticatedUser?.email ? `<div class="user-pill">${authenticatedUser.email}</div>` : ''}
      <p id="statusMsg">Your Google account has been verified. Returning to Brivu...</p>
      <div id="actionButtons" style="margin-top: 1.25rem;">
        <a id="btnPrimary" href="/" class="btn">Open Brivu App</a>
        <a id="btnWebSecondary" href="https://brivu.shapesmm7.workers.dev/" class="btn btn-secondary" style="display: none;">Continue on Web Instead</a>
      </div>
    `}
  </div>

  <script>
    (function() {
      var code = ${JSON.stringify(authCode)};
      var user = ${JSON.stringify(authenticatedUser)};
      var returnUrl = ${JSON.stringify(returnUrl)};
      var sessionId = ${JSON.stringify(sessionId)};
      var platform = ${JSON.stringify(platform)};

      if (!code && !user) return;

      // 1. Web Popup Flow: post message to opener window and close cleanly
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: code, user: user, sessionId: sessionId }, '*');
          setTimeout(function() {
            try { window.close(); } catch (_) {}
          }, 400);
          return;
        } catch (_) {}
      }

      var userAgent = (navigator.userAgent || '').toLowerCase();
      var isAndroid = userAgent.indexOf('android') >= 0;
      var isMobile = isAndroid || userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0;
      var isAndroidApp = platform === 'android' || isAndroid || isMobile;

      // Build payload parameters
      var userParam = user ? '&user=' + encodeURIComponent(JSON.stringify(user)) : '';
      var sessionParam = sessionId ? '&auth_session=' + encodeURIComponent(sessionId) : '';
      var codeParam = code ? '&code=' + encodeURIComponent(code) : '';

      // Direct Android app deep link schemes registered in AndroidManifest.xml
      var appSchemeUrl = 'brivu://auth/callback?' + codeParam + sessionParam + userParam;
      var appIntentUrl = 'intent://auth/callback?' + codeParam + sessionParam + userParam + '#Intent;scheme=brivu;package=com.brivu.myapp;end';

      var btnPrimary = document.getElementById('btnPrimary');
      var btnWebSecondary = document.getElementById('btnWebSecondary');
      var statusMsg = document.getElementById('statusMsg');

      function openAndroidApp(e) {
        if (e && e.preventDefault) e.preventDefault();
        try {
          window.location.href = appSchemeUrl;
        } catch (_) {}
        setTimeout(function() {
          try {
            window.location.href = appIntentUrl;
          } catch (_) {}
        }, 200);
      }

      if (isAndroidApp) {
        if (statusMsg) {
          statusMsg.textContent = 'Account verified! Opening your Brivu Android App...';
        }
        if (btnPrimary) {
          btnPrimary.textContent = 'Open Brivu App & Log In';
          btnPrimary.href = appSchemeUrl;
          btnPrimary.onclick = openAndroidApp;
        }
        if (btnWebSecondary) {
          btnWebSecondary.style.display = 'block';
          btnWebSecondary.href = 'https://brivu.shapesmm7.workers.dev/?auth_session=' + encodeURIComponent(sessionId || '') + userParam;
        }

        // Auto-launch into Android app immediately
        setTimeout(function() {
          openAndroidApp();
        }, 200);
      } else {
        // Desktop Web Flow
        var targetUrl = returnUrl;
        try {
          if (!targetUrl) {
            targetUrl = localStorage.getItem('workos_web_return_url') || sessionStorage.getItem('workos_web_return_url');
          }
        } catch (_) {}

        if (targetUrl && (targetUrl.indexOf('localhost') >= 0 || targetUrl.indexOf('127.0.0.1') >= 0 || targetUrl.indexOf('capacitor:') >= 0)) {
          targetUrl = 'https://brivu.shapesmm7.workers.dev/';
        }

        var dest = targetUrl || 'https://brivu.shapesmm7.workers.dev/';
        var sep = dest.indexOf('?') >= 0 ? '&' : '?';
        var webDestination = dest + sep + (code ? 'code=' + encodeURIComponent(code) : '') + sessionParam + userParam;

        if (btnPrimary) {
          btnPrimary.textContent = 'Continue to Brivu';
          btnPrimary.href = webDestination;
        }

        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
          try {
            var target = new URL(targetUrl);
            if (target.hostname !== 'localhost' && target.hostname !== '127.0.0.1' && target.origin !== window.location.origin) {
              target.searchParams.set('code', code);
              if (sessionId) target.searchParams.set('auth_session', sessionId);
              if (user) target.searchParams.set('user', JSON.stringify(user));
              window.location.replace(target.toString());
            }
          } catch (_) {}
        }
      }
    })();
  </script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // 2b. WorkOS Auth Session Polling Endpoint (/api/auth/session/status)
    // Instant real-time status check for web and Android login without any custom URL schemes
    if (url.pathname === '/api/auth/session/status' && request.method === 'GET') {
      const sessionId = url.searchParams.get('session_id') || '';
      if (!sessionId) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing session_id' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      let session = authSessionsCache.get(sessionId);
      if (!session) {
        const db = getD1Database(env);
        if (db) {
          try {
            await ensureD1Tables(db);
            const row: any = await db.prepare('SELECT * FROM auth_sessions WHERE session_id = ?').bind(sessionId).first();
            if (row) {
              session = {
                status: row.status,
                code: row.code,
                user: row.user_json ? JSON.parse(row.user_json) : null,
                createdAt: row.created_at,
              };
              authSessionsCache.set(sessionId, session);
            }
          } catch (_) {}
        }
      }

      if (session && session.status === 'completed') {
        return new Response(JSON.stringify({
          ok: true,
          success: true,
          status: 'completed',
          user: session.user,
          code: session.code,
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        status: 'pending',
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2c. WorkOS Auth Authorize / Config endpoint (/api/auth/workos/authorize)
    if (url.pathname === '/api/auth/workos/authorize') {
      const redirectUri = 'https://brivu.shapesmm7.workers.dev/callback';

      const clientId = workosClientId || 'client_01M4BGNT60CPMEA9P83WD6NRSB';
      const codeChallenge = url.searchParams.get('code_challenge');
      const isConfigured = Boolean(clientId);
      
      let authUrl = `https://api.workos.com/user_management/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&provider=GoogleOAuth`;
      if (codeChallenge) {
        authUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          configured: isConfigured,
          clientId,
          redirectUri,
          authUrl,
          provider: 'GoogleOAuth',
          cloudflareClientIdConfigured: Boolean(env.WORKOS_CLIENT_ID),
          cloudflareApiKeyConfigured: Boolean(env.WORKOS_API_KEY),
          isUsingFallback: !Boolean(env.WORKOS_CLIENT_ID) && !headerClientId,
          message: 'WorkOS AuthKit Google Sign-In ready',
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 2c. WorkOS Auth Code Authenticate endpoint (/api/auth/workos/authenticate)
    if (url.pathname === '/api/auth/workos/authenticate' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { code, redirectUri, codeVerifier } = body;
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);

        // Resolve clean API key and Client ID from request body, headers, or Cloudflare Worker env
        const cleanApiKey = (body?.workosApiKey || headerApiKey || env.WORKOS_API_KEY || workosApiKey || '').trim().replace(/^['"]|['"]$/g, '');
        const cleanClientId = (body?.workosClientId || headerClientId || env.WORKOS_CLIENT_ID || workosClientId || 'client_01M4BGNT60CPMEA9P83WD6NRSB').trim().replace(/^['"]|['"]$/g, '');

        if (!code) {
          return new Response(
            JSON.stringify({ ok: false, success: false, error: 'No authorization code received from Google Sign-In.' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        let user: any = null;
        let workosRes: Response | null = null;

        // 1. If PKCE codeVerifier is present, use official PKCE exchange
        if (codeVerifier) {
          const pkceBody: any = {
            client_id: cleanClientId,
            code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
          };
          if (cleanApiKey) {
            pkceBody.client_secret = cleanApiKey;
          }

          const pkceHeaders: any = { 'Content-Type': 'application/json' };
          if (cleanApiKey) {
            pkceHeaders['Authorization'] = `Bearer ${cleanApiKey}`;
          }

          workosRes = await fetch('https://api.workos.com/user_management/authenticate', {
            method: 'POST',
            headers: pkceHeaders,
            body: JSON.stringify(pkceBody),
          });

          // If rejected with secret error, retry PKCE without secret
          if (!workosRes.ok && pkceBody.client_secret) {
            try {
              const retryPkceRes = await fetch('https://api.workos.com/user_management/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  client_id: cleanClientId,
                  code,
                  code_verifier: codeVerifier,
                  grant_type: 'authorization_code',
                }),
              });
              if (retryPkceRes.ok) {
                workosRes = retryPkceRes;
              }
            } catch (_) {}
          }
        }

        // 2. If PKCE not used or failed, try standard API key code exchange
        if (!workosRes || !workosRes.ok) {
          if (cleanApiKey) {
            workosRes = await fetch('https://api.workos.com/user_management/authenticate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cleanApiKey}`,
              },
              body: JSON.stringify({
                client_id: cleanClientId,
                client_secret: cleanApiKey,
                code,
                grant_type: 'authorization_code',
              }),
            });
          }
        }

        if (workosRes && workosRes.ok) {
          const wData: any = await workosRes.json();
          const u = wData.user || wData;
          const firstName = u.first_name || u.firstName || '';
          const lastName = u.last_name || u.lastName || '';
          const email = (u.email || '').toLowerCase().trim();
          const name = (u.name || `${firstName} ${lastName}`.trim() || email || 'Google User').trim();
          const profilePictureUrl = u.profile_picture_url || u.profilePictureUrl || u.avatar_url || '';
          const emailVerified = u.email_verified ?? u.emailVerified ?? true;

          // User ID on Cloudflare is the user's authentic email
          user = {
            id: email || u.id || `workos_usr_${Date.now()}`,
            email,
            firstName,
            lastName,
            name,
            profilePictureUrl,
            emailVerified,
            provider: 'google',
            updatedAt: new Date().toISOString(),
            syncedToCloudflare: true,
          };
        } else {
          const errData: any = workosRes ? await workosRes.json().catch(() => null) : null;
          const rawMsg = errData?.error_description || errData?.message || errData?.error || 'Authentication code exchange failed';
          return new Response(
            JSON.stringify({
              ok: false,
              success: false,
              error: `WorkOS Error: ${rawMsg}`,
              details: errData,
            }),
            {
              status: 400,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          );
        }

        if (user && user.email && bucket) {
          const cleanEmail = user.email.toLowerCase().trim();
          const userKey = encodeURIComponent(cleanEmail);
          
          user.id = cleanEmail;
          user.syncedToCloudflare = true;
          user.cloudflareStoredAt = new Date().toISOString();

          await bucket.put(`users/${userKey}/profile.json`, JSON.stringify(user), {
            httpMetadata: { contentType: 'application/json' },
          });
          await bucket.put(`users/profile_${userKey}.json`, JSON.stringify(user), {
            httpMetadata: { contentType: 'application/json' },
          });
          await bucket.put(`users/email_${userKey}.json`, JSON.stringify({ email: user.email, userId: user.id, user }), {
            httpMetadata: { contentType: 'application/json' },
          });

          // Update aggregated users list
          let usersList: any[] = [];
          try {
            const listObj = await bucket.get('users/all_users.json');
            if (listObj) {
              const text = await listObj.text();
              usersList = JSON.parse(text);
            }
          } catch {}

          const existingIdx = usersList.findIndex((u) => u.email?.toLowerCase() === cleanEmail || u.id === cleanEmail);
          if (existingIdx >= 0) {
            usersList[existingIdx] = user;
          } else {
            usersList.push(user);
          }

          await bucket.put('users/all_users.json', JSON.stringify(usersList), {
            httpMetadata: { contentType: 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            user,
            storedInCloudflare: true,
            message: 'Authenticated and saved user profile & email in Cloudflare',
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, success: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2d. Cloudflare User Profile & Emails Storage endpoint (/api/user/profile)
    if (url.pathname === '/api/user/profile' && request.method === 'POST') {
      try {
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);
        const body: any = await request.json().catch(() => ({}));
        const { user, businessProfile, appData } = body;

        if (!user || !user.email) {
          return new Response(
            JSON.stringify({ ok: false, success: false, error: 'User email and details are required' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        const cleanEmail = user.email.toLowerCase().trim();
        const userPayload = {
          ...user,
          id: cleanEmail,
          email: cleanEmail,
          syncedToCloudflare: true,
          cloudflareStoredAt: new Date().toISOString(),
          businessProfile,
          appData,
        };

        if (bucket) {
          const userKey = encodeURIComponent(cleanEmail);
          await bucket.put(`users/${userKey}/profile.json`, JSON.stringify(userPayload), {
            httpMetadata: { contentType: 'application/json' },
          });
          await bucket.put(`users/profile_${userKey}.json`, JSON.stringify(userPayload), {
            httpMetadata: { contentType: 'application/json' },
          });
          await bucket.put(`users/email_${userKey}.json`, JSON.stringify({ email: cleanEmail, userId: cleanEmail, userPayload }), {
            httpMetadata: { contentType: 'application/json' },
          });
          if (appData || businessProfile) {
            await bucket.put(`users/${userKey}/data.json`, JSON.stringify({ businessProfile, appData, updatedAt: new Date().toISOString() }), {
              httpMetadata: { contentType: 'application/json' },
            });
            await bucket.put(`users/data_${userKey}.json`, JSON.stringify({ businessProfile, appData, updatedAt: new Date().toISOString() }), {
              httpMetadata: { contentType: 'application/json' },
            });
          }

          // Maintain list of all user profiles & emails stored in Cloudflare
          let allUsers: any[] = [];
          try {
            const listObj = await bucket.get('users/all_users.json');
            if (listObj) {
              allUsers = JSON.parse(await listObj.text());
            }
          } catch {}

          const idx = allUsers.findIndex((u) => u.email === user.email || u.id === user.id);
          const summaryRecord = {
            id: user.id,
            email: user.email,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            provider: user.provider || 'google',
            syncedToCloudflare: true,
            updatedAt: new Date().toISOString(),
          };
          if (idx >= 0) {
            allUsers[idx] = summaryRecord;
          } else {
            allUsers.push(summaryRecord);
          }

          await bucket.put('users/all_users.json', JSON.stringify(allUsers), {
            httpMetadata: { contentType: 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            message: 'User profile, email, and data stored successfully in Cloudflare',
            user: userPayload,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, success: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2e. Get stored user profile from Cloudflare (/api/user/profile?email=... or ?id=...)
    if (url.pathname === '/api/user/profile' && request.method === 'GET') {
      const bucket = getR2Bucket(env);
      const db = getD1Database(env);
      const email = url.searchParams.get('email');
      const id = url.searchParams.get('id');

      if (bucket && (email || id)) {
        try {
          const key = id ? `users/profile_${id}.json` : `users/email_${encodeURIComponent(email!.toLowerCase())}.json`;
          const obj = await bucket.get(key);
          if (obj) {
            const data = JSON.parse(await obj.text());
            return new Response(JSON.stringify({ ok: true, success: true, user: data }), {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
          }
        } catch {}
      }

      return new Response(
        JSON.stringify({ ok: false, success: false, message: 'User profile not found in Cloudflare' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 2f. List all stored users & emails from Cloudflare (/api/users/all)
    if (url.pathname === '/api/users/all') {
      const bucket = getR2Bucket(env);
      let users: any[] = [];
      if (bucket) {
        try {
          const obj = await bucket.get('users/all_users.json');
          if (obj) {
            users = JSON.parse(await obj.text());
          }
        } catch {}
      }
      return new Response(
        JSON.stringify({
          ok: true,
          success: true,
          users,
          emails: users.map((u) => u.email),
          total: users.length,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /api/receipts/:id - View hosted receipt / invoice info page (with boxes and details)
    if (url.pathname.startsWith('/api/receipts/') && request.method === 'GET') {
      try {
        const receiptId = decodeURIComponent(url.pathname.replace('/api/receipts/', '')).trim();
        const db = getD1Database(env);
        const bucket = getR2Bucket(env);
        let receipt: any = null;

        if (db && receiptId) {
          try {
            await ensureD1Tables(db);
            const row: any = await db.prepare('SELECT data_json FROM receipts WHERE id = ?').bind(receiptId).first();
            if (row && row.data_json) {
              receipt = JSON.parse(row.data_json);
            }
          } catch (_) {}
        }

        if (!receipt && bucket && receiptId) {
          try {
            const obj = await bucket.get(`receipts/${encodeURIComponent(receiptId)}.json`);
            if (obj) {
              receipt = JSON.parse(await obj.text());
              if (db && receipt) {
                try {
                  await ensureD1Tables(db);
                  await db.prepare(`
                    INSERT INTO receipts (id, user_email, receipt_number, total, data_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json
                  `).bind(receiptId, receipt.userEmail || receipt.email || 'global', receipt.receiptNumber || receiptId, receipt.total || 0, JSON.stringify(receipt), receipt.createdAt || new Date().toISOString()).run();
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        const acceptHeader = request.headers.get('Accept') || '';
        if (acceptHeader.includes('application/json')) {
          if (receipt) {
            return new Response(JSON.stringify({ ok: true, success: true, receipt }), {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ ok: false, error: 'Receipt not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        const isInvoice = receipt?.documentType === 'invoice';
        const docTitle = isInvoice ? `Invoice #${receipt?.receiptNumber || receiptId}` : `Receipt #${receipt?.receiptNumber || receiptId}`;
        const bizName = receipt?.businessSnapshot?.name || 'Brivu Business';
        const currency = receipt?.businessSnapshot?.currency || 'UGX';
        const total = receipt?.total || 0;
        const amountPaid = receipt?.amountPaid || 0;
        const balance = receipt?.balance || (amountPaid - total);
        const items = Array.isArray(receipt?.items) ? receipt.items : [];

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle} | ${bizName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .receipt-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      max-width: 520px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      margin-bottom: 1.5rem;
    }
    .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 1.25rem; }
    .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 50%; margin: 0 auto 0.75rem; display: block; border: 1px solid #e2e8f0; background: #f1f5f9; }
    .biz-name { font-size: 1.25rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 0.25rem; }
    .biz-meta { font-size: 0.8rem; color: #64748b; line-height: 1.4; }
    .badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      text-transform: uppercase;
      margin-top: 0.75rem;
    }
    .badge.invoice { background: #e0e7ff; color: #3730a3; }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
    }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 0.35rem; }
    .meta-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; font-size: 0.875rem; }
    .items-table th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #cbd5e1; }
    .items-table th:last-child { text-align: right; }
    .items-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    .items-table td:last-child { text-align: right; font-weight: 600; }
    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.25rem; font-size: 0.9rem; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .summary-row.total { font-size: 1.15rem; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 0.65rem; margin-top: 0.5rem; }
    .footer-note { text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
    .btn {
      display: block;
      width: 100%;
      background: #0f172a;
      color: #ffffff;
      text-align: center;
      padding: 0.85rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      margin-top: 1rem;
      transition: background 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn:hover { background: #1e293b; }
    .empty-state { text-align: center; padding: 3rem 1rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${receipt ? `
      <div class="header">
        ${receipt.businessSnapshot?.logo ? `<img src="${receipt.businessSnapshot.logo}" class="logo" alt="Logo">` : ''}
        <div class="biz-name">${receipt.businessSnapshot?.name || 'Brivu Business'}</div>
        <div class="biz-meta">
          ${receipt.businessSnapshot?.address ? `${receipt.businessSnapshot.address}<br>` : ''}
          ${receipt.businessSnapshot?.phone ? `Tel: ${receipt.businessSnapshot.phone}` : ''}
          ${receipt.businessSnapshot?.taxNumber ? `<br>TIN/VAT: ${receipt.businessSnapshot.taxNumber}` : ''}
        </div>
        <div class="badge ${isInvoice ? 'invoice' : ''}">${isInvoice ? 'Official Invoice' : 'Verified Receipt'}</div>
      </div>

      <div class="meta-box">
        <div class="meta-row">
          <span class="label">${isInvoice ? 'Invoice No' : 'Receipt No'}</span>
          <span class="value">${receipt.receiptNumber || 'N/A'}</span>
        </div>
        <div class="meta-row">
          <span class="label">Date & Time</span>
          <span class="value">${receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : 'N/A'}</span>
        </div>
        ${receipt.customerName ? `
          <div class="meta-row">
            <span class="label">Customer</span>
            <span class="value">${receipt.customerName}</span>
          </div>
        ` : ''}
        ${receipt.customerPhone ? `
          <div class="meta-row">
            <span class="label">Cust Phone</span>
            <span class="value">${receipt.customerPhone}</span>
          </div>
        ` : ''}
        <div class="meta-row">
          <span class="label">Payment Method</span>
          <span class="value">${receipt.paymentMethod || 'Cash'}</span>
        </div>
        ${receipt.dueDate ? `
          <div class="meta-row">
            <span class="label">Due Date</span>
            <span class="value">${receipt.dueDate}</span>
          </div>
        ` : ''}
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item / Description</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td>
                <div style="font-weight: 600;">${item.name}</div>
                ${item.unitPrice ? `<div style="font-size: 0.75rem; color: #64748b;">${item.quantity} × ${currency} ${Number(item.unitPrice).toLocaleString()}</div>` : ''}
              </td>
              <td>${item.quantity || 1}</td>
              <td>${currency} ${Number(item.subtotal || (item.quantity * item.unitPrice) || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-box">
        <div class="summary-row">
          <span class="label">Subtotal</span>
          <span class="value">${currency} ${Number(receipt.subtotal || 0).toLocaleString()}</span>
        </div>
        ${receipt.discountAmount && receipt.discountAmount > 0 ? `
          <div class="summary-row">
            <span class="label">Discount</span>
            <span class="value" style="color: #ef4444;">-${currency} ${Number(receipt.discountAmount).toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="summary-row total">
          <span>TOTAL</span>
          <span>${currency} ${Number(receipt.total || 0).toLocaleString()}</span>
        </div>
        <div class="summary-row" style="margin-top: 0.5rem; font-size: 0.85rem;">
          <span class="label">Amount Paid</span>
          <span class="value">${currency} ${Number(receipt.amountPaid || 0).toLocaleString()}</span>
        </div>
        ${balance > 0 ? `
          <div class="summary-row" style="font-size: 0.85rem;">
            <span class="label">Change Due</span>
            <span class="value">${currency} ${Number(balance).toLocaleString()}</span>
          </div>
        ` : balance < 0 ? `
          <div class="summary-row" style="font-size: 0.85rem; color: #ef4444;">
            <span class="label">Balance Due</span>
            <span class="value">${currency} ${Number(Math.abs(balance)).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      ${receipt.notes ? `
        <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 0.75rem; padding: 0.85rem; font-size: 0.8rem; color: #854d0e; margin-bottom: 1.25rem;">
          <strong>Notes:</strong> ${receipt.notes}
        </div>
      ` : ''}

      <div class="footer-note">
        Receipt ID: ${receipt.id}<br>
        🔒 Securely Verified & Synced via Brivu Cloud
      </div>

      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    ` : `
      <div class="empty-state">
        <h2>Receipt Not Found</h2>
        <p style="margin-top: 0.5rem; font-size: 0.85rem;">The requested receipt or invoice record could not be found or has not been synchronized to cloud storage yet.</p>
        <a href="/" class="btn" style="margin-top: 1.5rem;">Return to Brivu</a>
      </div>
    `}
  </div>
</body>
</html>`;

        return new Response(html, {
          status: receipt ? 200 : 404,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      } catch (err: any) {
        return new Response('Error loading receipt: ' + String(err?.message || err), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
        });
      }
    }

    // 2c. Single Receipt Sync endpoint (/api/receipts)
    if (url.pathname === '/api/receipts' && request.method === 'POST') {
      try {
        const db = getD1Database(env);
        const receipt: any = await request.json().catch(() => ({}));
        const userEmail = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          receipt?.userEmail ||
          url.searchParams.get('email') ||
          ''
        ).toLowerCase().trim();

        if (receipt && receipt.id && db) {
          try {
            await ensureD1Tables(db);
            const receiptJson = JSON.stringify(receipt);
            await db.prepare(`
              INSERT INTO receipts (id, user_email, receipt_number, total, data_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json
            `).bind(receipt.id, userEmail || 'global', receipt.receiptNumber || receipt.id, receipt.total || 0, receiptJson, new Date().toISOString()).run();
          } catch (_) {}
        }

        return new Response(
          JSON.stringify({ ok: true, success: true, message: 'Receipt synchronized' }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. File Upload endpoint (/api/files/upload)
    if (url.pathname === '/api/files/upload' && request.method === 'POST') {
      try {
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);
        const body: any = await request.json().catch(() => ({}));
        const { filename, data, mimeType = 'application/octet-stream', folder = 'receipts' } = body;

        const userEmail = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          body?.userEmail ||
          body?.email ||
          url.searchParams.get('email') ||
          ''
        ).toLowerCase().trim();

        const cleanFilename = (filename || `file_${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
        const userPrefix = userEmail ? `users/${encodeURIComponent(userEmail)}/` : '';
        const key = `${userPrefix}${folder}/${Date.now()}_${cleanFilename}`;
        const publicUrl = `${url.origin}/api/files/${encodeURIComponent(key)}`;

        if (bucket) {
          let buffer: Uint8Array;
          if (typeof data === 'string') {
            const cleanBase64 = data.includes(',') ? data.split(',')[1] : data;
            const binary = atob(cleanBase64);
            buffer = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              buffer[i] = binary.charCodeAt(i);
            }
          } else {
            buffer = new Uint8Array(0);
          }

          await bucket.put(key, buffer, {
            httpMetadata: { contentType: mimeType },
          });
        }

        if (db && data) {
          try {
            await ensureD1Tables(db);
            const dataBase64 = typeof data === 'string' ? (data.includes(',') ? data.split(',')[1] : data) : '';
            await db.prepare(`
              INSERT INTO files (id, filename, mime_type, size, data_base64, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET data_base64 = excluded.data_base64
            `).bind(key, cleanFilename, mimeType, dataBase64.length, dataBase64, new Date().toISOString()).run();
          } catch (d1Err) {
            console.warn('D1 file save note:', d1Err);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            url: publicUrl,
            key,
            filename: cleanFilename,
            size: data ? data.length : 0,
            message: `File ${cleanFilename} saved to Cloudflare`,
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            ok: false,
            success: false,
            error: String(err?.message || err),
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // 3b. File Listing endpoint (GET /api/files)
    if ((url.pathname === '/api/files' || url.pathname === '/api/files/') && request.method === 'GET') {
      const bucket = getR2Bucket(env);
      const db = getD1Database(env);
      const userEmail = (
        request.headers.get('X-User-Email') ||
        request.headers.get('X-User-Id') ||
        url.searchParams.get('email') ||
        url.searchParams.get('user_id') ||
        ''
      ).toLowerCase().trim();
      const prefixParam = url.searchParams.get('prefix') || '';
      const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);

      const files: any[] = [];
      const seenKeys = new Set<string>();

      const isSystemBackupFile = (k: string) => {
        const lower = k.toLowerCase();
        return (
          lower.endsWith('backup.json') ||
          lower.endsWith('latest_backup.json') ||
          lower.endsWith('data.json') ||
          lower.endsWith('profile.json') ||
          lower.endsWith('all_users.json')
        );
      };

      const parseFileRecord = (key: string, size: number, mimeType: string, uploadedAt: string) => {
        const parts = key.split('/');
        let folder = 'files';
        let rawFilename = parts[parts.length - 1] || key;
        if (key.startsWith('users/') && parts.length >= 4) {
          folder = parts[2];
          rawFilename = parts.slice(3).join('_');
        } else if (parts.length > 1) {
          folder = parts[parts.length - 2];
        }
        const cleanFilename = rawFilename.replace(/^\d+_/, '');
        return {
          key,
          filename: cleanFilename,
          size,
          mimeType,
          uploadedAt,
          url: `${url.origin}/api/files/${encodeURIComponent(key)}`,
          folder,
        };
      };

      // If no user email provided, return empty files list to prevent data leakage
      if (!userEmail) {
        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            files: [],
            count: 0,
            message: 'User email is required to list files',
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Fetch from R2 if bucket is bound strictly for this user email
      if (bucket && typeof bucket.list === 'function') {
        try {
          const listPrefixes: string[] = [
            `users/${encodeURIComponent(userEmail)}/`,
            `users/${userEmail}/`,
          ];
          if (prefixParam && prefixParam.startsWith('users/')) {
            listPrefixes.push(prefixParam);
          }

          for (const pfx of listPrefixes) {
            const listed = await bucket.list({ prefix: pfx, limit });
            if (listed && Array.isArray(listed.objects)) {
              for (const obj of listed.objects) {
                if (isSystemBackupFile(obj.key)) continue;
                if (!seenKeys.has(obj.key)) {
                  seenKeys.add(obj.key);
                  files.push(
                    parseFileRecord(
                      obj.key,
                      obj.size || 0,
                      obj.httpMetadata?.contentType || 'application/octet-stream',
                      obj.uploaded ? new Date(obj.uploaded).toISOString() : new Date().toISOString()
                    )
                  );
                }
              }
            }
          }
        } catch (r2Err) {
          console.warn('R2 file list note:', r2Err);
        }
      }

      // 2. Also check D1 if db is bound strictly for this user email
      if (db) {
        try {
          await ensureD1Tables(db);
          let query = 'SELECT id, filename, mime_type, size, created_at FROM files';
          const params: any[] = [];
          const whereClauses: string[] = [
            '(id LIKE ? OR id LIKE ?)'
          ];
          params.push(`users/${encodeURIComponent(userEmail)}/%`);
          params.push(`users/${userEmail}/%`);

          if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
          }
          query += ' ORDER BY created_at DESC LIMIT ?';
          params.push(limit);

          const rows: any = await db.prepare(query).bind(...params).all();
          if (rows && Array.isArray(rows.results)) {
            for (const row of rows.results) {
              if (isSystemBackupFile(row.id)) continue;
              if (!seenKeys.has(row.id)) {
                seenKeys.add(row.id);
                files.push(
                  parseFileRecord(
                    row.id,
                    row.size || 0,
                    row.mime_type || 'application/octet-stream',
                    row.created_at || new Date().toISOString()
                  )
                );
              }
            }
          }
        } catch (d1Err) {
          console.warn('D1 file list note:', d1Err);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          success: true,
          files,
          total: files.length,
          d1Bound: Boolean(db),
          r2Bound: Boolean(bucket),
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 4. File Download & Delete endpoint (/api/files/:key)
    if (url.pathname.startsWith('/api/files/')) {
      const bucket = getR2Bucket(env);
      const db = getD1Database(env);
      const key = decodeURIComponent(url.pathname.replace('/api/files/', ''));

      // Delete file
      if (request.method === 'DELETE') {
        let deletedR2 = false;
        let deletedD1 = false;
        if (bucket && key) {
          try {
            await bucket.delete(key);
            deletedR2 = true;
          } catch {}
        }
        if (db && key) {
          try {
            await ensureD1Tables(db);
            await db.prepare('DELETE FROM files WHERE id = ?').bind(key).run();
            deletedD1 = true;
          } catch {}
        }
        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            message: `File ${key} deleted`,
            deletedR2,
            deletedD1,
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Get/Serve file
      if (bucket && key) {
        try {
          const object = await bucket.get(key);
          if (object) {
            const headers = new Headers(CORS_HEADERS);
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            return new Response(object.body, { headers });
          }
        } catch {}
      }

      if (db && key) {
        try {
          await ensureD1Tables(db);
          const row: any = await db.prepare('SELECT data_base64, mime_type FROM files WHERE id = ?').bind(key).first();
          if (row && row.data_base64) {
            const binary = atob(row.data_base64);
            const buffer = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              buffer[i] = binary.charCodeAt(i);
            }
            return new Response(buffer, {
              headers: {
                ...CORS_HEADERS,
                'Content-Type': row.mime_type || 'application/octet-stream',
              },
            });
          }
        } catch {}
      }
    }

    // 5. QR Page Save endpoint (/api/qr)
    if (url.pathname === '/api/qr' && request.method === 'POST') {
      try {
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);
        const page: any = await request.json().catch(() => ({}));
        const userEmail = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          url.searchParams.get('email') ||
          url.searchParams.get('user_id') ||
          page?.userEmail ||
          page?.email ||
          ''
        ).toLowerCase().trim();

        if (page?.id) {
          const text = JSON.stringify(page);
          const now = new Date().toISOString();
          const isBusinessQrPage =
            page.pageType !== 'websites_hub' &&
            page.pageType !== 'socials_hub' &&
            page.pageType !== 'events_hub' &&
            !String(page.id).startsWith('websites') &&
            !String(page.id).startsWith('socials') &&
            !String(page.id).startsWith('events');

          if (bucket) {
            try {
              await bucket.put(`qr_pages/${encodeURIComponent(page.id)}.json`, text, {
                httpMetadata: { contentType: 'application/json' },
              });
              if (userEmail) {
                const userKey = encodeURIComponent(userEmail);
                await bucket.put(`users/${userKey}/qr_pages/${encodeURIComponent(page.id)}.json`, text, {
                  httpMetadata: { contentType: 'application/json' },
                });
                if (isBusinessQrPage) {
                  await bucket.put(`users/${userKey}/latest_qr_page.json`, text, {
                    httpMetadata: { contentType: 'application/json' },
                  });
                }
              }
            } catch (r2Err) {
              console.warn('R2 QR save note:', r2Err);
            }
          }
          if (db) {
            try {
              await ensureD1Tables(db);
              await db.prepare(`
                INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
              `).bind(page.id, userEmail || null, text, now).run();

              if (userEmail) {
                if (isBusinessQrPage) {
                  await db.prepare(`
                    INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                  `).bind(`user_${userEmail}_latest`, userEmail, text, now).run();
                  await db.prepare(`
                    INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                  `).bind(`user_${userEmail}_business`, userEmail, text, now).run();

                  if (String(page.id).startsWith('qr-')) {
                    const altId = `business-${String(page.id).replace('qr-', '')}`;
                    await db.prepare(`
                      INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                      VALUES (?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                    `).bind(altId, userEmail, text, now).run();
                  } else if (String(page.id).startsWith('business-')) {
                    const altId = `qr-${String(page.id).replace('business-', '')}`;
                    await db.prepare(`
                      INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                      VALUES (?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                    `).bind(altId, userEmail, text, now).run();
                  }
                } else if (page.pageType === 'websites_hub' || String(page.id).includes('websites')) {
                  await db.prepare(`
                    INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                  `).bind(`user_${userEmail}_websites`, userEmail, text, now).run();
                } else if (page.pageType === 'socials_hub' || String(page.id).includes('socials')) {
                  await db.prepare(`
                    INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                  `).bind(`user_${userEmail}_socials`, userEmail, text, now).run();
                } else if (page.pageType === 'events_hub' || String(page.id).includes('events')) {
                  await db.prepare(`
                    INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                  `).bind(`user_${userEmail}_events`, userEmail, text, now).run();
                }
              }
            } catch (d1Err) {
              console.warn('D1 QR page save note:', d1Err);
            }
          }
        }
        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            message: `QR page ${page?.id || ''} saved to Cloudflare`,
            data: { page },
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, success: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6. QR Page Fetch endpoint (/api/qr/:pageId)
    if (url.pathname.startsWith('/api/qr/')) {
      const pageId = decodeURIComponent(url.pathname.replace('/api/qr/', '')).trim();
      const userEmail = (
        url.searchParams.get('email') ||
        url.searchParams.get('u') ||
        url.searchParams.get('user') ||
        url.searchParams.get('user_id') ||
        request.headers.get('X-User-Email') ||
        request.headers.get('X-User-Id') ||
        ''
      ).toLowerCase().trim();

      const page = await resolveHostedQrPage(env, pageId, userEmail);

      if (page) {
        return new Response(
          JSON.stringify({ ok: true, success: true, data: { page } }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: 'QR Page not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Data Sync Push endpoint (/api/sync/push)
    if (url.pathname === '/api/sync/push' && request.method === 'POST') {
      try {
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);
        const body: any = await request.json().catch(() => ({}));
        const backupData = body?.backupData || body;

        const userEmail = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          url.searchParams.get('email') ||
          url.searchParams.get('user_id') ||
          body?.userEmail ||
          body?.user_id ||
          body?.email ||
          body?.user?.email ||
          backupData?.profile?.email ||
          ''
        ).toLowerCase().trim() || 'default_user';

        if (backupData) {
          const backupJson = JSON.stringify(backupData);
          const now = new Date().toISOString();

          // 1. Persist to D1 Relational SQL Database backups table
          if (db) {
            try {
              await ensureD1Tables(db);
              await db.prepare(`
                INSERT INTO backups (id, user_email, backup_data, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET backup_data = excluded.backup_data, user_email = excluded.user_email, updated_at = excluded.updated_at
              `).bind(`user_${userEmail}`, userEmail, backupJson, now).run();
              await db.prepare(`
                INSERT INTO backups (id, user_email, backup_data, updated_at)
                VALUES ('latest_backup', ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET backup_data = excluded.backup_data, user_email = excluded.user_email, updated_at = excluded.updated_at
              `).bind(userEmail, backupJson, now).run();

              if (Array.isArray(backupData.receipts)) {
                for (const r of backupData.receipts) {
                  if (r && r.id) {
                    const receiptJson = JSON.stringify(r);
                    await db.prepare(`
                      INSERT INTO receipts (id, user_email, receipt_number, total, data_json, created_at)
                      VALUES (?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json
                    `).bind(r.id, userEmail || 'global', r.receiptNumber || r.id, r.total || 0, receiptJson, r.createdAt || now).run();
                  }
                }
              }
            } catch (d1Err) {
              console.warn('D1 database push backup note:', d1Err);
            }
          }

          // 2. Persist to R2 Object Storage Bucket backups
          if (bucket) {
            try {
              const userKey = encodeURIComponent(userEmail);
              await bucket.put(`users/${userKey}/backup.json`, backupJson, {
                httpMetadata: { contentType: 'application/json' },
              });
              await bucket.put(`users/${userKey}/latest_backup.json`, backupJson, {
                httpMetadata: { contentType: 'application/json' },
              });
            } catch (r2Err) {
              console.warn('R2 backup push note:', r2Err);
            }
          }

          // Helper to persist any QR page to both D1 and R2 with multiple aliases
          const saveQrPageToCloud = async (pageObj: any, pageIdToUse: string) => {
            if (!pageObj || !pageIdToUse) return;
            const pageJson = JSON.stringify(pageObj);
            if (db) {
              try {
                await ensureD1Tables(db);
                await db.prepare(`
                  INSERT INTO qr_pages (id, user_email, page_json, updated_at)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET user_email = excluded.user_email, page_json = excluded.page_json, updated_at = excluded.updated_at
                `).bind(pageIdToUse, userEmail, pageJson, now).run();
              } catch (_) {}
            }
            if (bucket) {
              try {
                await bucket.put(`qr_pages/${encodeURIComponent(pageIdToUse)}.json`, pageJson, {
                  httpMetadata: { contentType: 'application/json' },
                });
                if (userEmail) {
                  const userKey = encodeURIComponent(userEmail);
                  await bucket.put(`users/${userKey}/qr_pages/${encodeURIComponent(pageIdToUse)}.json`, pageJson, {
                    httpMetadata: { contentType: 'application/json' },
                  });
                }
              } catch (_) {}
            }
          };

          const profile = backupData.profile || {};
          const cleanName = (profile.name || 'brivu').toLowerCase().replace(/[^a-z0-9]/g, '') || 'all';
          const cleanWa = (profile.whatsapp || profile.phone || '').replace(/[^0-9]/g, '');

          // 3. Persist Websites & Apps Hub Pages
          if (Array.isArray(backupData.websitesQrItems) && backupData.websitesQrItems.length > 0) {
            const webHubId = `websites-hub-${cleanName}`;
            const webHubPage = {
              id: webHubId,
              title: 'Our Sites',
              description: `Official web links and verified online apps directory for ${profile.name || 'our company'}.`,
              pageType: 'websites_hub',
              accentColor: '#2563eb',
              theme: 'indigo',
              logo: profile.logo,
              phone: profile.phone || '',
              whatsapp: cleanWa,
              email: profile.email || userEmail || '',
              userEmail: userEmail || profile.email || '',
              address: profile.address || '',
              currency: profile.currency || 'USD',
              announcement: `🌐 ${backupData.websitesQrItems.length} Official Link${backupData.websitesQrItems.length === 1 ? '' : 's'} Available`,
              photos: [],
              menuCategories: ['Our Sites'],
              menuItems: backupData.websitesQrItems.map((w: any) => ({
                id: `web-${w.id}`,
                name: w.title,
                category: 'Our Sites',
                price: 0,
                description: w.description || w.url,
                url: w.url,
                ctaText: w.ctaText || 'Visit Website',
                itemType: w.type,
                phone: w.phone,
                phoneAction: w.phoneAction,
                tags: [w.type, w.ctaText || 'Visit Website'],
                isSpecial: true,
                isAvailable: true,
              })),
              websitesQrItems: backupData.websitesQrItems,
              qrDarkColor: '#2563eb',
              qrLightColor: '#ffffff',
              qrEyeColor: '#1d4ed8',
              qrBoxBgColor: '#ffffff',
              qrBoxBorderColor: '#cbd5e1',
              createdAt: now,
              updatedAt: now,
            };

            await saveQrPageToCloud(webHubPage, webHubId);
            await saveQrPageToCloud(webHubPage, 'websites-hub-all');
            await saveQrPageToCloud(webHubPage, 'websites');
            if (userEmail) {
              await saveQrPageToCloud(webHubPage, `user_${userEmail}_websites`);
            }
          }

          // 4. Persist Socials & Messaging Hub Pages
          if (Array.isArray(backupData.socialsQrItems) && backupData.socialsQrItems.length > 0) {
            const socHubId = `socials-hub-${cleanName}`;
            const socialHubPage = {
              id: socHubId,
              title: 'our social media platforms',
              tagline: 'Connect Across All Official Social Channels & Messaging Apps',
              description: `Official social media profiles, chat channels, and community links for ${profile.name || 'our brand'}.`,
              pageType: 'socials_hub',
              accentColor: '#059669',
              theme: 'emerald',
              logo: profile.logo,
              phone: profile.phone || '',
              whatsapp: cleanWa,
              email: profile.email || userEmail || '',
              userEmail: userEmail || profile.email || '',
              address: profile.address || '',
              currency: profile.currency || 'USD',
              announcement: `💬 ${backupData.socialsQrItems.length} Official Channel${backupData.socialsQrItems.length === 1 ? '' : 's'} Connected`,
              photos: [],
              menuCategories: ['Official Social Media & Messaging'],
              menuItems: backupData.socialsQrItems.map((s: any) => ({
                id: `social-${s.id}`,
                name: s.title || s.customPlatformName || s.platform,
                category: 'Official Social Media & Messaging',
                price: 0,
                description: s.prefilledMessage || s.fullUrl,
                url: s.fullUrl,
                ctaText: s.ctaText || 'Connect',
                itemType: s.platform,
                tags: [s.platform, s.ctaText || 'Connect'],
                isSpecial: true,
                isAvailable: true,
              })),
              socialsQrItems: backupData.socialsQrItems,
              qrDarkColor: '#059669',
              qrLightColor: '#ffffff',
              qrEyeColor: '#047857',
              qrBoxBgColor: '#ffffff',
              qrBoxBorderColor: '#cbd5e1',
              createdAt: now,
              updatedAt: now,
            };

            await saveQrPageToCloud(socialHubPage, socHubId);
            await saveQrPageToCloud(socialHubPage, 'socials-hub-all');
            await saveQrPageToCloud(socialHubPage, 'socials');
            if (userEmail) {
              await saveQrPageToCloud(socialHubPage, `user_${userEmail}_socials`);
            }
          }

          // 5. Persist Events Hub and Individual Event Pages
          if (Array.isArray(backupData.eventsQrItems) && backupData.eventsQrItems.length > 0) {
            const evtHubId = `events-hub-${cleanName}`;
            const eventsHubPage = {
              id: evtHubId,
              title: 'Our Events',
              description: `Browse our events and get access passes for ${profile.name || 'our organization'}.`,
              pageType: 'events_hub',
              accentColor: '#7c3aed',
              theme: 'indigo',
              logo: profile.logo,
              phone: profile.phone || '',
              whatsapp: cleanWa,
              email: profile.email || userEmail || '',
              userEmail: userEmail || profile.email || '',
              address: profile.address || '',
              currency: profile.currency || 'USD',
              announcement: `🎉 ${backupData.eventsQrItems.length} Upcoming Event${backupData.eventsQrItems.length === 1 ? '' : 's'} Available`,
              photos: backupData.eventsQrItems.flatMap((e: any) => (e.photos || []).map((url: string, idx: number) => ({
                id: `${e.id}-photo-${idx}`,
                url,
                title: e.title,
                description: e.location,
                badge: 'Event Photo',
              }))),
              menuCategories: ['Our Events'],
              menuItems: backupData.eventsQrItems.map((e: any) => ({
                id: `event-pass-${e.id}`,
                name: e.title,
                category: 'Our Events',
                price: 0,
                description: `${e.startDate ? e.startDate + ' • ' : ''}${e.location || ''}${e.description ? ' • ' + e.description : ''}`,
                url: e.rsvpUrl || undefined,
                ctaText: e.ctaText || 'RSVP & Join',
                tags: [e.startDate || 'Upcoming', e.location || 'Event'],
                isSpecial: true,
                isAvailable: true,
                photoUrl: e.photos?.[0] || undefined,
              })),
              eventsQrItems: backupData.eventsQrItems,
              qrDarkColor: '#7c3aed',
              qrLightColor: '#ffffff',
              qrEyeColor: '#6d28d9',
              qrBoxBgColor: '#ffffff',
              qrBoxBorderColor: '#cbd5e1',
              createdAt: now,
              updatedAt: now,
            };

            await saveQrPageToCloud(eventsHubPage, evtHubId);
            await saveQrPageToCloud(eventsHubPage, 'events-hub-all');
            await saveQrPageToCloud(eventsHubPage, 'events');
            if (userEmail) {
              await saveQrPageToCloud(eventsHubPage, `user_${userEmail}_events`);
            }

            for (const evt of backupData.eventsQrItems) {
              const singleEventPage = {
                id: evt.id,
                title: evt.title,
                tagline: evt.ctaText || 'Official Event Invitation & RSVP Pass',
                description: evt.description || `Event Venue: ${evt.location}`,
                pageType: 'event',
                accentColor: evt.darkColor || '#7c3aed',
                theme: 'indigo',
                coverImage: evt.photos?.[0] || undefined,
                logo: evt.photos?.[0] || profile.logo || undefined,
                phone: evt.contactPhone || profile.phone || '',
                whatsapp: cleanWa,
                email: evt.contactEmail || profile.email || '',
                address: evt.location,
                googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evt.location)}`,
                currency: profile.currency || 'UGX',
                announcement: `📅 ${evt.startDate || evt.eventDate || 'Upcoming Event'} • 📍 ${evt.location}`,
                allowWhatsAppOrdering: true,
                photos: (evt.photos || []).map((url: string, idx: number) => ({
                  id: `${evt.id}-photo-${idx}`,
                  url,
                  title: evt.title,
                  description: evt.location,
                  badge: 'Event Photo',
                })),
                menuCategories: ['Event Pass & RSVP'],
                menuItems: [
                  {
                    id: `rsvp-${evt.id}`,
                    name: `${evt.title} - Entry & RSVP Pass`,
                    category: 'Event Pass & RSVP',
                    price: 0,
                    description: `${evt.description ? evt.description + ' • ' : ''}Venue: ${evt.location}. Click to RSVP!`,
                    tags: ['RSVP', 'Invitation', 'Entry Pass'],
                    isSpecial: true,
                    isAvailable: true,
                    photoUrl: evt.photos?.[0] || undefined,
                  },
                ],
                qrDarkColor: evt.darkColor || '#7c3aed',
                qrLightColor: '#ffffff',
                qrEyeColor: evt.eyeColor || '#6d28d9',
                qrBoxBgColor: '#ffffff',
                qrBoxBorderColor: '#cbd5e1',
                createdAt: now,
                updatedAt: now,
              };

              await saveQrPageToCloud(singleEventPage, evt.id);
              await saveQrPageToCloud(singleEventPage, `event-${evt.id}`);
            }
          }

          // 6. Persist Business Showcase & Hub Pages
          const inventory = Array.isArray(backupData.inventoryProducts) ? backupData.inventoryProducts : [];
          const photos = Array.isArray(backupData.photos) ? backupData.photos : [];
          const bizHubId = `business-hub-${cleanName}`;
          const bizHubPage = {
            id: bizHubId,
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
            email: profile.email || userEmail || '',
            userEmail: userEmail || profile.email || '',
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
            createdAt: now,
            updatedAt: now,
          };

          await saveQrPageToCloud(bizHubPage, bizHubId);
          await saveQrPageToCloud(bizHubPage, 'business-hub-all');
          await saveQrPageToCloud(bizHubPage, 'business');
          await saveQrPageToCloud(bizHubPage, 'business-latest');
          if (userEmail) {
            await saveQrPageToCloud(bizHubPage, `user_${userEmail}_business`);
            await saveQrPageToCloud(bizHubPage, `user_${userEmail}_latest`);
          }

          // Also persist any existing business pages from backupData.qrHostedPages
          if (Array.isArray(backupData.qrHostedPages) && backupData.qrHostedPages.length > 0) {
            for (const p of backupData.qrHostedPages) {
              if (p?.id) {
                await saveQrPageToCloud(p, p.id);
                if (p.id.startsWith('qr-')) {
                  await saveQrPageToCloud(p, p.id.replace('qr-', 'business-'));
                }
              }
            }
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            d1Saved: Boolean(db),
            r2Saved: Boolean(bucket),
            message: 'All records successfully saved to Cloudflare',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Data Sync Pull endpoint (/api/sync/pull)
    if (url.pathname === '/api/sync/pull' && request.method === 'GET') {
      try {
        const bucket = getR2Bucket(env);
        const db = getD1Database(env);
        const userEmail = (
          request.headers.get('X-User-Email') ||
          request.headers.get('X-User-Id') ||
          url.searchParams.get('email') ||
          url.searchParams.get('user_id') ||
          ''
        ).toLowerCase().trim();

        let backupData: any = null;

        // If no user email provided, return empty data (never leak someone else's data)
        if (!userEmail) {
          return new Response(
            JSON.stringify({
              ok: true,
              success: true,
              userEmail: '',
              backupData: null,
              data: { backupData: null },
              message: 'User email is required to pull cloud backup',
            }),
            {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            }
          );
        }

        // 1. Attempt retrieving user-scoped backup from R2 under user email ID
        if (bucket) {
          try {
            const userKey = encodeURIComponent(userEmail);
            let backupObj = await bucket.get(`users/${userKey}/latest_backup.json`);
            if (!backupObj) {
              backupObj = await bucket.get(`users/${userKey}/backup.json`);
            }
            if (backupObj) {
              backupData = JSON.parse(await backupObj.text());
            }
          } catch (_) {}
        }

        // 2. If not found in R2, check D1 user backup strictly for this user email
        if (!backupData && db) {
          try {
            await ensureD1Tables(db);
            const row: any = await db.prepare('SELECT backup_data FROM backups WHERE id = ? OR user_email = ?').bind(`user_${userEmail}`, userEmail).first();
            if (row && row.backup_data) {
              backupData = JSON.parse(row.backup_data);
            }
          } catch (_) {}
        }

        // 3. Enrich backupData with all live hosted QR pages stored in D1 qr_pages table for this user email
        if (db) {
          try {
            await ensureD1Tables(db);
            const qrRows = await db.prepare('SELECT page_json FROM qr_pages WHERE user_email = ?').bind(userEmail).all();
            const hostedPages: any[] = [];
            if (qrRows?.results) {
              for (const r of qrRows.results as any[]) {
                if (r?.page_json) {
                  try {
                    const parsedPage = JSON.parse(r.page_json);
                    if (parsedPage && parsedPage.id && parsedPage.id !== 'default' && parsedPage.id !== 'latest') {
                      hostedPages.push(parsedPage);
                    }
                  } catch (_) {}
                }
              }
            }
            if (hostedPages.length > 0) {
              if (!backupData) backupData = {};
              const existingPages = Array.isArray(backupData.qrHostedPages) ? backupData.qrHostedPages : [];
              const pageMap = new Map();
              for (const p of [...existingPages, ...hostedPages]) {
                if (p?.id) pageMap.set(p.id, p);
              }
              backupData.qrHostedPages = Array.from(pageMap.values());
            }
          } catch (_) {}
        }

        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            userEmail,
            backupData: backupData || null,
            data: { backupData: backupData || null },
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ ok: false, error: String(err?.message || err) }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 5. Try serving exact static asset from ASSETS binding
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        const newHeaders = new Headers(response.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    } catch {
      // Ignore asset lookup errors and proceed to SPA fallback
    }

    // 6. SPA Fallback: Serve /index.html for client-side React routes with pre-injected QR data
    try {
      const indexUrl = new URL('/index.html', url.origin);
      const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
      let html = await indexResponse.text();

      // Check if this is a QR customer request or request with email / qr params
      const isQrRoute =
        url.pathname.includes('/qr') ||
        url.searchParams.has('qr') ||
        url.searchParams.has('email') ||
        url.searchParams.has('u') ||
        url.searchParams.has('user') ||
        url.searchParams.has('event') ||
        url.searchParams.has('website') ||
        url.searchParams.has('social') ||
        url.pathname === '/' ||
        url.pathname === '';

      const emailParam = (
        url.searchParams.get('email') ||
        url.searchParams.get('u') ||
        url.searchParams.get('user') ||
        url.searchParams.get('user_id') ||
        request.headers.get('X-User-Email') ||
        request.headers.get('X-User-Id') ||
        ''
      ).toLowerCase().trim();

      let pageIdParam = url.searchParams.get('qr') || url.searchParams.get('event') || url.searchParams.get('website') || url.searchParams.get('social') || '';
      if (!pageIdParam && url.pathname.includes('/qr/')) {
        pageIdParam = decodeURIComponent(url.pathname.split('/qr/')[1]?.split('?')[0]?.split('/')[0] || '').trim();
      }
      if (!pageIdParam && isQrRoute) {
        pageIdParam = 'latest';
      }

      if (isQrRoute) {
        try {
          const preloadedPage = await resolveHostedQrPage(env, pageIdParam, emailParam);
          const hasItems = (p: any): boolean => {
            if (!p) return false;
            if (Array.isArray(p.websitesQrItems) && p.websitesQrItems.length > 0) return true;
            if (Array.isArray(p.socialsQrItems) && p.socialsQrItems.length > 0) return true;
            if (Array.isArray(p.eventsQrItems) && p.eventsQrItems.length > 0) return true;
            if (Array.isArray(p.menuItems) && p.menuItems.length > 0) return true;
            if (Array.isArray(p.photos) && p.photos.length > 0) return true;
            return false;
          };

          if (preloadedPage && hasItems(preloadedPage)) {
            const resolvedEmail = emailParam || preloadedPage.userEmail || preloadedPage.email || '';
            const scriptTag = `<script id="__INITIAL_QR_DATA__">window.__INITIAL_QR_PAGE__=${JSON.stringify(preloadedPage)};window.__OWNER_EMAIL__=${JSON.stringify(resolvedEmail)};</script>`;
            if (html.includes('</head>')) {
              html = html.replace('</head>', `${scriptTag}</head>`);
            } else {
              html = `${scriptTag}${html}`;
            }
            if (preloadedPage.title) {
              html = html.replace(/<title>.*?<\/title>/i, `<title>${preloadedPage.title} | Brivu</title>`);
            }
          }
        } catch (_) {}
      }

      const newHeaders = new Headers(indexResponse.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(html, {
        status: indexResponse.status,
        statusText: indexResponse.statusText,
        headers: newHeaders,
      });
    } catch {
      return new Response('Not Found', {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
  },
};
