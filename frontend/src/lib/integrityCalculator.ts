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

// Base penalty mapping based on confidence levels (will be scaled by distance)
const BASE_CONFIDENCE_PENALTIES: Record<string, number> = {
  "High": 20,
  "Moderate": 15,
  "Low": 8
};

/**
 * Calculate distance-based penalty multiplier
 * Closer to filing date = higher penalty
 * @param daysBeforeFiling Number of days between trade and filing
 * @returns Multiplier between 0.3 and 1.0
 */
function getDistanceMultiplier(daysBeforeFiling: number): number {
  // Maximum penalty for trades 1-3 days before filing
  if (daysBeforeFiling <= 3) return 1.0;
  
  // Linear decrease from 1.0 to 0.3 over 30 days
  // 3 days = 1.0, 30 days = 0.3
  const multiplier = 1.0 - ((daysBeforeFiling - 3) * 0.7) / 27;
  return Math.max(0.3, Math.min(1.0, multiplier));
}

/**
 * Calculate integrity score for a single trade
 * @param trade The trade to analyze
 * @param sentimentData Array of filing analyses
 * @returns Integrity score for this trade (0-100, where 100 is perfect)
 */
function calculateTradeIntegrityScore(
  trade: Trade,
  sentimentData: FilingAnalysis[]
): number {
  const suspiciousActivities = analyzeTradeForSuspiciousActivity(trade, sentimentData);
  
  if (suspiciousActivities.length === 0) {
    return 100; // Perfect score for non-suspicious trades
  }
  
  // Calculate total penalty for this trade
  let totalPenalty = 0;
  suspiciousActivities.forEach(activity => {
    const basePenalty = BASE_CONFIDENCE_PENALTIES[activity.filing.vector_prediction.vector_prediction.confidence] || 8;
    const distanceMultiplier = getDistanceMultiplier(activity.daysBeforeFiling);
    const adjustedPenalty = basePenalty * distanceMultiplier;
    totalPenalty += adjustedPenalty;
  });
  
  // Return score (100 - penalty, minimum 0)
  return Math.max(0, 100 - totalPenalty);
}

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
        const basePenalty = BASE_CONFIDENCE_PENALTIES[confidence] || 8;
        const distanceMultiplier = getDistanceMultiplier(daysDifference);
        const penalty = basePenalty * distanceMultiplier;
        
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
    // Calculate integrity score for each trade
    const tradeScores = insider.trades.map(trade => 
      calculateTradeIntegrityScore(trade, sentimentData)
    );
    
    // Calculate average integrity score for this insider
    const integrityScore = tradeScores.length > 0 
      ? Math.round(tradeScores.reduce((sum, score) => sum + score, 0) / tradeScores.length)
      : 100; // Perfect score if no trades
    
    // Log for debugging
    if (tradeScores.some(score => score < 100)) {
      console.log(`Insider ${insider.name}: ${tradeScores.length} trades, scores: [${tradeScores.join(', ')}], average: ${integrityScore}`);
    }
    
    return {
      ...insider,
      integrityScore
    };
  });
}

/**
 * Calculate company-wide integrity score
 * @param insiders Array of insiders with calculated integrity scores
 * @returns Company integrity score (0-100)
 */
export function calculateCompanyIntegrityScore(insiders: InsiderInfo[]): number {
  const insidersWithScores = insiders.filter(insider => 
    typeof insider.integrityScore === 'number'
  );
  
  if (insidersWithScores.length === 0) {
    return 100; // Perfect score if no insiders have scores
  }
  
  const totalScore = insidersWithScores.reduce((sum, insider) => 
    sum + (insider.integrityScore || 100), 0
  );
  
  return Math.round(totalScore / insidersWithScores.length);
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
  if (score >= 80) return "bg-green-600";
  if (score >= 60) return "bg-yellow-600"; 
  if (score >= 40) return "bg-orange-600";
  return "bg-red-600";
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