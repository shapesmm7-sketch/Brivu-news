import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Newspaper,
  Briefcase,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Share2,
  Heart,
  MoreVertical,
  AlertCircle,
  Tag,
  Globe,
  X,
  Check,
  ChevronDown,
  ArrowLeft,
  Clock,
  Trash2,
  Bookmark,
} from 'lucide-react';
import {
  BusinessNewsArticle,
  BusinessOpportunity,
  NewsCategory,
  OpportunityCategory,
  BusinessProfile,
} from '../types';
import {
  NewsService,
  NEWS_CATEGORIES,
  OPPORTUNITY_CATEGORIES,
} from '../services/newsService';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../data/countries';

interface NewsScreenProps {
  business?: BusinessProfile;
  activeFooterTab?: 'feed' | 'favorites' | 'history';
  onSelectFooterTab?: (tab: 'feed' | 'favorites' | 'history') => void;
  onUpdateCounts?: (favs: number, hist: number) => void;
}

type MainSectionMode = 'news' | 'opportunities';

export const NewsScreen: React.FC<NewsScreenProps> = ({
  business,
  activeFooterTab,
  onSelectFooterTab,
  onUpdateCounts,
}) => {
  // Main section toggle: Business News vs Business Opportunities
  const [sectionMode, setSectionMode] = useState<MainSectionMode>('news');

  // Selected subcategories
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('for-you');
  const [oppCategory, setOppCategory] = useState<OpportunityCategory>('grants');

  // Selected country state with persistence
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    try {
      const saved = localStorage.getItem('brivu_news_selected_country');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COUNTRY;
  });

  // Country Selection Page state
  const [isSelectingCountry, setIsSelectingCountry] = useState<boolean>(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [continentFilter, setContinentFilter] = useState<string>('All');

  // Search keyword query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dedicated Google Search Page states
  const [isGoogleSearchActive, setIsGoogleSearchActive] = useState<boolean>(false);
  const [googleSearchInput, setGoogleSearchInput] = useState<string>('');
  const [activeGoogleQuery, setActiveGoogleQuery] = useState<string>('');
  const [googleSearchResults, setGoogleSearchResults] = useState<BusinessNewsArticle[]>([]);
  const [googleSearchOpps, setGoogleSearchOpps] = useState<BusinessOpportunity[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState<boolean>(false);
  const [googleSearchTab, setGoogleSearchTab] = useState<'all' | 'news' | 'opportunities'>('all');
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);

  // Data states
  const [newsArticles, setNewsArticles] = useState<BusinessNewsArticle[]>([]);
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);

  // Liked/saved items state
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('brivu_liked_news_v1');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toast feedback for sharing/copying
  const [toastText, setToastText] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3000);
  }, []);

  // News Footer Navigation mode: 'feed' | 'favorites' | 'history'
  type NewsFooterTab = 'feed' | 'favorites' | 'history';
  const [internalFooterTab, setInternalFooterTab] = useState<NewsFooterTab>('feed');
  const newsFooterTab = activeFooterTab || internalFooterTab;

  const setNewsFooterTab = (tab: NewsFooterTab) => {
    setInternalFooterTab(tab);
    onSelectFooterTab?.(tab);
  };

  // Favorites items list
  const [favoriteItems, setFavoriteItems] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('brivu_news_favorite_items_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recently read history list
  const [readHistory, setReadHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('brivu_news_read_history_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Report counts to parent App component
  useEffect(() => {
    onUpdateCounts?.(favoriteItems.length, readHistory.length);
  }, [favoriteItems.length, readHistory.length, onUpdateCounts]);

  // Record an item to reading history
  const trackHistory = useCallback((item: {
    id: string;
    title: string;
    publisher?: string;
    organisation?: string;
    publisherDomain?: string;
    link?: string;
    originalLink?: string;
    formattedDate: string;
    thumbnailUrl: string;
    type: 'news' | 'opportunity';
  }) => {
    const historyEntry = {
      id: item.id,
      title: item.title,
      publisher: item.publisher || item.organisation || 'Publisher',
      publisherDomain: item.publisherDomain,
      link: item.link || item.originalLink || '',
      formattedDate: item.formattedDate,
      thumbnailUrl: item.thumbnailUrl,
      type: item.type,
      viewedAt: new Date().toISOString(),
    };

    setReadHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id && h.title !== item.title);
      const next = [historyEntry, ...filtered].slice(0, 100);
      try {
        localStorage.setItem('brivu_news_read_history_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Clear reading history
  const clearHistory = () => {
    setReadHistory([]);
    try {
      localStorage.removeItem('brivu_news_read_history_v2');
    } catch {}
    showToast('Reading history cleared');
  };

  // Toggle favorite / like for an article or opportunity
  const toggleLikeItem = useCallback((item: {
    id: string;
    title: string;
    publisher?: string;
    organisation?: string;
    publisherDomain?: string;
    link?: string;
    originalLink?: string;
    formattedDate: string;
    thumbnailUrl: string;
    type: 'news' | 'opportunity';
  }) => {
    const itemId = item.id;
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      try {
        localStorage.setItem('brivu_liked_news_v1', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setFavoriteItems((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      let next: any[];
      if (exists) {
        next = prev.filter((f) => f.id !== item.id);
        showToast('Removed from Favorites');
      } else {
        const favEntry = {
          id: item.id,
          title: item.title,
          publisher: item.publisher || item.organisation || 'Publisher',
          publisherDomain: item.publisherDomain,
          link: item.link || item.originalLink || '',
          formattedDate: item.formattedDate,
          thumbnailUrl: item.thumbnailUrl,
          type: item.type,
          viewedAt: new Date().toISOString(),
        };
        next = [favEntry, ...prev];
        showToast('Saved to Favorites!');
      }
      try {
        localStorage.setItem('brivu_news_favorite_items_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [showToast]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('brivu_liked_news_v1', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, []);

  // Fetch Business News
  const loadNews = useCallback(
    async (cat: NewsCategory, force: boolean = false, countryName?: string) => {
      try {
        if (force) setIsRefreshing(true);
        else setIsLoading(true);
        setErrorMsg(null);

        const targetCountry = countryName || selectedCountry.name;
        const data = await NewsService.getBusinessNews(cat, force, targetCountry);
        setNewsArticles(data);
      } catch (err: any) {
        console.warn('Error loading news:', err);
        setErrorMsg('Unable to retrieve news at the moment. Please check connection and refresh.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCountry.name]
  );

  // Fetch Business Opportunities
  const loadOpportunities = useCallback(
    async (cat: OpportunityCategory, force: boolean = false, countryName?: string) => {
      try {
        if (force) setIsRefreshing(true);
        else setIsLoading(true);
        setErrorMsg(null);

        const targetCountry = countryName || selectedCountry.name;
        const data = await NewsService.getBusinessOpportunities(cat, force, targetCountry);
        setOpportunities(data);
      } catch (err: any) {
        console.warn('Error loading opportunities:', err);
        setErrorMsg('Unable to retrieve opportunities at the moment. Please check connection and refresh.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCountry.name]
  );

  // Load when active section or category changes
  useEffect(() => {
    if (sectionMode === 'news') {
      loadNews(newsCategory, false);
    } else {
      loadOpportunities(oppCategory, false);
    }
  }, [sectionMode, newsCategory, oppCategory, loadNews, loadOpportunities]);

  // Manual refresh handler
  const handleRefresh = () => {
    if (sectionMode === 'news') {
      loadNews(newsCategory, true);
    } else {
      loadOpportunities(oppCategory, true);
    }
  };

  // Filtered countries for Country Selection Modal
  const filteredCountries = useMemo(() => {
    let list = COUNTRIES;
    if (continentFilter !== 'All') {
      list = list.filter((c) => c.continent === continentFilter);
    }
    if (countrySearchQuery.trim()) {
      const q = countrySearchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.continent.toLowerCase().includes(q)
      );
    }
    return list;
  }, [countrySearchQuery, continentFilter]);

  // Handle selecting a country
  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    try {
      localStorage.setItem('brivu_news_selected_country', JSON.stringify(country));
    } catch {}
    setIsSelectingCountry(false);
    if (sectionMode === 'news') {
      setNewsCategory('country');
      loadNews('country', false, country.name);
    } else {
      setOppCategory('country');
      loadOpportunities('country', false, country.name);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered news articles by search
  const filteredNews = useMemo(() => {
    if (!searchQuery.trim()) return newsArticles;
    const q = searchQuery.toLowerCase();
    return newsArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.publisher.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [newsArticles, searchQuery]);

  // Filtered opportunities by search
  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return opportunities;
    const q = searchQuery.toLowerCase();
    return opportunities.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.organisation.toLowerCase().includes(q) ||
        o.countryOrRegion.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        (o.fundingAmount && o.fundingAmount.toLowerCase().includes(q))
    );
  }, [opportunities, searchQuery]);

  // Share handler
  const handleShare = async (title: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} - Read via Brivu Business`,
          url,
        });
      } catch {
        // Share dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${title} - ${url}`);
        showToast('Link copied to clipboard!');
      } catch {
        showToast('Could not copy link');
      }
    }
  };

  // Open external URL safely and track history
  const openUrl = (
    url: string,
    item?: {
      id: string;
      title: string;
      publisher?: string;
      organisation?: string;
      publisherDomain?: string;
      link?: string;
      originalLink?: string;
      formattedDate: string;
      thumbnailUrl: string;
      type: 'news' | 'opportunity';
    }
  ) => {
    if (!url) return;
    if (item) {
      trackHistory(item);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Execute real-time Google search for any news, topic or company
  const executeGoogleSearch = useCallback(async (query: string, force: boolean = false) => {
    const q = query.trim();
    if (!q) return;

    setActiveGoogleQuery(q);
    setGoogleSearchInput(q);
    setIsGoogleSearchActive(true);
    setIsSearchingGoogle(true);
    setGoogleSearchError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const [articles, opps] = await Promise.all([
        NewsService.searchGoogleNews(q, force),
        NewsService.searchGoogleOpportunities(q, force),
      ]);
      setGoogleSearchResults(articles);
      setGoogleSearchOpps(opps);
    } catch (err: any) {
      console.warn('Google search failed:', err);
      setGoogleSearchError('Unable to load Google search results right now. Please check connection and try again.');
    } finally {
      setIsSearchingGoogle(false);
    }
  }, []);

  // Dedicated Country Selection Page view mode
  if (isSelectingCountry) {
    return (
      <div className="space-y-4 pb-12 sm:pb-16 animate-fadeIn max-w-2xl mx-auto">
        {/* TOP BAR / NAVIGATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsSelectingCountry(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Back to News</span>
          </button>

          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 justify-end">
              <span>Select Country</span>
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active: <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedCountry.flag} {selectedCountry.name}</span>
            </p>
          </div>
        </div>

        {/* SEARCH AND CONTINENT FILTERS CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={countrySearchQuery}
              onChange={(e) => setCountrySearchQuery(e.target.value)}
              placeholder="Search country name, flag, or continent..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            {countrySearchQuery && (
              <button
                type="button"
                onClick={() => setCountrySearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Continent Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Middle East'].map((cont) => {
              const isContActive = continentFilter === cont;
              return (
                <button
                  key={cont}
                  type="button"
                  onClick={() => setContinentFilter(cont)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                    isContActive
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cont}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESULTS COUNT HEADER */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Showing {filteredCountries.length} countries</span>
          {countrySearchQuery || continentFilter !== 'All' ? (
            <button
              type="button"
              onClick={() => {
                setCountrySearchQuery('');
                setContinentFilter('All');
              }}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          ) : null}
        </div>

        {/* COUNTRY LIST GRID */}
        {filteredCountries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
            <Globe className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No countries match "{countrySearchQuery}"</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Try searching with a different name or continent.</p>
            <button
              type="button"
              onClick={() => {
                setCountrySearchQuery('');
                setContinentFilter('All');
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer inline-block"
            >
              Show all countries
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredCountries.map((c) => {
              const isSelected = selectedCountry.code === c.code || selectedCountry.name.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900 dark:text-emerald-100 shadow-xs'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <span className="text-3xl leading-none shrink-0 select-none">{c.flag}</span>
                    <div className="min-w-0 truncate">
                      <span className="block text-xs sm:text-sm font-bold truncate leading-snug">{c.name}</span>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate">{c.continent}</span>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 opacity-80 hover:opacity-100">
                      Select
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Dedicated Full Google Search Results Page view mode
  if (isGoogleSearchActive) {
    const totalResults = googleSearchResults.length + googleSearchOpps.length;

    let displayedNews = googleSearchResults;
    let displayedOpps = googleSearchOpps;
    if (googleSearchTab === 'news') {
      displayedOpps = [];
    } else if (googleSearchTab === 'opportunities') {
      displayedNews = [];
    }

    const hasAnyResults = displayedNews.length > 0 || displayedOpps.length > 0;

    return (
      <div className="space-y-4 pb-24 sm:pb-28 animate-fadeIn max-w-2xl mx-auto">
        {/* Toast Notification */}
        {toastText && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700 animate-bounce">
            {toastText}
          </div>
        )}

        {/* TOP BAR / NAVIGATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setIsGoogleSearchActive(false);
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Back to Feed</span>
          </button>

          {/* Quick link to Google Web Search */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#4285F4] dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs cursor-pointer"
              title="Open full page on Google.com"
            >
              <span>Google.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SEARCH INPUT CARD WITH GOOGLE LOGO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
          {/* Header Row: Google Brand Logo and Live Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center tracking-tight font-black text-xl select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold text-xs ml-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">Search</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-semibold text-[11px] text-blue-600 dark:text-blue-400">Live Web & News</span>
            </div>
          </div>

          {/* Form Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (googleSearchInput.trim()) {
                executeGoogleSearch(googleSearchInput);
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={googleSearchInput}
                onChange={(e) => setGoogleSearchInput(e.target.value)}
                placeholder="Search Google for any topic, news, market..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {googleSearchInput && (
                <button
                  type="button"
                  onClick={() => setGoogleSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearchingGoogle || !googleSearchInput.trim()}
              className="px-4 py-2.5 bg-[#4285F4] hover:bg-blue-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* FILTER TABS & DIRECT GOOGLE SHORTCUTS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setGoogleSearchTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  googleSearchTab === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Results ({totalResults})
              </button>
              <button
                type="button"
                onClick={() => setGoogleSearchTab('news')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  googleSearchTab === 'news'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                News Stories ({googleSearchResults.length})
              </button>
              <button
                type="button"
                onClick={() => setGoogleSearchTab('opportunities')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  googleSearchTab === 'opportunities'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Opportunities ({googleSearchOpps.length})
              </button>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => executeGoogleSearch(activeGoogleQuery, true)}
              disabled={isSearchingGoogle}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSearchingGoogle ? 'animate-spin text-blue-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* RESULTS HEADER ROW */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Google results for <span className="font-bold text-slate-900 dark:text-slate-100">"{activeGoogleQuery}"</span>
          </span>
          <button
            type="button"
            onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
            className="text-[#4285F4] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open in Google ↗</span>
          </button>
        </div>

        {/* ERROR STATE */}
        {googleSearchError && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">Google Search Notice</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">{googleSearchError}</p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => executeGoogleSearch(activeGoogleQuery, true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Retry Search
                </button>
                <button
                  type="button"
                  onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Open on Google.com ↗
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isSearchingGoogle && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '450ms' }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Searching Google for "{activeGoogleQuery}"...</span>
            </div>

            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
              >
                <div className="w-full aspect-[16/9] bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-2 pt-1 px-1">
                  <div className="w-full h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-4/5 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="w-3/5 h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!isSearchingGoogle && !hasAnyResults && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#4285F4] mx-auto">
              <Search className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No results found for "{activeGoogleQuery}"
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try searching with more general keywords or view full results on Google Search directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
                className="px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Search on Google.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGoogleSearchActive(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Return to News Feed
              </button>
            </div>
          </div>
        )}

        {/* RESULTS CARDS */}
        {!isSearchingGoogle && hasAnyResults && (
          <div className="space-y-4">
            {/* News Stories from Google */}
            {displayedNews.map((article) => {
              const isLiked = likedIds.has(article.id);
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                article.publisherDomain || 'google.com'
              )}&sz=64`;

              return (
                <article
                  key={article.id}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  <div
                    onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                    className="relative w-full aspect-[16/9] bg-slate-900 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          target.src = NewsService.getEditorialThumbnail(article.title, article.category, article.description);
                        }
                      }}
                    />

                    <div className="absolute top-2.5 left-2.5 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white shadow-sm border border-white/20">
                        Google News
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3
                        onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                      >
                        {article.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-4.5 h-4.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-3.5 h-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px] xs:max-w-[180px]">
                            {article.publisher}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{article.formattedDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLikeItem({ ...article, type: 'news' })}
                          title={isLiked ? 'Saved' : 'Like'}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            isLiked
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(article.title, article.link)}
                          title="Share Article"
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.8]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                          title="Read full article"
                          className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 stroke-[1.8]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Opportunities from Google */}
            {displayedOpps.map((opp) => {
              const isLiked = likedIds.has(opp.id);
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                opp.publisherDomain || 'google.com'
              )}&sz=64`;

              return (
                <div
                  key={opp.id}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  <div
                    onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                    className="relative w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={opp.thumbnailUrl}
                      alt={opp.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          target.src = NewsService.getEditorialThumbnail(opp.title, opp.category, opp.description);
                        }
                      }}
                    />

                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white shadow-sm border border-white/20">
                        Opportunity
                      </span>

                      {opp.verificationStatus === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm border border-emerald-400/40">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3
                        onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {opp.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{opp.organisation}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{opp.countryOrRegion}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {opp.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-4.5 h-4.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-3.5 h-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px] xs:max-w-[160px]">
                            {opp.organisation}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{opp.formattedDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLikeItem({ ...opp, type: 'opportunity' })}
                          title={isLiked ? 'Saved' : 'Like'}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            isLiked
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(opp.title, opp.originalLink)}
                          title="Share Opportunity"
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.8]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer ml-1"
                        >
                          <span>Apply</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* FULL GOOGLE SEARCH BANNER AT BOTTOM */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 text-center space-y-2 mt-6">
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                <span>Want to see all results directly on Google?</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Open full Google web, images, videos, and news results for "{activeGoogleQuery}" in a new tab.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
                  className="px-4 py-2 bg-[#4285F4] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Open Full Google Search Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openUrl(`https://news.google.com/search?q=${encodeURIComponent(activeGoogleQuery)}`)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Open Google News</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-32 animate-fadeIn max-w-2xl mx-auto">
      {/* Toast Notification */}
      {toastText && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg border border-slate-700 animate-bounce">
          {toastText}
        </div>
      )}

      {/* CONTENT: SECTION FEED (NEWS AND OPPORTUNITIES) */}
      {newsFooterTab === 'feed' && (
        <>
          {/* SECTION SELECTOR (BUSINESS NEWS VS BUSINESS OPPORTUNITIES) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          {/* Business News Button */}
          <button
            type="button"
            onClick={() => {
              setSectionMode('news');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              sectionMode === 'news'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Newspaper className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-left">
              <span className="block leading-tight">Business News</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 hidden xs:inline">
                Real-time headlines
              </span>
            </div>
          </button>

          {/* Business Opportunities Button */}
          <button
            type="button"
            onClick={() => {
              setSectionMode('opportunities');
              setSearchQuery('');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              sectionMode === 'opportunities'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="text-left">
              <span className="block leading-tight">Opportunities</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 hidden xs:inline">
                Grants, loans & tenders
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* CATEGORY PILLS BAR (HORIZONTAL SCROLL) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs -mx-1 px-1">
        {sectionMode === 'news'
          ? NEWS_CATEGORIES.map((cat) => {
              const isSelected = newsCategory === cat.id;

              if (cat.id === 'country') {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setNewsCategory('country');
                      setIsSelectingCountry(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                    }`}
                    title="Choose country to view local news"
                  >
                    <span className="text-sm leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80 ml-0.5" />
                  </button>
                );
              }

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewsCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs ring-1 ring-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                  }`}
                  title={cat.description}
                >
                  {cat.label}
                </button>
              );
            })
          : OPPORTUNITY_CATEGORIES.map((cat) => {
              const isSelected = oppCategory === cat.id;

              if (cat.id === 'country') {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setOppCategory('country');
                      setIsSelectingCountry(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs ring-1 ring-indigo-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                    }`}
                    title="Choose country to view local opportunities"
                  >
                    <span className="text-sm leading-none">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80 ml-0.5" />
                  </button>
                );
              }

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setOppCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs ring-1 ring-indigo-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                  }`}
                  title={cat.description}
                >
                  {cat.label}
                </button>
              );
            })}
      </div>

      {/* SEARCH AND REFRESH TOOLBAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (searchQuery.trim()) {
            executeGoogleSearch(searchQuery);
          }
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                e.preventDefault();
                executeGoogleSearch(searchQuery);
              }
            }}
            placeholder="Search with Google for any news, topic, market..."
            className="w-full pl-9 pr-22 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-15 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#4285F4] hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1 disabled:opacity-40"
            title="Search with Google"
          >
            <span>Google</span>
            <Search className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          title="Refresh Feed"
          className="p-2 sm:px-3 sm:py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs"
        >
          <RefreshCw
            className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${
              isRefreshing || isLoading ? 'animate-spin' : ''
            }`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </form>

      {/* SECTION HEADER BANNER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {sectionMode === 'news'
              ? newsCategory === 'country'
                ? `${selectedCountry.flag} ${selectedCountry.name} Headlines`
                : `${NEWS_CATEGORIES.find((c) => c.id === newsCategory)?.label} Headlines`
              : `${OPPORTUNITY_CATEGORIES.find((c) => c.id === oppCategory)?.label}`}
          </h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {sectionMode === 'news'
            ? `${filteredNews.length} stories`
            : `${filteredOpportunities.length} opportunities`}
        </span>
      </div>

      {/* ERROR STATE */}
      {errorMsg && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200">Notice</p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-2.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
            >
              Retry Loading Feed
            </button>
          </div>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
            >
              {/* Full Width Hero Thumbnail Placeholder */}
              <div className="w-full aspect-[16/9] bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="space-y-2 pt-1 px-1">
                <div className="w-full h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-4/5 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="w-3/5 h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
              </div>
              <div className="flex justify-between items-center px-1 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT: SECTION A - BUSINESS NEWS (GOOGLE DISCOVER CARD STYLE) */}
      {!isLoading && sectionMode === 'news' && (
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Newspaper className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No articles found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchQuery
                  ? 'Try adjusting your search keywords.'
                  : 'Feed is temporarily empty. Tap refresh to reload.'}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-500 cursor-pointer"
              >
                Refresh News Feed
              </button>
            </div>
          ) : (
            filteredNews.map((article) => {
              const isLiked = likedIds.has(article.id);
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                article.publisherDomain || 'google.com'
              )}&sz=64`;

              return (
                <article
                  key={article.id}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* GOOGLE FEED PROMINENT COVER THUMBNAIL (AS REQUESTED) */}
                  <div
                    onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                    className="relative w-full aspect-[16/9] bg-slate-900 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          target.src = NewsService.getEditorialThumbnail(article.title, article.category, article.description);
                        }
                      }}
                    />

                    {/* Resilient fallback card if image fails completely (never shows browser broken icon) */}
                    <div
                      className="news-fallback-card hidden absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white"
                      style={{ display: 'none' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {article.category.replace('-', ' ')}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300">{article.publisher}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                          <Newspaper className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
                          {article.title}
                        </p>
                      </div>
                    </div>

                    {/* Category Pill Tag Overlay */}
                    <div className="absolute top-2.5 left-2.5 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white shadow-sm border border-white/20">
                        {article.category.replace('-', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* ARTICLE BODY & HEADLINE */}
                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      {/* Bold Main Headline (Google Discover Style) */}
                      <h3
                        onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                      >
                        {article.title}
                      </h3>

                      {/* Excerpt / Snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                    </div>

                    {/* PUBLISHER FOOTER ROW (IDENTICAL TO GOOGLE FEED ATTACHMENT) */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Left: Publisher Favicon, Name, Time */}
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-4.5 h-4.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-3.5 h-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px] xs:max-w-[180px]">
                            {article.publisher}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{article.formattedDate}</span>
                        </div>
                      </div>

                      {/* Right: Google Feed Action Icons (Like, Share, Open) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Like/Heart button */}
                        <button
                          type="button"
                          onClick={() => toggleLikeItem({ ...article, type: 'news' })}
                          title={isLiked ? 'Saved' : 'Like'}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            isLiked
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`}
                          />
                        </button>

                        {/* Share button */}
                        <button
                          type="button"
                          onClick={() => handleShare(article.title, article.link)}
                          title="Share Article"
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.8]" />
                        </button>

                        {/* Read More / Open */}
                        <button
                          type="button"
                          onClick={() => openUrl(article.link, { ...article, type: 'news' })}
                          title="Read full article"
                          className="p-1.5 rounded-full text-slate-400 hover:emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 stroke-[1.8]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* CONTENT: SECTION B - BUSINESS OPPORTUNITIES (GOOGLE DISCOVER CARD STYLE) */}
      {!isLoading && sectionMode === 'opportunities' && (
        <div className="space-y-4">
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No opportunities found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchQuery
                  ? 'Try searching with different terms.'
                  : 'Opportunities feed is refreshing. Tap below to reload.'}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
              >
                Refresh Opportunities
              </button>
            </div>
          ) : (
            filteredOpportunities.map((opp) => {
              const isLiked = likedIds.has(opp.id);
              const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                opp.publisherDomain || 'google.com'
              )}&sz=64`;

              return (
                <div
                  key={opp.id}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* PROMINENT COVER THUMBNAIL (AS ON GOOGLE DISCOVER) */}
                  <div
                    onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                    className="relative w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={opp.thumbnailUrl}
                      alt={opp.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.triedFallback) {
                          target.dataset.triedFallback = 'true';
                          target.src = NewsService.getEditorialThumbnail(opp.title, opp.category, opp.description);
                        }
                      }}
                    />

                    {/* Resilient, custom opportunity fallback card if image fails completely (unique per opportunity) */}
                    <div
                      className="opp-fallback-card hidden absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white"
                      style={{ display: 'none' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {opp.category}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300">{opp.organisation}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                          <Briefcase className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
                          {opp.title}
                        </p>
                      </div>
                    </div>

                    {/* Top Badges (Category + Verification) */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-white shadow-sm border border-white/20">
                        {opp.category}
                      </span>

                      {opp.verificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm border border-emerald-400/40">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Source</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-900/80 backdrop-blur-md text-slate-200 shadow-sm border border-white/20">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          <span>Public Call</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OPPORTUNITY BODY */}
                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      {/* Title */}
                      <h3
                        onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                        className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {opp.title}
                      </h3>

                      {/* Organization & Location Meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{opp.organisation}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{opp.countryOrRegion}</span>
                        </div>
                      </div>

                      {/* Highlight Badges (Funding Amount & Deadline) */}
                      {(opp.fundingAmount || opp.deadline) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {opp.fundingAmount && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                              <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Amount: {opp.fundingAmount}</span>
                            </div>
                          )}

                          {opp.deadline && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60">
                              <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>Deadline: {opp.deadline}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {opp.description}
                      </p>
                    </div>

                    {/* FOOTER ACTIONS (GOOGLE FEED STYLE) */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Left: Organization Favicon & Time */}
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-4.5 h-4.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-3.5 h-3.5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px] xs:max-w-[160px]">
                            {opp.organisation}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{opp.formattedDate}</span>
                        </div>
                      </div>

                      {/* Right: Actions (Like, Share, Apply Now) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLikeItem({ ...opp, type: 'opportunity' })}
                          title={isLiked ? 'Saved' : 'Like'}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            isLiked
                              ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isLiked ? 'fill-rose-500 stroke-rose-500' : 'stroke-[1.8]'}`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(opp.title, opp.originalLink)}
                          title="Share Opportunity"
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.8]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openUrl(opp.originalLink, { ...opp, type: 'opportunity' })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer ml-1"
                        >
                          <span>Apply</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
        </>
      )}

      {/* CONTENT: SECTION C - SAVED FAVORITES VIEW */}
      {newsFooterTab === 'favorites' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Heart className="w-5 h-5 fill-rose-500 stroke-rose-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Favorites & Saved Stories</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {favoriteItems.length} saved {favoriteItems.length === 1 ? 'headline' : 'headlines'}
                </p>
              </div>
            </div>

            {favoriteItems.length > 0 && (
              <button
                type="button"
                onClick={() => setNewsFooterTab('feed')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Browse Feed
              </button>
            )}
          </div>

          {favoriteItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500 mx-auto">
                <Heart className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No saved favorites yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Tap the heart icon on any news headline or business opportunity to save it here for quick access later.
              </p>
              <button
                type="button"
                onClick={() => setNewsFooterTab('feed')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer inline-block mt-2"
              >
                Explore News Feed
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteItems.map((fav) => {
                const domain = fav.publisherDomain || 'google.com';
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

                return (
                  <div
                    key={fav.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col xs:flex-row gap-3 sm:gap-4"
                  >
                    <div className="w-full xs:w-28 sm:w-32 h-28 xs:h-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative">
                      <img
                        src={fav.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs">
                        {fav.type}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <img src={faviconUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                            {fav.publisher}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[11px] text-slate-400 truncate">{fav.formattedDate}</span>
                        </div>

                        <h3
                          onClick={() => openUrl(fav.link, fav)}
                          className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer leading-snug"
                        >
                          {fav.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openUrl(fav.link, fav)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleShare(fav.title, fav.link)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleLikeItem(fav)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENT: SECTION D - READING HISTORY VIEW */}
      {newsFooterTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reading History</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {readHistory.length} recently opened {readHistory.length === 1 ? 'story' : 'stories'}
                </p>
              </div>
            </div>

            {readHistory.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {readHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-500 mx-auto">
                <Clock className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No reading history yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Articles and business opportunities you open will automatically appear here so you can easily find them again.
              </p>
              <button
                type="button"
                onClick={() => setNewsFooterTab('feed')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer inline-block mt-2"
              >
                Start Browsing News
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {readHistory.map((hist) => {
                const domain = hist.publisherDomain || 'google.com';
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
                const isLiked = likedIds.has(hist.id);

                return (
                  <div
                    key={`${hist.id}_${hist.viewedAt}`}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col xs:flex-row gap-3 sm:gap-4"
                  >
                    <div className="w-full xs:w-28 sm:w-32 h-28 xs:h-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative">
                      <img
                        src={hist.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs">
                        {hist.type}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <img src={faviconUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                            {hist.publisher}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[11px] text-slate-400 truncate">{hist.formattedDate}</span>
                        </div>

                        <h3
                          onClick={() => openUrl(hist.link, hist)}
                          className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer leading-snug"
                        >
                          {hist.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openUrl(hist.link, hist)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          <span>Revisit Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleShare(hist.title, hist.link)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Share"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleLikeItem(hist)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isLiked
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isLiked ? 'Saved in Favorites' : 'Save to Favorites'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 stroke-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
