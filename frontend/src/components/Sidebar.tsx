import React, { useState, useEffect } from 'react';
import SearchCache from '../lib/searchCache';

interface SearchResult {
  cik: string;
  company: string;
  ticker: string;
  timestamp: number;
}

interface SidebarProps {
  onSearchSelect?: (company: string, cik: string) => void;
}

function Sidebar({ onSearchSelect }: SidebarProps) {
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [cacheStats, setCacheStats] = useState({ searches: 0, analyses: 0 });

  const updateSearches = () => {
    const searches = SearchCache.getRecentSearches();
    setRecentSearches(searches);
    setCacheStats(SearchCache.getCacheStats());
  };

  const handleSearchClick = (search: SearchResult) => {
    if (onSearchSelect) {
      onSearchSelect(search.company, search.cik);
    }
  };

  const handleClearAll = () => {
    SearchCache.clearCache();
    updateSearches();
  };

  useEffect(() => {
    updateSearches(); // Initial load

    // Listen for custom event that we'll dispatch from MainContent
    window.addEventListener('searchesUpdated', updateSearches);

    // Clean up the event listener
    return () => {
      window.removeEventListener('searchesUpdated', updateSearches);
    };
  }, []);

  return (
    <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Veritas</h1>
        <p className="text-xs text-gray-500">Corporate Integrity Monitor</p>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-600 flex items-center">
            Recent Searches
          </h2>
          {recentSearches.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>
        {recentSearches.length > 0 ? (
          <ul className="space-y-1">
            {recentSearches.map((search, index) => (
              <li 
                key={`${search.cik}-${index}`} 
                className="text-gray-700 py-2 px-3 rounded cursor-pointer hover:bg-gray-200 transition-colors duration-150 border border-transparent hover:border-gray-300"
                onClick={() => handleSearchClick(search)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm truncate">{search.company}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">{search.ticker}</span>
                    <span className="text-xs text-gray-400">
                      {SearchCache.formatTimestamp(search.timestamp)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recent searches.</p>
        )}
      </div>
    </div>
  );
}

export default Sidebar;