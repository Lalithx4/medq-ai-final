"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from "next-themes";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-primary">
        <span>Change Theme</span>
        <div className="flex items-center">
          <Sun className="h-4 w-4" />
          <Switch checked={false} className="ml-2" disabled />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-primary hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onClick={toggleTheme}
    >
      <span>Change Theme</span>
      <div className="flex items-center">
        <Sun className="h-4 w-4 rotate-0 transition-all dark:hidden" />
        <Moon className="hidden h-4 w-4 rotate-0 transition-all dark:block" />
        <Switch
          checked={theme === "dark"}
          onCheckedChange={toggleTheme}
          className="ml-2"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </div>
  );
}
