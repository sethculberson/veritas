import React from 'react';
import { FilingAnalysis } from '../lib/types';

interface FilingAnalysisSummaryProps {
  filingsAnalysis: FilingAnalysis[];
}

const FilingAnalysisSummary: React.FC<FilingAnalysisSummaryProps> = ({ filingsAnalysis }) => {
  if (!filingsAnalysis || filingsAnalysis.length === 0) {
    return null;
  }

  const getSentimentColor = (impact: string) => {
    switch (impact) {
      case 'STOCK_UP':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'STOCK_DOWN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'NEUTRAL':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-orange-100 text-orange-800';
      case 'Low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getSentimentIcon = (impact: string) => {
    switch (impact) {
      case 'STOCK_UP':
        return '📈';
      case 'STOCK_DOWN':
        return '📉';
      case 'NEUTRAL':
        return '➡️';
      default:
        return '❓';
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        SEC Filing Analysis Summary
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Analysis of {filingsAnalysis.length} SEC filing{filingsAnalysis.length !== 1 ? 's' : ''} 
        used for insider trading integrity assessment.
      </p>
      
      <div className="space-y-4">
        {filingsAnalysis.map((filing, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">
                    Filing from {formatDate(filing.filing_date)}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(filing.vector_prediction.vector_prediction.impact)}`}>
                      {getSentimentIcon(filing.vector_prediction.vector_prediction.impact)} {filing.vector_prediction.vector_prediction.impact.replace('STOCK_', '')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(filing.vector_prediction.vector_prediction.confidence)}`}>
                      {filing.vector_prediction.vector_prediction.confidence} Confidence
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                  {filing.vector_prediction.summary.length > 300 
                    ? `${filing.vector_prediction.summary.substring(0, 300)}...`
                    : filing.vector_prediction.summary
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                Filing Date: {formatDate(filing.filing_date)}
              </div>
              <a
                href={filing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View SEC Filing
              </a>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Statistics */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">
              {filingsAnalysis.filter(f => f.vector_prediction.vector_prediction.impact === 'STOCK_UP').length}
            </div>
            <div className="text-sm text-green-600">Positive Impact</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-700">
              {filingsAnalysis.filter(f => f.vector_prediction.vector_prediction.impact === 'STOCK_DOWN').length}
            </div>
            <div className="text-sm text-red-600">Negative Impact</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-700">
              {filingsAnalysis.filter(f => f.vector_prediction.vector_prediction.impact === 'NEUTRAL').length}
            </div>
            <div className="text-sm text-gray-600">Neutral Impact</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilingAnalysisSummary;