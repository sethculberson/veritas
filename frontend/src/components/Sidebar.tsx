import React, { useState, useEffect } from 'react';

interface SearchResult {
  cik: string;
  name: string;
}

function Sidebar() {
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);

  const updateSearches = () => {
    const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(searches);
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
        <h2 className="text-sm font-semibold text-gray-600 mb-2 flex items-center">
          Recent Searches
        </h2>
        {recentSearches.length > 0 ? (
          <ul>
            {recentSearches.map((search) => (
              <li key={search.cik} className="text-gray-700 py-1 px-2 rounded cursor-pointer hover:bg-gray-200">
                {search.name}
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