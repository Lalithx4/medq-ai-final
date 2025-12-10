"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Download, Trash2, Eye, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

interface SavedFile {
  id: string;
  title: string;
  type: "research-paper" | "deep-research" | "presentation" | "document" | "irb-draft" | "poster" | "personal-statement";
  createdAt: string;
  size: string;
}

export function FilesDashboard() {
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      console.log("📂 Fetching files from database...");
      const response = await fetch("/api/files/list");
      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Failed to fetch files:", data.error);
        if (data.error === "Unauthorized") {
          console.error("❌ User not authenticated. Please log in.");
        }
        setFiles([]);
        return;
      }
      
      console.log("✅ Files fetched successfully:", data.files?.length || 0, "files");
      setFiles(data.files || []);
    } catch (error) {
      console.error("❌ Error fetching files:", error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/files/delete/${id}`, { method: "DELETE" });
      setFiles(files.filter(f => f.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleDownload = async (fileId: string, title: string) => {
    try {
      // Fetch the file content
      const response = await fetch(`/api/files/get/${fileId}`);
      const data = await response.json();
      
      if (!data.content) {
        alert("File content not found");
        return;
      }

      // Convert to Word format
      const wordResponse = await fetch("/api/research-paper/convert/word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: data.content,
          title: title
        }),
      });

      if (!wordResponse.ok) throw new Error('Conversion failed');

      const blob = await wordResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case "research-paper":
      case "deep-research":
        return <FileText className="w-5 h-5 text-primary" />;
      case "presentation":
        return <FileText className="w-5 h-5 text-primary" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "research-paper":
        return "Research Paper";
      case "deep-research":
        return "Deep Research";
      case "presentation":
        return "Presentation";
      case "personal-statement":
        return "Personal Statement";
      default:
        return "Document";
    }
  };

  const getViewLink = (file: SavedFile) => {
    switch (file.type) {
      case "personal-statement":
        return `/personal-statement?fileId=${file.id}`;
      default:
        return `/editor?fileId=${file.id}`;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-8 py-6 border-b border-border bg-background"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                My Files
              </h1>
              <p className="text-sm text-muted-foreground">{files.length} documents saved</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </motion.header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">No Files Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery ? "No files match your search" : "Start creating research papers, deep research reports, or presentations to see them here"}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="bg-card border border-border rounded-lg p-5 hover:shadow-lg hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{file.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {getTypeLabel(file.type)}
                          </span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                          <span>{file.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={getViewLink(file)}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleDownload(file.id, file.title)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
