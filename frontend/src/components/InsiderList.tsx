import React from "react";

// Define the interface for a single insider based on the data structure
interface Insider {
  cik: string;
  name: string;      // "LAST FIRST MI" format (per your data)
  roles: string[];
  photoUrl?: string; // optional pre-provided URL
  trades: any[];
  company?: string;  // Add company context if available
}

interface InsiderListProps {
  insiders: Insider[];
  companyName?: string; // Pass company name for better search context
  ticker?: string;      // Stock ticker for additional validation
}

const InsiderList: React.FC<InsiderListProps> = ({ insiders, companyName, ticker }) => {
  if (!insiders || insiders.length === 0) return <p>No insider information available.</p>;

  // Format name from "LAST FIRST MI" to "First Mi Last"
  const formatName = (name: string) => {
    // Add a guard clause to handle cases where name might be undefined or null.
    if (!name) return "Unknown Name";

    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;

    const last = parts[0];
    const first = parts[1];
    const middle = parts.slice(2).join(" ");

    const formatPart = (part: string) =>
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();

    return middle
      ? `${formatPart(first)} ${formatPart(middle)} ${formatPart(last)}`
      : `${formatPart(first)} ${formatPart(last)}`;
  };

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
                <h4 style={{ 
                  margin: "0 0 8px 0", 
                  fontSize: "18px", 
                  fontWeight: 600,
                  color: "#111"
                }}>
                  {formatName(insider.name)}
                </h4>
                <div style={{ color: "#666", fontSize: "14px" }}>
                  {/* FIX: Use optional chaining to prevent crash if roles is undefined */}
                  {insider.roles?.join(", ") || "No roles assigned"}
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