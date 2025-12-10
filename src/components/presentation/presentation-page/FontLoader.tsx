"use client";

import { type ThemeProperties } from "@/lib/presentation/themes";
import { useEffect } from "react";

// Component to load fonts for custom themes
export function CustomThemeFontLoader({
  themeData,
}: {
  themeData: ThemeProperties;
}) {
  const fonts = [themeData.fonts.heading, themeData.fonts.body];

  useEffect(() => {
    // Load fonts dynamically using Google Fonts API
    const uniqueFonts = [...new Set(fonts)];
    
    uniqueFonts.forEach((fontFamily) => {
      // Check if font is already loaded
      const fontId = `font-${fontFamily.replace(/\s+/g, "-")}`;
      if (document.getElementById(fontId)) {
        return; // Already loaded
      }

      // Create link element for Google Fonts
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    });
  }, [fonts]);

  return null;
}
