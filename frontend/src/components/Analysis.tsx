import React, { useState, useEffect } from 'react';
import { GetInfoResponse } from '../lib/types';
import StockGraph from './StockGraph';

interface AnalysisProps {
  cik: string;
}

const Analysis: React.FC<AnalysisProps> = ({ cik }) => {
  const [data, setData] = useState<GetInfoResponse>();
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
  }, [cik]); // Re-run effect if cik changes

  if (loading) {
    return <div>Loading analysis for CIK: {cik}...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available for CIK: {cik}</div>;
  }

  return (
    <div>
      <h2>Analysis for CIK: {cik}</h2>
      <StockGraph insiderData={data} />
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Insider Trading Summary</h3>
        <p>Total Insiders: {data.total_insiders}</p>
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">View Raw Data</summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default Analysis;
