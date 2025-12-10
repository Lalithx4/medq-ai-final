"use client";

import { FileText, BookOpen, History, LogOut, Menu, Settings, User as UserIcon, Moon, Sun, Edit3, MessageSquare, SlidersHorizontal, Sparkles, Video, LayoutDashboard, Users, Stethoscope, Plus, FolderOpen, Brain, Microscope, ChevronDown, ChevronRight, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CreditsDisplay } from "@/components/credits/CreditsDisplay";
import { useTheme } from "next-themes";

interface AppLayoutProps {
  children: ReactNode;
}

interface ChatHistoryItem {
  id: string;
  title: string | null;
  context: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to format timestamp relative to now
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // isSidebarOpen acts as a pin. When false, the rail is collapsed but can expand on hover.
  // Default to false on mobile, true on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const autoHideRef = useRef<NodeJS.Timeout | null>(null);

  // Collapsible sections state
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false);
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);

  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Set sidebar open by default on desktop only
  useEffect(() => {
    const isDesktop = window.innerWidth >= 768; // md breakpoint
    setIsSidebarOpen(isDesktop);
  }, []);

  // Get user from Supabase with role
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getBrowserSupabase();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Fetch user profile with role from database
        const { data: profile } = await supabase
          .from('User')
          .select('role')
          .eq('id', authUser.id)
          .single();

        setUser({
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          role: profile?.role || 'USER'
        });
      }
    };

    fetchUser();
  }, []);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setIsHistoryLoading(true);
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  const userEmail = user?.email || "user@example.com";
  const userName = user?.name || user?.email?.split('@')[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const isActive = (path: string) => {
    if (path === "/chat" && pathname?.startsWith("/chat")) return true;
    if (path === "/dashboard" && pathname?.startsWith("/dashboard")) return true;
    if (path !== "/chat" && path !== "/dashboard" && pathname?.startsWith(path)) return true;
    return false;
  };

  const isExpanded = isSidebarOpen || isHovering;

  // Auto-hide after 3 seconds when not hovered
  const clearAutoHide = () => {
    if (autoHideRef.current) {
      clearTimeout(autoHideRef.current);
      autoHideRef.current = null;
    }
  };

  const startAutoHide = () => {
    clearAutoHide();
    if (isSidebarOpen && !isHovering) {
      autoHideRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 3000);
    }
  };

  useEffect(() => {
    startAutoHide();
    return clearAutoHide;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, isHovering]);

  // Reset timer on global interactions
  useEffect(() => {
    const onInteract = () => startAutoHide();
    window.addEventListener("mousemove", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("click", onInteract);
    return () => {
      window.removeEventListener("mousemove", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("click", onInteract);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-[#1a1a1c]">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modern Minimal Dark Theme */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`${isExpanded ? "w-56" : "w-[60px]"
          } ${isSidebarOpen ? "flex" : "hidden md:flex"
          } fixed md:relative z-50 md:z-auto h-full bg-[#0f0f10] flex-col transition-all duration-300 ease-in-out`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header - Logo and Toggle */}
        <div className="h-14 flex items-center px-3 border-b border-gray-800/50">
          <button
            aria-label="Toggle sidebar"
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-800/60 text-gray-400 transition-colors flex-shrink-0"
            onClick={() => {
              setIsSidebarOpen((v) => !v);
              startAutoHide();
            }}
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 font-semibold text-white text-sm whitespace-nowrap overflow-hidden"
              >
                MedQ AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* New Chat Button */}
        <div className="px-2 py-3">
          <Link
            href="/chat"
            className={`flex items-center justify-center gap-2 h-9 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-all font-medium text-sm ${isExpanded ? 'px-4' : 'w-9 mx-auto'}`}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {isExpanded && <span>New Chat</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {/* Main Section - Collapsible */}
          {isExpanded && (
            <button
              onClick={() => setIsMainCollapsed(!isMainCollapsed)}
              className="w-full flex items-center justify-between text-[10px] font-medium uppercase text-gray-500 px-2 mb-2 tracking-wider hover:text-gray-400 transition-colors"
            >
              <span>Main</span>
              {isMainCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          <AnimatePresence>
            {!isMainCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                <Link
                  href="/cdss"
                  title="Clinical Assistant"
                  className={`flex items-center h-10 rounded-lg transition-all group ${isActive("/cdss")
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                    } ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}
                >
                  <Stethoscope className="w-[18px] h-[18px] flex-shrink-0" />
                  {isExpanded && <span className="text-sm">Clinical Assistant</span>}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="!my-3 border-t border-gray-800/50" />

          {/* Tools Section - Collapsible */}
          {isExpanded && (
            <button
              onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
              className="w-full flex items-center justify-between text-[10px] font-medium uppercase text-gray-500 px-2 mb-2 tracking-wider hover:text-gray-400 transition-colors"
            >
              <span>Tools</span>
              {isToolsCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          <AnimatePresence>
            {!isToolsCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                <Link
                  href="/deep-research"
                  title="Deep Research"
                  className={`flex items-center h-10 rounded-lg transition-all group ${isActive("/deep-research")
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                    } ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}
                >
                  <Microscope className="w-[18px] h-[18px] flex-shrink-0" />
                  {isExpanded && <span className="text-sm">Deep Research</span>}
                </Link>

                <Link
                  href="/pdf-chat/dashboard"
                  title="PDF Chat"
                  className={`flex items-center h-10 rounded-lg transition-all group ${isActive("/pdf-chat")
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                    } ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}
                >
                  <MessageSquare className="w-[18px] h-[18px] flex-shrink-0" />
                  {isExpanded && <span className="text-sm">PDF Chat</span>}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Admin Dashboard - Only visible to admins */}
          {user?.role === 'ADMIN' && (

            <>
              <div className="!my-3 border-t border-gray-800/50" />
              <Link
                href="/admin"
                title="Admin Dashboard"
                className={`flex items-center h-10 rounded-lg transition-all group ${isActive("/admin")
                  ? "bg-gray-800 text-orange-400"
                  : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                  } ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}
              >
                <LayoutDashboard className={`w-[18px] h-[18px] flex-shrink-0 ${isActive("/admin") ? 'text-orange-400' : 'text-orange-500'}`} />
                {isExpanded && <span className="text-sm">Admin</span>}
              </Link>
            </>
          )}

          {/* Divider before History */}
          <div className="!my-3 border-t border-gray-800/50" />

          {/* History Section */}
          {isExpanded && (
            <p className="text-[10px] font-medium uppercase text-gray-500 px-2 mb-2 tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>History</span>
            </p>
          )}

          {!isExpanded && (
            <div className="flex justify-center py-2">
              <Clock className="w-[18px] h-[18px] text-gray-500" />
            </div>
          )}

          {isExpanded && (
            <div className="space-y-0.5">
              {isHistoryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              ) : chatHistory.length === 0 ? (
                <p className="text-[11px] text-gray-600 px-3 py-2">No chat history yet</p>
              ) : (
                chatHistory.slice(0, 10).map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className="flex items-start px-3 py-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-gray-200">
                        {chat.title || "Untitled conversation"}
                      </p>
                      <p className="text-[10px] text-gray-600">{formatRelativeTime(chat.updatedAt)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </nav>

        {/* Bottom Section - Credits & User */}
        <div className="border-t border-gray-800/50">
          {/* Credits Display */}
          <div className="px-2 py-3">
            <CreditsDisplay compact={!isExpanded} />
          </div>

          {/* User Profile */}
          <div className="px-2 pb-3">
            <div className={`flex items-center rounded-lg p-2 hover:bg-gray-800/50 transition-all ${isExpanded ? 'gap-2' : 'justify-center'}`}>
              <Link
                href="/settings?tab=profile"
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                title="Profile Settings"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">{userInitial}</span>
                </div>
                {isExpanded && (
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                )}
              </Link>
              {isExpanded && (
                <button
                  onClick={async () => {
                    const supabase = getBrowserSupabase();
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="p-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-700/50 flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0 flex flex-col items-center justify-center">
        {/* Top bar for small screens */}
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-3 gap-2 md:hidden bg-[#1a1a1c]">
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle sidebar"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-800 text-gray-400 transition-colors"
              onClick={() => {
                setIsSidebarOpen((v) => !v);
                startAutoHide();
              }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-bold text-base text-white">
              MedQ AI
            </h1>
          </div>
          <button
            aria-label="User menu"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            <span className="text-sm font-semibold text-white">{userInitial}</span>
          </button>
        </div>

        {/* Mobile User Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Panel */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="fixed top-12 right-3 left-3 z-50 bg-[#2a2a2c] border border-gray-700 rounded-lg shadow-lg md:hidden"
              >
                <div className="p-4 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-white">{userInitial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-white">{userName}</p>
                      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                    </div>
                  </div>

                  {/* Credits Display */}
                  <div>
                    <CreditsDisplay />
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-gray-300"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                    <span className="text-sm">
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>

                  {/* Profile Link */}
                  <Link
                    href={user?.email ? `/user/${user.email}` : "/settings"}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-gray-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">Profile</span>
                  </Link>

                  {/* Admin Dashboard - Only visible to admins */}
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 text-orange-400 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span className="text-sm font-medium">Admin Dashboard</span>
                    </Link>
                  )}

                  {/* Logout Button */}
                  <button
                    onClick={async () => {
                      const supabase = getBrowserSupabase();
                      await supabase.auth.signOut();
                      setIsMobileMenuOpen(false);
                      router.push('/auth/login');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-900/30 text-red-400 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {children}
      </main>

      {/* Mobile Bottom Navigation - Dark Theme */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-[#1a1a1c]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a1a1c]/75">
        <div className="grid grid-cols-4 h-14 text-xs">
          <Link href="/chat" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Chat">
            <Plus className={`h-4 w-4 ${isActive("/chat") ? "text-teal-400" : "text-gray-400"}`} />
            <span className={`text-[9px] ${isActive("/chat") ? "font-semibold text-teal-400" : "text-gray-400"}`}>New Chat</span>
            {isActive("/chat") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />}
          </Link>
          <Link href="/deep-research" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Research">
            <Microscope className={`h-4 w-4 ${isActive("/deep-research") ? "text-teal-400" : "text-gray-400"}`} />
            <span className={`text-[9px] ${isActive("/deep-research") ? "font-semibold text-teal-400" : "text-gray-400"}`}>Research</span>
            {isActive("/deep-research") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />}
          </Link>
          <Link href="/cdss" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Clinical">
            <Stethoscope className={`h-4 w-4 ${isActive("/cdss") ? "text-teal-400" : "text-gray-400"}`} />
            <span className={`text-[9px] ${isActive("/cdss") ? "font-semibold text-teal-400" : "text-gray-400"}`}>Clinical</span>
            {isActive("/cdss") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />}
          </Link>

          <Link href="/pdf-chat/dashboard" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="PDF Chat">
            <MessageSquare className={`h-4 w-4 ${isActive("/pdf-chat") ? "text-teal-400" : "text-gray-400"}`} />
            <span className={`text-[9px] ${isActive("/pdf-chat") ? "font-semibold text-teal-400" : "text-gray-400"}`}>PDF Chat</span>
            {isActive("/pdf-chat") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-full" />}
          </Link>
        </div>
      </nav>
    </div>
  );
}
