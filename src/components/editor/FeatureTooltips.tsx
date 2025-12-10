"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface TooltipProps {
  show: boolean;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function FeatureTooltip({ show, message, position = "bottom" }: TooltipProps) {
  if (!show) return null;

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}
      >
        <div className="relative">
          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {message}
          </div>
          {/* Arrow */}
          <div
            className={`absolute ${
              position === "bottom"
                ? "bottom-full left-1/2 -translate-x-1/2 border-b-primary border-b-8 border-x-transparent border-x-8 border-t-0"
                : position === "top"
                ? "top-full left-1/2 -translate-x-1/2 border-t-primary border-t-8 border-x-transparent border-x-8 border-b-0"
                : ""
            }`}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Pulsing badge for new features
export function NewFeatureBadge() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        ✨
      </motion.div>
    </motion.div>
  );
}

// Feature announcement banner
export function FeatureAnnouncementBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("feature-banner-dismissed");
    if (!dismissed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("feature-banner-dismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-primary/20 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              ✨ New AI Features Available!
            </p>
            <p className="text-xs text-muted-foreground">
              AI Autocomplete, Citation Manager, and Paraphraser are now live
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition whitespace-nowrap"
        >
          Got it!
        </button>
      </div>
    </motion.div>
  );
}
