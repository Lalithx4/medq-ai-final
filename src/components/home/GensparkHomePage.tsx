"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Microscope,
  MessageSquare,
  Stethoscope,
  Paperclip,
  Mic,
  RotateCcw,
  ExternalLink,
  Loader2,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Tool configuration with neutral/dark styling
const tools = [
  {
    icon: Stethoscope,
    label: "AI Clinical Decision Support",
    href: "/cdss",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
  {
    icon: Microscope,
    label: "Deep Research",
    href: "/deep-research",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
  {
    icon: MessageSquare,
    label: "PDF Chat",
    href: "/pdf-chat/dashboard",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
];


// Discover types
type DiscoverContentType = "all" | "news" | "journal" | "trial" | "guideline" | "innovation";

interface DiscoverItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
  type: "news" | "journal" | "trial" | "guideline" | "innovation";
  specialties: string[];
  section?: "recent" | "month" | "year";
}

const CONTENT_TYPE_OPTIONS: { value: DiscoverContentType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "journal", label: "Journal" },
  { value: "trial", label: "Trials" },
  { value: "guideline", label: "Guidelines" },
  { value: "innovation", label: "Innovation" },
];

const SPECIALTY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All specialties" },
  { value: "cardiology", label: "Cardiology" },
  { value: "oncology", label: "Oncology" },
  { value: "neurology", label: "Neurology" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "gastroenterology", label: "Gastroenterology" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "pediatrics", label: "Pediatrics" },
];

