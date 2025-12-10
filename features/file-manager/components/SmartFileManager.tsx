"use client";

import { useState, useEffect, useCallback } from "react";
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
  Users,
  Share2,
  Link,
  ExternalLink,
  HardDrive,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { FileUploader } from "./FileUploader";
import { FileGallery } from "./FileGallery";
import { FilePreview } from "./FilePreview";
import { FileSearch } from "./FileSearch";
import { CollectionManager } from "./CollectionManager";
import { ShareCollectionModal } from "./ShareCollectionModal";
import { CollectionPresence } from "./CollectionPresence";
import { UserFile, FileCollection } from "../types";

interface SmartFileManagerProps {
  className?: string;
  onFileSelect?: (file: UserFile) => void;
  onFileInsert?: (file: UserFile) => void;
  showUploader?: boolean;
  compact?: boolean;
}

export function SmartFileManager({
  className = "",
  onFileSelect,
  onFileInsert,
  showUploader = true,
  compact = false,
}: SmartFileManagerProps) {
  const [activeTab, setActiveTab] = useState<"collections" | "generated">("collections");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<UserFile | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<FileCollection | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Local state for files and collections
  const [files, setFiles] = useState<UserFile[]>([]);
  const [legacyFiles, setLegacyFiles] = useState<UserFile[]>([]); // Files from old /api/files/list
  const [sharedCollectionFiles, setSharedCollectionFiles] = useState<UserFile[]>([]);
  const [collections, setCollections] = useState<FileCollection[]>([]);
  const [sharedCollections, setSharedCollections] = useState<FileCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSharedFiles, setIsLoadingSharedFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [collectionToShare, setCollectionToShare] = useState<FileCollection | null>(null);

  // Join via link modal state
  const [joinLinkModalOpen, setJoinLinkModalOpen] = useState(false);
  const [joinLinkValue, setJoinLinkValue] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Create collection modal state
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#3b82f6");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [collectionNameError, setCollectionNameError] = useState<string | null>(null);

  // Predefined gradient colors for collections
  const collectionColors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f97316", // orange
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#f59e0b", // amber
    "#ef4444", // red
  ];

  // Check if selected collection is a shared one
  const isSharedCollectionSelected = selectedCollection && sharedCollections.some(c => c.id === selectedCollection.id);

  // Fetch files from new API (gracefully handle if tables don't exist)
  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/file-manager/files");
      if (!response.ok) {
        // New tables might not exist yet - this is OK
        console.log("New file manager tables not available yet");
        setFiles([]);
        return;
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.log("New file manager not available:", err);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch legacy files from old API (for AI Files tab)
  const fetchLegacyFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files/list");
      if (!response.ok) {
        console.log("Legacy files API error");
        setLegacyFiles([]);
        return;
      }
      const data = await response.json();
      // Transform legacy files to UserFile format
      const transformed: UserFile[] = (data.files || []).map((file: any) => ({
        id: file.id,
        userId: "",
        filename: file.title || "Untitled",
        originalName: file.title || "Untitled",
        fileUrl: "",
        fileType: file.type === "research-paper" ? "pdf" : "doc",
        fileSize: 0,
        status: "ready" as const,
        isFavorite: false,
        isGenerated: true, // All legacy files are AI-generated
        sourceFeature: file.type as any,
        createdAt: file.createdAt,
        updatedAt: file.createdAt,
      }));
      setLegacyFiles(transformed);
    } catch (err) {
      console.error("Failed to fetch legacy files:", err);
      setLegacyFiles([]);
    }
  }, []);

  // Fetch collections from API (gracefully handle if tables don't exist)
  const fetchCollections = useCallback(async () => {
    try {
      console.log("[SmartFileManager] Fetching collections...");
      const response = await fetch("/api/file-manager/collections");
      console.log("[SmartFileManager] Collections response status:", response.status);
      if (!response.ok) {
        // New tables might not exist yet - this is OK
        const errorText = await response.text();
        console.log("[SmartFileManager] Collections error:", errorText);
        setCollections([]);
        return;
      }
      const data = await response.json();
      console.log("[SmartFileManager] Collections data:", data);
      console.log("[SmartFileManager] Setting collections:", data.collections?.length || 0);
      setCollections(data.collections || []);
      console.log("[SmartFileManager] Collections set complete");
    } catch (err) {
      console.log("[SmartFileManager] Collections fetch error:", err);
      setCollections([]);
    }
  }, []);

  // Fetch shared collections (gracefully handle if tables don't exist)
  const fetchSharedCollections = useCallback(async () => {
    try {
      const response = await fetch("/api/file-manager/shared");
      if (!response.ok) {
        console.log("Shared collections not available yet");
        setSharedCollections([]);
        return;
      }
      const data = await response.json();
      setSharedCollections(data.collections || []);
    } catch (err) {
      console.log("Shared collections not available:", err);
      setSharedCollections([]);
    }
  }, []);

  // Fetch files from a shared collection
  const fetchSharedCollectionFiles = useCallback(async (collectionId: string) => {
    try {
      setIsLoadingSharedFiles(true);
      const response = await fetch(`/api/file-manager/shared/collection/${collectionId}/files`);
      if (!response.ok) throw new Error("Failed to fetch shared collection files");
      const data = await response.json();
      setSharedCollectionFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch shared collection files:", err);
      setSharedCollectionFiles([]);
    } finally {
      setIsLoadingSharedFiles(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFiles();
    fetchLegacyFiles(); // Fetch old files for AI Files tab
    fetchCollections();
    fetchSharedCollections();
  }, [fetchFiles, fetchLegacyFiles, fetchCollections, fetchSharedCollections]);

  // Fetch shared collection files when a shared collection is selected
  useEffect(() => {
    if (selectedCollection && sharedCollections.some(c => c.id === selectedCollection.id)) {
      fetchSharedCollectionFiles(selectedCollection.id);
    } else {
      setSharedCollectionFiles([]);
    }
  }, [selectedCollection, sharedCollections, fetchSharedCollectionFiles]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFiles(), fetchLegacyFiles(), fetchCollections(), fetchSharedCollections()]);
    // Also refresh shared collection files if one is selected
    if (selectedCollection && sharedCollections.some(c => c.id === selectedCollection.id)) {
      await fetchSharedCollectionFiles(selectedCollection.id);
    }
    setIsRefreshing(false);
  };

  // Combine new files with legacy files (legacy files are all AI-generated)
  const allFiles = [...files, ...legacyFiles];

  // Filter files based on tab and collection
  // Use shared collection files if a shared collection is selected
  const filteredFiles = (() => {
    // Collections tab shows collections list, unless a collection is selected
    if (activeTab === "collections" && !selectedCollection) {
      return [];
    }
    
    // If a shared collection is selected, use those files
    if (isSharedCollectionSelected) {
      return sharedCollectionFiles.filter((file) => {
        if (activeTab === "generated" && !file.isGenerated) return false;
        return true;
      });
    }
    
    // Otherwise, filter from user's own files (including legacy)
    const result = allFiles.filter((file) => {
      // Filter by tab
      if (activeTab === "generated" && !file.isGenerated) return false;

      // Filter by collection - check if file belongs to the selected collection
      if (selectedCollection) {
        // Check collections array (many-to-many relationship)
        const fileCollections = (file as any).collections || [];
        const belongsToCollection = fileCollections.some(
          (col: any) => col?.id === selectedCollection.id
        );
        // Also check direct collectionId for backward compatibility
        if (!belongsToCollection && file.collectionId !== selectedCollection.id) {
          return false;
        }
      }

      return true;
    });
    
    return result;
  })();

  // Stats (include legacy files)
  const stats = {
    total: allFiles.length,
    collections: collections.length,
    generated: allFiles.filter((f) => f.isGenerated).length,
    favorites: files.filter((f) => f.isFavorite).length,
  };

  // Calculate total storage used
  const totalStorageBytes = files.reduce((acc, file) => acc + (file.fileSize || 0), 0);
  const formatStorage = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Handle file open - legacy/AI files go to editor, uploaded files show preview
  const handleFileOpen = (file: UserFile) => {
    // If it's a legacy file (AI-generated with sourceFeature), navigate to editor
    if (file.isGenerated && file.sourceFeature && onFileSelect) {
      onFileSelect(file);
      return;
    }
    
    // For uploaded files or files with fileUrl, show preview
    if (file.fileUrl) {
      setPreviewFile(file);
      return;
    }
    
    // Fallback: if onFileSelect is provided, use it
    if (onFileSelect) {
      onFileSelect(file);
      return;
    }
    
    // Last resort: show preview
    setPreviewFile(file);
  };

  const handleFileDelete = async (file: UserFile) => {
    if (confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      try {
        const response = await fetch(`/api/file-manager/files?id=${file.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete file");
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete file");
      }
    }
  };

  const handleFileFavorite = async (file: UserFile) => {
    try {
      const response = await fetch(`/api/file-manager/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, isFavorite: !file.isFavorite }),
      });
      if (!response.ok) throw new Error("Failed to update file");
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, isFavorite: !f.isFavorite } : f
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update file");
    }
  };

  const handleCreateCollection = async (name: string, color: string) => {
    try {
      const response = await fetch("/api/file-manager/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!response.ok) throw new Error("Failed to create collection");
      await fetchCollections();
      toast.success(`Collection "${name}" created!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    }
  };

  // Check if collection name already exists
  const checkCollectionNameExists = (name: string) => {
    return collections.some(c => c.name.toLowerCase() === name.toLowerCase());
  };

  // Handle collection name input change
  const handleCollectionNameChange = (name: string) => {
    setNewCollectionName(name);
    if (name.trim() && checkCollectionNameExists(name.trim())) {
      setCollectionNameError(`A collection named "${name}" already exists. Please choose a different name.`);
    } else {
      setCollectionNameError(null);
    }
  };

  // Handle create collection from modal
  const handleCreateCollectionFromModal = async () => {
    if (!newCollectionName.trim()) {
      setCollectionNameError("Please enter a collection name");
      return;
    }
    if (checkCollectionNameExists(newCollectionName.trim())) {
      setCollectionNameError(`A collection named "${newCollectionName}" already exists. Please choose a different name.`);
      return;
    }
    
    setIsCreatingCollection(true);
    try {
      await handleCreateCollection(newCollectionName.trim(), newCollectionColor);
      setCreateCollectionModalOpen(false);
      setNewCollectionName("");
      setNewCollectionColor("#3b82f6");
      setCollectionNameError(null);
    } catch (err) {
      setCollectionNameError("Failed to create collection. Please try again.");
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleUpdateCollection = async (id: string, updates: Partial<FileCollection>) => {
    try {
      const response = await fetch("/api/file-manager/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!response.ok) throw new Error("Failed to update collection");
      await fetchCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update collection");
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (confirm("Are you sure you want to delete this collection? Files will not be deleted.")) {
      try {
        const response = await fetch(`/api/file-manager/collections?id=${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete collection");
        await fetchCollections();
        if (selectedCollection?.id === id) {
          setSelectedCollection(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete collection");
      }
    }
  };

  // State for add to collection dialog
  const [addToCollectionFile, setAddToCollectionFile] = useState<UserFile | null>(null);

  // Handle opening share modal
  const handleShareCollection = (collection: FileCollection) => {
    setCollectionToShare(collection);
    setShareModalOpen(true);
  };

  // Handle joining via share link
  const handleJoinViaLink = async () => {
    if (!joinLinkValue.trim()) return;
    
    setIsJoining(true);
    try {
      // Extract the share link ID from URL or use directly
      let shareLinkId = joinLinkValue.trim();
      
      // If user pasted full URL, extract the ID
      if (shareLinkId.includes("/shared/")) {
        const match = shareLinkId.match(/\/shared\/([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          shareLinkId = match[1];
        }
      }
      
      // Navigate to the shared page
      window.location.href = `/shared/${shareLinkId}`;
    } catch (err) {
      toast.error("Invalid share link");
    } finally {
      setIsJoining(false);
    }
  };

  const handleAddToCollection = async (file: UserFile) => {
    setAddToCollectionFile(file);
  };

  const handleConfirmAddToCollection = async (collectionId: string) => {
    if (!addToCollectionFile) return;
    
    try {
      const response = await fetch("/api/file-manager/collections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId,
          fileId: addToCollectionFile.id,
          action: "add"
        }),
      });
      if (!response.ok) throw new Error("Failed to add to collection");
      await Promise.all([fetchFiles(), fetchCollections()]);
      setAddToCollectionFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to collection");
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/40 dark:from-slate-950 dark:via-blue-950/20 dark:to-violet-950/30 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 gap-3 sm:gap-0 border-b border-white/20 dark:border-white/10 bg-gradient-to-r from-white/80 via-blue-50/50 to-violet-50/50 dark:from-slate-900/90 dark:via-blue-900/30 dark:to-violet-900/30 backdrop-blur-2xl sticky top-0 z-10 shadow-lg shadow-blue-500/5">
        <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/40 ring-2 ring-white/20 flex-shrink-0"
          >
            <FolderOpen className="w-5 h-5 sm:w-7 sm:h-7 text-white drop-shadow-md" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Smart File Manager</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                {stats.total}
              </span>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/10">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-500" />
                {stats.generated}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {stats.favorites}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10">
                <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                {formatStorage(totalStorageBytes)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {/* Collection Presence - Show who's online */}
          <CollectionPresence 
            collectionId={selectedCollection?.id || null} 
            className="mr-1 sm:mr-2 hidden sm:block"
          />
          {/* Join via Share Link - always visible, full button on mobile, icon-only on desktop (since sidebar has it) */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="rounded-xl h-9 sm:h-11 border-border/40 bg-background/60 hover:bg-accent hover:border-primary/30 transition-all duration-200 gap-2 md:hidden text-sm"
              onClick={() => setJoinLinkModalOpen(true)}
            >
              <Link className="w-4 h-4" />
              <span className="hidden xs:inline">Join</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11 border-border/40 bg-background/60 hover:bg-accent hover:border-primary/30 transition-all duration-200 hidden md:flex"
              onClick={() => setJoinLinkModalOpen(true)}
              title="Join via Share Link"
            >
              <Link className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11 border-border/40 bg-background/60 hover:bg-accent hover:border-primary/30 transition-all duration-200"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/30 bg-gradient-to-r from-background/60 via-muted/5 to-background/60 backdrop-blur-md">
        <FileSearch
          onFileSelect={(file) => {
            setPreviewFile(file);
          }}
        />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-background to-muted/5">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 sm:pb-3 border-b border-white/20 dark:border-white/10 bg-gradient-to-r from-white/60 via-blue-50/30 to-violet-50/30 dark:from-slate-900/60 dark:via-blue-900/20 dark:to-violet-900/20 backdrop-blur-md z-10">
              <TabsList className="grid w-full grid-cols-2 max-w-md h-10 sm:h-12 p-1 sm:p-1.5 bg-white/60 dark:bg-slate-800/60 rounded-lg sm:rounded-xl border border-white/40 dark:border-white/10 shadow-lg shadow-blue-500/5">
                <TabsTrigger 
                  value="collections" 
                  className="gap-1 sm:gap-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-300"
                >
                  <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">My Collections</span>
                  <span className="sm:hidden">Collections</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="generated" 
                  className="gap-1 sm:gap-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 transition-all duration-300"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">AI Files</span>
                  <span className="sm:hidden">AI</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-6 pb-24 bg-gradient-to-b from-transparent to-muted/5" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <TabsContent value="collections" className="m-0">
                {/* Show either collection files OR collections grid */}
                {selectedCollection && !isSharedCollectionSelected ? (
                  /* Selected Collection Files View */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCollection(null)}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Back
                        </Button>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${selectedCollection.color}20` }}
                          >
                            <FolderOpen className="w-5 h-5" style={{ color: selectedCollection.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{selectedCollection.name}</h3>
                            <p className="text-sm text-muted-foreground">{filteredFiles.length} files</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Upload Files</span>
                        <span className="sm:hidden">Upload</span>
                      </Button>
                    </div>
                    <FileGallery
                      files={filteredFiles}
                      isLoading={isLoading}
                      onFileOpen={handleFileOpen}
                      onFileDelete={handleFileDelete}
                      onFileFavorite={handleFileFavorite}
                      onAddToCollection={handleAddToCollection}
                      emptyMessage={`No files in "${selectedCollection.name}" yet. Upload files to get started!`}
                    />
                  </div>
                ) : (
                  /* Collections Grid View */
                  <div className="space-y-6">
                    {/* Header with Create and Join buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">My Collections</h3>
                        <p className="text-sm text-muted-foreground">Organize your files into collections</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setJoinLinkModalOpen(true)}
                          className="gap-2 border-pink-300 dark:border-pink-500/30 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-400"
                        >
                          <Link className="w-4 h-4" />
                          <span className="hidden sm:inline">Join via Link</span>
                          <span className="sm:hidden">Join</span>
                        </Button>
                        <Button
                          onClick={() => setCreateCollectionModalOpen(true)}
                          className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">New Collection</span>
                          <span className="sm:hidden">New</span>
                        </Button>
                      </div>
                    </div>

                    {/* Collections Grid */}
                    {collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4 shadow-xl ring-2 ring-violet-500/20">
                        <FolderOpen className="w-10 h-10 text-violet-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1 text-slate-700 dark:text-slate-200">No collections yet</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto mb-4">
                        Create collections to organize your files
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {collections.map((collection) => (
                        <motion.div
                          key={collection.id}
                          whileHover={{ scale: 1.03, y: -6 }}
                          whileTap={{ scale: 0.98 }}
                          className={`group relative p-5 rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                            selectedCollection?.id === collection.id 
                              ? "ring-4 shadow-xl" 
                              : "hover:shadow-xl"
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${collection.color}15, ${collection.color}05, white)`,
                            borderColor: selectedCollection?.id === collection.id ? collection.color : `${collection.color}30`,
                            boxShadow: selectedCollection?.id === collection.id 
                              ? `0 12px 40px ${collection.color}40` 
                              : `0 4px 20px ${collection.color}15`,
                            // @ts-ignore
                            '--tw-ring-color': `${collection.color}40`
                          }}
                          onClick={() => {
                            setSelectedCollection(selectedCollection?.id === collection.id ? null : collection);
                          }}
                        >
                          {/* Gradient overlay */}
                          <div 
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ background: `linear-gradient(135deg, ${collection.color}, transparent 60%)` }}
                          />
                          <div className="relative flex items-start justify-between mb-3">
                            <div 
                              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                              style={{ 
                                background: `linear-gradient(135deg, ${collection.color}, ${collection.color}cc)`,
                                boxShadow: `0 6px 20px ${collection.color}50`
                              }}
                            >
                              <FolderOpen className="w-7 h-7 text-white drop-shadow-sm" />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt("Enter new name:", collection.name);
                                    if (newName && newName !== collection.name) {
                                      // TODO: Implement rename
                                      toast.info("Rename feature coming soon");
                                    }
                                  }}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollectionToShare(collection);
                                    setShareModalOpen(true);
                                  }}
                                >
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete "${collection.name}"?`)) {
                                      handleDeleteCollection(collection.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <h4 className="relative font-bold text-lg truncate text-slate-800 dark:text-white">{collection.name}</h4>
                          <p 
                            className="relative text-sm font-medium mt-1"
                            style={{ color: collection.color }}
                          >
                            {collection.fileCount} {collection.fileCount === 1 ? "file" : "files"}
                          </p>
                          {collection.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {collection.description}
                            </p>
                          )}
                          {/* Upload button for collection */}
                          <Button
                            size="sm"
                            className="w-full mt-4 gap-2 opacity-0 group-hover:opacity-100 transition-all bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCollection(collection);
                              setShowUploadModal(true);
                            }}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Files
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Shared Collections Section */}
                  {sharedCollections.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-violet-200/50 dark:border-violet-500/20">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-violet-700 dark:text-violet-300">
                        <Users className="w-5 h-5 text-violet-500" />
                        Shared with me
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sharedCollections.map((collection) => (
                          <motion.div
                            key={collection.id}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`group relative p-5 rounded-2xl border-2 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/50 dark:from-violet-900/30 dark:via-slate-800 dark:to-fuchsia-900/30 hover:shadow-xl transition-all cursor-pointer ${
                              selectedCollection?.id === collection.id 
                                ? "border-violet-400 ring-4 ring-violet-500/20 shadow-lg shadow-violet-500/10" 
                                : "border-violet-200/60 dark:border-violet-700/40 hover:border-violet-300 dark:hover:border-violet-500/50"
                            }`}
                            onClick={() => {
                              setSelectedCollection(selectedCollection?.id === collection.id ? null : collection);
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/50"
                                style={{ 
                                  background: `linear-gradient(135deg, ${collection.color}40, ${collection.color}20)`,
                                  boxShadow: `0 4px 16px ${collection.color}30`
                                }}
                              >
                                <Users className="w-6 h-6" style={{ color: collection.color }} />
                              </div>
                              <span className="text-xs bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full border border-violet-500/30 font-medium">
                                {collection.myRole}
                              </span>
                            </div>
                            <h4 className="font-semibold truncate text-slate-800 dark:text-white">{collection.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {collection.fileCount} {collection.fileCount === 1 ? "file" : "files"}
                            </p>
                            {collection.ownerEmail && (
                              <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
                                <Share2 className="w-3 h-3" />
                                Shared by {collection.ownerEmail}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="generated" className="m-0">
                <FileGallery
                  files={filteredFiles}
                  isLoading={isLoading || isLoadingSharedFiles}
                  onFileOpen={handleFileOpen}
                  onFileDelete={isSharedCollectionSelected ? undefined : handleFileDelete}
                  onFileFavorite={isSharedCollectionSelected ? undefined : handleFileFavorite}
                  onAddToCollection={isSharedCollectionSelected ? undefined : handleAddToCollection}
                  emptyMessage={isSharedCollectionSelected ? "No AI-generated files in this shared collection" : "No AI-generated content yet. Use Deep Research or Bio Agent to generate content!"}
                  emptyIcon={
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/25 via-purple-500/20 to-fuchsia-500/15 flex items-center justify-center mb-4 shadow-xl ring-1 ring-violet-500/20">
                      <Sparkles className="w-10 h-10 text-violet-500" />
                    </div>
                  }
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/40 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selectedCollection ? `${selectedCollection.color}20` : 'hsl(var(--primary) / 0.1)' }}
                  >
                    {selectedCollection ? (
                      <FolderOpen className="w-5 h-5" style={{ color: selectedCollection.color }} />
                    ) : (
                      <Upload className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Upload Files</h3>
                    {selectedCollection && (
                      <p className="text-sm text-muted-foreground">to {selectedCollection.name}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-background/80"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5">
                <FileUploader
                  collectionId={selectedCollection?.id}
                  onUploadComplete={() => {
                    fetchFiles();
                    fetchCollections();
                    setTimeout(() => setShowUploadModal(false), 1500);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Collection modal */}
      <AnimatePresence>
        {addToCollectionFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => setAddToCollectionFile(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-border/30 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner shadow-primary/10 ring-1 ring-primary/10">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight">Add to Collection</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => setAddToCollectionFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5">
                <p className="text-sm text-muted-foreground mb-5">
                  Select a collection for <span className="font-medium text-foreground">&quot;{addToCollectionFile?.filename}&quot;</span>
                </p>
                {collections.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No collections yet</p>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setAddToCollectionFile(null);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Collection First
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {collections.map((collection) => (
                      <motion.button
                        key={collection.id}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleConfirmAddToCollection(collection.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left group bg-card/50"
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                          style={{ backgroundColor: collection.color + "20" }}
                        >
                          <FolderOpen className="w-5 h-5" style={{ color: collection.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-foreground/90">{collection.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {collection.fileCount || 0} files
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                          <Plus className="w-5 h-5" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview */}
      <FilePreview
        file={previewFile}
        files={filteredFiles}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onFavorite={handleFileFavorite}
        onDelete={handleFileDelete}
      />

      {/* Share Collection Modal */}
      <ShareCollectionModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        collection={collectionToShare}
        onMembersUpdated={() => {
          fetchCollections();
          fetchSharedCollections();
        }}
      />

      {/* Join via Link Modal */}
      <Dialog open={joinLinkModalOpen} onOpenChange={setJoinLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              Join via Share Link
            </DialogTitle>
            <DialogDescription>
              Paste a share link to access a collection shared with you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Input
                placeholder="Paste share link here..."
                value={joinLinkValue}
                onChange={(e) => setJoinLinkValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinViaLink()}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Example: https://yoursite.com/shared/abc123-uuid
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setJoinLinkModalOpen(false);
                  setJoinLinkValue("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinViaLink}
                disabled={!joinLinkValue.trim() || isJoining}
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Collection
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Collection Modal */}
      <Dialog open={createCollectionModalOpen} onOpenChange={(open) => {
        setCreateCollectionModalOpen(open);
        if (!open) {
          setNewCollectionName("");
          setNewCollectionColor("#3b82f6");
          setCollectionNameError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-violet-500/5 to-fuchsia-500/5 pointer-events-none" />
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl">Create New Collection</span>
            </DialogTitle>
            <DialogDescription>
              Organize your files by creating a collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4 relative">
            {/* Collection Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Collection Name</label>
              <Input
                placeholder="Enter collection name..."
                value={newCollectionName}
                onChange={(e) => handleCollectionNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !collectionNameError && handleCreateCollectionFromModal()}
                className={`h-12 text-base ${collectionNameError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                autoFocus
              />
              {collectionNameError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  {collectionNameError}
                </p>
              )}
            </div>

            {/* Color Picker */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Choose a Color</label>
              <div className="flex flex-wrap gap-2">
                {collectionColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCollectionColor(color)}
                    className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                      newCollectionColor === color 
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110 shadow-lg' 
                        : 'hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      boxShadow: newCollectionColor === color ? `0 4px 14px ${color}50` : undefined
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl border-2 border-dashed border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${newCollectionColor}, ${newCollectionColor}99)`,
                    boxShadow: `0 4px 14px ${newCollectionColor}40`
                  }}
                >
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{newCollectionName || "Collection Name"}</p>
                  <p className="text-xs text-muted-foreground">0 files</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateCollectionModalOpen(false);
                  setNewCollectionName("");
                  setNewCollectionColor("#3b82f6");
                  setCollectionNameError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCollectionFromModal}
                disabled={!newCollectionName.trim() || !!collectionNameError || isCreatingCollection}
                className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-lg shadow-blue-500/30"
              >
                {isCreatingCollection ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Collection
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 p-4 rounded-lg bg-destructive text-destructive-foreground shadow-lg"
          >
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
