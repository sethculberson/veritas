import React, { useEffect, useState } from "react";

// Define the interface for a single insider based on the data structure
interface Insider {
  cik: string;
  name: string;      // "LAST FIRST MI" format (per your data)
  roles: string[];
  photoUrl?: string; // optional pre-provided URL
  trades: any[];
}

interface InsiderListProps {
  insiders: Insider[];
}

const InsiderList: React.FC<InsiderListProps> = ({ insiders }) => {
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
    )}&background=cccccc&color=fff&size=60`;
  };

  // State: map CIK -> resolved image URL
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});

  // Helper: create possible wikipedia search titles from original name
  const wikiSearchCandidates = (origName: string) => {
    const pretty = formatName(origName); // "First Middle Last"
    const parts = pretty.split(/\s+/);
    // prefer full name, then first + last
    const firstLast = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : pretty;
    // also include variations without middle initials
    return Array.from(new Set([pretty, firstLast]));
  };

  // Try to get an image URL from Wikipedia page summary API
  // Returns string|null
  const fetchWikiImageForTitle = async (title: string): Promise<string | null> => {
    try {
      // Use the page summary endpoint which often includes a thumbnail/originalimage
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const resp = await fetch(summaryUrl, { headers: { "Accept": "application/json" } });
      if (!resp.ok) return null;
      const data = await resp.json();
      // data.thumbnail?.source or data.originalimage?.source
      if (data?.originalimage?.source) return data.originalimage.source;
      if (data?.thumbnail?.source) return data.thumbnail.source;
      return null;
    } catch (e) {
      return null;
    }
  };

  // If direct title lookup fails, try search API to find the most likely page title
  const fetchWikiImageBySearch = async (name: string): Promise<string | null> => {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        name
      )}&format=json&origin=*`;
      const resp = await fetch(searchUrl);
      if (!resp.ok) return null;
      const data = await resp.json();
      const firstHit = data?.query?.search?.[0];
      if (!firstHit) return null;
      const title = firstHit.title;
      return await fetchWikiImageForTitle(title);
    } catch (e) {
      return null;
    }
  };

  // Main effect: resolve images for insiders (skips if insider.photoUrl exists)
  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      const newMap: Record<string, string> = {};
      // iterate insiders sequentially to avoid hammering remote endpoints
      for (const insider of insiders) {
        // if user already supplied a photoUrl, use it (but we still allow it to be overwritten if needed)
        if (insider.photoUrl) {
          newMap[insider.cik] = insider.photoUrl;
          continue;
        }

        // See if we already have it in state (avoid re-fetch)
        if (photoMap[insider.cik]) {
          newMap[insider.cik] = photoMap[insider.cik];
          continue;
        }

        const candidates = wikiSearchCandidates(insider.name);

        let found: string | null = null;
        // Try direct title lookups first (full name -> first+last)
        for (const title of candidates) {
          found = await fetchWikiImageForTitle(title);
          if (found) break;
        }

        // If still not found, try a search-based lookup
        if (!found) {
          for (const title of candidates) {
            found = await fetchWikiImageBySearch(title);
            if (found) break;
          }
        }

        // If found, use it; otherwise use fallback avatar
        newMap[insider.cik] = found ?? getFallbackAvatarUrl(insider.name);

        if (cancelled) return;
      }

      if (!cancelled) {
        // merge with current map (respect any pre-existing ones)
        setPhotoMap((prev) => ({ ...prev, ...newMap }));
      }
    };

    loadImages();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insiders]);

  // Get the image source - prefer resolved Wikipedia/photoMap -> insider.photoUrl -> fallback
  const getImageSrc = (insider: Insider) => {
    return photoMap[insider.cik] || insider.photoUrl || getFallbackAvatarUrl(insider.name);
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
              gap: "12px"
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
                flexShrink: 0
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
