import { ApiResponse } from '../lib/types';

// --- SCENARIO 1: HIGH ANOMALY RISK (LOW INTEGRITY SCORE) ---
export const MOCK_HIGH_ANOMALY: ApiResponse = {
  overallScore: 45, 
  people: [
    { name: "Elon Musk", integrityScore: 32, title: "CEO" },
    { name: "Kimbal Musk", integrityScore: 40, title: "Director" },
    { name: "Robyn Denholm", integrityScore: 91, title: "Chair of the Board" },
    { name: "Zachary Kirkhorn", integrityScore: 88, title: "Former CFO" },
    { name: "Drew Baglino", integrityScore: 65, title: "SVP Powertrain" },
    { name: "Vaibhav Taneja", integrityScore: 55, title: "CFO" },
  ],
};

// --- SCENARIO 2: MODERATE RISK (AVERAGE INTEGRITY SCORE) ---
export const MOCK_MODERATE_RISK: ApiResponse = {
  overallScore: 68, 
  people: [
    { name: "Jamie Dimon", integrityScore: 62, title: "Chairman and CEO" },
    { name: "Mary Callahan Erdoes", integrityScore: 75, title: "CEO of Asset & Wealth Mgmt" },
    { name: "Daniel E. Pinto", integrityScore: 71, title: "President and COO" },
    { name: "Stacey Friedman", integrityScore: 85, title: "General Counsel" },
    { name: "Lori A. Beer", integrityScore: 68, title: "Global Chief Information Officer" },
  ],
};

// --- SCENARIO 3: HIGH INTEGRITY (HIGH SCORE) ---
export const MOCK_HIGH_INTEGRITY: ApiResponse = {
  overallScore: 92, 
  people: [
    { name: "Tim Cook", integrityScore: 95, title: "CEO" },
    { name: "Luca Maestri", integrityScore: 89, title: "CFO" },
    { name: "Jeff Williams", integrityScore: 93, title: "COO" },
    { name: "Deirdre O'Brien", integrityScore: 90, title: "SVP, Retail + People" },
    { name: "Arthur Levinson", integrityScore: 96, title: "Chairman of the Board" },
  ],
};

// --- SCENARIO 4: NO EXECUTIVES/EMPTY STATE ---
export const MOCK_EMPTY_PEOPLE: ApiResponse = {
  overallScore: 78, 
  people: [],
};