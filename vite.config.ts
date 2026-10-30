import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'brivu-news-proxy',
      configureServer(server) {
        // RSS Feed Proxy
        server.middlewares.use('/api/news-proxy', async (req, res) => {
          try {
            const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
            const targetUrl = parsedUrl.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing target url parameter' }));
              return;
            }
            const upstream = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'application/rss+xml, application/xml, text/xml, */*',
              },
            });
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.end(text);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: String(err?.message || err) }));
          }
        });

        // Article Image Extractor Endpoint (Extracts genuine og:image / twitter:image from news articles)
        const articleMetaCache = new Map<string, string>();

        const isGoogleOrGenericLogo = (url: string): boolean => {
          if (!url) return true;
          const lower = url.toLowerCase();
          return (
            lower.includes('googleusercontent.com') ||
            lower.includes('gstatic.com') ||
            lower.includes('news.google.com') ||
            lower.includes('google_news') ||
            lower.includes('google-news') ||
            lower.includes('ge_logo') ||
            lower.includes('default_logo') ||
            lower.includes('logo_google') ||
            lower.includes('1x1') ||
            lower.includes('clear.gif') ||
            lower.includes('spacer')
          );
        };

        const tryExtractPublisherUrlFromGoogleNewsLink = (googleUrl: string): string | null => {
          try {
            const articleMatch = googleUrl.match(/articles\/([A-Za-z0-9_-]+)/);
            if (!articleMatch || !articleMatch[1]) return null;
            const code = articleMatch[1];

            const base64Str = code.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = Buffer.from(base64Str, 'base64').toString('latin1');

            const matches = decoded.match(/(https?:\/\/(?!news\.google|www\.google|gstatic|lh3|schema\.org)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"'\\]*)/g);
            if (matches && matches.length > 0) {
              for (const rawCandidate of matches) {
                let cleanCandidate = rawCandidate.split(/[\x00-\x1F\x7F-\xFF]/)[0];
                cleanCandidate = cleanCandidate.replace(/[;,)\\]+$/, '');
                if (cleanCandidate.startsWith('http') && cleanCandidate.includes('.')) {
                  return cleanCandidate;
                }
              }
            }
          } catch {}
          return null;
        };

        const EDITORIAL_PHOTOS: Record<string, string[]> = {
          agriculture: [
            'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1535242208474-9a2793260ca8?auto=format&fit=crop&w=1000&q=80',
          ],
          fellowship: [
            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80',
          ],
          grant: [
            'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80',
          ],
          finance: [
            'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
          ],
          tenders: [
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1516216628859-9bccecab13ca?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1000&q=80',
          ],
          tech: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80',
          ],
          general: [
            'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1000&q=80',
          ]
        };

        const djb2Hash = (str: string): number => {
          let hash = 5381;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash |= 0;
          }
          return Math.abs(hash);
        };

        const getTopicPhotoUrl = (titleStr?: string): string => {
          const str = (titleStr || '').toLowerCase();
          let pool = EDITORIAL_PHOTOS.general;
          if (str.includes('farmer') || str.includes('farming') || str.includes('irrigation') || str.includes('agriculture') || str.includes('crop') || str.includes('livestock') || str.includes('coffee')) {
            pool = EDITORIAL_PHOTOS.agriculture;
          } else if (str.includes('fellowship') || str.includes('research') || str.includes('cohort') || str.includes('programme') || str.includes('dsti') || str.includes('training') || str.includes('nrf')) {
            pool = EDITORIAL_PHOTOS.fellowship;
          } else if (str.includes('grant') || str.includes('funding') || str.includes('sme') || str.includes('venture') || str.includes('proposal') || str.includes('seed')) {
            pool = EDITORIAL_PHOTOS.grant;
          } else if (str.includes('loan') || str.includes('bank') || str.includes('credit') || str.includes('finance') || str.includes('revenue') || str.includes('tax') || str.includes('monetary')) {
            pool = EDITORIAL_PHOTOS.finance;
          } else if (str.includes('tender') || str.includes('bid') || str.includes('procurement') || str.includes('contract') || str.includes('construction') || str.includes('infrastructure')) {
            pool = EDITORIAL_PHOTOS.tenders;
          } else if (str.includes('tech') || str.includes('software') || str.includes('ai') || str.includes('digital') || str.includes('app') || str.includes('cyber')) {
            pool = EDITORIAL_PHOTOS.tech;
          }

          const hash = djb2Hash(str || 'brivu_default_article');
          const photoUrl = pool[hash % pool.length];
          return `${photoUrl}&sig=${hash}`;
        };

        server.middlewares.use('/api/article-image', async (req, res) => {
          const sendEditorialPhotoFallback = (titleHint?: string) => {
            const fallbackUrl = getTopicPhotoUrl(titleHint);
            res.writeHead(302, {
              Location: fallbackUrl,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            });
            res.end();
          };

          const fetchAndStream = async (imgUrl: string, titleHint?: string) => {
            try {
              const upstream = await fetch(imgUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                },
              });
              if (!upstream.ok) throw new Error(`Status ${upstream.status}`);
              const contentType = upstream.headers.get('content-type') || 'image/jpeg';
              const arrayBuffer = await upstream.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              res.statusCode = 200;
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
              res.end(buffer);
            } catch {
              sendEditorialPhotoFallback(titleHint);
            }
          };

          try {
            const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
            const targetUrl = parsedUrl.searchParams.get('url');
            const titleHint = parsedUrl.searchParams.get('title') || undefined;

            if (!targetUrl) return sendEditorialPhotoFallback(titleHint);

            if (articleMetaCache.has(targetUrl)) {
              const cached = articleMetaCache.get(targetUrl)!;
              if (cached && !isGoogleOrGenericLogo(cached)) {
                return fetchAndStream(cached, titleHint);
              }
            }

            // Function to extract meta image from HTML string
            const extractMetaImageFromHtml = (html: string, baseUrl: string): string | null => {
              const metaPatterns = [
                /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
                /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
                /<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
                /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
                /<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
                /<img\s+[^>]*src=["']([^"']+\.(?:png|jpg|jpeg|webp))["']/i,
              ];

              for (const pattern of metaPatterns) {
                const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
                for (const match of matches) {
                  if (match && match[1]) {
                    let candidate = match[1].trim().replace(/&amp;/g, '&');
                    try {
                      candidate = new URL(candidate, baseUrl).href;
                    } catch {}

                    if (candidate.startsWith('http') && !isGoogleOrGenericLogo(candidate)) {
                      return candidate;
                    }
                  }
                }
              }
              return null;
            };

            // 1. Try Protobuf base64 decoding if Google News link
            if (targetUrl.includes('news.google.com')) {
              const decodedPublisherUrl = tryExtractPublisherUrlFromGoogleNewsLink(targetUrl);
              if (decodedPublisherUrl) {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 4500);

                  const pubRes = await fetch(decodedPublisherUrl, {
                    signal: controller.signal,
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    },
                  });
                  clearTimeout(timeoutId);

                  if (pubRes.ok) {
                    const html = await pubRes.text();
                    const foundImg = extractMetaImageFromHtml(html, pubRes.url || decodedPublisherUrl);
                    if (foundImg) {
                      articleMetaCache.set(targetUrl, foundImg);
                      return fetchAndStream(foundImg, titleHint);
                    }
                  }
                } catch {
                  // Fall through to standard HTML fetch
                }
              }
            }

            // 2. Standard HTML fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            let fetchUrl = targetUrl;
            let pageRes = await fetch(fetchUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              },
            });

            clearTimeout(timeoutId);
            if (!pageRes.ok) throw new Error(`HTML fetch failed: ${pageRes.status}`);

            let html = await pageRes.text();
            let finalUrl = pageRes.url || fetchUrl;

            // Handle Google News wrapper pages by extracting actual publisher destination link
            if (finalUrl.includes('news.google.com') || targetUrl.includes('news.google.com')) {
              const destinationMatches = [
                /data-n-a-url=["'](https?:\/\/(?!news\.google|www\.google|gstatic|lh3)[^"']+)["']/i,
                /href=["'](https?:\/\/(?!news\.google|www\.google|gstatic|lh3)[^"']+)["']/i,
                /c-wiz[^>]*data-n-a-url=["']([^"']+)["']/i,
              ];

              let publisherUrl: string | null = null;
              for (const pattern of destinationMatches) {
                const m = html.match(pattern);
                if (m && m[1] && m[1].startsWith('http')) {
                  publisherUrl = m[1].trim().replace(/&amp;/g, '&');
                  break;
                }
              }

              if (publisherUrl) {
                try {
                  const pubController = new AbortController();
                  const pubTimeout = setTimeout(() => pubController.abort(), 4500);

                  const pubRes = await fetch(publisherUrl, {
                    signal: pubController.signal,
                    headers: {
                      'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    },
                  });
                  clearTimeout(pubTimeout);

                  if (pubRes.ok) {
                    html = await pubRes.text();
                    finalUrl = pubRes.url || publisherUrl;
                  }
                } catch {
                  // Keep initial HTML if publisher fetch times out
                }
              }
            }

            const foundImg = extractMetaImageFromHtml(html, finalUrl);

            if (foundImg) {
              articleMetaCache.set(targetUrl, foundImg);
              return fetchAndStream(foundImg, titleHint);
            }

            sendEditorialPhotoFallback(titleHint);
          } catch {
            sendEditorialPhotoFallback();
          }
        });

        // Image Proxy for CORS & Referrer-safe Image Delivery
        server.middlewares.use('/api/image-proxy', async (req, res) => {
          try {
            const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
            const targetUrl = parsedUrl.searchParams.get('url');
            if (!targetUrl) {
              res.writeHead(302, { Location: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80' });
              res.end();
              return;
            }

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
            const arrayBuffer = await upstream.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            res.statusCode = 200;
            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            res.end(buffer);
          } catch {
            res.writeHead(302, { Location: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80' });
            res.end();
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  }
});


