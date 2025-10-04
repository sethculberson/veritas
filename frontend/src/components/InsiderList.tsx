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
}

const InsiderList: React.FC<InsiderListProps> = ({ insiders, companyName }) => {
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

  // Generate a fallback avatar URL
  const getFallbackAvatarUrl = (name: string) => {
    const formattedName = formatName(name);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      formattedName
    )}&background=4f46e5&color=fff&size=120&bold=true`;
  };

  // Create more specific search queries including role/company context
  const createSearchQueries = (insider: Insider) => {
    const formattedName = formatName(insider.name);
    const queries = [];
    
    // Most specific: name + role + company
    if (companyName) {
      queries.push(`${formattedName} ${companyName}`);
      if (insider.roles && insider.roles.length > 0) {
        queries.push(`${formattedName} ${insider.roles[0]} ${companyName}`);
      }
    }
    
    // Add role context without company
    if (insider.roles && insider.roles.length > 0) {
      const primaryRole = insider.roles[0];
      queries.push(`${formattedName} ${primaryRole}`);
      
      // Add CEO/CFO/executive context if applicable
      if (primaryRole.toLowerCase().includes('ceo') || 
          primaryRole.toLowerCase().includes('chief executive')) {
        queries.push(`${formattedName} CEO`);
      } else if (primaryRole.toLowerCase().includes('cfo') || 
                 primaryRole.toLowerCase().includes('chief financial')) {
        queries.push(`${formattedName} CFO`);
      } else if (primaryRole.toLowerCase().includes('director')) {
        queries.push(`${formattedName} board director`);
      }
    }
    
    // Fallback to just name
    queries.push(formattedName);
    
    return queries;
  };

  // Fetch Wikipedia image with better validation
  const fetchWikiImage = async (searchQuery: string, insider: Insider): Promise<string | null> => {
    try {
      // First, search for the most relevant Wikipedia page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchQuery
      )}&srlimit=3&format=json&origin=*`;
      
      const searchResp = await fetch(searchUrl);
      if (!searchResp.ok) return null;
      
      const searchData = await searchResp.json();
      const searchResults = searchData?.query?.search || [];
      
      if (searchResults.length === 0) return null;
      
      // Check each result for relevance
      for (const result of searchResults) {
        const title = result.title;
        const snippet = result.snippet?.toLowerCase() || '';
        
        // Validate relevance by checking if snippet contains business/corporate terms
        const businessTerms = ['business', 'executive', 'ceo', 'cfo', 'director', 'founder', 
                              'president', 'officer', 'board', 'company', 'corporation', 
                              'investor', 'entrepreneur'];
        
        const hasBusinessContext = businessTerms.some(term => snippet.includes(term));
        
        // Skip if it's clearly wrong context (e.g., actor, musician, athlete)
        const wrongContextTerms = ['actor', 'actress', 'singer', 'musician', 'athlete', 
                                   'footballer', 'basketball', 'baseball', 'film', 'movie', 
                                   'television', 'tv series', 'album', 'song'];
        const hasWrongContext = wrongContextTerms.some(term => snippet.includes(term));
        
        if (hasWrongContext && !hasBusinessContext) continue;
        
        // Try to get image from this page
        try {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
          const resp = await fetch(summaryUrl);
          if (!resp.ok) continue;
          
          const data = await resp.json();
          
          // Additional validation: check if the extract mentions business context
          const extract = data?.extract?.toLowerCase() || '';
          if (extract && !hasBusinessContext) {
            const extractHasBusinessContext = businessTerms.some(term => extract.includes(term));
            const extractHasWrongContext = wrongContextTerms.some(term => extract.includes(term));
            
            if (extractHasWrongContext && !extractHasBusinessContext) continue;
          }
          
          // Return image if found
          if (data?.originalimage?.source) return data.originalimage.source;
          if (data?.thumbnail?.source) {
            // Get higher resolution version of thumbnail
            const highRes = data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            return highRes;
          }
        } catch (e) {
          continue;
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  // Main effect: resolve all images in parallel before rendering
  useEffect(() => {
    let cancelled = false;

    const loadAllImages = async () => {
      setIsLoading(true);
      const newMap: Record<string, string> = {};
      
      // Create all fetch promises in parallel
      const imagePromises = insiders.map(async (insider) => {
        // If user already supplied a photoUrl, use it
        if (insider.photoUrl) {
          return { cik: insider.cik, url: insider.photoUrl };
        }

        // Try different search queries with context
        const queries = createSearchQueries(insider);
        
        for (const query of queries) {
          const imageUrl = await fetchWikiImage(query, insider);
          if (imageUrl) {
            return { cik: insider.cik, url: imageUrl };
          }
        }
        
        // Fallback to avatar
        return { cik: insider.cik, url: getFallbackAvatarUrl(insider.name) };
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
  }, [insiders, companyName]);

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

  // Get the image source
  const getImageSrc = (insider: Insider) => {
    return photoMap[insider.cik] || getFallbackAvatarUrl(insider.name);
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
        {insiders.map((insider) => (
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
            <img
              src={getImageSrc(insider)}
              alt={`${formatName(insider.name)} headshot`}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                backgroundColor: "#f3f3f3"
              }}
              onError={(e) => {
                // Fallback to avatar if actual photo fails to load
                e.currentTarget.src = getFallbackAvatarUrl(insider.name);
              }}
            />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 600 }}>
                {formatName(insider.name)}
              </h4>
              <div style={{ color: "#666", fontSize: "14px" }}>{insider.roles.join(", ")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsiderList;