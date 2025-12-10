"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  File,
  Star,
  StarOff,
  MoreVertical,
  Trash2,
  Eye,
  FolderPlus,
  Download,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserFile, FileCardProps } from "../types";
import {
  formatFileSize,
  getFileColor,
  getRelativeTime,
  truncateFilename,
  isImageFile,
  getSourceFeatureName,
} from "../lib/file-utils";

export function FileCard({
  file,
  isSelected = false,
  onSelect,
  onOpen,
  onDelete,
  onFavorite,
  onAddToCollection,
  showActions = true,
}: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fileColor = getFileColor(file.fileType);
  const isImage = isImageFile(file.fileType);

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-6 h-6" />;
    if (file.fileType === "pdf") return <FileText className="w-6 h-6" />;
    if (["doc", "docx", "txt", "md"].includes(file.fileType))
      return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className={`
        group relative bg-card/80 backdrop-blur-sm border rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-300 ease-out
        ${isSelected 
          ? "border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/15 bg-primary/5" 
          : "border-border/40 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"}
        ${isHovered ? "shadow-2xl shadow-black/15" : "shadow-lg shadow-black/5"}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen?.(file)}
    >
      {/* Thumbnail / Preview - Always show icon (images require signed URLs) */}
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${fileColor}05 0%, ${fileColor}12 50%, ${fileColor}08 100%)` }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${fileColor}30 0%, ${fileColor}50 100%)`,
              color: fileColor 
            }}
          >
            {getFileIcon()}
          </motion.div>
          <Badge 
            variant="secondary" 
            className="text-[10px] font-bold uppercase tracking-wider px-2.5"
            style={{ backgroundColor: `${fileColor}15`, color: fileColor }}
          >
            {file.fileType}
          </Badge>
        </div>

        {/* Favorite badge */}
        {file.isFavorite && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2.5 left-2.5"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </motion.div>
        )}

        {/* Generated badge */}
        {file.isGenerated && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-2.5 right-2.5"
          >
            <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-500/30 gap-1">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          </motion.div>
        )}

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Button
              variant="secondary"
              size="sm"
              className="h-9 px-4 rounded-xl bg-white/95 hover:bg-white text-black shadow-xl gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(file);
              }}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </motion.div>
        </motion.div>

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* File info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate leading-tight" title={file.filename}>
              {truncateFilename(file.filename, 25)}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {formatFileSize(file.fileSize)}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">
                {getRelativeTime(file.createdAt)}
              </span>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl">
                <DropdownMenuItem onClick={() => onOpen?.(file)} className="rounded-lg py-2.5 cursor-pointer">
                  <Eye className="w-4 h-4 mr-2.5" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFavorite?.(file)} className="rounded-lg py-2.5 cursor-pointer">
                  {file.isFavorite ? (
                    <>
                      <StarOff className="w-4 h-4 mr-2.5" />
                      Remove from Favorites
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2.5" />
                      Add to Favorites
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddToCollection?.(file)} className="rounded-lg py-2.5 cursor-pointer">
                  <FolderPlus className="w-4 h-4 mr-2.5" />
                  Add to Collection
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer">
                  <a href={file.fileUrl} download={file.originalName}>
                    <Download className="w-4 h-4 mr-2.5" />
                    Download
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg py-2.5 cursor-pointer">
                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2.5" />
                    Open in New Tab
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2.5 cursor-pointer"
                  onClick={() => onDelete?.(file)}
                >
                  <Trash2 className="w-4 h-4 mr-2.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tags */}
        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {file.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                style={{
                  backgroundColor: `${tag.color || "#6b7280"}12`,
                  color: tag.color || "#6b7280",
                }}
              >
                {tag.tagName}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                +{file.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Source info for generated files */}
        {file.isGenerated && file.sourceFeature && (
          <div className="mt-3 pt-3 border-t border-dashed text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>From {getSourceFeatureName(file.sourceFeature)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
