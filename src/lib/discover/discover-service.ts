import { MultiSourceService, type SourceSelection } from "@/lib/deep-research/multi-source-service";

export type DiscoverContentType =
  | "all"
  | "news"
  | "journal"
  | "trial"
  | "guideline"
  | "innovation";

export type DiscoverSource = "web" | "pubmed";

export interface DiscoverItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  type: "news" | "journal" | "trial" | "guideline" | "innovation";
  specialties: string[];
  // Optional logical section for grouping on the frontend
  // e.g. "recent" | "month" | "year" for PubMed feeds
  section?: "recent" | "month" | "year";
}

export interface DiscoverFeedRequest {
  type: DiscoverContentType;
  specialty: string;
  source: DiscoverSource;
  cursor?: string | null;
}

export interface DiscoverFeedResponse {
  items: DiscoverItem[];
  nextCursor?: string | null;
}

// Map UI specialties to more precise PubMed / MeSH-style query fragments
function mapSpecialtyToQueryTerm(raw: string): string | null {
  const key = raw.toLowerCase();

  switch (key) {
    case "cardiology":
      return "cardiology[MeSH Terms] OR cardiovascular diseases[MeSH Terms]";
    case "oncology":
      return "medical oncology[MeSH Terms] OR neoplasms[MeSH Terms]";
    case "neurology":
      return "neurology[MeSH Terms] OR nervous system diseases[MeSH Terms]";
    case "endocrinology":
      return "endocrinology[MeSH Terms] OR endocrine system diseases[MeSH Terms]";
    case "gastroenterology":
      return "gastroenterology[MeSH Terms] OR digestive system diseases[MeSH Terms]";
    case "orthopedics":
      return "orthopedics[MeSH Terms] OR musculoskeletal diseases[MeSH Terms]";
    case "pediatrics":
      return "pediatrics[MeSH Terms] OR child[MeSH Terms]";
    case "ent":
      // ENT = ear, nose, throat → use otolaryngology terms
      return "otolaryngology[MeSH Terms] OR otorhinolaryngologic diseases[MeSH Terms]";
    case "critical-care":
      return "critical care[MeSH Terms] OR intensive care units[MeSH Terms]";
    default:
      return null;
  }
}

// Simple in-memory cache (per server instance) keyed by content type + specialty
interface CachedDiscoverEntry {
  items: DiscoverItem[];
  cachedAt: number; // epoch ms
}

const DISCOVER_CACHE = new Map<string, CachedDiscoverEntry>();
const DISCOVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class DiscoverService {
  private multiSource: MultiSourceService;

  constructor() {
    // Reuse the same multi-source search system as Deep Research
    this.multiSource = new MultiSourceService();
  }

  async getFeed(req: DiscoverFeedRequest): Promise<DiscoverFeedResponse> {
    const { type, specialty, source, cursor } = req;
    // For now, force Discover to use PubMed only, regardless of requested source
    const effectiveSource: DiscoverSource = "pubmed";
    // Build a simple medical query combining specialty and content type hint
    const mappedSpecialty =
      specialty && specialty.toLowerCase() !== "all"
        ? mapSpecialtyToQueryTerm(specialty) || specialty
        : null;

    const specialtyPart = mappedSpecialty ?? "medicine";

    // Map Discover content type to PubMed-oriented query fragment
    const typeHint =
      type === "trial"
        ? "(clinical trial[pt] OR randomized controlled trial[pt])"
        : type === "guideline"
          ? "(practice guideline[pt] OR guideline[pt])"
          : type === "journal"
            ? "(journal article[pt] OR review[pt])"
            : type === "news"
              ? "(journal article[pt] OR review[pt])"
              : type === "innovation"
                ? "(clinical trial[pt] OR observational study[pt] OR multicenter study[pt])"
                : "(journal article[pt] OR review[pt])";

    // Broad exclusion filter to avoid editorials/letters and overt "about the specialty"
    // or education/workforce pieces dominating the feed. This keeps the focus on
    // clinical and research content inside the chosen specialty.
    const exclusionFilter =
      "NOT (editorial[pt] OR letter[pt] OR comment[pt] OR news[pt]" +
      " OR education[tiab] OR teaching[tiab] OR curriculum[tiab]" +
      " OR residency[tiab] OR resident[tiab] OR workforce[tiab] OR training[tiab])";

    const baseQuery = `${specialtyPart} ${typeHint} ${exclusionFilter}`.trim();

    // Only cache the base page (no cursor) so behaviour stays simple
    const cacheKey = `${effectiveSource}:${type}:${specialtyPart.toLowerCase()}`;
    if (!cursor) {
      const existing = DISCOVER_CACHE.get(cacheKey);
      if (existing && Date.now() - existing.cachedAt < DISCOVER_CACHE_TTL_MS) {
        return { items: existing.items, nextCursor: null };
      }
    }

    const sources: SourceSelection = { pubmed: true, arxiv: false, web: false };

    try {
      // Build three related PubMed queries for sectionalised feeds:
      // a) Recently published / indexed (base query, sorted by pub date)
      // b) Highest indexed this month (restrict by current month [dp])
      // c) Highest indexed this year (restrict by current year [dp])

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-based
      const monthStr = month.toString().padStart(2, "0");

      const recentQuery = baseQuery;
      const monthQuery = `${baseQuery} AND ("${year}/${monthStr}/01"[dp] : "${year}/${monthStr}/31"[dp])`;
      const yearQuery = `${baseQuery} AND ("${year}"[dp] : "${year}"[dp])`;

      const [recentResult, monthResult, yearResult] = await Promise.all([
        this.multiSource.searchAll(recentQuery, sources, 10),
        this.multiSource.searchAll(monthQuery, sources, 10),
        this.multiSource.searchAll(yearQuery, sources, 10),
      ]);

      const buildItems = (results: typeof recentResult.results, section: "recent" | "month" | "year"): DiscoverItem[] => {
        return results.map((res) => {
          let baseType: DiscoverItem["type"];

          // PubMed results are primarily journal / trial / guideline content
          if (type === "trial") baseType = "trial";
          else if (type === "guideline") baseType = "guideline";
          else baseType = "journal";

          return {
            id: res.id,
            title: res.title,
            summary: res.abstract || res.snippet || "",
            url: res.url,
            source: res.journal || res.authors || res.source,
            // We typically only have a year; omit publishedAt to avoid misleading dates
            publishedAt: undefined,
            imageUrl: undefined,
            type: baseType,
            specialties:
              specialty && specialty.toLowerCase() !== "all"
                ? [specialty]
                : [],
            section,
          };
        });
      };

      const items: DiscoverItem[] = [
        ...buildItems(recentResult.results, "recent"),
        ...buildItems(monthResult.results, "month"),
        ...buildItems(yearResult.results, "year"),
      ];

      if (!cursor) {
        DISCOVER_CACHE.set(cacheKey, { items, cachedAt: Date.now() });
      }

      return {
        items,
        nextCursor: null,
      };
    } catch (error) {
      console.error("[DiscoverService] Multi-source search failed", error);
      return { items: [], nextCursor: null };
    }
  }
}