export function GensparkHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Discover state
  const [discoverType, setDiscoverType] = useState<DiscoverContentType>("all");
  const [discoverSpecialty, setDiscoverSpecialty] = useState("all");
  const [discoverItems, setDiscoverItems] = useState<DiscoverItem[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // Fetch discover feed
  const fetchDiscoverFeed = async () => {
    try {
      setIsDiscoverLoading(true);
      setDiscoverError(null);

      const params = new URLSearchParams();
      params.set("type", discoverType);
      params.set("specialty", discoverSpecialty);
      params.set("source", "pubmed");

      const res = await fetch(`/api/discover/feed?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load discover feed");
      }

      setDiscoverItems(data.items || []);
    } catch (err: any) {
      console.error("[Discover] Error loading feed", err);
      setDiscoverError(err?.message || "Failed to load discover feed");
      setDiscoverItems([]);
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    void fetchDiscoverFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverType, discoverSpecialty]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const lower = searchQuery.toLowerCase();

    if (/(deep\s+research|comprehensive\s+research)/i.test(lower)) {
      localStorage.setItem("deepResearchQuery", searchQuery);
      router.push("/deep-research");
      return;
    }

    if (/(research\s+paper|write\s+paper|academic\s+paper)/i.test(lower)) {
      localStorage.setItem("researchPaperTopic", searchQuery);
      router.push("/research-paper");
      return;
    }

    // Default: go to deep research
    localStorage.setItem("deepResearchQuery", searchQuery);
    router.push("/deep-research");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleOpenDiscoverItem = (item: DiscoverItem) => {
    if (!item.url) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const currentTypeLabel = CONTENT_TYPE_OPTIONS.find((o) => o.value === discoverType)?.label || "All";
  const currentSpecialtyLabel = SPECIALTY_OPTIONS.find((o) => o.value === discoverSpecialty)?.label || "All specialties";

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto bg-[#1a1a1c]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8">
          {/* Header Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight flex items-center justify-center gap-2">
              MedQ AI Workspace
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
            </h1>
          </motion.div>

          {/* Search Bar - Genspark Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl mx-auto mb-6"
          >
            <div className={`relative bg-[#2a2a2c] transition-all duration-300 ${isSearchFocused ? 'ring-1 ring-gray-500' : ''} rounded-2xl`}>
              {/* Main Input Area */}
              <div className="px-5 py-4">
                <input
                  type="text"
                  placeholder="Ask anything, create anything"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-500 text-base"
                />
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                <div className="flex items-center gap-1">
                  {/* Person/Profile Icon */}
                  <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors" title="Profile">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  {/* Tools/Wrench Icon */}
                  <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors" title="Tools">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Attachment Icon */}
                  <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors" title="Attach file">
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                  {/* Mic Icon */}
                  <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors" title="Voice input">
                    <Mic className="w-5 h-5 text-gray-400" />
                  </button>
                  {/* History/Refresh Icon */}
                  <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors" title="History">
                    <RotateCcw className="w-5 h-5 text-gray-400" />
                  </button>
                  {/* Submit Button */}
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                    className="ml-2 p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tool Icons Row - Circular Dark Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12"
          >
            <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap px-4">
              {tools.map((tool, i) => (
                <motion.div
                  key={tool.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.08 }}
                  className="flex flex-col items-center gap-3 cursor-pointer group"
                  onClick={() => router.push(tool.href)}
                >
                  {/* Circular Icon Container */}
                  <div className={`w-14 h-14 rounded-full bg-[#2a2a2c] border-2 ${tool.borderColor} flex items-center justify-center group-hover:bg-[#3a3a3c] transition-all`}>
                    <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                  </div>
                  {/* Label */}
                  <span className="text-xs text-center text-gray-400 font-medium max-w-[80px] leading-tight group-hover:text-gray-300 transition-colors">
                    {tool.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Discover Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    Discover
                    <span className="px-2 py-0.5 rounded-full border border-teal-500/30 text-[10px] uppercase tracking-wide text-teal-400 bg-teal-500/10">
                      PubMed
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500">Latest medical research and news</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Content type filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs bg-[#2a2a2c] border-gray-700 text-gray-300 hover:bg-[#3a3a3c] hover:text-white">
                      <Filter className="w-3 h-3" />
                      <span>{currentTypeLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#2a2a2c] border-gray-700 text-gray-300">
                    <DropdownMenuLabel className="text-gray-400">Content type</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setDiscoverType(opt.value)}
                        className={`hover:bg-[#3a3a3c] ${discoverType === opt.value ? "font-semibold text-teal-400" : ""}`}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Specialty filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs bg-[#2a2a2c] border-gray-700 text-gray-300 hover:bg-[#3a3a3c] hover:text-white">
                      <Stethoscope className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{currentSpecialtyLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#2a2a2c] border-gray-700 text-gray-300 max-h-60 overflow-auto">
                    <DropdownMenuLabel className="text-gray-400">Specialty</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-700" />
                    {SPECIALTY_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setDiscoverSpecialty(opt.value)}
                        className={`hover:bg-[#3a3a3c] ${discoverSpecialty === opt.value ? "font-semibold text-teal-400" : ""}`}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs bg-[#2a2a2c] border-gray-700 text-gray-300 hover:bg-[#3a3a3c] hover:text-white"
                  onClick={() => fetchDiscoverFeed()}
                  disabled={isDiscoverLoading}
                >
                  {isDiscoverLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Feed Content */}
            {isDiscoverLoading && !discoverItems.length ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading medical discoveries...</span>
              </div>
            ) : discoverError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-red-400 gap-2">
                <p>{discoverError}</p>
                <Button size="sm" variant="outline" onClick={() => fetchDiscoverFeed()} className="bg-[#2a2a2c] border-gray-700 text-gray-300 hover:bg-[#3a3a3c]">
                  Retry
                </Button>
              </div>
            ) : !discoverItems.length ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                No items found. Try a different content type or specialty.
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {discoverItems.slice(0, 6).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-gray-700/50 bg-[#2a2a2c] hover:bg-[#323234] transition-all cursor-pointer flex flex-col hover:-translate-y-0.5 hover:border-teal-500/30"
                    onClick={() => handleOpenDiscoverItem(item)}
                  >
                    <div className="flex-1 p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="font-medium truncate max-w-[140px]">{item.source}</span>
                          {item.publishedAt && (
                            <span>· {new Date(item.publishedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-200 leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-gray-500 line-clamp-2">{item.summary}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 mt-auto text-[9px]">
                        <span className="px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          {item.type === "journal" ? "Journal" : item.type === "trial" ? "Trial" : item.type === "guideline" ? "Guideline" : item.type === "innovation" ? "Innovation" : "News"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </motion.div>

          {/* Bottom spacing */}
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
}

