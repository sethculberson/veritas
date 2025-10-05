import { FilingAnalysis, InsiderInfo, Trade } from './types';

interface SuspiciousTrade {
  trade: Trade;
  filing: FilingAnalysis;
  penalty: number;
  reason: string;
  daysBeforeFiling: number;
}

interface IntegrityAnalysis {
  insider: InsiderInfo;
  integrityScore: number;
  suspiciousTrades: SuspiciousTrade[];
  totalPenalty: number;
}

// Penalty mapping based on confidence levels
const CONFIDENCE_PENALTIES: Record<string, number> = {
  "High": 100,
  "Medium": 50,
  "Low": 10
};

/**
 * Analyze a single trade for suspicious patterns
 * @param trade The trade to analyze
 * @param sentimentData Array of filing analyses
 * @returns Array of suspicious trade details if any
 */
export function analyzeTradeForSuspiciousActivity(
  trade: Trade, 
  sentimentData: FilingAnalysis[]
): SuspiciousTrade[] {
  const suspiciousActivities: SuspiciousTrade[] = [];
  const tradeDate = new Date(trade.date);
  
  sentimentData.forEach(filing => {
    const filingDate = new Date(filing.filing_date);
    const daysDifference = Math.floor((filingDate.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if trade occurred within 30 days before the filing
    if (daysDifference >= 0 && daysDifference <= 30) {
      const impact = filing.vector_prediction.vector_prediction.impact;
      const confidence = filing.vector_prediction.vector_prediction.confidence;
      
      let isSuspicious = false;
      let reason = "";
      
      // Case 1: STOCK_UP sentiment and insider bought before
      if (impact === "STOCK_UP" && trade.acquired_disposed === "A") {
        isSuspicious = true;
        reason = `Purchased ${trade.shares} shares ${daysDifference} days before positive sentiment filing (${confidence} confidence)`;
      }
      
      // Case 2: STOCK_DOWN sentiment and insider sold before  
      if (impact === "STOCK_DOWN" && trade.acquired_disposed === "D") {
        isSuspicious = true;
        reason = `Sold ${trade.shares} shares ${daysDifference} days before negative sentiment filing (${confidence} confidence)`;
      }
      
      if (isSuspicious) {
        const penalty = CONFIDENCE_PENALTIES[confidence];
        suspiciousActivities.push({
          trade,
          filing,
          penalty,
          reason,
          daysBeforeFiling: daysDifference
        });
      }
    }
  });
  
  return suspiciousActivities;
}

/**
 * Calculate integrity scores for insiders based on sentiment analysis
 * @param insiders Array of insider information
 * @param sentimentData Array of filing analyses with sentiment predictions
 * @returns Array of insiders with calculated integrity scores
 */
export function calculateInsiderIntegrity(
  insiders: InsiderInfo[], 
  sentimentData: FilingAnalysis[]
): InsiderInfo[] {
  
  return insiders.map(insider => {
    let totalPenalty = 0;
    const suspiciousTrades: SuspiciousTrade[] = [];
    
    // Check each trade against sentiment predictions
    insider.trades.forEach(trade => {
      const tradeAnalysis = analyzeTradeForSuspiciousActivity(trade, sentimentData);
      suspiciousTrades.push(...tradeAnalysis);
      totalPenalty += tradeAnalysis.reduce((sum, analysis) => sum + analysis.penalty, 0);
    });
    
    // Calculate final integrity score (starting from 100, subtracting penalties)
    const integrityScore = Math.max(0, 100 - totalPenalty);
    
    // Log for debugging
    if (suspiciousTrades.length > 0) {
      console.log(`Insider ${insider.name} has ${suspiciousTrades.length} suspicious trades with total penalty of ${totalPenalty}. Final integrity score: ${integrityScore}`);
    }
    
    return {
      ...insider,
      integrityScore
    };
  });
}

/**
 * Get detailed integrity analysis for a specific insider
 * @param insider Insider information
 * @param sentimentData Array of filing analyses
 * @returns Detailed analysis including suspicious trades
 */
export function getInsiderIntegrityAnalysis(
  insider: InsiderInfo,
  sentimentData: FilingAnalysis[]
): IntegrityAnalysis {
  let totalPenalty = 0;
  const suspiciousTrades: SuspiciousTrade[] = [];
  
  insider.trades.forEach(trade => {
    const tradeAnalysis = analyzeTradeForSuspiciousActivity(trade, sentimentData);
    suspiciousTrades.push(...tradeAnalysis);
    totalPenalty += tradeAnalysis.reduce((sum, analysis) => sum + analysis.penalty, 0);
  });
  
  const integrityScore = Math.max(0, 100 - totalPenalty);
  
  return {
    insider,
    integrityScore,
    suspiciousTrades,
    totalPenalty
  };
}

/**
 * Get integrity score color class for UI display
 * @param score Integrity score (0-100)
 * @returns CSS class for color coding
 */
export function getIntegrityScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600"; 
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get integrity score label
 * @param score Integrity score (0-100)  
 * @returns Human readable label
 */
export function getIntegrityScoreLabel(score: number): string {
  if (score >= 80) return "High Integrity";
  if (score >= 60) return "Medium Integrity";
  if (score >= 40) return "Low Integrity";
  return "Very Low Integrity";
}