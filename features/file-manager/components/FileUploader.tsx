"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  File,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFileManagerStore } from "../stores/file-store";
import {
  formatFileSize,
  validateFile,
  getFileColor,
} from "../lib/file-utils";
import { FileType } from "../types";

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

interface FileUploaderProps {
  onUploadComplete?: () => void;
  maxFiles?: number;
  allowedTypes?: string[];
  maxSize?: number;
  collectionId?: string;
}

export function FileUploader({
  onUploadComplete,
  maxFiles = 10,
  allowedTypes,
  maxSize = 50 * 1024 * 1024, // 50MB default
  collectionId,
}: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, setIsUploading } = useFileManagerStore();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles);
      const newItems: FileUploadItem[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file, { maxSize, acceptedTypes: allowedTypes });

        if (!validation.valid) {
          newItems.push({
            id: crypto.randomUUID(),
            file,
            progress: 0,
            status: "error",
            error: validation.error,
          });
        } else {
          newItems.push({
            id: crypto.randomUUID(),
            file,
            progress: 0,
            status: "pending",
          });
        }
      }

      setUploadQueue((prev) => [...prev, ...newItems]);
      await uploadFiles(newItems.filter((item) => item.status !== "error"));
    },
    [maxFiles, maxSize, allowedTypes]
  );

  const uploadFiles = async (items: FileUploadItem[]) => {
    setIsUploading(true);

    for (const item of items) {
      try {
        // Update status to uploading
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "uploading" } : i
          )
        );

        // Simulate upload progress
        for (let progress = 0; progress <= 90; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          setUploadQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
          );
        }

        // Create FormData
        const formData = new FormData();
        formData.append("file", item.file);
        if (collectionId) {
          formData.append("collectionId", collectionId);
        }

        // Upload to API
        const response = await fetch("/api/file-manager/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        // Update status to processing (AI tagging)
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "processing", progress: 95 } : i
          )
        );

        // Brief delay to show processing state
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Complete
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "complete", progress: 100 }
              : i
          )
        );
      } catch (error) {
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : i
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5" />;
    }
    if (file.type === "application/pdf") {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const getFileExtension = (filename: string): FileType => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    // Map common extensions to FileType
    const typeMap: Record<string, FileType> = {
      'pdf': 'pdf', 'doc': 'doc', 'docx': 'docx', 'txt': 'txt', 'md': 'md',
      'csv': 'csv', 'xlsx': 'xlsx', 'xls': 'xlsx', 'pptx': 'pptx', 'ppt': 'pptx',
      'png': 'png', 'jpg': 'jpg', 'jpeg': 'jpeg', 'gif': 'gif', 'webp': 'webp'
    };
    return typeMap[ext] || 'other';
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        animate={{
          scale: isDragActive ? 1.02 : 1,
          borderColor: isDragActive ? "hsl(var(--primary))" : "hsl(var(--border))",
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-8 cursor-pointer
          transition-colors duration-200
          ${isDragActive ? "bg-primary/5 border-primary" : "hover:bg-muted/50 hover:border-primary/50"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes?.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{
              y: isDragActive ? -5 : 0,
              scale: isDragActive ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              w-16 h-16 rounded-xl flex items-center justify-center
              ${isDragActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
            `}
          >
            <Upload className="w-8 h-8" />
          </motion.div>

          <div className="text-center">
            <p className="font-medium text-foreground">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-muted">PDF</span>
            <span className="px-2 py-1 rounded bg-muted">DOCX</span>
            <span className="px-2 py-1 rounded bg-muted">Images</span>
            <span className="px-2 py-1 rounded bg-muted">Up to {formatFileSize(maxSize)}</span>
          </div>
        </div>

        {/* Animated particles when dragging */}
        <AnimatePresence>
          {isDragActive && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0.5],
                    x: Math.cos((i * Math.PI) / 3) * 100,
                    y: Math.sin((i * Math.PI) / 3) * 100,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Upload queue */}
      <AnimatePresence mode="popLayout">
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadQueue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                layout
                className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${item.status === "error" ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}
                `}
              >
                {/* File icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${getFileColor(getFileExtension(item.file.name))}15`,
                    color: getFileColor(getFileExtension(item.file.name)),
                  }}
                >
                  {getFileIcon(item.file)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(item.file.size)}</span>
                    {item.status === "processing" && (
                      <span className="flex items-center gap-1 text-primary">
                        <Sparkles className="w-3 h-3" />
                        AI processing...
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-destructive">{item.error}</span>
                    )}
                  </div>
                  {(item.status === "uploading" || item.status === "processing") && (
                    <Progress value={item.progress} className="mt-2 h-1" />
                  )}
                </div>

                {/* Status icon */}
                <div className="flex items-center gap-2">
                  {item.status === "uploading" && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  {item.status === "processing" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-primary" />
                    </motion.div>
                  )}
                  {item.status === "complete" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </motion.div>
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
