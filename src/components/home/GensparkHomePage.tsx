"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePresentationState } from "@/states/presentation-state";
import {
  Search,
  Send,
  Sparkles,
  FileText,
  BookOpen,
  Microscope,
  MessageSquare,
  Stethoscope,
  GraduationCap,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Zap,
  Brain,
  FlaskConical,
  Globe,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";

interface ForYouCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  href: string;
  category: string;
}

const forYouCards: ForYouCard[] = [
  {
    id: "cdss",
    title: "AI Clinical Decision Support",
    description: "Get real-time diagnostic assistance from specialist AI agents",
    icon: Stethoscope,
    gradient: "from-blue-600 to-cyan-500",
    href: "/cdss",
    category: "Clinical",
  },
  {
    id: "deep-research",
    title: "Deep Research",
    description: "Comprehensive multi-source research with citations",
    icon: Microscope,
    gradient: "from-teal-600 to-emerald-500",
    href: "/deep-research",
    category: "Research",
  },
  {
    id: "presentation",
    title: "AI Presentations",
    description: "Generate professional medical slides in minutes",
    icon: GraduationCap,
    gradient: "from-slate-700 to-slate-500",
    href: "/presentation-builder",
    category: "Productivity",
  },
  {
    id: "research-paper",
    title: "Research Paper Writer",
    description: "Write academic papers with proper citations",
    icon: BookOpen,
    gradient: "from-indigo-600 to-blue-500",
    href: "/research-paper",
    category: "Academic",
  },
  {
    id: "pdf-chat",
    title: "Chat with Documents",
    description: "Upload PDFs and have AI conversations about them",
    icon: MessageSquare,
    gradient: "from-sky-600 to-cyan-500",
    href: "/pdf-chat/dashboard",
    category: "Documents",
  },
  {
    id: "video",
    title: "Video Meetings",
    description: "HIPAA-ready video conferencing for healthcare",
    icon: Video,
    gradient: "from-blue-700 to-indigo-600",
    href: "/video-streaming",
    category: "Collaboration",
  },
  {
    id: "groups",
    title: "Study Groups",
    description: "Collaborate with peers in real-time",
    icon: Users,
    gradient: "from-teal-500 to-cyan-600",
    href: "/groups",
    category: "Collaboration",
  },
  {
    id: "editor",
    title: "AI Document Editor",
    description: "Write with AI-powered autocomplete and citations",
    icon: FileText,
    gradient: "from-slate-600 to-gray-500",
    href: "/editor",
    category: "Productivity",
  },
];

const trendingTopics = [
  "Latest diabetes treatment guidelines",
  "AI in radiology diagnosis",
  "mRNA vaccine technology advances",
  "Precision oncology updates",
  "Antibiotic resistance research",
  "Neuroimaging biomarkers",
];

export function GensparkHomePage() {
  const router = useRouter();
  const { setPresentationInput } = usePresentationState();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        setCurrentCardIndex((prev) => (prev + 1) % (forYouCards.length - 3));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const lower = searchQuery.toLowerCase();

    // Detect intents
    if (/(generate|create|make)\s+(a\s+)?(ppt|powerpoint|presentation)/i.test(lower)) {
      const topic = searchQuery.replace(/^.*?(ppt|powerpoint|presentation)\s*/i, "").trim() || "Medical Topic";
      setPresentationInput(topic);
      router.push("/presentation-builder");
      return;
    }

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

  const scrollCarousel = (direction: "left" | "right") => {
    setIsAnimating(true);
    if (direction === "left") {
      setCurrentCardIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentCardIndex((prev) => Math.min(forYouCards.length - 4, prev + 1));
    }
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-12">
          {/* Header - Modern Style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground tracking-tight">
              MedQ AI Doctors Cockpit
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your intelligent medical workspace for clinical support, research, and productivity.
            </p>
          </motion.div>

          {/* Search Bar - Modern Professional Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-3xl mx-auto mb-12"
          >
            <div className={`relative bg-card transition-all duration-300 ${isSearchFocused ? 'shadow-2xl ring-2 ring-primary/20' : 'shadow-xl'} rounded-full border border-border/50`}>
              <div className="flex items-center px-6 py-4">
                <Search className={`w-5 h-5 mr-4 ${isSearchFocused ? 'text-primary' : 'text-muted-foreground'}`} />
                <input
                  type="text"
                  placeholder="Ask anything, create anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70 text-lg"
                />
                <div className="flex items-center gap-2 pl-4 border-l border-border/50">
                  <button className="p-2 hover:bg-accent rounded-full transition-colors" title="Attach file">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                    className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tool Icons Row - Genspark Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-16"
          >
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 px-4">
              {[
                { icon: Stethoscope, label: "AI Clinical Decision Support", href: "/cdss", gradient: "from-blue-600 to-cyan-500" },
                { icon: GraduationCap, label: "AI Slides", href: "/presentation-builder", gradient: "from-slate-700 to-slate-500" },
                { icon: FileText, label: "AI Docs", href: "/research-paper", gradient: "from-indigo-600 to-blue-500" },
                { icon: MessageSquare, label: "AI Chat", href: "/pdf-chat/dashboard", gradient: "from-sky-600 to-cyan-500" },
                { icon: Microscope, label: "Deep Research", href: "/deep-research", gradient: "from-teal-600 to-emerald-500" },
                { icon: Brain, label: "AI Designer", href: "/editor", gradient: "from-slate-600 to-gray-500" },
                { icon: Users, label: "AI Groups", href: "/groups", gradient: "from-teal-500 to-cyan-600" },
                { icon: Video, label: "AI Video", href: "/video-streaming", gradient: "from-blue-700 to-indigo-600" },
              ].map((tool, i) => (
                <motion.div
                  key={tool.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2 min-w-[100px] cursor-pointer group"
                  onClick={() => router.push(tool.href)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}>
                    <tool.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs text-center text-foreground font-medium line-clamp-2">
                    {tool.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* For You Section - Genspark Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            {/* Section Header with line */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-6 py-2 bg-background text-sm font-medium text-foreground rounded-full border border-border">
                  For You
                </span>
              </div>
            </div>

            {/* Carousel with navigation arrows */}
            <div className="relative">
              <div className="flex items-center gap-4">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollCarousel("left")}
                  disabled={currentCardIndex === 0}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Cards Container */}
                <div className="flex-1 overflow-hidden">
                  <motion.div
                    className="flex gap-6"
                    animate={{ x: -currentCardIndex * (340 + 24) }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {forYouCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        whileHover={{ y: -4 }}
                        className="flex-shrink-0 w-[340px]"
                      >
                        <Link href={card.href}>
                          <div className="relative h-[280px] bg-card rounded-2xl border border-border overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`} />
                            
                            {/* Content */}
                            <div className="relative z-10 p-8 h-full flex flex-col text-white">
                              {/* Category Badge */}
                              <span className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-6">
                                {card.category}
                              </span>
                              
                              {/* Icon */}
                              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <card.icon className="w-8 h-8 text-white" />
                              </div>
                              
                              {/* Title & Description */}
                              <h3 className="text-2xl font-bold mb-3 leading-tight">
                                {card.title}
                              </h3>
                              <p className="text-sm opacity-90 leading-relaxed">
                                {card.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollCarousel("right")}
                  disabled={currentCardIndex >= forYouCards.length - 3}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-card border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bottom spacing */}
          <div className="h-12"></div>
        </div>
      </div>
    </div>
  );
}
