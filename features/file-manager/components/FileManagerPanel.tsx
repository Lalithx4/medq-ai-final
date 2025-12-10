"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FolderOpen,
  Star,
  Sparkles,
  RefreshCw,
  Plus,
  X,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUploader } from "./FileUploader";
import { FilePreview } from "./FilePreview";
import { UserFile } from "../types";
import { formatFileSize, getRelativeTime, getFileColor, truncateFilename } from "../lib/file-utils";

interface FileManagerPanelProps {
  onFileSelect?: (file: UserFile) => void;
  onFileInsert?: (file: UserFile) => void;
  className?: string;
}

export function FileManagerPanel({
  onFileSelect,
  onFileInsert,
  className = "",
}: FileManagerPanelProps) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [previewFile, setPreviewFile] = useState<UserFile | null>(null);
  const [activeSection, setActiveSection] = useState<"uploaded" | "generated">("uploaded");
  const [uploadedExpanded, setUploadedExpanded] = useState(true);
  const [generatedExpanded, setGeneratedExpanded] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/file-manager/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFiles();
    setIsRefreshing(false);
  };

  const handleDelete = async (file: UserFile) => {
    if (!confirm(`Delete "${file.filename}"?`)) return;
    
    try {
      const response = await fetch(`/api/file-manager/files?id=${file.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setFiles(files.filter((f) => f.id !== file.id));
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const uploadedFiles = files.filter((f) => !f.isGenerated);
  const generatedFiles = files.filter((f) => f.isGenerated);

  const getFileIcon = (fileType: string) => {
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const FileItem = ({ file }: { file: UserFile }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
      onClick={() => onFileSelect?.(file)}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${getFileColor(file.fileType)}15`,
          color: getFileColor(file.fileType),
        }}
      >
        {getFileIcon(file.fileType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.filename}>
          {truncateFilename(file.filename, 20)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.fileSize)} • {getRelativeTime(file.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewFile(file);
          }}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onFileInsert?.(file);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(file);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">My Files</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? <X className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Uploader */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
          >
            <div className="p-3">
              <FileUploader
                onUploadComplete={() => {
                  fetchFiles();
                  setShowUploader(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No files yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowUploader(true)}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>
          ) : (
            <>
              {/* Uploaded Files Section */}
              <div className="mb-4">
                <button
                  className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setUploadedExpanded(!uploadedExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Uploaded ({uploadedFiles.length})</span>
                  </div>
                  {uploadedExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <AnimatePresence>
                  {uploadedExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {uploadedFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-2">
                          No uploaded files
                        </p>
                      ) : (
                        uploadedFiles.map((file) => (
                          <FileItem key={file.id} file={file} />
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generated Files Section */}
              <div>
                <button
                  className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setGeneratedExpanded(!generatedExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>AI Generated ({generatedFiles.length})</span>
                  </div>
                  {generatedExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <AnimatePresence>
                  {generatedExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {generatedFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-2">
                          No AI-generated content yet
                        </p>
                      ) : (
                        generatedFiles.map((file) => (
                          <FileItem key={file.id} file={file} />
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* File preview */}
      <FilePreview
        file={previewFile}
        files={files}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={(file) => {
          handleDelete(file);
          setPreviewFile(null);
        }}
      />
    </div>
  );
}
