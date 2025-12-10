"use server";

/**
 * PubMed Central (PMC) Open Access Image Search
 * Uses NCBI E-utilities API to search for medical images
 * Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */

interface PMCImage {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  articleTitle?: string;
  pmcid?: string;
}

/**
 * Search for medical images from PubMed Central Open Access
 */
export async function getImageFromPubMed(query: string): Promise<{
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  title?: string;
  source?: string;
  error?: string;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: "Query is required",
      };
    }

    // Step 1: Search PMC for articles with images
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}+AND+open+access[filter]&retmode=json&retmax=10`;

    console.log("🔍 [PubMed] Searching for:", query);

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!searchResponse.ok) {
      console.error("❌ [PubMed] Search API error:", searchResponse.status);
      return {
        success: false,
        error: `PubMed API returned ${searchResponse.status}`,
      };
    }

    const searchData = await searchResponse.json();
    const pmcIds = searchData?.esearchresult?.idlist || [];

    if (pmcIds.length === 0) {
      console.warn("⚠️ [PubMed] No articles found for query:", query);
      return {
        success: false,
        error: "No articles found",
      };
    }

    // Step 2: Fetch article details to get images
    const pmcId = pmcIds[0];
    const fetchUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=PMC${pmcId}&format=json`;

    const fetchResponse = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!fetchResponse.ok) {
      return {
        success: false,
        error: "Failed to fetch article details",
      };
    }

    const fetchData = await fetchResponse.json();
    const record = fetchData?.records?.[0];

    if (!record) {
      return {
        success: false,
        error: "No article data found",
      };
    }

    // Construct image URL from PMC
    // PMC images are typically at: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{id}/bin/{figure-id}.jpg
    const imageUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcId}/bin/`;
    
    console.log("✅ [PubMed] Found article PMC" + pmcId);

    // For now, return a placeholder since we need to parse the article HTML to get actual image URLs
    // This is a simplified implementation - full implementation would require HTML parsing
    return {
      success: false,
      error: "PubMed image extraction requires article HTML parsing (not yet implemented)",
    };
  } catch (error) {
    console.error("❌ [PubMed] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
