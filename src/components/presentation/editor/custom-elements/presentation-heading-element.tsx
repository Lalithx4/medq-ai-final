"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type PlateElementProps } from "platejs/react";
import { PresentationElement } from "./presentation-element";

const headingVariants = cva("relative", {
  variants: {
    variant: {
      h1: "mb-6 text-5xl font-extrabold tracking-tight leading-tight",
      h2: "mb-4 text-3xl font-bold tracking-tight leading-snug",
      h3: "mb-2 text-xl font-bold tracking-tight leading-snug",
      h4: "mb-2 text-lg font-semibold tracking-tight",
      h5: "mb-1 text-base font-semibold tracking-tight",
      h6: "mb-1 text-sm font-semibold tracking-tight",
    },
  },
});

export const PresentationHeadingElement = ({
  children,
  variant,
  ref,
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) => {
  return (
    <PresentationElement
      ref={ref}
      className={cn("presentation-heading", headingVariants({ variant }))}
      {...props}
    >
      {children}
    </PresentationElement>
  );
};

export function H1Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h1" {...props} />;
}

export function H2Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h2" {...props} />;
}

export function H3Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h3" {...props} />;
}

export function H4Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h4" {...props} />;
}

export function H5Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h5" {...props} />;
}

export function H6Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h6" {...props} />;
}
