import { useState, useEffect } from 'react';
import Analysis from './Analysis'; // Import the Analysis component

// --- Mock CompanyScoreCard component ---
const CompanyScoreCard = ({ company }: { company: any }) => {
  if (!company) return null;
  return (
    <div className="mt-10 p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-800">{company.companyName} ({company.ticker})</h3>
      <p className="text-lg text-gray-600 mt-2">Anomaly Score: <span className="font-bold text-red-600">{company.score}/100</span></p>
      <p className="mt-4 text-gray-700">{company.summary}</p>
    </div>
  );
};

// --- Main Content Component ---
interface MainContentProps {
  onSearch: (query: string) => void;
}

interface CompanySuggestion {
  cik_str: number;
  ticker: string;
  title: string;
}

const MainContent: React.FC<MainContentProps> = ({ onSearch }) => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [allCompanies, setAllCompanies] = useState<CompanySuggestion[]>([]);
  const [selectedCik, setSelectedCik] = useState<string>(''); 
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>(''); 
  const [analyze, setAnalyze] = useState<boolean>(false); // NEW: Only run analysis when true

  const saveSearch = (company: { cik: string; name: string }) => {
    const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const filteredSearches = searches.filter((s: any) => s.cik !== company.cik);
    const newSearches = [company, ...filteredSearches].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));
    window.dispatchEvent(new Event('searchesUpdated'));
  };

  useEffect(() => {
    const fetchAllCompanies = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/autofill`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const companiesArray = Object.values(data) as CompanySuggestion[];
        setAllCompanies(companiesArray);
      } catch (error) {
        console.error('Failed to fetch company list:', error);
      }
    };
    fetchAllCompanies();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (allCompanies.length > 0) {
      const lowercasedQuery = query.toLowerCase();
      const filtered = allCompanies.filter(
        (company) =>
          company.title.toLowerCase().includes(lowercasedQuery) ||
          company.ticker.toLowerCase().includes(lowercasedQuery)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  }, [query, allCompanies]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (!query.trim()) return;

    onSearch(query.trim());

    const match = allCompanies.find(
      (company) =>
        company.title.toLowerCase() === query.toLowerCase() ||
        company.ticker.toLowerCase() === query.toLowerCase()
    );

    if (match) {
      setSelectedCik(match.cik_str.toString());
      setSelectedCompanyName(match.title);
      saveSearch({ cik: match.cik_str.toString(), name: match.title });
      setAnalyze(true); // ✅ only now trigger analysis
    } else {
      setSelectedCik('');
      setSelectedCompanyName('');
      setAnalyze(false);
    }
  };

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    setQuery(suggestion.title);
    setSelectedCik(suggestion.cik_str.toString());
    setSelectedCompanyName(suggestion.title);
    saveSearch({ cik: suggestion.cik_str.toString(), name: suggestion.title });
    setSuggestions([]);
    setShowSuggestions(false);
    setAnalyze(false); // ✅ don't auto-analyze on suggestion click
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-start p-10 overflow-y-auto bg-white">
      <header className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
          Analyze Corporate Trading
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Input a publicly traded company's name or ticker symbol to detect statistically suspicious insider trading patterns.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl relative">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3 bg-white border-2 border-gray-300 rounded-xl p-2 shadow-lg focus-within:border-blue-500 transition duration-300 w-full">
            <input
              type="text"
              className="flex-grow p-3 text-lg border-none focus:ring-0 rounded-lg outline-none"
              placeholder="e.g., Apple, JPMorgan, TSLA, AAPL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              aria-label="Search company name or ticker"
              required
              autoComplete="off"
            />
            <button
              type="submit"
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-300 shadow-md transform active:scale-95"
              aria-label="Run analysis"
            >
              Analyze
            </button>
          </div>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <ul className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onMouseDown={() => handleSuggestionClick(suggestion)}
                >
                  <span className="font-medium text-gray-800">{suggestion.title}</span>
                  <span className="ml-2 text-gray-500">{suggestion.ticker}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {/* ✅ Only render analysis if Analyze button was pressed */}
      <div className="mt-10 w-full max-w-4xl">
        {analyze && selectedCik && <Analysis cik={selectedCik} companyName={selectedCompanyName} />}
      </div>
    </div>
  );
};

export default MainContent;
