"use client";

import { cn } from "@/lib/utils";
import { PlateElement, withRef } from "platejs/react";
import React from "react";

export interface PresentationParagraphElementProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const PresentationParagraphElement = withRef<
  typeof PlateElement,
  PresentationParagraphElementProps
>(({ className, children, ...props }, ref) => {
  return (
    <PlateElement
      ref={ref}
      as="div"
      className={cn(
        "presentation-paragraph presentation-text m-0 px-0 py-2 text-base leading-relaxed",
        className,
      )}
      {...props}
    >
      {children}
    </PlateElement>
  );
});

PresentationParagraphElement.displayName = "PresentationParagraphElement";
