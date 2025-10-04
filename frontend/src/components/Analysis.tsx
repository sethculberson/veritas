import React, { useState, useEffect } from 'react';
import { GetInfoResponse } from '../lib/types';
import StockGraph from './StockGraph';
import InsiderList from './InsiderList';

interface AnalysisProps {
  cik: string;
  companyName?: string;
}

const Analysis: React.FC<AnalysisProps> = ({ cik, companyName }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cik) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://127.0.0.1:5000/getInfo/${cik}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
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
        <p className="mt-4 text-gray-600">Loading integrity analysis for {companyName || `CIK: ${cik}`}...</p>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available for {companyName || `CIK: ${cik}`}</div>;  
  }

  return (
    <div>
      <h2>Analysis for CIK: {cik}</h2>
      <StockGraph insiderData={data} />
      <div className="mt-8">
        <InsiderList insiders={data.insiders} />
      </div>
    </div>
  );
};

export default Analysis;
