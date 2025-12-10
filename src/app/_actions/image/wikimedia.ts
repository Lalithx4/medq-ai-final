"use server";

/**
 * Wikimedia Commons Medical Image Search
 * Uses Wikimedia Commons API to search for medical images
 * Documentation: https://www.mediawiki.org/wiki/API:Main_page
 */

interface WikimediaImage {
  title: string;
  url: string;
  thumbnailUrl?: string;
  descriptionUrl?: string;
  width?: number;
  height?: number;
}

interface WikimediaSearchResult {
  query?: {
    search?: Array<{
      title: string;
      pageid: number;
    }>;
  };
}

interface WikimediaImageInfo {
  query?: {
    pages?: {
      [key: string]: {
        imageinfo?: Array<{
          url: string;
          thumburl?: string;
          descriptionurl?: string;
          width?: number;
          height?: number;
        }>;
      };
    };
  };
}

/**
 * Search for medical images from Wikimedia Commons
 */
export async function getImageFromWikimedia(query: string): Promise<{
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

    // Add medical context to search
    const medicalQuery = `${query} medical anatomy`;

    // Step 1: Search for images in Wikimedia Commons
    const searchParams = new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: `${medicalQuery} filetype:bitmap`,
      srnamespace: "6", // File namespace
      srlimit: "10",
      origin: "*",
    });

    const searchUrl = `https://commons.wikimedia.org/w/api.php?${searchParams.toString()}`;

    console.log("🔍 [Wikimedia] Searching for:", medicalQuery);

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!searchResponse.ok) {
      console.error("❌ [Wikimedia] Search API error:", searchResponse.status);
      return {
        success: false,
        error: `Wikimedia API returned ${searchResponse.status}`,
      };
    }

    const searchData: WikimediaSearchResult = await searchResponse.json();
    const results = searchData?.query?.search || [];

    if (results.length === 0) {
      console.warn("⚠️ [Wikimedia] No images found for query:", query);
      return {
        success: false,
        error: "No images found",
      };
    }

    // Step 2: Get image info for the first result
    const firstResult = results[0];
    if (!firstResult) {
      return {
        success: false,
        error: "No valid results",
      };
    }

    const imageParams = new URLSearchParams({
      action: "query",
      format: "json",
      titles: firstResult.title,
      prop: "imageinfo",
      iiprop: "url|size",
      iiurlwidth: "800",
      origin: "*",
    });

    const imageUrl = `https://commons.wikimedia.org/w/api.php?${imageParams.toString()}`;

    const imageResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!imageResponse.ok) {
      return {
        success: false,
        error: "Failed to fetch image details",
      };
    }

    const imageData: WikimediaImageInfo = await imageResponse.json();
    const pages = imageData?.query?.pages;

    if (!pages) {
      return {
        success: false,
        error: "No image data found",
      };
    }

    // Get the first page
    const pageId = Object.keys(pages)[0];
    if (!pageId) {
      return {
        success: false,
        error: "No page data found",
      };
    }

    const page = pages[pageId];
    const imageInfo = page?.imageinfo?.[0];

    if (!imageInfo?.url) {
      return {
        success: false,
        error: "No image URL found",
      };
    }

    console.log("✅ [Wikimedia] Found image:", imageInfo.url);

    return {
      success: true,
      url: imageInfo.url,
      thumbnailUrl: imageInfo.thumburl || imageInfo.url,
      title: firstResult.title.replace("File:", ""),
      source: "Wikimedia Commons",
    };
  } catch (error) {
    console.error("❌ [Wikimedia] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
