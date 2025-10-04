import React from 'react';
import { ApiResponse } from '../lib/types';

// Define the props for this component
interface CompanyScoreCardProps {
  company: ApiResponse;
}

// Helper to determine the color and descriptor based on the score
const getScoreStatus = (score: number) => {
  if (score >= 80) return { color: 'text-green-600 border-green-600', descriptor: 'High Integrity' };
  if (score >= 50) return { color: 'text-yellow-600 border-yellow-600', descriptor: 'Moderate Scrutiny' };
  return { color: 'text-red-600 border-red-600', descriptor: 'High Anomaly Risk' };
};

const CompanyScoreCard: React.FC<CompanyScoreCardProps> = ({ company }) => {
  const { color, descriptor } = getScoreStatus(company.overallScore);
  const percentage = Math.min(100, Math.max(0, company.overallScore));

  return (
    <div className="bg-white border-gray-300 mt-4 mb-4 p-6 border-2 rounded-lg max-w-lg w-full transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl">
      <p className="text-sm text-gray-500 mb-6">Overall Corporate Integrity Score</p>

      <div className="flex items-center space-x-6">
        {/* Score Ring (Visualization) */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={color.split(' ')[1]}
              strokeWidth="6"
              strokeDasharray="251.2" // 2 * pi * r (approx)
              strokeDashoffset={251.2 - (251.2 * percentage) / 100}
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={`text-3xl font-extrabold ${color}`}>
              {company.overallScore}
            </p>
          </div>
        </div>
        
        {/* Score Details */}
        <div>
          <p className={`text-lg font-semibold ${color} mb-1`}>{descriptor.toUpperCase()}</p>
          <p className="text-sm text-gray-700">
            Based on {company.people.length} executive filings.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            * Score is calculated by averaging anomaly detection metrics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyScoreCard;
