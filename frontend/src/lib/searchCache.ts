import { GetInfoResponse } from './types';

interface SearchCacheItem {
  query: string;
  company: string;
  ticker: string;
  cik: string;
  timestamp: number;
}

interface AnalysisCacheItem {
  cik: string;
  data: GetInfoResponse;
  timestamp: number;
}

interface CacheData {
  searches: SearchCacheItem[];
  analyses: AnalysisCacheItem[];
  lastCleanup: number;
}

const CACHE_KEY = 'veritas_recent_searches';
const ANALYSIS_CACHE_KEY = 'veritas_analysis_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const ANALYSIS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day for analysis data
const MAX_RECENT_SEARCHES = 10; // Maximum number of recent searches to keep
const MAX_CACHED_ANALYSES = 20; // Maximum number of cached analyses to keep

export class SearchCache {
  private static getCacheData(): CacheData {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to parse search cache:', error);
    }
    
    return {
      searches: [],
      analyses: [],
      lastCleanup: Date.now()
    };
  }

  private static setCacheData(data: CacheData): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save search cache:', error);
    }
  }

  private static cleanExpiredEntries(data: CacheData): CacheData {
    const now = Date.now();
    const searchCutoff = now - CACHE_DURATION;
    const analysisCutoff = now - ANALYSIS_CACHE_DURATION;
    
    return {
      searches: data.searches.filter(item => item.timestamp > searchCutoff),
      analyses: (data.analyses || []).filter(item => item.timestamp > analysisCutoff),
      lastCleanup: now
    };
  }

  // Normalize CIK to remove leading zeros for consistent lookup
  private static normalizeCik(cik: string): string {
    return cik.replace(/^0+/, '') || '0';
  }

  // Add a new search to the cache
  static addSearch(company: string, ticker: string, cik: string): void {
    const normalizedCik = this.normalizeCik(cik);
    const query = company.toLowerCase();
    const timestamp = Date.now();
    
    let data = this.getCacheData();
    
    // Clean expired entries if it's been more than a day since last cleanup
    if (timestamp - data.lastCleanup > 24 * 60 * 60 * 1000) {
      data = this.cleanExpiredEntries(data);
    }
    
    // Remove any existing entry for this company to avoid duplicates
    data.searches = data.searches.filter(item => 
      this.normalizeCik(item.cik) !== normalizedCik && item.ticker.toLowerCase() !== ticker.toLowerCase()
    );
    
    // Add new search at the beginning
    data.searches.unshift({
      query,
      company,
      ticker,
      cik: normalizedCik,
      timestamp
    });
    
    // Keep only the most recent searches
    data.searches = data.searches.slice(0, MAX_RECENT_SEARCHES);
    
    this.setCacheData(data);
  }

  // Get recent searches, optionally filtered by query
  static getRecentSearches(filterQuery?: string): SearchCacheItem[] {
    let data = this.getCacheData();
    
    // Clean expired entries
    data = this.cleanExpiredEntries(data);
    this.setCacheData(data);
    
    let searches = data.searches;
    
    // Filter by query if provided
    if (filterQuery && filterQuery.trim()) {
      const query = filterQuery.toLowerCase();
      searches = searches.filter(item => 
        item.company.toLowerCase().includes(query) ||
        item.ticker.toLowerCase().includes(query)
      );
    }
    
    return searches;
  }

  // Clear all cached searches
  static clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear search cache:', error);
    }
  }

  // --- Analysis Data Caching Methods ---

  // Cache analysis data for a CIK
  static cacheAnalysis(cik: string, analysisData: GetInfoResponse): void {
    const normalizedCik = this.normalizeCik(cik);
    const timestamp = Date.now();
    
    let data = this.getCacheData();
    
    // Clean expired entries
    data = this.cleanExpiredEntries(data);
    
    // Remove any existing entry for this CIK
    data.analyses = (data.analyses || []).filter(item => this.normalizeCik(item.cik) !== normalizedCik);
    
    // Add new analysis at the beginning
    data.analyses.unshift({
      cik: normalizedCik,
      data: analysisData,
      timestamp
    });
    
    // Keep only the most recent analyses
    data.analyses = data.analyses.slice(0, MAX_CACHED_ANALYSES);
    
    this.setCacheData(data);
  }

  // Get cached analysis data for a CIK
  static getCachedAnalysis(cik: string): GetInfoResponse | null {
    const normalizedCik = this.normalizeCik(cik);
    let data = this.getCacheData();
    
    // Clean expired entries
    data = this.cleanExpiredEntries(data);
    this.setCacheData(data);
    
    console.log(`Looking for normalized CIK: "${normalizedCik}" in cache. Available CIKs:`, 
      (data.analyses || []).map(item => `"${item.cik}"`));
    
    const cachedItem = (data.analyses || []).find(item => this.normalizeCik(item.cik) === normalizedCik);
    return cachedItem ? cachedItem.data : null;
  }

  // Check if analysis data is cached and still valid
  static hasValidAnalysisCache(cik: string): boolean {
    return this.getCachedAnalysis(cik) !== null;
  }

  // Clear analysis cache
  static clearAnalysisCache(): void {
    let data = this.getCacheData();
    data.analyses = [];
    this.setCacheData(data);
  }

  // Get cache statistics
  static getCacheStats(): { searches: number; analyses: number } {
    const data = this.getCacheData();
    return {
      searches: data.searches.length,
      analyses: (data.analyses || []).length
    };
  }

  // Get the age of a search in days
  static getSearchAge(timestamp: number): number {
    return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  }

  // Format timestamp for display
  static formatTimestamp(timestamp: number): string {
    const age = this.getSearchAge(timestamp);
    
    if (age === 0) {
      return 'Today';
    } else if (age === 1) {
      return 'Yesterday';
    } else {
      return `${age} days ago`;
    }
  }
}

export default SearchCache;