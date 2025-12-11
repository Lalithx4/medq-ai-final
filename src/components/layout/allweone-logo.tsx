import { cn } from "@/lib/utils";
import Image from "next/image";
import type React from "react";

export default function AllweoneText(
  props: React.ButtonHTMLAttributes<HTMLDivElement> & { className?: string },
) {
  return (
    <div className={cn("h-10 w-auto relative", props.className)} {...props}>
      <Image
        src="/logocel.jpg"
        alt="Logo"
        width={120}
        height={40}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  );
}
