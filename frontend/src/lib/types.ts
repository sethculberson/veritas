export interface People {
    name: string,
    integrityScore: number,
    title: string,
}
export interface ApiResponse {
    overallScore: number,
    people: People[],
}

export interface GetInfoResponse {
  success: boolean;
  cik: string;
  padded_cik: string;
  total_insiders: number;
  insiders: InsiderInfo[];
  stock_data: StockDataPoint[];
  ticker: string;
}

// Stock Data Types
export interface StockDataPoint {
  date: string;
  price: number;
}

// Insider Data Types
export interface InsiderInfo {
  name: string;
  cik: string;
  roles: string[];
  trades: Trade[];
}

export interface Trade {
  security: string;
  date: string;
  transaction_code: string;
  shares: number;
  price_per_share: number | null;
  acquired_disposed: string;
  shares_owned_after: number;
  transaction_type: 'non-derivative' | 'derivative';
  
  // Additional fields for derivative transactions
  exercise_price?: number | null;
  underlying_shares?: number;
}