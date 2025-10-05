import React, { useState, useEffect } from 'react';
import { GetInfoResponse } from '../lib/types';
import StockGraph from './StockGraph';
import InsiderList from './InsiderList';
import SearchCache from '../lib/searchCache';
import { calculateInsiderIntegrity, calculateCompanyIntegrityScore, getIntegrityScoreColor } from '../lib/integrityCalculator';
import FilingAnalysisSummary from './FilingAnalysisSummary';

interface AnalysisProps {
  cik: string;
  companyName?: string;
  onAnalysisComplete?: (company: { cik: string; name: string; ticker: string }) => void;
}

const Analysis: React.FC<AnalysisProps> = ({ cik, companyName, onAnalysisComplete }) => {
  const [data, setData] = useState<GetInfoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  useEffect(() => {
    if (!cik) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFromCache(false);

      // First, check if we have cached data
      const cachedData = SearchCache.getCachedAnalysis(cik);
      
      if (cachedData) {
        console.log(`Loading cached analysis data for CIK: ${cik}`);
        setData(cachedData);
        setFromCache(true);
        setLoading(false);
        
        // Call completion callback for cached data as well
        if (onAnalysisComplete && cachedData.ticker) {
          onAnalysisComplete({
            cik: cik,
            name: companyName || cachedData.ticker,
            ticker: cachedData.ticker
          });
        }
        return;
      }

      // If no cache, fetch from API
      try {
        console.log(`Fetching fresh analysis data for CIK: ${cik}`);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/getInfo/${cik}`);

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 429) {
            throw new Error('SEC_RATE_LIMIT');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Only cache successful results (don't cache errors or rate limits)
        if (result.success) {
          SearchCache.cacheAnalysis(cik, result);
          console.log(`Cached analysis data for CIK: ${cik}`);
          
          // Call completion callback if provided
          if (onAnalysisComplete && result.ticker) {
            onAnalysisComplete({
              cik: cik,
              name: companyName || result.ticker,
              ticker: result.ticker
            });
          }
        }

        setData(result);
      } catch (e) {
        if (e instanceof Error) {
          if (e.message === 'SEC_RATE_LIMIT') {
            setError('SEC rate limit exceeded. Please wait a moment and try again. The SEC limits the number of requests per minute to protect their servers.');
          } else {
            setError(e.message);
          }
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cik]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <label className="mt-4 text-gray-600">Loading integrity analysis for {companyName || `CIK: ${cik}`}...</label>
      </div>
    );
  }

  if (error) {
    const isRateLimit = error.includes('SEC rate limit exceeded');

    return (
      <div className={`p-6 rounded-lg border ${isRateLimit ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
        <div className={`flex items-center mb-3 ${isRateLimit ? 'text-yellow-800' : 'text-red-800'}`}>
          <span className="text-xl mr-2">{isRateLimit ? '⏳' : '❌'}</span>
          <h3 className="font-semibold">
            {isRateLimit ? 'Rate Limit Exceeded' : 'Error Loading Data'}
          </h3>
        </div>
        <p className={`${isRateLimit ? 'text-yellow-700' : 'text-red-700'}`}>
          {error}
        </p>
        {isRateLimit && (
          <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> Try clicking on a recent search from the sidebar - those are cached and load instantly!
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return <div>No data available for {companyName || `CIK: ${cik}`}</div>;  
  }

  // Calculate integrity scores for insiders based on sentiment analysis
  const insidersWithIntegrity = calculateInsiderIntegrity(data.insiders, data.sentiment);
  const companyIntegrityScore = calculateCompanyIntegrityScore(insidersWithIntegrity);

  console.log("sentiment", data.sentiment)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Analysis for CIK: {cik}</h2>
        <div className="flex items-center gap-3">
          {/* Company Integrity Score */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-700">Company Integrity:</span>
            <span className={`px-4 py-2 rounded-full text-lg font-bold ${
              companyIntegrityScore >= 80 ? 'bg-green-100 text-green-800' :
              companyIntegrityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
              companyIntegrityScore >= 40 ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {companyIntegrityScore}/100
            </span>
          </div>
          {fromCache && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              📦 Cached Data
            </span>
          )}
        </div>
      </div>
      <StockGraph insiderData={data} />
      <div className="mt-8">
        <InsiderList insiders={insidersWithIntegrity} sentimentData={data.sentiment} />
      </div>
      <FilingAnalysisSummary filingsAnalysis={data.sentiment} />
    </div>
  );
};

export default Analysis;
