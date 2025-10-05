import React from 'react';
import { Trade, FilingAnalysis } from '../lib/types';
import { formatName } from '../lib/Trades';
import { analyzeTradeForSuspiciousActivity } from '../lib/integrityCalculator';

interface PersonTradesProps {
  person: {
    name: string;
    cik: string;
    roles: string[];
    trades: Trade[];
  };
  sentimentData: FilingAnalysis[];
  onBack: () => void;
}

const PersonTrades: React.FC<PersonTradesProps> = ({ person, sentimentData, onBack }) => {
  // Sort trades by date (most recent first)
  const sortedTrades = [...person.trades].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getTransactionTypeDisplay = (trade: Trade) => {
    const codeMap: { [key: string]: string } = {
      'P': 'Purchase',
      'S': 'Sale',
      'A': 'Acquisition',
      'D': 'Disposition',
      'M': 'Exercise',
      'F': 'Tax Withholding',
      'G': 'Gift',
      'V': 'Other',
    };
    return codeMap[trade.transaction_code] || trade.transaction_code;
  };

  const getActionColor = (code: string) => {
    switch (code) {
      case 'P':
      case 'A':
      case 'M':
        return 'text-green-700 bg-green-50';
      case 'S':
      case 'D':
        return 'text-red-700 bg-red-50';
      case 'F':
        return 'text-yellow-700 bg-yellow-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  // Generate fallback avatar (same logic as InsiderList)
  const getFallbackAvatarUrl = (name: string) => {
    const formattedName = formatName(name);
    const initials = formattedName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    let hash = 0;
    for (let i = 0; i < formattedName.length; i++) {
      hash = formattedName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = '6b7280';
    return `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=120&bold=true&length=2`;
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-lg margin-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
            <img
              src={getFallbackAvatarUrl(person.name)}
              alt={formatName(person.name)}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatName(person.name)}'s Trades
            </h3>
            <p className="text-gray-600">
              {person.roles?.join(", ") || "No roles assigned"}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Stakeholders
        </button>
      </div>

      {/* Trades list */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Transaction History ({sortedTrades.length} trades)
        </h4>
        
        {sortedTrades.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No trades available for this person.</p>
        ) : (
          <div className="space-y-2">
            {sortedTrades.map((trade, index) => {
              // Analyze this trade for suspicious activity
              const suspiciousActivity = analyzeTradeForSuspiciousActivity(trade, sentimentData);
              const isSuspicious = suspiciousActivity.length > 0;
              
              return (
                <div 
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    isSuspicious 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {/* Suspicious Activity Alert */}
                  {isSuspicious && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 font-medium text-sm mb-2">
                        <span className="text-red-600">⚠️</span>
                        Potentially Suspicious Activity
                      </div>
                      {suspiciousActivity.map((activity, idx) => (
                        <div key={idx} className="mb-2 last:mb-0">
                          <div className="text-red-700 text-sm mb-1">
                            • {activity.reason}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              activity.filing.vector_prediction.vector_prediction.confidence === 'High' ? 'bg-red-200 text-red-800' :
                              (activity.filing.vector_prediction.vector_prediction.confidence === 'Medium' || activity.filing.vector_prediction.vector_prediction.confidence === 'Moderate') ? 'bg-orange-200 text-orange-800' :
                              'bg-yellow-200 text-yellow-800'
                            }`}>
                              {activity.filing.vector_prediction.vector_prediction.confidence} Confidence
                            </span>
                            <a
                              href={activity.filing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View SEC Filing →
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(trade.transaction_code)}`}>
                        {getTransactionTypeDisplay(trade)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{trade.security}</p>
                        <p className="text-sm text-gray-500">{formatDate(trade.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNumber(trade.shares)} shares
                      </p>
                      <p className="text-sm text-gray-600">
                        @ {trade.price_per_share ? formatCurrency(trade.price_per_share) : 'N/A'}
                      </p>
                    </div>
                  </div>
                
                {/* Additional details */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-gray-600">
                  <span>
                    <strong>Acquired/Disposed:</strong> {trade.acquired_disposed}
                  </span>
                  <span>
                    <strong>Shares Owned After:</strong> {formatNumber(trade.shares_owned_after)}
                  </span>
                  <span>
                    <strong>Type:</strong> {trade.transaction_type}
                  </span>
                </div>
                
                {/* Total value if available */}
                {trade.price_per_share && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-gray-700">
                      Total Value: {formatCurrency(trade.shares * trade.price_per_share)}
                    </span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonTrades;