"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderPlus,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Plus,
  Users,
  Share2,
  Crown,
  Eye,
  Edit3,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FileCollection } from "../types";

interface CollectionManagerProps {
  collections: FileCollection[];
  selectedCollectionId?: string;
  onSelectCollection?: (collection: FileCollection | null) => void;
  onCreateCollection?: (name: string, color: string) => Promise<void>;
  onUpdateCollection?: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  onDeleteCollection?: (id: string) => Promise<void>;
  onShareCollection?: (collection: FileCollection) => void;
  showSharedBadge?: boolean;
}

const COLLECTION_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export function CollectionManager({
  collections,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onShareCollection,
  showSharedBadge = true,
}: CollectionManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(COLLECTION_COLORS[4] ?? "#06b6d4");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !newColor) return;
    
    setIsLoading(true);
    try {
      await onCreateCollection?.(newName.trim(), newColor);
      setNewName("");
      setNewColor(COLLECTION_COLORS[4] ?? "#06b6d4");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!newName.trim()) return;
    
    setIsLoading(true);
    try {
      await onUpdateCollection?.(id, { name: newName.trim(), color: newColor });
      setEditingId(null);
      setNewName("");
    } catch (error) {
      console.error("Failed to update collection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await onDeleteCollection?.(id);
    } catch (error) {
      console.error("Failed to delete collection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (collection: FileCollection) => {
    setEditingId(collection.id);
    setNewName(collection.name);
    setNewColor(collection.color || COLLECTION_COLORS[4] || "#06b6d4");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setNewName("");
    setNewColor(COLLECTION_COLORS[4] || "#06b6d4");
  };

  return (
    <div className="space-y-2">
      {/* Create Button (if not creating) - only show if onCreateCollection is provided */}
      {!isCreating && onCreateCollection && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 mb-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4" />
          New Collection
        </Button>
      )}

      {/* Create new collection form */}
      <AnimatePresence>
        {isCreating && onCreateCollection && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border border-border/50 bg-card/50 space-y-3 shadow-sm">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                className="h-9 bg-background/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewName("");
                  }
                }}
              />
              
              {/* Color picker */}
              <div className="flex flex-wrap gap-1.5">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`
                      w-5 h-5 rounded-full transition-all duration-200
                      ${newColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"}
                    `}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleCreate}
                  disabled={!newName.trim() || isLoading}
                >
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections list */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {collections.map((collection) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              layout
            >
              {editingId === collection.id ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-accent/50 border border-border/50">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: newColor }}
                  />
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-7 text-sm bg-background/50 min-w-0"
                    placeholder="Name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(collection.id);
                      if (e.key === "Escape") cancelEditing();
                    }}
                  />
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-green-500/10 hover:text-green-600"
                      onClick={() => handleUpdate(collection.id)}
                      disabled={isLoading}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                      onClick={cancelEditing}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`
                    group flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-200 cursor-pointer border border-transparent
                    ${selectedCollectionId === collection.id 
                      ? "bg-primary/10 text-primary font-medium shadow-sm border-primary/10" 
                      : "hover:bg-accent/50 hover:border-border/30 text-muted-foreground hover:text-foreground"}
                  `}
                  onClick={() => onSelectCollection?.(collection)}
                >
                  <div className="relative">
                    <FolderOpen 
                      className={`w-4 h-4 transition-colors ${selectedCollectionId === collection.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} 
                      style={{ color: selectedCollectionId === collection.id ? undefined : collection.color }}
                    />
                    {/* Shared indicator */}
                    {showSharedBadge && collection.isShared && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary flex items-center justify-center">
                        <Users className="w-1.5 h-1.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm truncate">
                        {collection.name}
                      </span>
                      {/* Role badge for shared collections */}
                      {collection.myRole && collection.myRole !== 'owner' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge 
                                variant="secondary" 
                                className="h-4 px-1 text-[10px] gap-0.5"
                              >
                                {collection.myRole === 'editor' ? (
                                  <Edit3 className="w-2.5 h-2.5" />
                                ) : (
                                  <Eye className="w-2.5 h-2.5" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              You have {collection.myRole} access
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Share link indicator */}
                      {collection.shareLinkEnabled && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {collection.shareLinkAccess === 'public' ? (
                                <Globe className="w-3 h-3 text-green-500" />
                              ) : (
                                <Lock className="w-3 h-3 text-amber-500" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {collection.shareLinkAccess === 'public' 
                                ? 'Public share link enabled'
                                : 'Share link enabled (login required)'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {/* Owner info for shared collections */}
                    {collection.ownerEmail && collection.myRole !== 'owner' && (
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {collection.ownerEmail}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${selectedCollectionId === collection.id ? "bg-primary/20 text-primary-foreground/80" : "bg-muted text-muted-foreground"}`}>
                    {collection.fileCount || 0}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all -mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {/* Only show share if user is owner */}
                      {(!collection.myRole || collection.myRole === 'owner') && (
                        <>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareCollection?.(collection);
                            }}
                          >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => startEditing(collection)}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(collection.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* For shared collections where user is not owner */}
                      {collection.myRole && collection.myRole !== 'owner' && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(collection.id)}
                        >
                          <X className="w-3.5 h-3.5 mr-2" />
                          Leave
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {collections.length === 0 && !isCreating && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-10 px-6 border-2 border-dashed border-border/40 rounded-2xl bg-gradient-to-br from-muted/5 to-muted/10"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            No collections yet
          </p>
          <p className="text-xs text-muted-foreground/70">
            Create one to organize your files
          </p>
        </motion.div>
      )}
    </div>
  );
}
