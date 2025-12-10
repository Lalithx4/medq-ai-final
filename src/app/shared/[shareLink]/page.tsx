"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Lock,
  User,
  Loader2,
  AlertCircle,
  ArrowLeft,
  File,
  FileSpreadsheet,
  FileCode,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SharedFile {
  id: string;
  name: string;
  originalName?: string;
  type: string;
  mimeType?: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface SharedCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  fileCount: number;
  ownerEmail: string;
  accessRole: string;
}

export default function SharedCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const shareLink = params.shareLink as string;

  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [collectionName, setCollectionName] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);

  useEffect(() => {
    if (shareLink) {
      fetchSharedCollection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareLink]);

  const fetchSharedCollection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/file-manager/shared/${shareLink}`);
      
      // Try to parse JSON, but handle errors
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Failed to parse API response:", parseErr);
        setError("Server returned an invalid response");
        return;
      }

      if (!res.ok) {
        if (data?.requiresLogin) {
          setRequiresLogin(true);
          setCollectionName(data.collectionName || "");
          setError("Login required to access this collection");
        } else if (data?.setupRequired) {
          setError("Share links are not set up. Please contact the administrator.");
        } else {
          setError(data?.error || "Failed to load collection");
        }
        return;
      }

      // Validate response has expected structure
      if (!data?.collection) {
        setError("Invalid response from server");
        return;
      }

      setCollection(data.collection);
      setFiles(data.files || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load shared collection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string, mimeType?: string) => {
    const t = (type || mimeType || "").toLowerCase();
    if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif")) {
      return <ImageIcon className="w-5 h-5" />;
    }
    if (t.includes("pdf")) {
      return <FileText className="w-5 h-5" />;
    }
    if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv")) {
      return <FileSpreadsheet className="w-5 h-5" />;
    }
    if (t.includes("code") || t.includes("json") || t.includes("javascript") || t.includes("typescript")) {
      return <FileCode className="w-5 h-5" />;
    }
    if (t.includes("doc") || t.includes("word") || t.includes("text")) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const isImageFile = (file: SharedFile) => {
    const t = (file.type || file.mimeType || "").toLowerCase();
    return t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp");
  };

  const isPdfFile = (file: SharedFile) => {
    const t = (file.type || file.mimeType || "").toLowerCase();
    return t.includes("pdf");
  };

  const handleLogin = () => {
    // Preserve the share link in the redirect
    const returnUrl = encodeURIComponent(`/shared/${shareLink}`);
    router.push(`/auth/login?returnUrl=${returnUrl}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared collection...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-8 max-w-md w-full text-center shadow-xl">
            {requiresLogin ? (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Login Required</h2>
                {collectionName && (
                  <p className="text-muted-foreground mb-2">
                    To access <span className="font-medium text-foreground">&quot;{collectionName}&quot;</span>
                  </p>
                )}
                <p className="text-muted-foreground mb-6">
                  You need to be logged in to view this shared collection.
                </p>
                <Button onClick={handleLogin} className="w-full h-11" size="lg">
                  <User className="w-4 h-4 mr-2" />
                  Sign In to Continue
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Don&apos;t have an account? You can create one after clicking Sign In.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Collection not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: collection.color }}
            >
              <FolderOpen className="w-7 h-7 text-white" />
            </motion.div>
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold"
              >
                {collection.name}
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mt-1"
              >
                <p className="text-sm text-muted-foreground">
                  Shared by <span className="font-medium">{collection.ownerEmail}</span>
                </p>
                <Badge variant="secondary" className="text-xs">
                  {collection.accessRole === "editor" ? (
                    <><Eye className="w-3 h-3 mr-1" /> Can edit</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Can view</>
                  )}
                </Badge>
              </motion.div>
            </div>
          </div>
          {collection.description && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-muted-foreground"
            >
              {collection.description}
            </motion.p>
          )}
        </div>
      </div>

      {/* Files Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-semibold text-muted-foreground mb-4"
        >
          {files.length} {files.length === 1 ? "file" : "files"}
        </motion.h2>
        
        {files.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No files in this collection</p>
              <p className="text-sm text-muted-foreground mt-1">
                Files added to this collection will appear here
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {files.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  onClick={() => setPreviewFile(file)}
                >
                  <Card className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden">
                    {/* Thumbnail for images */}
                    {isImageFile(file) && file.url && (
                      <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={file.thumbnailUrl || file.url}
                          alt={file.name || "Image"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${collection?.color || "#3b82f6"}20` }}
                      >
                        <span style={{ color: collection?.color || "#3b82f6" }}>
                          {getFileIcon(file.type || "", file.mimeType || "")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name || "Unknown file"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size || 0)}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {file.url && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(file.url, "_blank");
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                              asChild
                            >
                              <a href={file.url} download={file.name || "file"}>
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <span style={{ color: collection?.color || "#3b82f6" }}>
                {previewFile && getFileIcon(previewFile.type || "", previewFile.mimeType || "")}
              </span>
              <span className="truncate">{previewFile?.name || "File"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile && isImageFile(previewFile) && previewFile.url && (
              <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                <img
                  src={previewFile.url}
                  alt={previewFile.name || "Image"}
                  className="max-w-full max-h-[60vh] object-contain rounded"
                />
              </div>
            )}
            {previewFile && isPdfFile(previewFile) && previewFile.url && (
              <iframe
                src={previewFile.url}
                className="w-full h-[60vh] rounded-lg border"
                title={previewFile.name}
              />
            )}
            {previewFile && !isImageFile(previewFile) && !isPdfFile(previewFile) && (
              <div className="text-center py-12">
                <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Preview not available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {formatFileSize(previewFile.size)} • {previewFile.type || "Unknown type"}
                </p>
                <Button asChild>
                  <a href={previewFile.url} download={previewFile.name}>
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </a>
                </Button>
              </div>
            )}
          </div>
          {previewFile && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {formatFileSize(previewFile.size)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open(previewFile.url, "_blank")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button asChild>
                  <a href={previewFile.url} download={previewFile.name}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
