import type { ThemeName } from "@/lib/presentation/themes";

export type SimpleTemplate = {
  id: string;
  name: string;
  description: string;
  themeKey: ThemeName; // maps to themes.ts keys already supported by state
  thumbnail?: string; // optional public path e.g. /templates/minimal.jpg
  initialSlides?: ("title" | "bullets" | "imageLeft")[]; // MVP presets
  previewImages?: string[]; // show first 3 previews below picker
};

export const TEMPLATES: SimpleTemplate[] = [
  {
    id: "minimal-orbit",
    name: "Minimal",
    description: "Clean, modern slides with balanced spacing.",
    themeKey: "orbit",
    thumbnail: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    initialSlides: ["title", "bullets"],
    previewImages: [
      "https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "corporate-daktilo",
    name: "Corporate",
    description: "Professional look suitable for business decks.",
    themeKey: "daktilo",
    thumbnail: "https://images.unsplash.com/photo-1581092921461-eab62e97a971?q=80&w=1200&auto=format&fit=crop",
    initialSlides: ["title", "imageLeft", "bullets"],
    previewImages: [
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581093588401-16ec8a5a4d9b?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "academic-forest",
    name: "Academic",
    description: "Readable typography and subtle accent colors.",
    themeKey: "forest",
    thumbnail: "https://images.unsplash.com/photo-1584983238608-1a6fac11a5b3?q=80&w=1200&auto=format&fit=crop",
    initialSlides: ["title", "bullets"],
    previewImages: [
      "https://images.unsplash.com/photo-1580281657527-47d5c0c2f6b9?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584982757243-3f12e3f5ed4a?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719478442-cd511b1c1b39?q=80&w=1200&auto=format&fit=crop",
    ],
  },
];

export function getTemplateById(id?: string | null) {
  if (!id) return undefined;
  return TEMPLATES.find((t) => t.id === id);
}
