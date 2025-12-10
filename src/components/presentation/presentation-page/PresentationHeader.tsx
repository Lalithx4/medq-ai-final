"use client";
import { usePresentationState } from "@/states/presentation-state";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Import our new components
import AllweoneText from "@/components/globals/allweone-logo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { themes, type Themes } from "@/lib/presentation/themes";
import * as motion from "framer-motion/client";
import { Palette } from "lucide-react";
import { AgentButton } from "../editor/agent/AgentButton";
import { ExportButton } from "./buttons/ExportButton";
import { ManualSaveButton } from "./buttons/ManualSaveButton";
import { PresentButton } from "./buttons/PresentButton";
import { SaveStatus } from "./buttons/SaveStatus";
import { ShareButton } from "./buttons/ShareButton";

interface PresentationHeaderProps {
  title?: string;
}

export default function PresentationHeader({ title }: PresentationHeaderProps) {
  const currentPresentationTitle = usePresentationState(
    (s) => s.currentPresentationTitle,
  );
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const currentPresentationId = usePresentationState(
    (s) => s.currentPresentationId,
  );
  const theme = usePresentationState((s) => s.theme);
  const setTheme = usePresentationState((s) => s.setTheme);
  const [presentationTitle, setPresentationTitle] =
    useState<string>("Presentation");
  const pathname = usePathname();
  // Check if we're on the generate/outline page
  const isPresentationPage =
    pathname.startsWith("/presentation/") && !pathname.includes("generate");

  // Update title when it changes in the state
  useEffect(() => {
    if (currentPresentationTitle) {
      setPresentationTitle(currentPresentationTitle);
    } else if (title) {
      setPresentationTitle(title);
    }
  }, [currentPresentationTitle, title]);

  if (pathname === "/presentation/create")
    return (
      <header className="flex h-12 max-w-[100vw]  items-center justify-between overflow-clip border-accent px-2 py-2">
        <div className="flex items-center gap-2">
          {/* This component is suppose to be logo but for now its is actually hamburger menu */}


          <motion.div
            initial={false}
            layout="position"
            transition={{ duration: 1 }}
          >
            <Link href="/" className="h-max">
              <AllweoneText className="h-10 w-[7.5rem] cursor-pointer transition-transform duration-100 active:scale-95"></AllweoneText>
            </Link>
          </motion.div>
        </div>

        {/* Account dropdown removed - now in sidebar */}
      </header>
    );

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-accent bg-background px-4">
      {/* Left section with breadcrumb navigation */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{presentationTitle}</span>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center gap-2">
        {/* Manual save button */}
        {isPresentationPage && !isPresenting && <ManualSaveButton />}

        {/* Theme selector dropdown */}
        {isPresentationPage && !isPresenting && (
          <Select
            value={theme as string}
            onValueChange={(value) => setTheme(value as Themes)}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(themes).map(([key, themeOption]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[
                        themeOption.colors.light.primary,
                        themeOption.colors.light.accent,
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 rounded-full ring-1 ring-inset ring-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>{themeOption.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* AI Agent button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && <AgentButton />}

        {/* Export button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && (
          <ExportButton presentationId={currentPresentationId ?? ""} />
        )}

        {/* Share button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <ShareButton />}

        {/* Present button - Only in presentation page, not outline */}
        {isPresentationPage && <PresentButton />}

        {/* User profile moved to sidebar */}
      </div>
    </header>
  );
}
