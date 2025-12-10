import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.biodocs.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/editor/",
          "/files/",
          "/auth/callback",
          "/_next/",
          "/private/",
        ],
      },
      // Allow AI crawlers specifically
      {
        userAgent: "GPTBot",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
      {
        userAgent: "Anthropic-AI",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
      {
        userAgent: "CCBot",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard/", "/auth/callback"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
