"use client";

import { cn } from "@/lib/utils";
import { PlateElement, withRef } from "platejs/react";

// Main bullets component with withRef pattern
export const BulletsElement = withRef<typeof PlateElement>(
  ({ element, children, className, ...props }, ref) => {
    const items = element.children;

    // Determine number of columns based on item count - prefer single column for text-heavy content
    const getColumnClass = () => {
      const count = items.length;
      if (count <= 2) return "grid-cols-1"; // Single column for better readability
      if (count <= 4) return "grid-cols-2"; // Two columns for 3-4 items
      return "grid-cols-2"; // Max 2 columns for text-heavy slides
    };

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("my-4", className)} // Reduced from my-6 to my-4
        {...props}
      >
        {/* Grid layout with adaptive columns - optimized for text content */}
        <div className={cn("grid gap-4", getColumnClass())}>{children}</div> {/* Reduced from gap-8 to gap-4 */}
      </PlateElement>
    );
  },
);
