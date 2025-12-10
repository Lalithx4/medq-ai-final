import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.biodocs.ai";
  const lastModified = new Date();

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  // Feature pages (public marketing pages)
  const featurePages = [
    "presentation-builder",
    "deep-research",
    "editor",
    "citation-generator",
    "paraphraser",
    "manuscript-review",
    "literature-review",
    "personal-statement",
    "poster-builder",
    "irb-builder",
    "pdf-chat",
    "video-streaming",
  ].map((feature) => ({

    url: `${baseUrl}/${feature}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...featurePages];
}
