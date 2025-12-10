"use client";

import { SmartFileManager } from "@/features/file-manager/components";
import { AppLayout } from "@/components/home/AppLayout";
import { UserFile } from "@/features/file-manager/types";
import { useRouter } from "next/navigation";

export default function FilesPage() {
  const router = useRouter();

  const handleFileSelect = (file: UserFile) => {
    console.log("Selected file:", file);
    
    // Route legacy files to their appropriate editors based on sourceFeature
    const feature = file.sourceFeature as string;
    if (feature) {
      switch (feature) {
        case "personal-statement":
          router.push(`/personal-statement?fileId=${file.id}`);
          return;
        case "research-paper":
        case "deep-research":
          router.push(`/editor?fileId=${file.id}`);
          return;
        default:
          router.push(`/editor?fileId=${file.id}`);
          return;
      }
    }
    
    // For new files with fileUrl, open in editor
    if (file.fileUrl) {
      router.push(`/editor?fileId=${file.id}`);
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] overflow-hidden">
        <SmartFileManager
          className="h-full"
          onFileSelect={handleFileSelect}
        />
      </div>
    </AppLayout>
  );
}
