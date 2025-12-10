"use server";

/**
 * OpenI (Open-i) Image Search API
 * Base URL: https://openi.nlm.nih.gov
 * Documentation: https://openi.nlm.nih.gov/services
 * 
 * OpenI provides access to biomedical images from:
 * - PubMed Central (PMC)
 * - Chest X-rays (CXR)
 * - History of Medicine Division (HMD)
 * - Mpox images (MPX)
 * - USC collections
 */

interface OpenISearchParams {
  query: string;
  m?: number; // Start index (default: 1)
  n?: number; // End index (default: 10)
  coll?: string; // Collection: pmc, cxr, usc, hmd, mpx
  it?: string; // Image type
  lic?: string; // License type
}

interface OpenIImage {
  imgLarge: string;
  imgThumb: string;
  imgSmall?: string;
  title?: string;
  abstract?: string;
  articleTitle?: string;
  collection?: string;
  license?: string;
  pmcid?: string;
}

interface OpenIResponse {
  list?: OpenIImage[];
  total?: number;
  error?: string;
}

/**
 * Search for medical images using OpenI API
 */
export async function getImageFromOpenI(query: string): Promise<{
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  title?: string;
  source?: string;
  license?: string;
  error?: string;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: "Query is required",
      };
    }

    // Build search URL
    const params = new URLSearchParams({
      query: query.trim(),
      m: "1", // Start index
      n: "10", // Get 10 results
      // Focus on PMC (PubMed Central) for high-quality medical images
      coll: "pmc",
    });

    const searchUrl = `https://openi.nlm.nih.gov/api/search?${params.toString()}`;

    // console.log("🔍 [OpenI] Searching for:", query);
    // console.log("🔍 [OpenI] URL:", searchUrl);

    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // console.error("❌ [OpenI] API error:", response.status, response.statusText);
      return {
        success: false,
        error: `OpenI API returned ${response.status}: ${response.statusText}`,
      };
    }

    const data: OpenIResponse = await response.json();

    if (data.error) {
      // console.error("❌ [OpenI] API error:", data.error);
      return {
        success: false,
        error: data.error,
      };
    }

    if (!data.list || data.list.length === 0) {
      // console.warn("⚠️ [OpenI] No images found for query:", query);
      return {
        success: false,
        error: "No images found",
      };
    }

    // Get the first image from results
    const image = data.list[0];

    if (!image || !image.imgLarge) {
      return {
        success: false,
        error: "Invalid image data received",
      };
    }

    // Ensure URLs are absolute
    const imageUrl = image.imgLarge.startsWith("http")
      ? image.imgLarge
      : `https://openi.nlm.nih.gov${image.imgLarge}`;

    const thumbnailUrl = image.imgThumb
      ? image.imgThumb.startsWith("http")
        ? image.imgThumb
        : `https://openi.nlm.nih.gov${image.imgThumb}`
      : imageUrl;

    // console.log("✅ [OpenI] Found image:", imageUrl);

    return {
      success: true,
      url: imageUrl,
      thumbnailUrl: thumbnailUrl,
      title: image.articleTitle || image.title || query,
      source: `OpenI - ${image.collection?.toUpperCase() || "PMC"}`,
      license: image.license || "Unknown",
    };
  } catch (error) {
    // console.error("❌ [OpenI] Error fetching image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Search for multiple medical images using OpenI API
 */
export async function getImagesFromOpenI(
  query: string,
  count: number = 10
): Promise<{
  success: boolean;
  images?: Array<{
    url: string;
    thumbnailUrl: string;
    title: string;
    source: string;
    license: string;
  }>;
  total?: number;
  error?: string;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: "Query is required",
      };
    }

    const params = new URLSearchParams({
      query: query.trim(),
      m: "1",
      n: Math.min(count, 100).toString(), // Max 100 results
      coll: "pmc",
    });

    const searchUrl = `https://openi.nlm.nih.gov/api/search?${params.toString()}`;

    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `OpenI API returned ${response.status}`,
      };
    }

    const data: OpenIResponse = await response.json();

    if (data.error || !data.list || data.list.length === 0) {
      return {
        success: false,
        error: data.error || "No images found",
      };
    }

    const images = data.list
      .filter((img) => img.imgLarge)
      .map((img) => ({
        url: img.imgLarge.startsWith("http")
          ? img.imgLarge
          : `https://openi.nlm.nih.gov${img.imgLarge}`,
        thumbnailUrl: img.imgThumb
          ? img.imgThumb.startsWith("http")
            ? img.imgThumb
            : `https://openi.nlm.nih.gov${img.imgThumb}`
          : img.imgLarge.startsWith("http")
            ? img.imgLarge
            : `https://openi.nlm.nih.gov${img.imgLarge}`,
        title: img.articleTitle || img.title || query,
        source: `OpenI - ${img.collection?.toUpperCase() || "PMC"}`,
        license: img.license || "Unknown",
      }));

    return {
      success: true,
      images,
      total: data.total || images.length,
    };
  } catch (error) {
    // console.error("❌ [OpenI] Error fetching images:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
