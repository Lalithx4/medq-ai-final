"use client";

import { usePresentationState } from "@/states/presentation-state";
import { FileText, BookOpen, Search, MessageSquare, History, Users, Send, Bot, User, Stethoscope, RefreshCw, Zap, ClipboardCheck, Sparkles, GraduationCap, Microscope, ShieldCheck, Video, FolderOpen, Presentation, Lock, FileUp, BarChart3, Radio, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setPresentationInput } = usePresentationState();

  // Try to detect an intent to create a presentation and extract a topic
  const parsePresentationIntent = (text: string): string | null => {
    const lower = text.toLowerCase();
    const intent = /(generate|create|make)\s+(a\s+)?(ppt|powerpoint|presentation)/i.test(lower);
    if (!intent) return null;
    // extract topic after "on" or "about"
    const onMatch = /(?:on|about)\s+(.+)$/i.exec(text);
    if (onMatch && onMatch[1]) return onMatch[1].trim();
    // otherwise use the remaining words after the keyword
    const after = text.replace(/^(.*?(ppt|powerpoint|presentation)\s*)/i, "").trim();
    return after || "Untitled Topic";
  };

  // Detect research paper intent
  const parseResearchIntent = (text: string): string | null => {
    const lower = text.toLowerCase();
    const intent = /(generate|create|write|make)\s+(a\s+)?(research\s+paper|paper|essay|article)/i.test(lower);
    if (!intent) return null;
    // extract topic after "on" or "about"
    const onMatch = /(?:on|about)\s+(.+)$/i.exec(text);
    if (onMatch && onMatch[1]) return onMatch[1].trim();
    // otherwise use the remaining words after the keyword
    const after = text.replace(/^(.*?(research\s+paper|paper|essay|article)\s*)/i, "").trim();
    return after || null;
  };

  // Detect deep research intent
  const parseDeepResearchIntent = (text: string): string | null => {
    const lower = text.toLowerCase();
    const intent = /(deep\s+research|comprehensive\s+research|research\s+report|detailed\s+research)/i.test(lower);
    if (!intent) return null;
    // extract topic after "on" or "about"
    const onMatch = /(?:on|about)\s+(.+)$/i.exec(text);
    if (onMatch && onMatch[1]) return onMatch[1].trim();
    // otherwise use the remaining words after the keyword
    const after = text.replace(/^(.*?(deep\s+research|comprehensive\s+research|research\s+report|detailed\s+research)\s*)/i, "").trim();
    return after || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!searchQuery.trim() || isLoading) return;

    const userMessage = searchQuery.trim();
    setSearchQuery("");

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    // Check for presentation intent
    const presentationTopic = parsePresentationIntent(userMessage);
    if (presentationTopic) {
      setPresentationInput(presentationTopic);
      router.push("/presentation-builder");
      return;
    }

    // Check for deep research intent (check this first as it's more specific)
    const deepResearchTopic = parseDeepResearchIntent(userMessage);
    if (deepResearchTopic) {
      // Store the topic in localStorage and redirect
      localStorage.setItem('deepResearchQuery', deepResearchTopic);
      router.push("/deep-research");
      return;
    }

    // Check for research paper intent
    const researchTopic = parseResearchIntent(userMessage);
    if (researchTopic) {
      // Store the topic in localStorage and redirect
      localStorage.setItem('researchPaperTopic', researchTopic);
      router.push("/research-paper");
      return;
    }

    // Normal chat - no special intent detected
    setIsLoading(true);

    try {
      // Call your AI API here
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages 
        }),
      });

      const data = await response.json();
      
      // Add AI response
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || "I'm here to help with medical research and documentation. How can I assist you today?"
      }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble connecting right now. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <header className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between border-b border-border bg-background">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to BioDocsAI
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
              Start a conversation with our specialized medical AI agents
            </p>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Chat Messages - Show when there are messages */}
          {messages.length > 0 && (
            <div className="mb-8 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-xl px-5 py-3 ${
                      message.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-5 py-3">
                    {/* Account moved to sidebar */}
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Feature Cards - Show when no messages */}
          {messages.length === 0 && (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {[
                {
                  href: "/groups",
                  icon: Users,
                  title: "Study Groups",
                  description: "Create groups to chat, share documents, live stream & collaborate",
                  gradient: "from-violet-500/10 to-purple-500/10",
                  iconColor: "text-violet-500",
                  badge: "NEW"
                },
                {
                  href: "/pdf-chat/dashboard",
                  icon: BarChart3,
                  title: "PDF Analysis & Articles",
                  description: "Upload PDFs, get AI analysis, generate research articles & export",
                  gradient: "from-cyan-500/10 to-blue-500/10",
                  iconColor: "text-cyan-500",
                  badge: "NEW"
                },
                {
                  href: "/video-streaming",
                  icon: Video,
                  title: "Video Meetings",
                  description: "HIPAA-ready video conferencing for CME, grand rounds & telemedicine",
                  gradient: "from-rose-500/10 to-pink-500/10",
                  iconColor: "text-rose-500",
                  badge: "HOT"
                },
                {
                  href: "/files",
                  icon: FolderOpen,
                  title: "File Manager",
                  description: "Organize and manage all your research documents securely",
                  gradient: "from-amber-500/10 to-orange-500/10",
                  iconColor: "text-amber-500",
                  badge: null
                },
                {
                  href: "/presentation-builder",
                  icon: GraduationCap,
                  title: "Create Presentations",
                  description: "Generate professional medical presentations with AI",
                  gradient: "from-blue-500/10 to-cyan-500/10",
                  iconColor: "text-blue-500",
                  badge: null
                },
                {
                  href: "/research-paper",
                  icon: BookOpen,
                  title: "Research Papers",
                  description: "Write academic papers with citations and references",
                  gradient: "from-purple-500/10 to-pink-500/10",
                  iconColor: "text-purple-500",
                  badge: null
                },
                {
                  href: "/deep-research",
                  icon: Microscope,
                  title: "Deep Research",
                  description: "Comprehensive research from PubMed and arXiv",
                  gradient: "from-green-500/10 to-emerald-500/10",
                  iconColor: "text-green-500",
                  badge: null
                },
                {
                  href: "/editor",
                  icon: FileText,
                  title: "AI Document Editor",
                  description: "Edit with AI citations, paraphrasing & autocomplete",
                  gradient: "from-orange-500/10 to-red-500/10",
                  iconColor: "text-orange-500",
                  badge: "POPULAR"
                },
                {
                  href: "/pdf-chat",
                  icon: MessageSquare,
                  title: "Chat with Documents",
                  description: "Upload PDFs and chat with them using AI",
                  gradient: "from-sky-500/10 to-blue-500/10",
                  iconColor: "text-sky-500",
                  badge: null
                },
                {
                  href: "/citation-generator",
                  icon: BookOpen,
                  title: "AI Citation Generator",
                  description: "Search 280M+ sources and insert citations instantly",
                  gradient: "from-indigo-500/10 to-blue-500/10",
                  iconColor: "text-indigo-500",
                  badge: "NEW"
                },
                {
                  href: "/paraphraser",
                  icon: RefreshCw,
                  title: "AI Paraphraser",
                  description: "Rewrite text in different tones with medical accuracy",
                  gradient: "from-pink-500/10 to-rose-500/10",
                  iconColor: "text-pink-500",
                  badge: "NEW"
                },
                {
                  href: "/manuscript-review",
                  icon: ClipboardCheck,
                  title: "Manuscript Review",
                  description: "AI-powered review and feedback on manuscripts",
                  gradient: "from-teal-500/10 to-cyan-500/10",
                  iconColor: "text-teal-500",
                  badge: "NEW"
                },

                {
                  href: "/personal-statement",
                  icon: Sparkles,
                  title: "Personal Statement Builder",
                  description: "Craft compelling residency and fellowship personal statements",
                  gradient: "from-purple-500/10 to-pink-500/10",
                  iconColor: "text-purple-500",
                  badge: "NEW"
                },


              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={feature.href}>
                    <div className="relative bg-card rounded-2xl p-6 border border-border hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group overflow-hidden h-full">
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      
                      {/* Badge */}
                      {feature.badge && (
                        <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold z-10">
                          {feature.badge}
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 tracking-tight group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>

                      {/* Sparkle Effect on Hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Search Bar + Quick Actions (temporarily hidden) */}
          <div className="hidden bg-card rounded-xl p-5 border border-border">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask me anything about medical topics, request documents, or chat with your knowledge bases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-5 py-4 pr-14 bg-transparent border-none focus:outline-none text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !searchQuery.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 border border-border bg-card text-foreground p-3 rounded-lg hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 overflow-x-auto">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Quick actions:</p>
                <button
                  onClick={() => router.push('/presentation-builder')}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-sm group whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-foreground">Create presentation</span>
                </button>
                <button
                  onClick={() => router.push('/research-paper')}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-sm group whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-foreground">Research paper</span>
                </button>
                <button
                  onClick={() => router.push('/deep-research')}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-sm group whitespace-nowrap"
                >
                  <Search className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-foreground">Deep research</span>
                </button>
                <button
                  onClick={() => router.push('/editor')}
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all text-sm group whitespace-nowrap"
                >
                  <Stethoscope className="w-4 h-4 text-primary group-hover:scale-105 transition-transform" />
                  <span className="text-foreground">Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
