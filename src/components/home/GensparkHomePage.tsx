"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  BookOpen,
  Microscope,
  MessageSquare,
  Stethoscope,
  ArrowRight,
  Paperclip,
  Mic,
  RotateCcw,
} from "lucide-react";

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
    icon: BookOpen,
    label: "AI Docs",
    href: "/research-paper",
    borderColor: "border-amber-700",
    iconColor: "text-amber-400"
  },
  {
    icon: MessageSquare,
    label: "PDF Chat",
    href: "/pdf-chat/dashboard",
    borderColor: "border-gray-600",
    iconColor: "text-white"
  },
];

export function GensparkHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1a1a1c]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8">
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
            className="mt-16"
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

          {/* Bottom spacing */}
          <div className="h-12"></div>
        </div>
      </div>
    </div>
  );
}
