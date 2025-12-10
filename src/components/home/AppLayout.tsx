"use client";

import { FileText, BookOpen, History, Home, LogOut, Menu, Search, CreditCard, Settings, User as UserIcon, Moon, Sun, Edit3, MessageSquare, SlidersHorizontal, Sparkles, Video, LayoutDashboard, Users, Stethoscope, Plus, FolderOpen, Brain, Microscope } from "lucide-react";
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


export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // isSidebarOpen acts as a pin. When false, the rail is collapsed but can expand on hover.
  // Default to false on mobile, true on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const autoHideRef = useRef<NodeJS.Timeout | null>(null);

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

  const userEmail = user?.email || "user@example.com";
  const userName = user?.name || user?.email?.split('@')[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname?.startsWith("/dashboard")) return true;
    if (path !== "/dashboard" && pathname?.startsWith(path)) return true;
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
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`${isExpanded ? "w-64" : "w-16"
          } ${isSidebarOpen ? "flex" : "hidden md:flex"
          } fixed md:relative z-50 md:z-auto h-full bg-card border-r border-border flex-col transition-all duration-300`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Top area: hamburger on left, brand text with logo */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <button
            aria-label="Toggle sidebar"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground transition-colors"
            onClick={() => {
              setIsSidebarOpen((v) => !v);
              startAutoHide();
            }}
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsSidebarOpen((v) => !v);
              startAutoHide();
            }}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {/* Text */}
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                BioDocsAI
              </h1>
            </div>
          </button>
        </div>

        {/* Credits Display + Theme toggle */}
        <div className="p-3 space-y-3">
          {/* + New Button */}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className={`${isExpanded ? "block" : "hidden"}`}>New</span>
          </Link>

          {/* Credits Display - always visible with icon */}
          <div className="pt-2">
            <CreditsDisplay compact={!isExpanded} />
          </div>

          <div className={`${isExpanded ? "block" : "hidden"}`}>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          <h3 className={cn(
            "text-[10px] font-semibold uppercase mb-2 text-muted-foreground",
            isExpanded ? "px-1" : "sr-only"
          )}>
            Main
          </h3>

          <Link
            href="/dashboard"
            title="Home"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${pathname?.startsWith("/dashboard") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-sky-500/10 to-blue-500/10`}>
              <Home className={`w-4 h-4 text-sky-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Home</p>
            </div>
          </Link>

          <Link
            href="/cdss"
            title="Clinical Assistant"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/cdss") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-rose-500/10 to-orange-500/10`}>
              <Stethoscope className={`w-4 h-4 text-rose-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Clinical Assistant</p>
            </div>
          </Link>

          <Link
            href="/deep-research"
            title="Deep Research"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/deep-research") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10`}>
              <Microscope className={`w-4 h-4 text-emerald-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Deep Research</p>
            </div>
          </Link>

          <Link
            href="/discover"
            title="Discover"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/discover") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10`}>
              <Search className={`w-4 h-4 text-purple-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Discover</p>
            </div>
          </Link>

          {/* Separator */}
          <div className="my-3 border-t border-border" />

          <h3 className={cn(
            "text-[10px] font-semibold uppercase mb-2 text-muted-foreground",
            isExpanded ? "px-1" : "sr-only"
          )}>
            Tools
          </h3>

          <Link
            href="/research-paper"
            title="Research Paper"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/research-paper") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10`}>
              <BookOpen className={`w-4 h-4 text-purple-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Research Paper</p>
            </div>
          </Link>

          <Link
            href="/pdf-chat/dashboard"
            title="PDF Chat"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/pdf-chat") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10`}>
              <MessageSquare className={`w-4 h-4 text-cyan-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">PDF Chat</p>
            </div>
          </Link>

          {/* Separator */}
          <div className="my-3 border-t border-border" />

          <Link
            href="/pricing"
            title="Pricing"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/pricing") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-yellow-500/10 to-amber-500/10`}>
              <CreditCard className={`w-4 h-4 text-yellow-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Pricing</p>
            </div>
          </Link>

          <Link
            href="/settings"
            title="Settings"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/settings") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
              }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-slate-500/10 to-gray-500/10`}>
              <Settings className={`w-4 h-4 text-slate-600`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Settings</p>
            </div>
          </Link>



          {/* Admin Dashboard - Only visible to admins */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="my-3 border-t border-border" />
              <Link
                href="/admin"
                title="Admin Dashboard"
                className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${isActive("/admin") ? "bg-orange-500/20 text-orange-600" : "hover:bg-orange-500/10 text-foreground"
                  }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-orange-500/10 to-red-500/10`}>
                  <LayoutDashboard className={`w-4 h-4 text-orange-600`} />
                </div>
                <div className={`${isExpanded ? "block" : "hidden"}`}>
                  <p className="text-sm font-medium">Admin</p>
                </div>
              </Link>
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-foreground">{userInitial}</span>
            </div>
            <div className={`${isExpanded ? "block" : "hidden"} flex-1`}
            >
              <p className="text-sm font-medium text-foreground">{userName}</p>
              {/* email intentionally removed from header; keep hidden here as well */}
            </div>
          </div>
          <button
            onClick={async () => {
              const supabase = getBrowserSupabase();
              await supabase.auth.signOut();
              router.push('/');
            }}
            className={`w-full mt-2 text-sm flex items-center gap-2 justify-center transition-colors text-foreground hover:text-muted-foreground ${isExpanded ? "block" : "hidden"}`}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
        {/* Top bar for small screens */}
        <div className="h-12 border-b border-border flex items-center justify-between px-3 gap-2 md:hidden">
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle sidebar"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground transition-colors"
              onClick={() => {
                setIsSidebarOpen((v) => !v);
                startAutoHide();
              }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              BioDocsAI
            </h1>
          </div>
          <button
            aria-label="User menu"
            className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-accent hover:bg-accent/80"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            <span className="text-sm font-semibold">{userInitial}</span>
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
                className="fixed top-12 right-3 left-3 z-50 bg-card border border-border rounded-lg shadow-lg md:hidden"
              >
                <div className="p-4 space-y-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold">{userInitial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>

                  {/* Credits Display */}
                  <div>
                    <CreditsDisplay />
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">Profile</span>
                  </Link>

                  {/* Admin Dashboard - Only visible to admins */}
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-orange-500/10 text-orange-600 transition-colors"
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="grid grid-cols-7 h-14 text-xs">
          <Link href="/discover" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Discover">
            <Search className={`h-4 w-4 ${isActive("/discover") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/discover") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Discover</span>
            {isActive("/discover") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>
          <Link href="/presentation-builder" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Slide Composer">
            <SlidersHorizontal className={`h-4 w-4 ${isActive("/presentation-builder") ? "text-emerald-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/presentation-builder") ? "font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent" : "text-foreground"}`}>Compose</span>
            {isActive("/presentation-builder") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full" />}
          </Link>
          <Link href="/editor" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="AI Editor">
            <Edit3 className={`h-4 w-4 ${isActive("/editor") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/editor") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Editor</span>
            {isActive("/editor") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>
          <Link href="/citation-generator" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Citation Generator">
            <BookOpen className={`h-4 w-4 ${isActive("/citation-generator") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/citation-generator") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Cite</span>
            {isActive("/citation-generator") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>

          <Link href="/research-paper" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Research Paper">
            <BookOpen className={`h-4 w-4 ${isActive("/research-paper") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/research-paper") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Papers</span>
            {isActive("/research-paper") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>
          <Link href="/deep-research" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Deep Research">
            <Search className={`h-4 w-4 ${isActive("/deep-research") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/deep-research") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Search</span>
            {isActive("/deep-research") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>
          <Link href="/settings" className="flex flex-col items-center justify-center gap-0.5 relative" aria-label="Settings">
            <Settings className={`h-4 w-4 ${isActive("/settings") ? "text-purple-600" : "text-foreground"}`} />
            <span className={`text-[9px] ${isActive("/settings") ? "font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-foreground"}`}>Settings</span>
            {isActive("/settings") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" />}
          </Link>
        </div>
      </nav>
    </div>
  );
}


