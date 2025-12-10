import TanStackQueryProvider from "@/providers/TanstackProvider";
import AuthProvider from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/theme-provider";
import { CreditsProvider } from "@/contexts/CreditsContext";
import "@/styles/globals.css";
import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { EnvRuntimeProvider } from "@/components/system/EnvRuntimeProvider";

// Ensure this layout is rendered dynamically on each request so runtime env vars are available
export const dynamic = "force-dynamic";
// Ensure Node runtime (not edge) to access process.env reliably on Railway
export const runtime = "nodejs";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "BioDocs.ai - AI-Powered Biomedical Research Platform",
    template: "%s | BioDocs.ai",
  },
  description: "Transform your biomedical research with AI. Generate presentations, write research papers, find citations from 280M+ sources, and collaborate with HIPAA-ready video meetings. Built for medical professionals, researchers, and students.",
  keywords: [
    "biomedical AI",
    "medical research",
    "AI research assistant",
    "medical presentations",
    "research paper writer",
    "citation generator",
    "PubMed search",
    "medical AI tools",
    "healthcare AI",
    "academic writing",
    "literature review",
    "HIPAA video conferencing",
  ],
  authors: [{ name: "BioDocs.ai" }],
  creator: "BioDocs.ai",
  publisher: "BioDocs.ai",
  metadataBase: new URL("https://www.biodocs.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.biodocs.ai",
    siteName: "BioDocs.ai",
    title: "BioDocs.ai - AI-Powered Biomedical Research Platform",
    description: "Transform your biomedical research with AI. Generate presentations, write research papers, find citations, and collaborate securely.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BioDocs.ai - AI-Powered Biomedical Research",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BioDocs.ai - AI-Powered Biomedical Research Platform",
    description: "Transform your biomedical research with AI. Generate presentations, write research papers, and find citations.",
    images: ["/og-image.png"],
    creator: "@biodocsai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Prepare runtime env for client. These come from the server (Railway) at request time.
  const publicEnv = {
    // Use NEXT_PUBLIC_* if present at build, otherwise fall back to server vars at runtime injection
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  } as const;

  return (
    <TanStackQueryProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" href="/logo-icon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
        </head>
        <body className={`${inter.className} antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <CreditsProvider>
                {children}
              </CreditsProvider>
            </AuthProvider>
          </ThemeProvider>
          {/* Ensure runtime env bootstrap on client */}
          <EnvRuntimeProvider />
          {/* Inject runtime public env for client-side code */}
          <script
            id="__env"
            dangerouslySetInnerHTML={{
              __html: `window.__ENV=${JSON.stringify(publicEnv)};`,
            }}
          />
          {/* Debug: log which public env keys are available (masked) */}
          <script
            id="__env_debug"
            dangerouslySetInnerHTML={{
              __html: `try{(function(){const e=window.__ENV||{};const maskedKey=(e.NEXT_PUBLIC_SUPABASE_ANON_KEY||"");const safeKey=maskedKey?maskedKey.slice(0,6)+"…len="+maskedKey.length: "MISSING";console.log("[ENV DEBUG] window.__ENV keys:",Object.keys(e));console.log("[ENV DEBUG] URL:", e.NEXT_PUBLIC_SUPABASE_URL?"SET":"MISSING", " ANON_KEY:", safeKey)}())}catch(_){}`,
            }}
          />
        </body>
      </html>
    </TanStackQueryProvider>
  );
}
