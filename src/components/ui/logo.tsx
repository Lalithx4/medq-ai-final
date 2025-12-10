import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  className?: string;
  variant?: "default" | "icon-only";
}

export function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "icon-only") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Image
          src="/logocel.jpg"
          alt="Logo"
          width={32}
          height={32}
          className="rounded-md object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logocel.jpg"
        alt="Logo"
        width={120}
        height={40}
        className="h-10 w-auto object-contain"
      />
    </div>
  );
}
