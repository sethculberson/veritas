import { FilingAnalysis, InsiderInfo, Trade } from './types';

interface IntegrityPenalty {
  confidence: "Low" | "Medium" | "High";
  penalty: number;
}

// Penalty mapping based on confidence levels
const CONFIDENCE_PENALTIES: Record<string, number> = {
  "High": 100,
  "Medium": 50,
  "Low": 10
};

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
    const suspiciousTrades: Array<{trade: Trade, filing: FilingAnalysis, penalty: number}> = [];
    
    // Check each trade against sentiment predictions
    insider.trades.forEach(trade => {
      const tradeDate = new Date(trade.date);
      
      // Check against each sentiment filing
      sentimentData.forEach(filing => {
        const filingDate = new Date(filing.filing_date);
        const daysDifference = Math.floor((filingDate.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if trade occurred within 30 days before the filing
        if (daysDifference >= 0 && daysDifference <= 30) {
          const impact = filing.vector_prediction.vector_prediction.impact;
          const confidence = filing.vector_prediction.vector_prediction.confidence;
          
          let isSuspicious = false;
          
          // Case 1: STOCK_UP sentiment and insider bought before
          if (impact === "STOCK_UP" && trade.acquired_disposed === "A") {
            isSuspicious = true;
          }
          
          // Case 2: STOCK_DOWN sentiment and insider sold before  
          if (impact === "STOCK_DOWN" && trade.acquired_disposed === "D") {
            isSuspicious = true;
          }
          
          if (isSuspicious) {
            const penalty = CONFIDENCE_PENALTIES[confidence];
            totalPenalty += penalty;
            
            suspiciousTrades.push({
              trade,
              filing,
              penalty
            });
          }
        }
      });
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