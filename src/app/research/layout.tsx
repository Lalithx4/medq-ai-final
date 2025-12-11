import { AppLayout } from "@/components/features/home/AppLayout";
import type React from "react";

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <div className="flex h-full w-full flex-col bg-white pb-16 md:pb-0">
        <main className="relative flex flex-1 overflow-hidden">
          <div className="h-full flex-1 place-items-center overflow-y-auto overflow-x-clip">
            {children}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
