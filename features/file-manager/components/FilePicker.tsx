"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Check,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserFile } from "../types";
import { formatFileSize, getFileColor, truncateFilename } from "../lib/file-utils";

interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: UserFile) => void;
  title?: string;
  multiple?: boolean;
  fileTypes?: string[];
}

export function FilePicker({
  isOpen,
  onClose,
  onSelect,
  title = "Select a file",
  multiple = false,
  fileTypes,
}: FilePickerProps) {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "uploaded" | "generated">("all");

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

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

  const filteredFiles = files.filter((file) => {
    // Filter by tab
    if (activeTab === "uploaded" && file.isGenerated) return false;
    if (activeTab === "generated" && !file.isGenerated) return false;

    // Filter by file type
    if (fileTypes && fileTypes.length > 0) {
      if (!fileTypes.includes(file.fileType)) return false;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        file.filename.toLowerCase().includes(query) ||
        file.originalName.toLowerCase().includes(query) ||
        file.tags?.some((tag) => tag.tagName.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const handleFileClick = (file: UserFile) => {
    if (multiple) {
      if (selectedFiles.includes(file.id)) {
        setSelectedFiles(selectedFiles.filter((id) => id !== file.id));
      } else {
        setSelectedFiles([...selectedFiles, file.id]);
      }
    } else {
      onSelect(file);
      onClose();
    }
  };

  const handleConfirm = () => {
    const selected = files.filter((f) => selectedFiles.includes(f.id));
    selected.forEach(onSelect);
    onClose();
  };

  const getFileIcon = (fileType: string) => {
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType)) {
      return <ImageIcon className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-2xl bg-background rounded-2xl shadow-xl flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">{title}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="uploaded">Uploaded</TabsTrigger>
                  <TabsTrigger value="generated" className="gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generated
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="flex-1 overflow-y-auto p-4 m-0">
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-lg bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No files found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredFiles.map((file) => (
                      <motion.button
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => handleFileClick(file)}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                          ${selectedFiles.includes(file.id) 
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50 hover:bg-accent"}
                        `}
                      >
                        {/* Thumbnail / Icon */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${getFileColor(file.fileType)}15`,
                            color: getFileColor(file.fileType),
                          }}
                        >
                          {getFileIcon(file.fileType)}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {truncateFilename(file.filename, 30)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.fileType.toUpperCase()}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.fileSize)}</span>
                            {file.isGenerated && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 text-primary">
                                  <Sparkles className="w-3 h-3" />
                                  AI
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Selection indicator */}
                        {multiple && selectedFiles.includes(file.id) && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer */}
            {multiple && (
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length} file(s) selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={selectedFiles.length === 0}
                  >
                    Insert Files
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
