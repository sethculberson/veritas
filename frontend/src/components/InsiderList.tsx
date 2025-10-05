import React, { useState } from "react";
import { formatName } from "../lib/Trades";
import PersonTrades from "./PersonTrades";
import { getIntegrityScoreColor, getIntegrityScoreLabel } from "../lib/integrityCalculator";

// Define the interface for a single insider based on the data structure
interface Insider {
  cik: string;
  name: string;      // "LAST FIRST MI" format (per your data)
  roles: string[];
  photoUrl?: string; // optional pre-provided URL
  trades: any[];
  company?: string;  // Add company context if available
  integrityScore?: number; // Calculated integrity score
}

interface InsiderListProps {
  insiders: Insider[];
  companyName?: string; // Pass company name for better search context
  ticker?: string;      // Stock ticker for additional validation
}

const InsiderList: React.FC<InsiderListProps> = ({ insiders, companyName, ticker }) => {
  const [selectedPerson, setSelectedPerson] = useState<Insider | null>(null);

  // Helper function to get hex color from integrity score
  const getIntegrityColor = (score: number): string => {
    if (score >= 80) return "#16a34a"; // green-600
    if (score >= 60) return "#ca8a04"; // yellow-600
    if (score >= 40) return "#ea580c"; // orange-600
    return "#dc2626"; // red-600
  };

  if (!insiders || insiders.length === 0) return <p>No insider information available.</p>;

  // If a person is selected, show their trades
  if (selectedPerson) {
    return (
      <PersonTrades 
        person={selectedPerson} 
        onBack={() => setSelectedPerson(null)}
      />
    );
  }

  // Generate a professional-looking fallback avatar URL
  const getFallbackAvatarUrl = (name: string) => {
    const formattedName = formatName(name);
    // Use initials for a cleaner look
    const initials = formattedName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    // Generate a consistent color based on the name
    let hash = 0;
    // FIX: Use the sanitized 'formattedName' to generate the hash
    for (let i = 0; i < formattedName.length; i++) {
      hash = formattedName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = '6b7280';
    return `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=120&bold=true&length=2`;
  };

  return (
    <div style={{
      border: "1px solid #e0e0e0",
      borderRadius: "12px",
      padding: "24px",
      backgroundColor: "#fff",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      margin: "16px 0"
    }}>
      <h3 style={{ 
        margin: "0 0 20px 0", 
        fontSize: "20px", 
        fontWeight: "bold",
        textAlign: "left"
      }}>
        Relevant Stakeholders
      </h3>
      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {insiders.filter((insider) => insider.name && insider.name.trim().length > 0).map((insider) => {
          // Directly generate the fallback avatar URL.
          const imageUrl = getFallbackAvatarUrl(insider.name);
          
          return (
            <div
              key={insider.cik}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
              onClick={() => setSelectedPerson(insider)}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  backgroundColor: "#f3f3f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#fff"
                }}
              >
                <img
                  src={imageUrl}
                  alt={`${formatName(insider.name)}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <h4 style={{ 
                    margin: "0", 
                    fontSize: "18px", 
                    fontWeight: 600,
                    color: "#111"
                  }}>
                    {formatName(insider.name)}
                  </h4>
                  {typeof insider.integrityScore === 'number' && (
                    <div style={{ 
                      fontSize: "12px", 
                      fontWeight: "600",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: insider.integrityScore >= 80 ? "#dcfce7" : 
                                     insider.integrityScore >= 60 ? "#fef3c7" :
                                     insider.integrityScore >= 40 ? "#fed7aa" : "#fecaca",
                      color: getIntegrityScoreColor(insider.integrityScore)
                    }}>
                      {insider.integrityScore}/100
                    </div>
                  )}
                </div>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  {/* FIX: Use optional chaining to prevent crash if roles is undefined */}
                  {insider.roles?.join(", ") || "No roles assigned"}
                </div>
                {typeof insider.integrityScore === 'number' && insider.integrityScore < 100 && (
                  <div style={{ 
                    color: getIntegrityColor(insider.integrityScore), 
                    fontSize: "12px", 
                    marginTop: "2px",
                    fontWeight: "500"
                  }}>
                    {getIntegrityScoreLabel(insider.integrityScore)}
                  </div>
                )}
                <div style={{ 
                  color: "#3b82f6", 
                  fontSize: "12px", 
                  marginTop: "4px",
                  fontWeight: "500"
                }}>
                  Click to view {insider.trades?.length || 0} trades →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsiderList;