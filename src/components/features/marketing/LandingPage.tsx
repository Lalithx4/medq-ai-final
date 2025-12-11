"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Stethoscope, Pill, Dna, TestTube, Activity, ShieldCheck, FileText, Zap, Sparkles, GraduationCap, Microscope, BookOpenText, Code2, BookOpen, RefreshCw, Search, ClipboardCheck, MessageSquare, Presentation } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { FloatingParticles } from "@/components/ui/floating-particles";

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const supabase = getBrowserSupabase();
      const { data: profile } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'ADMIN');
    };

    checkAdminRole();
  }, [user]);

  const dashboardUrl = isAdmin ? '/admin' : '/dashboard';

  const handleSignOut = async () => {
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signOut();
      router.replace("/");
    } catch { }
  };
  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const pop = {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70 text-foreground relative">
      {/* Floating Particles Background */}
      <FloatingParticles count={80} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/60 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">MedQ AI</span>
            </Link>
          </motion.div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#features" className="hover:text-primary">Features</Link>
            <Link href="#pdf-analysis" className="hover:text-primary flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              PDF Analysis
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link href={dashboardUrl} className="inline-block px-3 py-2 text-sm rounded-md border border-border hover:bg-accent">Go to dashboard</Link>
                </motion.span>
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <button onClick={handleSignOut} className="inline-block px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Sign out</button>
                </motion.span>
              </>
            ) : (
              <>
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/auth/login" className="inline-block px-3 py-2 text-sm rounded-md border border-border hover:bg-accent">Sign in</Link>
                </motion.span>
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/presentation" className="inline-block px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Try now</Link>
                </motion.span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          {/* Static gradient fallback (always visible) */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-transparent to-transparent" />
          {/* Gradient blobs */}
          <motion.div
            aria-hidden
            className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, hsl(var(--primary)/0.28), transparent)",
              filter: "saturate(120%)",
            }}
            animate={{ x: [0, 10, -10, 0], y: [0, -10, 10, 0], scale: [1, 1.05, 0.98, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            aria-hidden
            className="absolute top-40 -right-10 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, hsl(var(--primary)/0.22), transparent)",
              filter: "saturate(120%)",
            }}
            animate={{ x: [0, -12, 8, 0], y: [0, 8, -12, 0], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[-6rem] left-1/3 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, hsl(var(--primary)/0.18), transparent)",
              filter: "saturate(120%)",
            }}
            animate={{ x: [0, 6, -6, 0], y: [0, -8, 8, 0], scale: [1, 0.97, 1.03, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Subtle noise overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.5\"/></svg>')",
              backgroundSize: "auto",
            }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.h1 variants={fadeUp}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              AI-Powered Medical Research
              <span className="block bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">From Literature to Publication in Minutes</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl">
              MedQ AI : generate lecture slides, run deep research, write research articles with AI citations, paraphrasing, autocomplete, and manuscript review in our AI-powered editor.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-start gap-x-3 gap-y-3">
              <motion.span className="w-full sm:w-auto inline-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/presentation" className="block px-5 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">Generate a Presentation</Link>
              </motion.span>
              <motion.span className="w-full sm:w-auto inline-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/deep-research" className="block px-5 py-3 rounded-md border border-border hover:bg-accent text-sm font-medium">Run Deep Research</Link>
              </motion.span>
              <motion.span className="w-full sm:w-auto inline-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/research-paper" className="block px-5 py-3 rounded-md border border-border hover:bg-accent text-sm font-medium">Write Research Article</Link>
              </motion.span>
              <motion.span className="w-full sm:w-auto inline-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/editor" className="block px-5 py-3 rounded-md border border-border hover:bg-accent text-sm font-medium">AI Code Editor</Link>
              </motion.span>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-3">
              {user ? (
                <Link href={dashboardUrl} className="text-sm text-primary hover:underline">Go to dashboard →</Link>
              ) : (
                <Link href="/auth/login" className="text-sm text-primary hover:underline">Sign in to continue where you left off →</Link>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />HIPAA-ready workflows</div>
              <div className="flex items-center gap-2"><Zap className="h-4 w-4" />Optimized for mobile</div>
            </motion.div>
          </motion.div>

          {/* Beautiful Feature Cards Showcase */}
          <motion.div className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, repeatType: "mirror", duration: 6, ease: "easeInOut" }}>
            <motion.div className="rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden shadow-2xl p-6"
              variants={pop} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: GraduationCap, title: "Lecture slides", desc: "Auto-styled medical slides", gradient: "from-blue-500/20 to-cyan-500/20", iconColor: "text-blue-500", href: "/presentation" },
                  { icon: Microscope, title: "Deep research", desc: "PubMed + arXiv grounded", gradient: "from-green-500/20 to-emerald-500/20", iconColor: "text-green-500", href: "/deep-research" },
                  { icon: BookOpenText, title: "Research articles", desc: "Citations + references", gradient: "from-purple-500/20 to-pink-500/20", iconColor: "text-purple-500", href: "/research-paper" },
                  { icon: Code2, title: "AI code editor", desc: "Edit with inline citations", gradient: "from-orange-500/20 to-red-500/20", iconColor: "text-orange-500", href: "/editor" },
                ].map((feature, index) => (
                  <Link href={feature.href} key={feature.title}>
                    <motion.div
                      className="relative rounded-xl border border-border p-4 bg-background/80 hover:bg-background transition-all cursor-pointer group overflow-hidden"
                      variants={pop}
                      whileHover={{ scale: 1.05, y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      {/* Content */}
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-3 group-hover:text-primary transition-colors">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <feature.icon className={`h-4 w-4 ${feature.iconColor}`} />
                          </div>
                          {feature.title}
                        </div>
                        <div className="h-24 rounded-lg bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center text-xs text-muted-foreground font-medium px-2 text-center group-hover:from-primary/10 transition-colors">
                          {feature.desc}
                        </div>
                      </div>

                      {/* Sparkle Effect */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Built for medical learning and practice</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-2xl mx-auto">
          From undergraduate lectures to specialty training and clinical documentation.
        </p>
        <motion.div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          {[
            { icon: Stethoscope, title: "Clinical Presentations", desc: "Generate lecture slides with clinical pearls, images, and citations.", gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-500", href: "/presentation" },
            { icon: Microscope, title: "Deep Research", desc: "Retrieve from PubMed/arXiv and synthesize with traceable sources.", gradient: "from-green-500/10 to-emerald-500/10", iconColor: "text-green-500", href: "/deep-research" },
            { icon: BookOpenText, title: "Research Articles", desc: "Write IMRaD-style papers with references and journal formats.", gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-purple-500", href: "/research-paper" },
            { icon: BookOpen, title: "AI Citation Generator", desc: "Search 280M+ academic sources and insert formatted citations instantly.", badge: "NEW", gradient: "from-indigo-500/10 to-blue-500/10", iconColor: "text-indigo-500", href: "/editor" },
            { icon: RefreshCw, title: "AI Paraphraser", desc: "Rewrite text in different tones while preserving medical accuracy.", badge: "NEW", gradient: "from-pink-500/10 to-rose-500/10", iconColor: "text-pink-500", href: "/editor" },
            { icon: Zap, title: "AI Autocomplete", desc: "Smart text suggestions as you write medical documents.", badge: "NEW", gradient: "from-yellow-500/10 to-amber-500/10", iconColor: "text-yellow-500", href: "/editor" },
            { icon: ClipboardCheck, title: "Manuscript Review", desc: "AI-powered review and feedback on your research manuscripts.", badge: "NEW", gradient: "from-teal-500/10 to-cyan-500/10", iconColor: "text-teal-500", href: "/editor" },
            { icon: Code2, title: "AI Document Editor", desc: "Edit and refactor documents with inline citation helpers and AI assistance.", gradient: "from-orange-500/10 to-red-500/10", iconColor: "text-orange-500", href: "/editor" },
          ].map(({ icon: Icon, title, desc, badge, gradient, iconColor, href }) => (
            <Link href={href} key={title}>
              <motion.div className="relative rounded-2xl border border-border bg-card p-6 hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group overflow-hidden h-full"
                variants={pop} whileHover={{ y: -8, scale: 1.02 }}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Badge */}
                {badge && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold z-10">
                    {badge}
                  </div>
                )}

                {/* Content */}
                <div className="relative z-10">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                  <h3 className="font-bold mb-2 group-hover:text-primary transition-colors">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>

                {/* Sparkle Effect on Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Use cases (no remote images) */}
      <section id="use-cases" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Use cases for med school and practice</h2>
        <motion.div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          {[
            { icon: GraduationCap, title: "Lecture decks", desc: "Auto-structured slides for teaching rounds and tutorials.", gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-blue-500", href: "/presentation" },
            { icon: BookOpenText, title: "Research writing", desc: "Drafts in IMRaD with AI citations and paraphrasing.", gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-purple-500", href: "/research-paper" },
            { icon: Code2, title: "Smart editing", desc: "AI autocomplete, citations, and manuscript review.", gradient: "from-orange-500/10 to-red-500/10", iconColor: "text-orange-500", href: "/editor" },
            { icon: BookOpen, title: "Citation management", desc: "Search and insert citations from 280M+ sources.", gradient: "from-indigo-500/10 to-blue-500/10", iconColor: "text-indigo-500", href: "/editor" },
            { icon: RefreshCw, title: "Text refinement", desc: "Paraphrase and improve medical writing clarity.", gradient: "from-pink-500/10 to-rose-500/10", iconColor: "text-pink-500", href: "/editor" },
            { icon: ClipboardCheck, title: "Manuscript review", desc: "Get AI feedback on structure and content.", gradient: "from-teal-500/10 to-cyan-500/10", iconColor: "text-teal-500", href: "/editor" },
            { icon: Search, title: "Deep research", desc: "Comprehensive literature synthesis with PubMed.", gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-500", href: "/deep-research" },
          ].map(({ icon: Icon, title, desc, gradient, iconColor, href }) => (
            <Link href={href} key={title}>
              <motion.div className="relative rounded-2xl border border-border p-5 bg-card hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group overflow-hidden h-full" variants={pop} whileHover={{ y: -6, scale: 1.02 }}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Content */}
                <div className="relative z-10">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>

                {/* Sparkle Effect on Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </section>



      {/* PDF Analysis & Article Generation Section */}
      <section id="pdf-analysis" className="relative py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-cyan-500/5 to-background" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <FileText className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium text-cyan-500">AI-Powered Document Analysis</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Upload PDFs, Get Instant Analysis
              <span className="block bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent mt-2">
                Generate Research Articles in Minutes
              </span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              Upload your research PDFs and let AI extract insights, generate comprehensive analyses,
              and create publication-ready research articles. Export to Word, PDF, or PowerPoint.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left: Feature List */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {[
                { icon: FileText, title: "Multi-PDF Upload", desc: "Upload multiple PDFs at once. Create collections for organized research.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
                { icon: MessageSquare, title: "Chat with Documents", desc: "Ask questions about your PDFs. Get AI-powered answers with source citations.", color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: Microscope, title: "Comprehensive Analysis", desc: "Extract key findings, data tables, and clinical insights automatically.", color: "text-purple-500", bg: "bg-purple-500/10" },
                { icon: BookOpenText, title: "Article Generation", desc: "Generate IMRaD-style research articles with proper citations and references.", color: "text-indigo-500", bg: "bg-indigo-500/10" },
                { icon: RefreshCw, title: "Interactive Refinement", desc: "Chat with AI to refine and improve your analysis or article content.", color: "text-pink-500", bg: "bg-pink-500/10", badge: "NEW" },
              ].map(({ icon: Icon, title, desc, color, bg, badge }) => (
                <motion.div
                  key={title}
                  className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group"
                  whileHover={{ x: 8 }}
                >
                  <div className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold group-hover:text-primary transition-colors">{title}</h4>
                      {badge && <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-500 text-[10px] font-bold">{badge}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right: Export Options Showcase */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 text-center">Export Your Work</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: FileText, label: "PDF", desc: "Publication ready", gradient: "from-red-500 to-rose-500" },
                    { icon: BookOpen, label: "Word", desc: "Editable DOCX", gradient: "from-blue-500 to-indigo-500" },
                    { icon: Presentation, label: "PowerPoint", desc: "Slide decks", gradient: "from-orange-500 to-amber-500" },
                  ].map(({ icon: Icon, label, desc, gradient }) => (
                    <motion.div
                      key={label}
                      className="text-center p-4 rounded-xl border border-border bg-background hover:border-primary/50 transition-all cursor-pointer group"
                      whileHover={{ y: -4, scale: 1.05 }}
                    >
                      <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h4 className="font-semibold">{label}</h4>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" />Secure processing</div>
                    <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" />Instant export</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link href="/pdf-chat/dashboard">
              <motion.button
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Try PDF Analysis
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How it works (3 steps) */}
      <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">How it works</h2>
        <motion.div className="mt-8 grid md:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          {[
            { step: 1, title: "Describe your goal", desc: "Tell MedQ AI your topic or paste a paper link." },
            { step: 2, title: "Review with sources", desc: "Deep research pulls PubMed/arXiv citations you can trust." },
            { step: 3, title: "Export instantly", desc: "Generate slides, DOCX or PDF with medical themes." },
          ].map((s) => (
            <motion.div key={s.step} className="rounded-xl border border-border p-6 bg-card/60" variants={pop} whileHover={{ y: -4 }}>
              <div className="text-xs text-muted-foreground">Step {s.step}</div>
              <h3 className="mt-1 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className="mt-8 flex flex-wrap justify-center items-start gap-x-3 gap-y-3" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <motion.span className="w-full sm:w-auto inline-block" variants={pop} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/presentation" className="block px-5 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium">Create slides</Link>
          </motion.span>
          <motion.span className="w-full sm:w-auto inline-block" variants={pop} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/research-paper" className="block px-5 py-3 rounded-md border border-border hover:bg-accent text-sm font-medium">Write article</Link>
          </motion.span>
          <motion.span className="w-full sm:w-auto inline-block" variants={pop} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/editor" className="block px-5 py-3 rounded-md border border-border hover:bg-accent text-sm font-medium">Open AI editor</Link>
          </motion.span>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 grid place-items-center">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">MedQ AI</span>
            </div>
            <p className="mt-3 text-muted-foreground">AI for Medical students and professionals: slides, deep research, articles with AI citations, paraphrasing, autocomplete, and manuscript review.</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Company</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link href="/settings" className="hover:text-primary">Settings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Get started</h4>
            <p className="text-muted-foreground mb-3">Create your first medical presentation in minutes.</p>
            <Link href="/presentation" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Generate slides</Link>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MedQ AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
