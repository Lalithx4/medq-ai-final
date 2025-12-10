import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";

interface PubMedArticle {
  uid: string;
  title: string;
  authors: { name: string }[];
  pubdate: string;
  source: string;
  doi?: string;
}

interface CrossrefWork {
  DOI: string;
  title: string[];
  author: { given?: string; family: string }[];
  published: { "date-parts": number[][] };
  "container-title"?: string[];
  abstract?: string;
}

interface Citation {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi?: string;
  url: string;
  abstract?: string;
  source?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Search both PubMed and Crossref
    const [pubmedResults, crossrefResults] = await Promise.allSettled([
      searchPubMed(query),
      searchCrossref(query)
    ]);

    const results: Citation[] = [];

    // Process PubMed results
    if (pubmedResults.status === 'fulfilled' && pubmedResults.value) {
      results.push(...pubmedResults.value);
    }

    // Process Crossref results
    if (crossrefResults.status === 'fulfilled' && crossrefResults.value) {
      results.push(...crossrefResults.value);
    }

    // Track usage (FREE operation, 0 credits, but track for analytics)
    await CreditService.deductCredits(
      user.id,
      "citation_search",
      `Citation search: ${query.substring(0, 50)}`
    );

    // If no results, return empty array
    if (results.length === 0) {
      return NextResponse.json({ 
        success: true,
        results: [],
        query,
        message: "No results found"
      });
    }

    return NextResponse.json({ 
      success: true,
      results: results.slice(0, 20), // Limit to 20 results
      query
    });

  } catch (error) {
    console.error("Citation search error:", error);
    return NextResponse.json(
      { error: "Failed to search citations" },
      { status: 500 }
    );
  }
}

// Search PubMed via E-utilities API
async function searchPubMed(query: string): Promise<Citation[]> {
  try {
    // Step 1: Search for article IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=10`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch article details
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();

    const results: Citation[] = [];
    for (const id of ids) {
      const article = summaryData.result?.[id];
      if (!article) continue;

      results.push({
        id: `pubmed-${id}`,
        title: article.title || "Untitled",
        authors: article.authors?.map((a: any) => a.name) || [],
        year: parseInt(article.pubdate?.split(' ')[0]) || new Date().getFullYear(),
        journal: article.source || "",
        doi: article.elocationid?.replace('doi: ', '') || undefined,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        abstract: article.abstract || undefined,
        source: "PubMed"
      });
    }

    return results;
  } catch (error) {
    console.error("PubMed search error:", error);
    return [];
  }
}

// Search Crossref API
async function searchCrossref(query: string): Promise<Citation[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10&mailto=support@biodocsai.com`;
    const response = await fetch(url);
    const data = await response.json();

    const items = data.message?.items || [];
    
    return items.map((item: CrossrefWork) => ({
      id: `crossref-${item.DOI}`,
      title: item.title?.[0] || "Untitled",
      authors: item.author?.map(a => `${a.family}, ${a.given || ''}`).filter(Boolean) || [],
      year: item.published?.["date-parts"]?.[0]?.[0] || new Date().getFullYear(),
      journal: item["container-title"]?.[0] || "",
      doi: item.DOI,
      url: `https://doi.org/${item.DOI}`,
      abstract: item.abstract || undefined,
      source: "Crossref"
    }));
  } catch (error) {
    console.error("Crossref search error:", error);
    return [];
  }
}
