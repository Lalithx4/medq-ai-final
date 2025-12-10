"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  File,
  Sparkles,
  Info,
  ChevronDown,
  Trash2,
  Play,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserFile } from "../types";
import { getSignedFileUrl } from "../hooks/useFileUrl";
import {
  formatFileSize,
  getRelativeTime,
  isImageFile,
  getFileColor,
} from "../lib/file-utils";

interface FilePreviewProps {
  file: UserFile | null;
  files?: UserFile[];
  isOpen: boolean;
  onClose: () => void;
  onFavorite?: (file: UserFile) => void;
  onDelete?: (file: UserFile) => void;
}

export function FilePreview({
  file,
  files = [],
  isOpen,
  onClose,
  onFavorite,
  onDelete,
}: FilePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const currentFile = files.length > 0 ? files[currentIndex] : file;
  const hasMultiple = files.length > 1;
  const isImage = currentFile ? isImageFile(currentFile.fileType) : false;
  const isPDF = currentFile?.fileType === "pdf";
  const isVideo = currentFile ? ["mp4", "webm", "mov", "avi", "mkv"].includes(currentFile.fileType?.toLowerCase()) : false;
  const isAudio = currentFile ? ["mp3", "wav", "ogg", "m4a", "flac"].includes(currentFile.fileType?.toLowerCase()) : false;

  // Fetch signed URL
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!currentFile?.id || !isOpen) {
        setSignedUrl(null);
        return;
      }
      
      setIsLoading(true);
      try {
        const url = await getSignedFileUrl(currentFile.id, true);
        setSignedUrl(url || currentFile.fileUrl);
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setSignedUrl(currentFile.fileUrl);
      }
    };

    fetchSignedUrl();
  }, [currentFile?.id, isOpen, currentFile?.fileUrl]);

  const displayUrl = signedUrl || currentFile?.fileUrl;

  // Update index when file changes
  useEffect(() => {
    if (file && files.length > 0) {
      const index = files.findIndex((f) => f.id === file.id);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [file, files]);

  // Reset zoom/rotation on file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
  }, [currentFile?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasMultiple) goToPrev();
          break;
        case "ArrowRight":
          if (hasMultiple) goToNext();
          break;
        case "+":
        case "=":
          if (isImage) setZoom((z) => Math.min(z + 0.25, 3));
          break;
        case "-":
          if (isImage) setZoom((z) => Math.max(z - 0.25, 0.5));
          break;
        case "r":
          if (isImage) setRotation((r) => (r + 90) % 360);
          break;
        case "i":
          setShowInfo((s) => !s);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasMultiple, isImage, onClose]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : files.length - 1));
  }, [files.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i < files.length - 1 ? i + 1 : 0));
  }, [files.length]);

  if (!currentFile) return null;

  const fileColor = getFileColor(currentFile.fileType);

  // Get file type icon
  const getFileIcon = () => {
    if (isImage) return <File className="w-16 h-16 text-white/80" />;
    if (isPDF) return <FileText className="w-16 h-16 text-white/80" />;
    if (isVideo) return <Play className="w-16 h-16 text-white/80" />;
    if (isAudio) return <Music className="w-16 h-16 text-white/80" />;
    return <File className="w-16 h-16 text-white/80" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black"
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
            {/* Left: File info */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h2 className="text-white font-medium truncate text-sm md:text-base">
                  {currentFile.filename}
                </h2>
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <span>{currentFile.fileType.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatFileSize(currentFile.fileSize)}</span>
                  {hasMultiple && (
                    <>
                      <span>•</span>
                      <span>{currentIndex + 1} of {files.length}</span>
                    </>
                  )}
                </div>
              </div>
              {currentFile.isGenerated && (
                <Badge className="bg-violet-500/80 text-white border-0 text-xs shrink-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full text-white ${currentFile.isFavorite ? 'bg-yellow-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                onClick={() => onFavorite?.(currentFile)}
              >
                <Star className={`w-5 h-5 ${currentFile.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                onClick={() => setShowInfo(!showInfo)}
              >
                <Info className="w-5 h-5" />
              </Button>
              <a
                href={displayUrl || '#'}
                download={currentFile.originalName}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
              >
                <Download className="w-5 h-5" />
              </a>
              <a
                href={displayUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Navigation Arrows */}
            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-20 h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-20 h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Image Preview */}
            {isImage && displayUrl && (
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={displayUrl}
                alt={currentFile.filename}
                className="max-w-[90vw] max-h-[85vh] object-contain select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
                draggable={false}
              />
            )}

            {/* PDF Preview - Full screen iframe */}
            {isPDF && displayUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-4">
                <iframe
                  src={displayUrl}
                  className="w-full h-full rounded-lg shadow-2xl"
                  style={{ 
                    border: 'none',
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                  title={currentFile.filename}
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            )}

            {/* Video Preview */}
            {isVideo && displayUrl && (
              <video
                src={displayUrl}
                controls
                autoPlay={false}
                className="max-w-[95vw] max-h-[85vh] rounded-lg"
                onLoadedData={() => setIsLoading(false)}
              >
                Your browser does not support video playback.
              </video>
            )}

            {/* Audio Preview */}
            {isAudio && displayUrl && (
              <div className="flex flex-col items-center gap-8 p-8">
                <div
                  className="w-40 h-40 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${fileColor}, ${fileColor}99)` }}
                >
                  <Music className="w-20 h-20 text-white" />
                </div>
                <p className="text-white text-xl font-medium">{currentFile.filename}</p>
                <audio
                  src={displayUrl}
                  controls
                  className="w-96 max-w-[90vw]"
                  onLoadedData={() => setIsLoading(false)}
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {/* Other Files */}
            {!isImage && !isPDF && !isVideo && !isAudio && (
              <div className="flex flex-col items-center gap-6 p-8">
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${fileColor}, ${fileColor}99)` }}
                >
                  {getFileIcon()}
                </div>
                <div className="text-center">
                  <p className="text-white text-xl font-medium mb-2">{currentFile.filename}</p>
                  <p className="text-white/60 text-sm mb-6">Preview not available for this file type</p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={displayUrl || '#'}
                    download={currentFile.originalName}
                    className="px-6 py-3 rounded-lg bg-white text-black font-medium inline-flex items-center gap-2 hover:bg-white/90 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </a>
                  <a
                    href={displayUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-lg bg-white/10 text-white font-medium inline-flex items-center gap-2 hover:bg-white/20 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Image Controls (bottom center) */}
          {isImage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 rounded-full bg-black/60 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm font-medium w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <div className="w-px h-6 bg-white/30 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Info Panel (slide from right) */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute top-0 right-0 bottom-0 w-80 bg-black border-l border-white/10 z-40 overflow-y-auto"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-white font-semibold">File Details</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setShowInfo(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-4 space-y-6">
                  {/* File Name */}
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Name</p>
                    <p className="text-white text-sm break-words">{currentFile.filename}</p>
                  </div>

                  {/* Type & Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Type</p>
                      <p className="text-white text-sm">{currentFile.fileType.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Size</p>
                      <p className="text-white text-sm">{formatFileSize(currentFile.fileSize)}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Added</p>
                    <p className="text-white text-sm">{getRelativeTime(currentFile.createdAt)}</p>
                  </div>

                  {/* Tags */}
                  {currentFile.tags && currentFile.tags.length > 0 && (
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wide mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentFile.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${tag.color || "#6b7280"}30`,
                              color: tag.color || "#9ca3af",
                            }}
                          >
                            {tag.tagName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Generated Badge */}
                  {currentFile.isGenerated && (
                    <div className="p-3 rounded-lg bg-violet-500/20 border border-violet-500/30">
                      <div className="flex items-center gap-2 text-violet-300">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">AI Generated</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      onDelete?.(currentFile);
                      onClose();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete File
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
