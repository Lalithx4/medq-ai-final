import { AppLayout } from "@/components/home/AppLayout";
import { PresentationGenerationManager } from "@/components/presentation/dashboard/PresentationGenerationManager";
import PresentationHeader from "@/components/presentation/presentation-page/PresentationHeader";
import type React from "react";

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <PresentationGenerationManager />
      <div className="flex h-full w-full flex-col bg-white pb-16 md:pb-0">
        <PresentationHeader />
        <main className="relative flex flex-1 overflow-hidden">
          <div className="sheet-container h-full flex-1 place-items-center overflow-y-auto overflow-x-clip">
            {children}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
