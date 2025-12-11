"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Microscope,
  MessageSquare,
  Stethoscope,
  Mic,
  MicOff,
  ExternalLink,
  Loader2,
  Filter,
  ArrowUp,
  ChevronDown,
  FileText,
  RefreshCw,
  Paperclip,
  X,
  ArrowRight
} from "lucide-react";

import { AnimatePresence } from 'framer-motion';
import { usePDFUpload } from '@/hooks/usePDFUpload';
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
    icon: Microscope,
    id: "deep-research",
    label: "Deep Research",
    href: "/deep-research",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
  {
    icon: MessageSquare,
    id: "pdf-chat",
    label: "PDF Chat",
    href: "/pdf-chat/dashboard",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
  {
    icon: Stethoscope,
    id: "cdss",
    label: "AI Clinical Decision Support",
    href: "/cdss",
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
  imageUrl?: string;
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

// Generate placeholder image based on specialty/type
function getPlaceholderImage(item: DiscoverItem): string {
  const colors = {
    cardiology: "e74c3c",
    oncology: "9b59b6",
    neurology: "3498db",
    endocrinology: "f39c12",
    gastroenterology: "27ae60",
    orthopedics: "1abc9c",
    pediatrics: "e91e63",
    default: "14b8a6"
  };

  const specialty = item.specialties[0]?.toLowerCase() || "default";
  const color = colors[specialty as keyof typeof colors] || colors.default;

  // Use a medical-themed placeholder
  return `https://via.placeholder.com/400x200/${color}/ffffff?text=${encodeURIComponent(item.type.charAt(0).toUpperCase() + item.type.slice(1))}`;
}

export function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Search mode state for tool selection
  type SearchMode = "deep-research" | "pdf-chat";
  const [searchMode, setSearchMode] = useState<SearchMode>("deep-research");



  // PDF Chat state
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const { uploadFiles, isUploading: isPdfUploading } = usePDFUpload();
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Deep Research Sources State
  const [selectedSources, setSelectedSources] = useState({
    pubmed: true,
    arxiv: false,
    web: false
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file) return;
      setUploadedFileName(file.name);

      const result = await uploadFiles(Array.from(files));
      if (result) {
        // Create a new session for this document
        try {
          const createRes = await fetch('/api/pdf-chat/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: result.documentId,
              title: `Chat about ${file!.name}`
            })
          });
          const sessionData = await createRes.json();
          setPdfSessionId(sessionData.sessionId || sessionData.session_id);
        } catch (err) {
          console.error("Failed to create session", err);
        }
      }
    }
  };

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Discover state
  const [discoverType, setDiscoverType] = useState<DiscoverContentType>("all");
  const [discoverSpecialty, setDiscoverSpecialty] = useState("all");
  const [discoverItems, setDiscoverItems] = useState<DiscoverItem[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setSearchQuery(transcript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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

  const handleSearch = async () => {
    if (!searchQuery.trim() && !uploadedFileName) return;

    if (searchMode === "pdf-chat") {
      if (pdfSessionId) {
        if (searchQuery) localStorage.setItem("pdfChatQuery", searchQuery);
        router.push(`/chat/${pdfSessionId}`);
      } else if (searchQuery) {
        // If no session but query, maybe redirect to dashboard with query
        localStorage.setItem("pdfChatQuery", searchQuery);
        router.push("/pdf-chat/dashboard");
      }
      return;
    }

    // Deep Research
    try {
      const res = await fetch('/api/chat/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            type: 'deep-research',
            metadata: { sources: selectedSources }
          },
          title: searchQuery
        })
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/chat/${data.id}`);
      }
    } catch (e) {
      console.error("Failed to create chat", e);
    }
  };

  // Render Inline Views Removed - Logic Moved to /chat/[id]


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
    <div className="flex flex-col w-full overflow-y-auto bg-[#1a1a1c]">
      {/* Hero Section - Full viewport height with centered search */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight flex items-center justify-center gap-2">
              MedQ AI Workspace
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
            </h1>
            <p className="text-gray-400 mt-3 text-sm">Your AI-powered medical research companion</p>
          </motion.div>

          {/* Search Bar - Centered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl mx-auto mb-10"
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
                  onKeyDown={handleKeyPress}
                  className="w-full bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-500 text-base"
                />
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                <div className="flex items-center gap-1">
                  {/* Gemini-style Toggle Dropdown for Tool Selection */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700/50 rounded-full transition-colors text-sm text-gray-300"
                        title="Select tool"
                      >
                        {searchMode === "deep-research" ? (
                          <Microscope className="w-4 h-4 text-teal-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-teal-400" />
                        )}
                        <span className="text-gray-300">
                          {searchMode === "deep-research" ? "Deep Research" : "PDF Chat"}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#2a2a2c] border-gray-700 text-gray-300">
                      <DropdownMenuLabel className="text-gray-400">Select Tool</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-700" />
                      <DropdownMenuItem
                        onClick={() => setSearchMode("deep-research")}
                        className={`hover:bg-[#3a3a3c] flex items-center gap-2 ${searchMode === "deep-research" ? "text-teal-400" : ""}`}
                      >
                        <Microscope className="w-4 h-4" />
                        <span>Deep Research</span>
                        {searchMode === "deep-research" && <span className="ml-auto text-xs">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSearchMode("pdf-chat")}
                        className={`hover:bg-[#3a3a3c] flex items-center gap-2 ${searchMode === "pdf-chat" ? "text-teal-400" : ""}`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>PDF Chat</span>
                        {searchMode === "pdf-chat" && <span className="ml-auto text-xs">✓</span>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-1">
                  {/* File Upload for PDF mode */}
                  {searchMode === "pdf-chat" && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 rounded-lg transition-colors ${uploadedFileName ? 'text-teal-400 bg-teal-500/10' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        title="Attach PDF"
                        disabled={isPdfUploading}
                      >
                        {isPdfUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                      </button>
                      {uploadedFileName && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded max-w-[100px] truncate">
                          <span className="truncate">{uploadedFileName}</span>
                          <button onClick={(e) => { e.stopPropagation(); setUploadedFileName(null); setPdfSessionId(null); }}><X className="w-3 h-3 hover:text-white" /></button>
                        </div>
                      )}
                    </>
                  )}


                  {/* Mic Icon - Working Voice Input */}
                  <button
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-400' : 'hover:bg-gray-700/50 text-gray-400'}`}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                  {/* Submit Button with Enter/Arrow Icon */}
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                    className="ml-2 p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Deep Research Source Selection */}
              {searchMode === "deep-research" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 pb-4 flex items-center gap-3 border-t border-gray-700/30 pt-3"
                >
                  <span className="text-xs text-gray-400 font-medium mr-1">Sources:</span>

                  <button
                    onClick={() => setSelectedSources(prev => ({ ...prev, pubmed: !prev.pubmed }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.pubmed
                      ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                      : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.pubmed ? "bg-blue-500" : "bg-gray-600"}`} />
                    PubMed
                  </button>

                  <button
                    onClick={() => setSelectedSources(prev => ({ ...prev, arxiv: !prev.arxiv }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.arxiv
                      ? "bg-red-500/10 border-red-500/50 text-red-400"
                      : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.arxiv ? "bg-red-500" : "bg-gray-600"}`} />
                    arXiv
                  </button>

                  <button
                    onClick={() => setSelectedSources(prev => ({ ...prev, web: !prev.web }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.web
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                      : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.web ? "bg-emerald-500" : "bg-gray-600"}`} />
                    Web
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Tool Icons Row - Pill Shape Design */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap px-4">
              {tools.map((tool, i) => (
                <motion.button
                  key={tool.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all cursor-pointer group ${(tool.id === "deep-research" && searchMode === "deep-research") || (tool.id === "pdf-chat" && searchMode === "pdf-chat")
                    ? "bg-[#3a3a3c] border-teal-500/50"
                    : "bg-[#2a2a2c] border-gray-700 hover:bg-[#3a3a3c] hover:border-gray-600"
                    }`}
                  onClick={() => {
                    if (tool.id === "deep-research") setSearchMode("deep-research");
                    else if (tool.id === "pdf-chat") setSearchMode("pdf-chat");
                    else router.push(tool.href);
                  }}
                >
                  <tool.icon className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">
                    {tool.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div >

      {/* Discover Section - Below the centered search */}
      < motion.div
        initial={{ opacity: 0, y: 40 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-16"
      >
        {/* Section Header */}
        < div className="flex items-center justify-between mb-6" >
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
          </div>
        </div >

        {/* Feed Content */}
        {
          isDiscoverLoading && !discoverItems.length ? (
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
            <>
              {/* Redesigned Article Cards Grid */}
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {discoverItems.slice(0, 9).map((item) => (
                  <article
                    key={item.id}
                    className="group rounded-2xl overflow-hidden border border-gray-700/50 bg-[#2a2a2c] hover:bg-[#323234] transition-all cursor-pointer hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5"
                    onClick={() => handleOpenDiscoverItem(item)}
                  >
                    {/* Image Section */}
                    <div className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                        style={{
                          backgroundImage: `url(${item.imageUrl || getPlaceholderImage(item)})`,
                        }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2a2a2c] via-transparent to-transparent" />

                      {/* Type badge */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-teal-500/20 backdrop-blur-sm text-teal-300 text-[10px] uppercase tracking-wide font-medium border border-teal-500/30">
                          {item.type === "journal" ? "Journal" : item.type === "trial" ? "Trial" : item.type === "guideline" ? "Guideline" : item.type === "innovation" ? "Innovation" : "News"}
                        </span>
                      </div>

                      {/* External link icon */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 flex flex-col gap-2">
                      {/* Source and date */}
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="font-medium truncate max-w-[180px]">{item.source}</span>
                        {item.publishedAt && (
                          <span>· {new Date(item.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                        {item.title}
                      </h3>

                      {/* Summary */}
                      {item.summary && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{item.summary}</p>
                      )}

                      {/* Specialties */}
                      {item.specialties.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-auto">
                          {item.specialties.slice(0, 2).map((spec) => (
                            <span key={spec} className="px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 text-[10px]">
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* Refresh Now Pill Button - Bottom Center */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchDiscoverFeed()}
                  disabled={isDiscoverLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-medium hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDiscoverLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Refresh Now</span>
                </button>
              </div>
            </>
          )
        }
      </motion.div >
    </div >
  );
}
