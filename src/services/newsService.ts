/**
 * News and Business Opportunities RSS Service for Brivu
 * Retrieves dynamic real-time headlines and verified opportunities from Google News RSS feeds
 * Generates Google-style thumbnails, publisher favicons, and verified status
 * Ephemeral lightweight caching only (no permanent Cloudflare D1/R2 storage)
 */
import { BusinessNewsArticle, BusinessOpportunity, NewsCategory, OpportunityCategory } from '../types';

export interface CategoryInfo<T> {
  id: T;
  label: string;
  description: string;
}

export const NEWS_CATEGORIES: CategoryInfo<NewsCategory>[] = [
  { id: 'for-you', label: 'For You', description: 'Curated business headlines and market movements' },
  { id: 'country', label: 'Country', description: 'Business news and economic updates from any country in the world' },
  { id: 'africa', label: 'Africa', description: 'Pan-African trade, AfCFTA, and continental business' },
  { id: 'asia', label: 'Asia', description: 'Asian markets, manufacturing, trade, tech giants, and economy' },
  { id: 'europe', label: 'Europe', description: 'European Union markets, ECB policy, trade, and enterprise' },
  { id: 'north-america', label: 'North America', description: 'US & Canada stock markets, Wall Street, and tech hubs' },
  { id: 'south-america', label: 'South America', description: 'Latin America business, commodities, energy, and markets' },
  { id: 'australia-oceania', label: 'Australia / Oceania', description: 'Australia, New Zealand, Pacific trade, and resources' },
  { id: 'middle-east', label: 'Middle East', description: 'Gulf business, energy, oil & gas, fintech, and trade hubs' },
  { id: 'world', label: 'World', description: 'Global market trends, international trade, and economics' },
  { id: 'finance', label: 'Finance', description: 'Banking, investment, currency, and capital markets' },
  { id: 'technology', label: 'Technology', description: 'Tech innovation, enterprise software, AI, and fintech' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', description: 'Startup growth, founder stories, and ventures' },
  { id: 'small-business', label: 'Small Business', description: 'Practical SME management, retail tips, and growth' },
];

export const OPPORTUNITY_CATEGORIES: CategoryInfo<OpportunityCategory>[] = [
  { id: 'grants', label: 'Grants', description: 'Non-repayable business & innovation grants' },
  { id: 'country', label: 'Country', description: 'Grants, loans, tenders & opportunities by country' },
  { id: 'africa', label: 'Africa', description: 'Pan-African grants, development funding & tenders' },
  { id: 'asia', label: 'Asia', description: 'Asian startup funding, grants, and trade opportunities' },
  { id: 'europe', label: 'Europe', description: 'EU grants, innovation funding, and SME subsidies' },
  { id: 'north-america', label: 'North America', description: 'US & Canada business grants, VC & accelerator funds' },
  { id: 'south-america', label: 'South America', description: 'Latin America development funding and tenders' },
  { id: 'australia-oceania', label: 'Australia / Oceania', description: 'Australia & Pacific business grants and funding' },
  { id: 'middle-east', label: 'Middle East', description: 'Gulf startup funds, innovation grants, and tenders' },
  { id: 'world', label: 'World', description: 'Global business opportunities, UN & international calls' },
  { id: 'funding', label: 'Business Funding', description: 'Venture capital, angel funding, and equity' },
  { id: 'loans', label: 'Business Loans', description: 'Low-interest SME credit, facilities & microloans' },
  { id: 'tenders', label: 'Tenders', description: 'Procurement bids, RFPs, and contract supply' },
  { id: 'competitions', label: 'Competitions', description: 'Pitch competitions, hackathons & challenge awards' },
  { id: 'programmes', label: 'Entrepreneurship Programmes', description: 'Accelerators, incubators & startup cohorts' },
  { id: 'training', label: 'Business Training', description: 'Capacity building, masterclasses & workshops' },
  { id: 'partnerships', label: 'Partnerships', description: 'Strategic collaborations, distributors & trade deals' },
];

// Ephemeral in-memory and sessionStorage cache (10 min TTL)
const CACHE_TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map<string, { timestamp: number; data: any }>();

export class NewsService {
  /**
   * Resolve publisher web domain for high-resolution Google favicon resolution
   */
  static resolvePublisherDomain(publisher: string, rawUrl?: string): string {
    const pubLower = (publisher || '').toLowerCase().trim();

    if (pubLower.includes('new vision')) return 'newvision.co.ug';
    if (pubLower.includes('monitor') || pubLower.includes('daily monitor')) return 'monitor.co.ug';
    if (pubLower.includes('eastafrican') || pubLower.includes('the east african')) return 'theeastafrican.co.ke';
    if (pubLower.includes('electoral commission') || pubLower.includes('ec.or.ug')) return 'ec.or.ug';
    if (pubLower.includes('bloomberg')) return 'bloomberg.com';
    if (pubLower.includes('cnbc')) return 'cnbc.com';
    if (pubLower.includes('coindesk')) return 'coindesk.com';
    if (pubLower.includes('reuters')) return 'reuters.com';
    if (pubLower.includes('euronews')) return 'euronews.com';
    if (pubLower.includes('yahoo')) return 'finance.yahoo.com';
    if (pubLower.includes('engadget')) return 'engadget.com';
    if (pubLower.includes('bbc')) return 'bbc.co.uk';
    if (pubLower.includes('fundsforngos')) return 'fundsforngos.org';
    if (pubLower.includes('weetracker')) return 'weetracker.com';
    if (pubLower.includes('techcrunch')) return 'techcrunch.com';
    if (pubLower.includes('forbes')) return 'forbes.com';
    if (pubLower.includes('financial times') || pubLower === 'ft') return 'ft.com';
    if (pubLower.includes('ntv uganda') || pubLower.includes('ntv')) return 'ntv.co.ug';
    if (pubLower.includes('independent')) return 'independent.co.ug';
    if (pubLower.includes('chimpreports')) return 'chimpreports.com';
    if (pubLower.includes('stanbic')) return 'stanbicbank.co.ug';
    if (pubLower.includes('bank of uganda')) return 'bou.or.ug';
    if (pubLower.includes('ura') || pubLower.includes('revenue authority')) return 'ura.go.ug';
    if (pubLower.includes('casrai')) return 'casrai.org';
    if (pubLower.includes('google')) return 'google.com';
    if (pubLower.includes('x') || pubLower.includes('twitter')) return 'x.com';

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname && !parsed.hostname.includes('google.com')) {
          return parsed.hostname;
        }
      } catch {}
    }

    const cleanName = pubLower.replace(/[^a-z0-9]/g, '');
    return cleanName ? `${cleanName}.com` : 'google.com';
  }

  /**
   * Deterministic DJB2 hash helper for consistent, high-dispersion image selection
   */
  private static djb2Hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Resolve an authentic, high-impact editorial thumbnail matching the article/opportunity topic
   * Displays just like Google Discover cards, with guaranteed title uniqueness
   */
  static getEditorialThumbnail(title: string, category: string, description: string): string {
    const combined = `${title} ${description} ${category}`.toLowerCase();
    const hash = this.djb2Hash(title || 'brivu_article');

    // 1. Elections, Governance, Official Reports & Public Policy
    if (
      combined.includes('election') ||
      combined.includes('electoral') ||
      combined.includes('report') ||
      combined.includes('government') ||
      combined.includes('parliament') ||
      combined.includes('ministry') ||
      combined.includes('policy') ||
      combined.includes('commission')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 2. Fellowships, Fellowships Programmes, Research & Higher Education
    if (
      combined.includes('fellowship') ||
      combined.includes('research') ||
      combined.includes('cohort') ||
      combined.includes('programme') ||
      combined.includes('dsti') ||
      combined.includes('nrf') ||
      combined.includes('scholarship') ||
      combined.includes('training')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 3. Solar, Clean Energy & Environment / Deforestation
    if (
      combined.includes('solar') ||
      combined.includes('energy') ||
      combined.includes('power') ||
      combined.includes('electricity') ||
      combined.includes('deforestation') ||
      combined.includes('climate') ||
      combined.includes('green')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 4. Agriculture, Farming, Livestock, Cows, Crops & Food
    if (
      combined.includes('farmer') ||
      combined.includes('farming') ||
      combined.includes('agriculture') ||
      combined.includes('coffee') ||
      combined.includes('cow') ||
      combined.includes('cows') ||
      combined.includes('livestock') ||
      combined.includes('crops') ||
      combined.includes('harvest') ||
      combined.includes('irrigation')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1535242208474-9a2793260ca8?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 5. Grants, Funding, Accelerators, Competitions & Startups
    if (
      category === 'grants' ||
      category === 'funding' ||
      category === 'competitions' ||
      category === 'programmes' ||
      combined.includes('grant') ||
      combined.includes('funding') ||
      combined.includes('startup') ||
      combined.includes('entrepreneur') ||
      combined.includes('accelerator') ||
      combined.includes('female tech') ||
      combined.includes('pitch') ||
      combined.includes('seed')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 6. Tenders, Procurement, Infrastructure & Construction
    if (
      category === 'tenders' ||
      category === 'partnerships' ||
      combined.includes('tender') ||
      combined.includes('procurement') ||
      combined.includes('bid') ||
      combined.includes('contract') ||
      combined.includes('construction') ||
      combined.includes('infrastructure') ||
      combined.includes('road')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1516216628859-9bccecab13ca?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 7. Banking, Loans, Finance, Currencies & Microfinance
    if (
      category === 'finance' ||
      category === 'loans' ||
      combined.includes('bank') ||
      combined.includes('loan') ||
      combined.includes('loans') ||
      combined.includes('credit') ||
      combined.includes('shilling') ||
      combined.includes('interest') ||
      combined.includes('cfo') ||
      combined.includes('revenue') ||
      combined.includes('tax')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // 8. Tech, AI, Gemini, Software & Gadgets
    if (
      category === 'technology' ||
      combined.includes('tech') ||
      combined.includes('technology') ||
      combined.includes('ai') ||
      combined.includes('gemini') ||
      combined.includes('amazon') ||
      combined.includes('intel') ||
      combined.includes('software') ||
      combined.includes('digital')
    ) {
      const photos = [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
      ];
      const selected = photos[hash % photos.length];
      return `${selected}&sig=${hash}`;
    }

    // Default High-Quality Global Business Editorial
    const generalPhotos = [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=900&q=80',
    ];
    const selected = generalPhotos[hash % generalPhotos.length];
    return `${selected}&sig=${hash}`;
  }

  /**
   * Get rich RSS feed URLs with authentic media photos for each business news category
   */
  private static getNewsFeedUrls(category: NewsCategory, selectedCountryName?: string): string[] {
    switch (category) {
      case 'for-you':
        return [
          'https://nilepost.co.ug/feed',
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
          'https://africanews.com/feed/',
          'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-UG&gl=UG&ceid=UG:en',
        ];
      case 'country': {
        const country = selectedCountryName || 'Uganda';
        if (country.toLowerCase() === 'uganda') {
          return [
            'https://nilepost.co.ug/feed',
            'https://news.google.com/rss/search?q=Uganda+business+OR+economy+OR+trade+OR+SME&hl=en-UG&gl=UG&ceid=UG:en',
          ];
        }
        return [
          `https://news.google.com/rss/search?q=${encodeURIComponent(country)}+business+OR+economy+OR+trade+OR+markets+OR+SME&hl=en&gl=US&ceid=US:en`,
        ];
      }
      case 'africa':
        return [
          'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
          'https://africanews.com/feed/',
          'https://news.google.com/rss/search?q=Africa+business+OR+economy+OR+trade+OR+markets&hl=en&gl=US&ceid=US:en',
        ];
      case 'asia':
        return [
          'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
          'https://news.google.com/rss/search?q=Asia+business+OR+economy+OR+trade+OR+markets+OR+China+OR+India&hl=en&gl=US&ceid=US:en',
        ];
      case 'europe':
        return [
          'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
          'https://news.google.com/rss/search?q=Europe+business+OR+economy+OR+EU+trade+OR+markets&hl=en&gl=US&ceid=US:en',
        ];
      case 'north-america':
        return [
          'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
          'https://news.google.com/rss/search?q=US+business+OR+Wall+Street+OR+economy+OR+Canada&hl=en&gl=US&ceid=US:en',
        ];
      case 'south-america':
        return [
          'https://news.google.com/rss/search?q=Latin+America+business+OR+South+America+economy+OR+trade&hl=en&gl=US&ceid=US:en',
          'https://news.google.com/rss/search?q=Brazil+OR+Argentina+OR+Colombia+business+economy&hl=en&gl=US&ceid=US:en',
        ];
      case 'australia-oceania':
        return [
          'https://feeds.bbci.co.uk/news/world/australia/rss.xml',
          'https://news.google.com/rss/search?q=Australia+business+OR+New+Zealand+economy+OR+trade&hl=en&gl=US&ceid=US:en',
        ];
      case 'middle-east':
        return [
          'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
          'https://news.google.com/rss/search?q=Middle+East+business+OR+Gulf+economy+OR+Dubai+trade+OR+Saudi&hl=en&gl=US&ceid=US:en',
        ];
      case 'world':
        return [
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
        ];
      case 'finance':
        return [
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://nilepost.co.ug/feed',
          'https://news.google.com/rss/search?q=business+finance+OR+banking+OR+investing+OR+markets&hl=en&gl=US&ceid=US:en',
        ];
      case 'technology':
        return [
          'https://feeds.bbci.co.uk/news/technology/rss.xml',
          'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en&gl=US&ceid=US:en',
        ];
      case 'entrepreneurship':
        return [
          'https://nilepost.co.ug/feed',
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://news.google.com/rss/search?q=entrepreneurship+OR+startups+OR+founders+OR+ventures&hl=en&gl=US&ceid=US:en',
        ];
      case 'small-business':
        return [
          'https://nilepost.co.ug/feed',
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://news.google.com/rss/search?q=small+business+OR+SME+enterprise+OR+retail&hl=en&gl=US&ceid=US:en',
        ];
      default:
        return [
          'https://nilepost.co.ug/feed',
          'https://feeds.bbci.co.uk/news/business/rss.xml',
          'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-UG&gl=UG&ceid=UG:en',
        ];
    }
  }

  /**
   * Get Google News & Media RSS search feed URLs for an opportunity category
   */
  private static getOpportunityFeedUrls(category: OpportunityCategory, selectedCountryName?: string): string[] {
    switch (category) {
      case 'country': {
        const country = selectedCountryName || 'Uganda';
        return [
          `https://news.google.com/rss/search?q=${encodeURIComponent(country)}+(grants+OR+funding+OR+loans+OR+tenders+OR+SME+opportunities)&hl=en&gl=US&ceid=US:en`,
          'https://www.opportunitiesforafricans.com/feed/',
        ];
      }
      case 'africa':
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://disrupt-africa.com/feed/',
          'https://news.google.com/rss/search?q=Africa+(grants+OR+funding+OR+tenders+OR+SME+opportunities)&hl=en&gl=US&ceid=US:en',
        ];
      case 'asia':
        return [
          'https://news.google.com/rss/search?q=Asia+(grants+OR+funding+OR+tenders+OR+startup+opportunities)&hl=en&gl=US&ceid=US:en',
          'https://www.fundsforngos.org/feed/',
        ];
      case 'europe':
        return [
          'https://news.google.com/rss/search?q=Europe+EU+(grants+OR+funding+OR+tenders+OR+SME+subsidies)&hl=en&gl=US&ceid=US:en',
          'https://www.fundsforngos.org/feed/',
        ];
      case 'north-america':
        return [
          'https://news.google.com/rss/search?q=(US+OR+Canada)+(business+grants+OR+SME+funding+OR+tenders)&hl=en&gl=US&ceid=US:en',
          'https://www.fundsforngos.org/feed/',
        ];
      case 'south-america':
        return [
          'https://news.google.com/rss/search?q=(Latin+America+OR+South+America)+(grants+OR+funding+OR+tenders)&hl=en&gl=US&ceid=US:en',
          'https://www.fundsforngos.org/feed/',
        ];
      case 'australia-oceania':
        return [
          'https://news.google.com/rss/search?q=(Australia+OR+New+Zealand)+(business+grants+OR+funding+OR+tenders)&hl=en&gl=US&ceid=US:en',
        ];
      case 'middle-east':
        return [
          'https://news.google.com/rss/search?q=Middle+East+(grants+OR+funding+OR+tenders+OR+startup+opportunities)&hl=en&gl=US&ceid=US:en',
        ];
      case 'world':
        return [
          'https://www.fundsforngos.org/feed/',
          'https://www.opportunitiesforafricans.com/feed/',
          'https://news.google.com/rss/search?q=(global+business+grants+OR+international+funding+OR+tenders)&hl=en&gl=US&ceid=US:en',
        ];
      case 'grants':
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://www.fundsforngos.org/feed/',
          'https://news.google.com/rss/search?q=(business+grants+OR+SME+grant+OR+startup+grant)+Uganda+OR+Africa+OR+global&hl=en-UG&gl=UG&ceid=UG:en',
        ];
      case 'funding':
        return [
          'https://disrupt-africa.com/feed/',
          'https://www.opportunitiesforafricans.com/feed/',
          'https://news.google.com/rss/search?q=(business+funding+OR+venture+capital+OR+seed+investment)+Uganda+OR+Africa&hl=en&gl=US&ceid=US:en',
        ];
      case 'loans':
        return [
          'https://nilepost.co.ug/feed',
          'https://news.google.com/rss/search?q=(business+loans+OR+SME+credit+facility+OR+microfinance)+Uganda+OR+Africa&hl=en-UG&gl=UG&ceid=UG:en',
        ];
      case 'tenders':
        return [
          'https://nilepost.co.ug/feed',
          'https://news.google.com/rss/search?q=(business+tender+OR+procurement+bid+OR+request+for+proposals)+Uganda+OR+East+Africa&hl=en-UG&gl=UG&ceid=UG:en',
        ];
      case 'competitions':
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://disrupt-africa.com/feed/',
          'https://news.google.com/rss/search?q=(business+pitch+competition+OR+challenge+award+OR+hackathon)+startups+OR+business&hl=en&gl=US&ceid=US:en',
        ];
      case 'programmes':
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://disrupt-africa.com/feed/',
          'https://news.google.com/rss/search?q=(entrepreneurship+programme+OR+accelerator+cohort+OR+incubator)+applications+open&hl=en&gl=US&ceid=US:en',
        ];
      case 'training':
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://news.google.com/rss/search?q=(business+training+workshop+OR+SME+masterclass+OR+entrepreneurship+skills)&hl=en&gl=US&ceid=US:en',
        ];
      case 'partnerships':
        return [
          'https://nilepost.co.ug/feed',
          'https://news.google.com/rss/search?q=(business+partnership+OR+joint+venture+OR+trade+collaboration+OR+deal)+Uganda+OR+Africa&hl=en&gl=US&ceid=US:en',
        ];
      default:
        return [
          'https://www.opportunitiesforafricans.com/feed/',
          'https://news.google.com/rss/search?q=business+grants+OR+funding+Uganda+OR+Africa&hl=en-UG&gl=UG&ceid=UG:en',
        ];
    }
  }

  /**
   * Fetch RSS text with multi-tier fallback pipeline
   */
  private static async fetchRssXml(feedUrl: string): Promise<string> {
    const candidateProxies = [
      `/api/news-proxy?url=${encodeURIComponent(feedUrl)}`,
      `https://brivu.shapesmm7.workers.dev/api/news-proxy?url=${encodeURIComponent(feedUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`,
      feedUrl,
    ];

    let lastError: any = null;

    for (const endpoint of candidateProxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          if (text && text.includes('<rss') && text.includes('<item')) {
            return text;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(lastError?.message || 'Failed to retrieve RSS feed from all available network endpoints');
  }

  /**
   * Decode HTML entities safely
   */
  private static decodeHtmlEntities(str: string): string {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
  }

  /**
   * Strip HTML tags and clean description snippet
   */
  private static cleanSnippet(html: string): string {
    if (!html) return '';
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    clean = clean.replace(/<[^>]+>/g, ' ');
    clean = this.decodeHtmlEntities(clean);
    clean = clean.replace(/\s+/g, ' ').trim();
    if (clean.length > 280) {
      clean = clean.substring(0, 277).trim() + '...';
    }
    return clean;
  }

  /**
   * Extract thumbnail from item or description if provided by RSS
   */
  private static extractThumbnail(itemNode: Element): string | undefined {
    const isGenericOrGoogleLogo = (u: string): boolean => {
      if (!u) return true;
      const lower = u.toLowerCase();
      return (
        lower.includes('googleusercontent.com') ||
        lower.includes('news.google.com') ||
        lower.includes('gstatic.com') ||
        lower.includes('clear.gif') ||
        lower.includes('1x1') ||
        lower.includes('spacer') ||
        lower.includes('ge_logo') ||
        lower.includes('default_logo')
      );
    };

    // 1. media:content or content
    const mediaContent = itemNode.getElementsByTagName('media:content')[0] || itemNode.getElementsByTagName('content')[0];
    if (mediaContent && mediaContent.getAttribute('url')) {
      let u = mediaContent.getAttribute('url') || '';
      if (u.startsWith('http:')) u = u.replace('http:', 'https:');
      if (u && !isGenericOrGoogleLogo(u)) return u;
    }

    // 2. media:thumbnail
    const mediaThumbnail = itemNode.getElementsByTagName('media:thumbnail')[0];
    if (mediaThumbnail && mediaThumbnail.getAttribute('url')) {
      let u = mediaThumbnail.getAttribute('url') || '';
      if (u.includes('ichef.bbci.co.uk')) {
        u = u.replace(/\/standard\/\d+\//, '/standard/800/');
      }
      if (u.startsWith('http:')) u = u.replace('http:', 'https:');
      if (u && !isGenericOrGoogleLogo(u)) return u;
    }

    // 3. enclosure
    const enclosure = itemNode.getElementsByTagName('enclosure')[0];
    if (enclosure && enclosure.getAttribute('url')) {
      let u = enclosure.getAttribute('url') || '';
      const type = enclosure.getAttribute('type') || '';
      if (u.startsWith('http:')) u = u.replace('http:', 'https:');
      if ((type.startsWith('image/') || u.match(/\.(jpeg|jpg|png|webp|gif)/i)) && !isGenericOrGoogleLogo(u)) {
        return u;
      }
    }

    // 4. img tag inside description or content:encoded
    const desc = itemNode.getElementsByTagName('description')[0]?.textContent || '';
    const content = itemNode.getElementsByTagName('content:encoded')[0]?.textContent || '';
    const combined = desc + ' ' + content;
    const imgMatch = combined.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      let u = imgMatch[1];
      if (u.startsWith('http:')) u = u.replace('http:', 'https:');
      if (!isGenericOrGoogleLogo(u)) {
        return u;
      }
    }

    return undefined;
  }

  /**
   * Format date into clean relative or standard string (e.g. 23h, 1d, 3h just like Google Discover)
   */
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 5) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return '1d';
      if (diffDays < 7) return `${diffDays}d`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  }

  /**
   * Clean headline and separate publisher if attached
   */
  private static parseTitleAndPublisher(rawTitle: string, sourceNode: Element | null): { title: string; publisher: string } {
    let title = this.decodeHtmlEntities(rawTitle || '').trim();
    let publisher = sourceNode ? this.decodeHtmlEntities(sourceNode.textContent || '').trim() : '';

    if (!publisher) {
      const lastDash = title.lastIndexOf(' - ');
      if (lastDash > 15) {
        publisher = title.substring(lastDash + 3).trim();
        title = title.substring(0, lastDash).trim();
      } else {
        publisher = 'Business News';
      }
    } else {
      const suffix = ` - ${publisher}`;
      if (title.endsWith(suffix)) {
        title = title.substring(0, title.length - suffix.length).trim();
      }
    }

    return { title, publisher };
  }

  /**
   * Determine verification status and authority of an opportunity source
   */
  private static evaluateVerification(
    publisher: string,
    organisation: string,
    link: string,
    text: string
  ): 'verified' | 'unverified' {
    const combined = `${publisher} ${organisation} ${link} ${text}`.toLowerCase();

    const verifiedKeywords = [
      'world bank',
      'afdb',
      'african development bank',
      'undp',
      'usaid',
      'european union',
      'mastercard foundation',
      'tony elumelu',
      'fundsforngos',
      'uncst',
      'psfu',
      'private sector foundation',
      'stanbic',
      'bank of uganda',
      'ministry of finance',
      'ministry of trade',
      'centenary bank',
      'dfcu',
      'equity bank',
      'kcca',
      'ura.go.ug',
      'gov.ug',
      'go.ug',
      'new vision',
      'daily monitor',
      'the eastafrican',
      'cnbc',
      'bloomberg',
      'reuters',
      'ft.com',
      'forbes',
      'gates foundation',
      'ford foundation',
      'unicef',
      'fao',
      'giz',
      'jica',
      'enabel',
      'weetracker',
      'disrupt africa',
      'ventureburn',
      'electoral commission',
      'ec.or.ug',
    ];

    for (const kw of verifiedKeywords) {
      if (combined.includes(kw)) {
        return 'verified';
      }
    }

    return 'unverified';
  }

  /**
   * Extract funding amount if confirmed/mentioned
   */
  private static extractFundingAmount(text: string): string | undefined {
    const amountRegexes = [
      /\b(?:USD|\$)\s*([\d,]+(?:\.\d+)?\s*(?:million|billion|m|b|k)?)\b/i,
      /\bUGX\s*([\d,]+(?:\.\d+)?\s*(?:million|billion|m|b)?)\b/i,
      /\b(?:EUR|€)\s*([\d,]+(?:\.\d+)?\s*(?:million|billion|m|k)?)\b/i,
      /\b(?:GBP|£)\s*([\d,]+(?:\.\d+)?\s*(?:million|billion|m|k)?)\b/i,
      /\b([\d,]+(?:\.\d+)?\s*(?:million|billion)\s*(?:USD|dollars|UGX|shillings))\b/i,
    ];

    for (const rgx of amountRegexes) {
      const match = text.match(rgx);
      if (match && match[0]) {
        return match[0].trim();
      }
    }
    return undefined;
  }

  /**
   * Detect eligible country or region
   */
  private static detectRegion(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('uganda') || lower.includes('kampala')) return 'Uganda';
    if (lower.includes('east africa') || lower.includes('kenya') || lower.includes('rwanda') || lower.includes('tanzania')) return 'East Africa';
    if (lower.includes('sub-saharan africa') || lower.includes('pan-africa') || lower.includes('across africa') || lower.includes('africa')) return 'Africa';
    if (lower.includes('global') || lower.includes('worldwide') || lower.includes('international') || lower.includes('developing countries')) return 'Worldwide';
    return 'Africa & Global';
  }

  /**
   * Detect application deadline if mentioned
   */
  private static extractDeadline(text: string): string | undefined {
    const deadlineRegex = /(?:deadline|closing\s+date|apply\s+by|due\s+date|open\s+until)[:\s]+([A-Za-z0-9,\s]{3,24})/i;
    const match = text.match(deadlineRegex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length >= 4 && candidate.length <= 25) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * Fetch Business News Articles by Category
   */
  static async getBusinessNews(
    category: NewsCategory = 'for-you',
    forceRefresh: boolean = false,
    selectedCountryName?: string
  ): Promise<BusinessNewsArticle[]> {
    const countryKeyPart = (selectedCountryName || 'uganda').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cacheKey = category === 'country' ? `brivu_news_country_${countryKeyPart}` : `brivu_news_${category}`;

    if (!forceRefresh) {
      const mem = memoryCache.get(cacheKey);
      if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
        return mem.data;
      }

      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(cacheKey, parsed);
            return parsed.data;
          }
        }
      } catch {
        // ignore
      }
    }

    const feedUrls = this.getNewsFeedUrls(category, selectedCountryName);
    const feedResults = await Promise.allSettled(feedUrls.map((u) => this.fetchRssXml(u)));

    const parser = new DOMParser();
    const articles: BusinessNewsArticle[] = [];
    const seenTitles = new Set<string>();

    for (const res of feedResults) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      const xmlText = res.value;
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawTitle = item.getElementsByTagName('title')[0]?.textContent || '';
        const rawLink = item.getElementsByTagName('link')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
        const rawDesc = item.getElementsByTagName('description')[0]?.textContent || '';
        const sourceNode = item.getElementsByTagName('source')[0] || null;
        const sourceUrl = sourceNode?.getAttribute('url') || undefined;

        const { title, publisher } = this.parseTitleAndPublisher(rawTitle, sourceNode);
        const description = this.cleanSnippet(rawDesc);

        // Deduplication by normalized title
        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normTitle || seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        // Extract direct photo thumbnail from RSS (e.g. Nile Post, BBC, Africanews) or fetch metadata og:image from news article
        const directThumb = this.extractThumbnail(item);
        const articleImageProxy = rawLink ? `/api/article-image?url=${encodeURIComponent(rawLink)}&title=${encodeURIComponent(title)}` : undefined;
        const thumbnailUrl = directThumb || articleImageProxy || this.getEditorialThumbnail(title, category, description);
        const publisherDomain = this.resolvePublisherDomain(publisher, sourceUrl || rawLink);

        articles.push({
          id: `news_${category}_${articles.length}_${Date.now()}`,
          title,
          link: rawLink,
          publisher: publisher || 'Business News',
          publisherDomain,
          publisherUrl: sourceUrl,
          pubDate,
          formattedDate: this.formatDate(pubDate),
          description: description || 'Tap Read More to view the full coverage and official publisher report.',
          thumbnailUrl,
          category,
        });

        if (articles.length >= 50) break;
      }
    }

    // Sort by publication date (newest first)
    articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const cachePayload = { timestamp: Date.now(), data: articles };
    memoryCache.set(cacheKey, cachePayload);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    } catch {
      // quota
    }

    return articles;
  }

  /**
   * Search Google News directly for any keyword or phrase
   * Returns live results from Google Search
   */
  static async searchGoogleNews(
    query: string,
    forceRefresh: boolean = false
  ): Promise<BusinessNewsArticle[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const cacheKey = `brivu_google_search_${cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    if (!forceRefresh) {
      const mem = memoryCache.get(cacheKey);
      if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
        return mem.data;
      }
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(cacheKey, parsed);
            return parsed.data;
          }
        }
      } catch {}
    }

    const encodedQuery = encodeURIComponent(cleanQuery);
    const urls = [
      `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`,
    ];

    const feedResults = await Promise.allSettled(urls.map((u) => this.fetchRssXml(u)));
    const parser = new DOMParser();
    const articles: BusinessNewsArticle[] = [];
    const seenTitles = new Set<string>();

    for (const res of feedResults) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      const xmlText = res.value;
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawTitle = item.getElementsByTagName('title')[0]?.textContent || '';
        const rawLink = item.getElementsByTagName('link')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
        const rawDesc = item.getElementsByTagName('description')[0]?.textContent || '';
        const sourceNode = item.getElementsByTagName('source')[0] || null;
        const sourceUrl = sourceNode?.getAttribute('url') || undefined;

        const { title, publisher } = this.parseTitleAndPublisher(rawTitle, sourceNode);
        const description = this.cleanSnippet(rawDesc);

        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normTitle || seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        const directThumb = this.extractThumbnail(item);
        const articleImageProxy = rawLink ? `/api/article-image?url=${encodeURIComponent(rawLink)}&title=${encodeURIComponent(title)}` : undefined;
        const thumbnailUrl = directThumb || articleImageProxy || this.getEditorialThumbnail(title, 'for-you', description);
        const publisherDomain = this.resolvePublisherDomain(publisher, sourceUrl || rawLink);

        articles.push({
          id: `google_search_${articles.length}_${Date.now()}`,
          title,
          link: rawLink,
          publisher: publisher || 'Google News',
          publisherDomain,
          publisherUrl: sourceUrl,
          pubDate,
          formattedDate: this.formatDate(pubDate),
          description: description || `Report on "${cleanQuery}" via Google Search.`,
          thumbnailUrl,
          category: 'for-you',
        });

        if (articles.length >= 60) break;
      }
    }

    articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const cachePayload = { timestamp: Date.now(), data: articles };
    memoryCache.set(cacheKey, cachePayload);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    } catch {}

    return articles;
  }

  /**
   * Search Google for Business Opportunities, grants, funding, tenders matching the query
   */
  static async searchGoogleOpportunities(
    query: string,
    forceRefresh: boolean = false
  ): Promise<BusinessOpportunity[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const encodedQuery = encodeURIComponent(`${cleanQuery} grant OR funding OR tender OR opportunity`);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const xmlText = await this.fetchRssXml(url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));
      const opps: BusinessOpportunity[] = [];
      const seenTitles = new Set<string>();

      for (const item of items) {
        const rawTitle = item.getElementsByTagName('title')[0]?.textContent || '';
        const rawLink = item.getElementsByTagName('link')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
        const rawDesc = item.getElementsByTagName('description')[0]?.textContent || '';
        const sourceNode = item.getElementsByTagName('source')[0] || null;

        const { title, publisher } = this.parseTitleAndPublisher(rawTitle, sourceNode);
        const description = this.cleanSnippet(rawDesc);

        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normTitle || seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        const fullText = `${title} ${description} ${publisher}`;
        const fundingAmount = this.extractFundingAmount(fullText);
        const countryOrRegion = this.detectRegion(fullText);
        const deadline = this.extractDeadline(fullText);
        const verificationStatus = this.evaluateVerification(publisher, '', rawLink, fullText);

        const directThumb = this.extractThumbnail(item);
        const articleImageProxy = rawLink ? `/api/article-image?url=${encodeURIComponent(rawLink)}&title=${encodeURIComponent(title)}` : undefined;
        const thumbnailUrl = directThumb || articleImageProxy || this.getEditorialThumbnail(title, 'grants', description);
        const publisherDomain = this.resolvePublisherDomain(publisher, rawLink);

        opps.push({
          id: `google_opp_${opps.length}_${Date.now()}`,
          title,
          organisation: publisher || 'Opportunity Provider',
          publisherDomain,
          countryOrRegion,
          description: description || 'Google search business opportunity. Open to view complete application guidelines.',
          fundingAmount,
          deadline,
          originalLink: rawLink,
          verificationStatus,
          category: 'grants',
          pubDate,
          formattedDate: this.formatDate(pubDate),
          thumbnailUrl,
        });

        if (opps.length >= 30) break;
      }

      opps.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      return opps;
    } catch {
      return [];
    }
  }

  /**
   * Fetch Business Opportunities by Category (Multi-feed parallel fetch)
   */
  static async getBusinessOpportunities(
    category: OpportunityCategory = 'grants',
    forceRefresh: boolean = false,
    selectedCountryName?: string
  ): Promise<BusinessOpportunity[]> {
    const cacheKey = category === 'country' ? `brivu_opp_${category}_${selectedCountryName || 'uganda'}` : `brivu_opp_${category}`;

    if (!forceRefresh) {
      const mem = memoryCache.get(cacheKey);
      if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
        return mem.data;
      }

      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(cacheKey, parsed);
            return parsed.data;
          }
        }
      } catch {
        // ignore
      }
    }

    const feedUrls = this.getOpportunityFeedUrls(category, selectedCountryName);
    const feedResults = await Promise.allSettled(feedUrls.map((u) => this.fetchRssXml(u)));

    const parser = new DOMParser();
    const opportunities: BusinessOpportunity[] = [];
    const seenTitles = new Set<string>();

    for (const res of feedResults) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      const xmlText = res.value;
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item'));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawTitle = item.getElementsByTagName('title')[0]?.textContent || '';
        const rawLink = item.getElementsByTagName('link')[0]?.textContent || '';
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
        const rawDesc = item.getElementsByTagName('description')[0]?.textContent || '';
        const sourceNode = item.getElementsByTagName('source')[0] || null;

        const { title, publisher } = this.parseTitleAndPublisher(rawTitle, sourceNode);
        const description = this.cleanSnippet(rawDesc);

        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normTitle || seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);

        const fullText = `${title} ${description} ${publisher}`;
        const fundingAmount = this.extractFundingAmount(fullText);
        const countryOrRegion = this.detectRegion(fullText);
        const deadline = this.extractDeadline(fullText);
        const verificationStatus = this.evaluateVerification(publisher, '', rawLink, fullText);

        const directThumb = this.extractThumbnail(item);
        const articleImageProxy = rawLink ? `/api/article-image?url=${encodeURIComponent(rawLink)}&title=${encodeURIComponent(title)}` : undefined;
        const thumbnailUrl = directThumb || articleImageProxy || this.getEditorialThumbnail(title, category, description);
        const publisherDomain = this.resolvePublisherDomain(publisher, rawLink);

        opportunities.push({
          id: `opp_${category}_${opportunities.length}_${Date.now()}`,
          title,
          organisation: publisher || 'Enterprise Initiative',
          publisherDomain,
          countryOrRegion,
          description: description || 'Verified business opportunity call. Open link for submission guidelines, eligibility requirements, and portal application.',
          fundingAmount,
          deadline,
          originalLink: rawLink,
          verificationStatus,
          category,
          pubDate,
          formattedDate: this.formatDate(pubDate),
          thumbnailUrl,
        });

        if (opportunities.length >= 35) break;
      }
    }

    opportunities.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const cachePayload = { timestamp: Date.now(), data: opportunities };
    memoryCache.set(cacheKey, cachePayload);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    } catch {
      // quota
    }

    return opportunities;
  }

  /**
   * Clear ephemeral cache
   */
  static clearCache(): void {
    memoryCache.clear();
    try {
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith('brivu_news_') || k.startsWith('brivu_opp_')) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }
}
