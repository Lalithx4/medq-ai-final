"use client";

import { FileText, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/research-paper",
      icon: FileText,
      label: "Research Paper",
      description: "Academic papers",
    },
    {
      href: "/deep-research",
      icon: Search,
      label: "Deep Research",
      description: "Comprehensive research",
    },
  ];

  const isActive = (path: string) => {
    return pathname?.startsWith(path);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all relative group",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      active
                        ? "bg-primary/20 scale-110"
                        : "bg-accent group-hover:bg-accent/80"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-all",
                        active ? "text-primary" : "text-foreground"
                      )}
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="relative text-center">
                  <span
                    className={cn(
                      "text-xs font-medium transition-all",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
