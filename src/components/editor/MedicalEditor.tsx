"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Save, 
  Download, 
  Share2, 
  Sparkles,
  FileText,
  Lightbulb,
  Plus,
  Search as SearchIcon,
  Send,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  MoreHorizontal,
  Eye,
  Edit3,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  RefreshCw,
  Zap,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { AutocompleteEngine } from "./features/AutocompleteEngine";
import { CitationManager } from "./features/CitationManager";
import { ParaphraserTool } from "./features/ParaphraserTool";
import { WritingTemplates } from "./features/WritingTemplates";
import { CitationGenerator } from "./features/CitationGenerator";
import { EditorOnboarding } from "./EditorOnboarding";
import { FeatureAnnouncementBanner, NewFeatureBadge } from "./FeatureTooltips";
import { DiffViewer } from "./DiffViewer";
import { FileManagerPanel, FilePicker } from "@/features/file-manager/components";
import type { UserFile } from "@/features/file-manager/types";

// Convert markdown to HTML
async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  return String(result);
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action: string;
}

export function MedicalEditor() {
  const searchParams = useSearchParams();
  const fileId = searchParams?.get("fileId");
  
  const [documentId, setDocumentId] = useState<string | null>(fileId);
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true); // Enable edit mode by default
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("Normal");
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(true);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  
  // Diff viewer state
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [suggestedContent, setSuggestedContent] = useState("");
  const [contentHistory, setContentHistory] = useState<string[]>([]);

  // SciSpace-like features state
  const [showCitationManager, setShowCitationManager] = useState(false);
  const [showParaphraser, setShowParaphraser] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCitationGenerator, setShowCitationGenerator] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
  
  // Feature discovery
  const [showNewBadges, setShowNewBadges] = useState(true);
  
  useEffect(() => {
    // Hide badges after 7 days
    const badgesDismissed = localStorage.getItem("feature-badges-dismissed");
    if (badgesDismissed) {
      const dismissedDate = new Date(badgesDismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setShowNewBadges(true);
      } else {
        setShowNewBadges(false);
      }
    }
  }, []);

  const quickActions: QuickAction[] = [
    { icon: <FileText className="w-4 h-4" />, label: "Generate Paper", action: "generate_paper" },
    { icon: <Sparkles className="w-4 h-4" />, label: "Generate Case Study", action: "generate_case_study" },
    { icon: <Lightbulb className="w-4 h-4" />, label: "Continue Writing", action: "continue_writing" },
    { icon: <Lightbulb className="w-4 h-4" />, label: "Improve Section", action: "improve_section" },
    { icon: <SearchIcon className="w-4 h-4" />, label: "Add Citations", action: "add_citations" },
    { icon: <Plus className="w-4 h-4" />, label: "Add Section", action: "add_section" },
  ];

  useEffect(() => {
    // First check if there's content from localStorage (from paraphraser, manuscript review, etc.)
    const storedContent = localStorage.getItem("editorContent");
    const storedTitle = localStorage.getItem("editorTitle");
    
    if (storedContent) {
      console.log("📝 Loading content from localStorage...");
      setContent(storedContent);
      if (storedTitle) {
        setTitle(storedTitle);
      }
      // Clear localStorage after loading
      localStorage.removeItem("editorContent");
      localStorage.removeItem("editorTitle");
    } else if (fileId) {
      // Otherwise load from file ID
      loadFile(fileId);
    }
  }, [fileId]);

  useEffect(() => {
    if (aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages]);

  useEffect(() => {
    if (editorRef.current) {
      // Only update if content is different to avoid cursor jumping
      if (editorRef.current.innerHTML !== content) {
        // Save cursor position
        const selection = window.getSelection();
        let cursorPosition = 0;
        
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(editorRef.current);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          cursorPosition = preCaretRange.toString().length;
        }
        
        // Update content
        editorRef.current.innerHTML = content || '<p>Start typing your medical document...</p>';
        
        // Restore cursor position
        if (cursorPosition > 0 && editorRef.current) {
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            let charCount = 0;
            const nodeStack: Node[] = [editorRef.current];
            let node: Node | undefined;
            let foundStart = false;
            
            while (!foundStart && (node = nodeStack.pop())) {
              if (node.nodeType === Node.TEXT_NODE) {
                const nextCharCount = charCount + (node.textContent?.length || 0);
                if (cursorPosition <= nextCharCount) {
                  range.setStart(node, cursorPosition - charCount);
                  range.collapse(true);
                  foundStart = true;
                } else {
                  charCount = nextCharCount;
                }
              } else {
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                  const childNode = node.childNodes[i];
                  if (childNode) {
                    nodeStack.push(childNode);
                  }
                }
              }
            }
            
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch (e) {
            // Cursor restoration failed, ignore
            console.warn('Failed to restore cursor position:', e);
          }
        }
      }
    }
  }, [content]);

  const loadFile = async (id: string) => {
    try {
      const response = await fetch(`/api/files/get/${id}`);
      const data = await response.json();
      
      let loadedContent = data.content || "";
      
      // Check if content is markdown (contains markdown syntax)
      const isMarkdown = loadedContent.includes('#') || 
                        loadedContent.includes('**') || 
                        loadedContent.includes('##') ||
                        loadedContent.includes('- ') ||
                        loadedContent.includes('* ');
      
      // Convert markdown to HTML if needed
      if (isMarkdown && !loadedContent.includes('<h1>') && !loadedContent.includes('<p>')) {
        console.log('📝 Converting markdown to HTML...');
        loadedContent = await markdownToHtml(loadedContent);
      }
      
      setContent(loadedContent);
      setTitle(data.title || "Untitled Document");
    } catch (error) {
      console.error("Error loading file:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("💾 Saving document...", { documentId, title });
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          title,
          content,
          type: "document",
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store document ID for future updates
        if (!documentId && data.fileId) {
          setDocumentId(data.fileId);
        }
        setLastSaved(new Date());
        console.log("✅ Document saved successfully:", data.fileId);
      } else {
        console.error("❌ Failed to save:", data.error);
        alert("Failed to save document. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Error saving document. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      console.log('📥 Downloading DOCX...');
      
      // Send to server for proper DOCX conversion
      const response = await fetch('/api/editor/convert/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert to DOCX');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      console.log('📥 Generating PDF...');
      
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container and strip out all CSS classes
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Remove all class attributes and inline styles that might affect color
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        el.removeAttribute('class');
        el.removeAttribute('style');
      });
      
      // Get cleaned HTML
      const cleanedContent = tempDiv.innerHTML;
      
      // Create final element with proper PDF styling
      const element = document.createElement('div');
      element.innerHTML = `
        <style>
          * { color: #000 !important; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; }
          
          /* Headings - prevent page breaks after */
          h1 { 
            font-size: 24pt; 
            font-weight: bold; 
            text-align: center; 
            margin-bottom: 24pt; 
            color: #000 !important; 
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          h2 { 
            font-size: 18pt; 
            font-weight: bold; 
            margin-top: 18pt; 
            margin-bottom: 12pt; 
            color: #000 !important; 
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          h3 { 
            font-size: 14pt; 
            font-weight: bold; 
            margin-top: 12pt; 
            margin-bottom: 6pt; 
            color: #000 !important; 
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          /* Paragraphs - control orphans and widows */
          p { 
            text-align: justify; 
            margin-bottom: 12pt; 
            color: #000 !important; 
            orphans: 3;
            widows: 3;
            page-break-inside: avoid;
          }
          
          /* Lists */
          ul, ol { 
            margin-left: 0.5in; 
            margin-bottom: 12pt; 
            page-break-inside: avoid;
          }
          li { 
            margin-bottom: 6pt; 
            color: #000 !important; 
            page-break-inside: avoid;
          }
          
          /* Text formatting */
          strong, b { font-weight: bold; color: #000 !important; }
          em, i { font-style: italic; color: #000 !important; }
          
          /* Tables - prevent splitting */
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin-bottom: 12pt; 
            page-break-inside: avoid;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 6pt; 
            text-align: left; 
            color: #000 !important; 
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
          }
          
          /* Prevent breaking inside these elements */
          blockquote, pre, code {
            page-break-inside: avoid;
          }
        </style>
        <div>
          <h1>${title}</h1>
          ${cleanedContent}
        </div>
      `;
      
      // Configure PDF options
      const opt = {
        margin: [1, 1, 1, 1] as [number, number, number, number], // 1 inch margins
        filename: `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };
      
      // Generate and download PDF
      await html2pdf().set(opt).from(element).save();
      
      setShowDownloadMenu(false);
      console.log('✅ PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim() || isAiLoading) return;

    const userMessage = aiQuery.trim();
    setAiQuery("");
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/editor/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage,
          context: content,
        }),
      });

      const data = await response.json();
      
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || "I can help you with your medical document. What would you like to do?"
      }]);

      // If AI suggests content, show diff viewer
      if (data.suggestedContent) {
        setOriginalContent(content);
        // For edit requests, replace content; for add requests, append
        const newContent = data.suggestedContent.includes("#") || data.suggestedContent.includes("##")
          ? data.suggestedContent // If it has markdown headers, it's likely a full replacement
          : content + "\n\n" + data.suggestedContent; // Otherwise append
        setSuggestedContent(newContent);
        setShowDiffViewer(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble processing your request. Please try again."
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsAiLoading(true);
    setAiMessages(prev => [...prev, { role: "user", content: `Action: ${action}` }]);

    try {
      const response = await fetch("/api/editor/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action,
          context: content,
        }),
      });

      const data = await response.json();
      
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || "Action completed."
      }]);

      if (data.suggestedContent) {
        setOriginalContent(content);
        setSuggestedContent(content + "\n\n" + data.suggestedContent);
        setShowDiffViewer(true);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptChanges = async () => {
    setContentHistory(prev => [...prev, content]);
    
    // Convert markdown to HTML before inserting
    const htmlContent = await markdownToHtml(suggestedContent);
    
    setContent(htmlContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
    setShowDiffViewer(false);
  };

  const handleRejectChanges = () => {
    setShowDiffViewer(false);
  };

  const handleUndoChange = () => {
    if (contentHistory.length > 0) {
      const previousContent = contentHistory[contentHistory.length - 1];
      if (previousContent !== undefined) {
        setContent(previousContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = previousContent;
        }
        setContentHistory(prev => prev.slice(0, -1));
      }
    }
  };

  // Formatting functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    switch(format) {
      case "Heading 1":
        execCommand("formatBlock", "<h1>");
        break;
      case "Heading 2":
        execCommand("formatBlock", "<h2>");
        break;
      case "Heading 3":
        execCommand("formatBlock", "<h3>");
        break;
      case "Normal":
        execCommand("formatBlock", "<p>");
        break;
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      
      // Track cursor position for autocomplete
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        setCursorPosition(preCaretRange.toString().length);
      }
    }
  };

  // Handle file insertion into editor
  const handleFileInsert = (file: UserFile) => {
    if (!editorRef.current) return;
    
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.fileType);
    
    let insertHtml = "";
    if (isImage) {
      insertHtml = `<img src="${file.fileUrl}" alt="${file.filename}" style="max-width: 100%; height: auto; margin: 1rem 0;" />`;
    } else {
      insertHtml = `<a href="${file.fileUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">${file.filename}</a>`;
    }
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const fragment = range.createContextualFragment(insertHtml);
      range.insertNode(fragment);
      range.collapse(false);
    } else {
      editorRef.current.innerHTML += insertHtml;
    }
    
    setContent(editorRef.current.innerHTML);
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Onboarding Tour */}
      <EditorOnboarding />
      
      {/* Files Panel - Left Sidebar */}
      <AnimatePresence>
        {showFilesPanel && (
          <motion.div
            initial={{ opacity: 0, x: -20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 280 }}
            exit={{ opacity: 0, x: -20, width: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:flex border-r border-border bg-card flex-col overflow-hidden"
          >
            <FileManagerPanel
              onFileSelect={(file) => {
                console.log("Selected file:", file);
              }}
              onFileInsert={handleFileInsert}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-border bg-background px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none max-w-md"
              placeholder="Untitled Document"
            />
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant={isEditMode ? "default" : "ghost"} 
              size="sm" 
              className="gap-2"
              onClick={() => setIsEditMode(true)}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
            <Button 
              variant={!isEditMode ? "default" : "ghost"} 
              size="sm" 
              className="gap-2"
              onClick={() => setIsEditMode(false)}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button 
              variant={showAiAssistant ? "default" : "ghost"}
              size="sm" 
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className="gap-2"
            >
              {showAiAssistant ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              Bio Agent
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="w-4 h-4" />
              Templates
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 text-green-600 hover:text-green-700"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadDOCX}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Actions - Compact Icons */}
          <div className="flex md:hidden items-center gap-1">
            <Button 
              variant={isEditMode ? "default" : "ghost"} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsEditMode(true)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button 
              variant={!isEditMode ? "default" : "ghost"} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsEditMode(false)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              variant={showAiAssistant ? "default" : "ghost"}
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowAiAssistant(!showAiAssistant)}
            >
              {showAiAssistant ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowTemplates(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadDOCX}>
                  <Download className="w-4 h-4 mr-2" />
                  Download DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Formatting Toolbar */}
        <div className="border-b border-border bg-background px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {/* Format Dropdown */}
          <select 
            value={selectedFormat}
            onChange={(e) => handleFormatChange(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Normal</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
          </select>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Text Formatting */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("bold")}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("italic")}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("underline")}>
            <Underline className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("strikeThrough")}>
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Alignment */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Lists */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Other */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("formatBlock", "<blockquote>")}>
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("formatBlock", "<pre>")}>
            <Code className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("createLink", prompt("Enter URL:") || "")}>
            <Link className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertImage", prompt("Enter image URL:") || "")}>
            <Image className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* SciSpace-like Features */}
          <div className="relative flex flex-col items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setShowCitationManager(true)}
              title="Add Citation (NEW!)"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            <span className="text-[9px] text-muted-foreground mt-0.5">Ai Citation</span>
            {showNewBadges && <NewFeatureBadge />}
          </div>
          <div className="relative flex flex-col items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => {
                const selection = window.getSelection();
                const selected = selection?.toString();
                if (selected && selected.trim()) {
                  setSelectedText(selected);
                  setShowParaphraser(true);
                } else {
                  alert('Please select some text to paraphrase');
                }
              }}
              title="Paraphrase Selected Text (NEW!)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <span className="text-[9px] text-muted-foreground mt-0.5">Ai Paraphrase</span>
            {showNewBadges && <NewFeatureBadge />}
          </div>
          <div className="relative flex flex-col items-center">
            <Button 
              variant={autocompleteEnabled ? "default" : "ghost"} 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setAutocompleteEnabled(!autocompleteEnabled)}
              title={autocompleteEnabled ? "Disable AI Autocomplete (NEW!)" : "Enable AI Autocomplete (NEW!)"}
            >
              <Zap className="h-4 w-4" />
            </Button>
            <span className="text-[9px] text-muted-foreground mt-0.5">Autocomplete</span>
            {showNewBadges && <NewFeatureBadge />}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg overflow-hidden border border-border"
          >
            {/* Document Info Bar */}
            <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Document Editor</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {content.replace(/<[^>]*>/g, '').length} characters
              </span>
            </div>

            {/* Content Area - Editable or Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditMode ? (
                /* Editable Mode - Rich Text Editor */
                <div
                  ref={editorRef}
                  contentEditable={true}
                  suppressContentEditableWarning
                  onInput={(e) => setContent(e.currentTarget.innerHTML)}
                  className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] focus:outline-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_strong]:font-bold [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:p-2"
                  style={{ direction: 'ltr', unicodeBidi: 'normal' }}
                />
              ) : (
                /* Preview Mode - Rendered HTML */
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_strong]:font-bold [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:p-2"
                  dangerouslySetInnerHTML={{ __html: content || '<p className="text-muted-foreground">Start typing your medical document...</p>' }}
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Medical Assistant Sidebar - Desktop: sidebar, Mobile: overlay */}
      <AnimatePresence>
        {showAiAssistant && (
          <motion.div 
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 384 }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:flex border-l border-border bg-card flex-col overflow-hidden"
          >
        {/* AI Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold">AI Medical Assistant</h2>
          </div>
        </div>

        {/* AI Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {aiMessages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  💡 <strong>Quick Tips:</strong><br/>
                  • Ask me to "edit the introduction" or "add citations"<br/>
                  • Say "change the tone to more formal" to modify text<br/>
                  • I'll show you a diff viewer to review all changes before applying them!
                </p>
              </motion.div>
            )}
            {aiMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground ml-4" 
                    : "bg-accent mr-4"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </motion.div>
            ))}
            {isAiLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-accent mr-4"
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={aiMessagesEndRef} />
        </div>

        {/* AI Input */}
        <div className="p-4 border-t border-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me anything about your medical document..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAiQuery()}
              className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={isAiLoading}
            />
            <button
              onClick={handleAiQuery}
              disabled={isAiLoading || !aiQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Medical Assistant - Mobile Bottom Sheet */}
      <AnimatePresence>
        {showAiAssistant && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowAiAssistant(false)}
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-border rounded-full" />
              </div>
              
              {/* AI Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-semibold">AI Medical Assistant</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowAiAssistant(false)}
                >
                  <PanelRightClose className="w-4 h-4" />
                </Button>
              </div>

              {/* AI Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {aiMessages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        💡 <strong>Quick Tips:</strong><br/>
                        • Ask me to "edit the introduction" or "add citations"<br/>
                        • Say "change the tone to more formal" to modify text<br/>
                        • I'll show you a diff viewer to review all changes before applying them!
                      </p>
                    </motion.div>
                  )}
                  {aiMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${
                        message.role === "user" 
                          ? "bg-primary text-primary-foreground ml-4" 
                          : "bg-accent mr-4"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </motion.div>
                  ))}
                  {isAiLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-accent mr-4"
                    >
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={aiMessagesEndRef} />
              </div>

              {/* AI Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ask me anything..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAiQuery()}
                    className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    disabled={isAiLoading}
                  />
                  <button
                    onClick={handleAiQuery}
                    disabled={isAiLoading || !aiQuery.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Diff Viewer Modal */}
      {showDiffViewer && (
        <DiffViewer
          originalText={originalContent}
          suggestedText={suggestedContent}
          onAccept={handleAcceptChanges}
          onReject={handleRejectChanges}
          onClose={() => setShowDiffViewer(false)}
        />
      )}

      {/* AI Autocomplete Engine */}
      <AutocompleteEngine
        content={content}
        cursorPosition={cursorPosition}
        onAccept={(suggestion) => {
          const newContent = content + " " + suggestion;
          setContent(newContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = newContent;
          }
        }}
        enabled={autocompleteEnabled}
      />

      {/* Citation Manager Modal */}
      {showCitationManager && (
        <CitationManager
          onInsert={(citation) => {
            const newContent = content + "\n\n" + citation;
            setContent(newContent);
            if (editorRef.current) {
              editorRef.current.innerHTML = newContent;
            }
            setShowCitationManager(false);
          }}
          onClose={() => setShowCitationManager(false)}
        />
      )}

      {/* Paraphraser Tool Modal */}
      {showParaphraser && (
        <ParaphraserTool
          selectedText={selectedText}
          onReplace={(newText) => {
            // Replace selected text with paraphrased version
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(newText));
              
              // Update content state
              if (editorRef.current) {
                setContent(editorRef.current.innerHTML);
              }
            }
            setShowParaphraser(false);
          }}
          onClose={() => setShowParaphraser(false)}
        />
      )}

      {/* Writing Templates Modal */}
      {showTemplates && (
        <WritingTemplates
          onSelect={async (templateContent) => {
            // Convert markdown template to HTML
            const htmlTemplate = await markdownToHtml(templateContent);
            const newContent = content + "\n\n" + htmlTemplate;
            setContent(newContent);
            if (editorRef.current) {
              editorRef.current.innerHTML = newContent;
            }
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Citation Generator Modal */}
      {showCitationGenerator && (
        <CitationGenerator
          onClose={() => setShowCitationGenerator(false)}
        />
      )}

      {/* File Picker Modal */}
      <FilePicker
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onSelect={handleFileInsert}
        title="Insert File"
      />
    </div>
  );
}
