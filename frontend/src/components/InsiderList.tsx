import React, { useEffect, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  if (!insiders || insiders.length === 0) return <p>No insider information available.</p>;

  // Format name from "LAST FIRST MI" to "First Mi Last"
  const formatName = (name: string) => {
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
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['4f46e5', '7c3aed', '2563eb', '0891b2', '059669', '84cc16'];
    const color = colors[Math.abs(hash) % colors.length];
    
    return `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=120&bold=true&length=2`;
  };

  // Extract key validation terms from roles
  const getRoleKeywords = (roles: string[]): string[] => {
    const keywords = [];
    const roleStr = roles.join(' ').toLowerCase();
    
    if (roleStr.includes('chief executive') || roleStr.includes('ceo')) {
      keywords.push('ceo', 'chief executive');
    }
    if (roleStr.includes('chief financial') || roleStr.includes('cfo')) {
      keywords.push('cfo', 'chief financial');
    }
    if (roleStr.includes('chief operating') || roleStr.includes('coo')) {
      keywords.push('coo', 'chief operating');
    }
    if (roleStr.includes('chief technology') || roleStr.includes('cto')) {
      keywords.push('cto', 'chief technology');
    }
    if (roleStr.includes('president')) {
      keywords.push('president');
    }
    if (roleStr.includes('chairman')) {
      keywords.push('chairman');
    }
    if (roleStr.includes('director')) {
      keywords.push('director', 'board');
    }
    if (roleStr.includes('founder')) {
      keywords.push('founder');
    }
    
    return keywords;
  };

  // Validate if Wikipedia content matches our insider
  const validateWikipediaMatch = (
    pageData: any, 
    insider: Insider,
    searchQuery: string
  ): { isValid: boolean; confidence: number } => {
    const extract = (pageData?.extract || '').toLowerCase();
    const description = (pageData?.description || '').toLowerCase();
    const title = (pageData?.title || '').toLowerCase();
    
    // Combine all text for analysis
    const fullText = `${extract} ${description}`;
    
    // Get expected keywords
    const roleKeywords = getRoleKeywords(insider.roles);
    const formattedName = formatName(insider.name).toLowerCase();
    const nameParts = formattedName.split(' ');
    
    let confidenceScore = 0;
    let redFlags = 0;
    
    // Check if the page title matches the name closely
    const titleMatchesName = nameParts.every(part => 
      title.includes(part.toLowerCase())
    );
    if (titleMatchesName) confidenceScore += 30;
    
    // Check for company name mention (high confidence if found)
    if (companyName && fullText.includes(companyName.toLowerCase())) {
      confidenceScore += 40;
    }
    
    // Check for ticker mention
    if (ticker && fullText.includes(ticker.toLowerCase())) {
      confidenceScore += 20;
    }
    
    // Check for role keywords
    const matchedRoleKeywords = roleKeywords.filter(keyword => 
      fullText.includes(keyword)
    );
    if (matchedRoleKeywords.length > 0) {
      confidenceScore += Math.min(30, matchedRoleKeywords.length * 15);
    }
    
    // Check for business/corporate context
    const businessTerms = [
      'business', 'executive', 'company', 'corporation', 'corporate',
      'investor', 'entrepreneur', 'venture', 'equity', 'capital',
      'management', 'leadership', 'appointed', 'serves', 'board'
    ];
    const businessMatches = businessTerms.filter(term => fullText.includes(term));
    if (businessMatches.length > 0) {
      confidenceScore += Math.min(20, businessMatches.length * 5);
    }
    
    // Red flags - wrong context indicators
    const wrongContextTerms = [
      // Entertainment
      'actor', 'actress', 'film', 'movie', 'television', 'tv series',
      'oscar', 'emmy', 'golden globe', 'screen', 'hollywood', 'broadway',
      'directed', 'starred', 'cast', 'role in', 'performance',
      // Sports
      'player', 'athlete', 'footballer', 'basketball', 'baseball', 
      'soccer', 'tennis', 'golf', 'olympic', 'championship', 'league',
      'team', 'coach', 'scored', 'season', 'game', 'match',
      // Music
      'singer', 'musician', 'band', 'album', 'song', 'concert',
      'tour', 'grammy', 'record', 'music', 'artist',
      // Politics (unless they have a business role too)
      'senator', 'congressman', 'governor', 'mayor', 'minister',
      'politician', 'election', 'campaign', 'democratic', 'republican',
      // Academic (unless business-related)
      'professor', 'phd', 'researcher', 'university', 'academic',
      'scholar', 'thesis', 'dissertation',
      // Other
      'novelist', 'author', 'writer', 'journalist', 'reporter'
    ];
    
    wrongContextTerms.forEach(term => {
      if (fullText.includes(term)) {
        redFlags++;
      }
    });
    
    // Heavy penalty for multiple red flags
    if (redFlags > 2) {
      confidenceScore -= redFlags * 15;
    } else if (redFlags > 0) {
      confidenceScore -= redFlags * 10;
    }
    
    // Special case: if description explicitly mentions entertainment/sports/music
    if (description.includes('actor') || description.includes('actress') ||
        description.includes('athlete') || description.includes('player') ||
        description.includes('singer') || description.includes('musician')) {
      // Unless there's strong business evidence, reject
      if (confidenceScore < 70) {
        confidenceScore = 0;
      }
    }
    
    // If we have company name but it's not mentioned, be very suspicious
    if (companyName && !fullText.includes(companyName.toLowerCase()) && 
        confidenceScore < 50) {
      confidenceScore -= 20;
    }
    
    // Require minimum confidence threshold
    const isValid = confidenceScore >= 50;
    
    return { isValid, confidence: confidenceScore };
  };

  // Fetch Wikipedia image with strict validation
  const fetchWikiImage = async (insider: Insider): Promise<string | null> => {
    const formattedName = formatName(insider.name);
    
    // Build search queries from most to least specific
    const queries = [];
    
    // Most specific: name + company + role
    if (companyName) {
      if (insider.roles.length > 0) {
        queries.push(`${formattedName} ${insider.roles[0]} ${companyName}`);
      }
      queries.push(`${formattedName} ${companyName}`);
    }
    
    // Add role-specific query
    if (insider.roles.length > 0) {
      queries.push(`${formattedName} ${insider.roles[0]}`);
    }
    
    // Try with business context
    queries.push(`${formattedName} business executive`);
    queries.push(`${formattedName} CEO`);
    
    // Last resort: just the name
    queries.push(formattedName);
    
    for (const query of queries) {
      try {
        // Search Wikipedia
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&srlimit=5&format=json&origin=*`;
        
        const searchResp = await fetch(searchUrl);
        if (!searchResp.ok) continue;
        
        const searchData = await searchResp.json();
        const searchResults = searchData?.query?.search || [];
        
        // Try each search result
        for (const result of searchResults) {
          const title = result.title;
          
          try {
            // Get page summary
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
            const resp = await fetch(summaryUrl);
            if (!resp.ok) continue;
            
            const pageData = await resp.json();
            
            // Validate this is the right person
            const validation = validateWikipediaMatch(pageData, insider, query);
            
            if (validation.isValid) {
              // Found a valid match with sufficient confidence
              if (pageData?.originalimage?.source) {
                return pageData.originalimage.source;
              }
              if (pageData?.thumbnail?.source) {
                // Get higher resolution version
                const highRes = pageData.thumbnail.source.replace(/\/\d+px-/, '/400px-');
                return highRes;
              }
            }
            
            // If confidence is very low, stop trying this query's results
            if (validation.confidence < 20) {
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // No valid image found - return null to use fallback
    return null;
  };

  // Main effect: resolve all images in parallel
  useEffect(() => {
    let cancelled = false;

    const loadAllImages = async () => {
      setIsLoading(true);
      const newMap: Record<string, string> = {};
      
      // Create all fetch promises in parallel
      const imagePromises = insiders.map(async (insider) => {
        // If user already supplied a validated photoUrl, trust it
        if (insider.photoUrl) {
          return { cik: insider.cik, url: insider.photoUrl };
        }

        // Try to fetch from Wikipedia with strict validation
        const imageUrl = await fetchWikiImage(insider);
        
        // Use Wikipedia image if found, otherwise use fallback
        return { 
          cik: insider.cik, 
          url: imageUrl || getFallbackAvatarUrl(insider.name)
        };
      });

      // Wait for all images to resolve
      const results = await Promise.all(imagePromises);
      
      if (cancelled) return;
      
      // Build the map
      results.forEach(({ cik, url }) => {
        newMap[cik] = url;
      });
      
      setPhotoMap(newMap);
      setIsLoading(false);
    };

    loadAllImages();

    return () => {
      cancelled = true;
    };
  }, [insiders, companyName, ticker]);

  // Show loading state while images are being fetched
  if (isLoading) {
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
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          padding: "40px",
          color: "#666"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #4f46e5",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            Loading stakeholder information...
          </div>
        </div>
      </div>
    );
  }

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
        {insiders.map((insider) => {
          const imageUrl = photoMap[insider.cik] || getFallbackAvatarUrl(insider.name);
          const isDefaultAvatar = imageUrl.includes('ui-avatars.com');
          
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
                  fontSize: isDefaultAvatar ? "20px" : "0",
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
                  onError={(e) => {
                    // Fallback to avatar if image fails to load
                    e.currentTarget.src = getFallbackAvatarUrl(insider.name);
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
                  {insider.roles.join(", ")}
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