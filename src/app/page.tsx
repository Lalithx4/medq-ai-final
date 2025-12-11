import LandingPage from "@/components/features/marketing/LandingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://www.biodocs.ai",
  },
};

// JSON-LD structured data for rich search results
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.biodocs.ai/#website",
      url: "https://www.biodocs.ai",
      name: "BioDocs.ai",
      description: "AI-Powered Biomedical Research Platform",
      publisher: {
        "@id": "https://www.biodocs.ai/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.biodocs.ai/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://www.biodocs.ai/#organization",
      name: "BioDocs.ai",
      url: "https://www.biodocs.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://www.biodocs.ai/logo.svg",
      },
      sameAs: [
        "https://twitter.com/biodocsai",
        "https://linkedin.com/company/biodocsai",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@biodocs.ai",
        contactType: "customer support",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.biodocs.ai/#application",
      name: "BioDocs.ai",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier available",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "150",
      },
      featureList: [
        "AI Research Assistant",
        "Presentation Builder",
        "Research Paper Writer",
        "Citation Generator with 280M+ sources",
        "AI Document Editor",
        "Literature Review",
        "Manuscript Review",
        "HIPAA-ready Video Meetings",
        "Study Groups & Collaboration",
        "PDF Analysis & Article Generation",
        "Live Streaming for Groups",
        "Export to Word, PDF, PowerPoint",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is BioDocs.ai?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BioDocs.ai is an AI-powered platform for biomedical researchers, healthcare professionals, and students. It provides tools for creating presentations, writing research papers, generating citations, and conducting literature reviews.",
          },
        },
        {
          "@type": "Question",
          name: "Is BioDocs.ai HIPAA compliant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, BioDocs.ai provides HIPAA-ready infrastructure for healthcare data, including secure video conferencing for telemedicine and medical consultations.",
          },
        },
        {
          "@type": "Question",
          name: "How many citation sources does BioDocs.ai have?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BioDocs.ai provides access to over 280 million academic sources including PubMed, arXiv, and major scientific journals for citation generation.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
