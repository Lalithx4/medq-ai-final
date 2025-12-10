"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  FolderOpen,
  Star,
  Sparkles,
  FileText,
  Image as ImageIcon,
  X,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { FileCard } from "./FileCard";
import { useFileManagerStore } from "../stores/file-store";
import { UserFile, FileFilterOption, FileSortOption, FileViewMode } from "../types";

interface FileGalleryProps {
  files: UserFile[];
  isLoading?: boolean;
  onFileOpen?: (file: UserFile) => void;
  onFileDelete?: (file: UserFile) => void;
  onFileFavorite?: (file: UserFile) => void;
  onAddToCollection?: (file: UserFile) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

const SORT_OPTIONS: { value: FileSortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "size-desc", label: "Largest First" },
  { value: "size-asc", label: "Smallest First" },
];

const FILE_TYPE_FILTERS = [
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "doc", label: "Documents", icon: FileText },
  { value: "image", label: "Images", icon: ImageIcon },
];

export function FileGallery({
  files,
  isLoading = false,
  onFileOpen,
  onFileDelete,
  onFileFavorite,
  onAddToCollection,
  showSearch = true,
  showFilters = true,
  emptyMessage = "No files yet",
  emptyIcon,
}: FileGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<FileViewMode>("grid");
  const [sortOption, setSortOption] = useState<FileSortOption>("newest");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);
  const { selectedFiles, selectFile, deselectFile, clearSelection } = useFileManagerStore();

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (file) =>
          file.filename.toLowerCase().includes(query) ||
          file.originalName.toLowerCase().includes(query) ||
          file.tags?.some((tag) => tag.tagName.toLowerCase().includes(query))
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter((file) => {
        if (selectedTypes.includes("image")) {
          if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.fileType)) {
            return true;
          }
        }
        if (selectedTypes.includes("doc")) {
          if (["doc", "docx", "txt", "md", "rtf"].includes(file.fileType)) {
            return true;
          }
        }
        if (selectedTypes.includes("pdf") && file.fileType === "pdf") {
          return true;
        }
        return false;
      });
    }

    // Favorites filter
    if (showFavorites) {
      result = result.filter((file) => file.isFavorite);
    }

    // Generated filter
    if (showGenerated) {
      result = result.filter((file) => file.isGenerated);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return a.filename.localeCompare(b.filename);
        case "name-desc":
          return b.filename.localeCompare(a.filename);
        case "size-desc":
          return b.fileSize - a.fileSize;
        case "size-asc":
          return a.fileSize - b.fileSize;
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchQuery, selectedTypes, showFavorites, showGenerated, sortOption]);

  const hasActiveFilters = selectedTypes.length > 0 || showFavorites || showGenerated;

  const clearFilters = () => {
    setSelectedTypes([]);
    setShowFavorites(false);
    setShowGenerated(false);
    setSearchQuery("");
  };

  const handleFileSelect = (file: UserFile) => {
    if (selectedFiles.includes(file.id)) {
      deselectFile(file.id);
    } else {
      selectFile(file.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          {showSearch && (
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search files, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 bg-muted/30 border-border/40 rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Type filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-lg sm:rounded-xl border-border/40 bg-background/50 hover:bg-accent/80 transition-all text-xs sm:text-sm">
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Type</span>
                    {selectedTypes.length > 0 && (
                      <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold">
                        {selectedTypes.length}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>File Types</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {FILE_TYPE_FILTERS.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type.value}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTypes([...selectedTypes, type.value]);
                        } else {
                          setSelectedTypes(selectedTypes.filter((t) => t !== type.value));
                        }
                      }}
                    >
                      <type.icon className="w-4 h-4 mr-2" />
                      {type.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick filters */}
              <Button
                variant={showFavorites ? "default" : "outline"}
                size="sm"
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl transition-all ${showFavorites ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 shadow-lg shadow-yellow-500/25" : "border-border/40 hover:border-yellow-500/50 hover:bg-yellow-500/10"}`}
                onClick={() => setShowFavorites(!showFavorites)}
              >
                <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFavorites ? "fill-current" : ""}`} />
              </Button>

              <Button
                variant={showGenerated ? "default" : "outline"}
                size="sm"
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl transition-all ${showGenerated ? "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-transparent shadow-lg shadow-purple-500/25" : "border-border/40 hover:border-violet-500/50 hover:bg-violet-500/10"}`}
                onClick={() => setShowGenerated(!showGenerated)}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm">
                    {sortOption.includes("desc") ? (
                      <SortDesc className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    ) : (
                      <SortAsc className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSortOption(option.value)}
                      className={sortOption === option.value ? "bg-accent" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View mode toggle */}
              <div className="hidden sm:flex items-center bg-muted/50 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-border/20">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 sm:px-2.5 rounded-md sm:rounded-lg transition-all ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2 sm:px-2.5 rounded-md sm:rounded-lg transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Filters:</span>
          {selectedTypes.map((type) => (
            <motion.button
              key={type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSelectedTypes(selectedTypes.filter((t) => t !== type))}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/10"
            >
              {type}
              <X className="w-3 h-3 opacity-70" />
            </motion.button>
          ))}
          {showFavorites && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setShowFavorites(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-colors border border-yellow-500/10"
            >
              <Star className="w-3 h-3 fill-current" />
              Favorites
              <X className="w-3 h-3 opacity-70" />
            </motion.button>
          )}
          {showGenerated && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setShowGenerated(false)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors border border-violet-500/10"
            >
              <Sparkles className="w-3 h-3" />
              Generated
              <X className="w-3 h-3 opacity-70" />
            </motion.button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Selection bar */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 backdrop-blur-sm"
          >
            <span className="text-sm font-medium text-primary pl-2">
              {selectedFiles.length} file(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection} className="hover:bg-primary/10 text-primary hover:text-primary">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="rounded-lg shadow-sm">
                Delete Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredFiles.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          {emptyIcon || (
            <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-muted-foreground/50" />
            </div>
          )}
          <h3 className="text-lg font-semibold mb-1">No files found</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mb-6">{emptyMessage}</p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="rounded-xl">
              Clear filters
            </Button>
          )}
        </motion.div>
      )}

      {/* File grid */}
      {!isLoading && filteredFiles.length > 0 && (
        <motion.div
          layout
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              : "flex flex-col gap-2"
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={handleFileSelect}
                onOpen={onFileOpen}
                onDelete={onFileDelete}
                onFavorite={onFileFavorite}
                onAddToCollection={onAddToCollection}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results count */}
      {!isLoading && filteredFiles.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredFiles.length} of {files.length} files
        </div>
      )}
    </div>
  );
}
