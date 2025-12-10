"use client";

import { useState } from "react";
import { AppLayout } from "@/components/home/AppLayout";
import { motion } from "framer-motion";
import { BookOpen, Copy, Check, Download, FileText, Globe, Book, GraduationCap, ScrollText, Layers, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

type SourceType = "journal" | "book" | "thesis" | "webpage" | "report" | "book-chapter" | "custom";
type CitationStyle = "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE";

interface CitationData {
  // Common fields
  title: string;
  authors: string;
  year: string;
  url?: string;
  doi?: string;
  
  // Journal specific
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  
  // Book specific
  publisher?: string;
  publisherPlace?: string;
  edition?: string;
  editors?: string;
  
  // Thesis specific
  thesisType?: string;
  university?: string;
  
  // Webpage specific
  websiteTitle?: string;
  accessDate?: string;
  publishDate?: string;
  
  // Report specific
  reportNumber?: string;
  
  // Book Chapter specific
  bookTitle?: string;
  chapterTitle?: string;
  medium?: string;
  source?: string;
  
  // Custom text
  customText?: string;
}

export default function CitationGeneratorPage() {
  const [sourceType, setSourceType] = useState<SourceType>("journal");
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [citationData, setCitationData] = useState<CitationData>({
    title: "",
    authors: "",
    year: "",
  });
  const [generatedCitation, setGeneratedCitation] = useState("");
  const [copied, setCopied] = useState(false);

  const sourceTypes = [
    { id: "journal" as SourceType, name: "Journal Article", icon: <FileText className="w-4 h-4" /> },
    { id: "book" as SourceType, name: "Book", icon: <Book className="w-4 h-4" /> },
    { id: "thesis" as SourceType, name: "Thesis", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "webpage" as SourceType, name: "Webpage", icon: <Globe className="w-4 h-4" /> },
    { id: "report" as SourceType, name: "Report", icon: <ScrollText className="w-4 h-4" /> },
    { id: "book-chapter" as SourceType, name: "Book Chapter", icon: <Layers className="w-4 h-4" /> },
    { id: "custom" as SourceType, name: "Custom Text", icon: <Type className="w-4 h-4" /> },
  ];

  const updateField = (field: keyof CitationData, value: string) => {
    setCitationData(prev => ({ ...prev, [field]: value }));
  };

  const generateCitation = () => {
    // For custom text, just use the input directly
    if (sourceType === "custom") {
      setGeneratedCitation(citationData.customText || "");
      return;
    }
    
    const authorList = citationData.authors.split(",").map(a => a.trim()).filter(Boolean);
    
    let citation = "";
    
    switch (style) {
      case "APA":
        citation = generateAPA(authorList);
        break;
      case "MLA":
        citation = generateMLA(authorList);
        break;
      case "Chicago":
        citation = generateChicago(authorList);
        break;
      case "Harvard":
        citation = generateHarvard(authorList);
        break;
      case "IEEE":
        citation = generateIEEE(authorList);
        break;
    }
    
    setGeneratedCitation(citation);
  };

  const generateAPA = (authors: string[]) => {
    const authorsStr = formatAuthorsAPA(authors);
    let citation = `${authorsStr} (${citationData.year}). ${citationData.title}.`;
    
    if (sourceType === "journal") {
      if (citationData.journal) citation += ` ${citationData.journal}`;
      if (citationData.volume) citation += `, ${citationData.volume}`;
      if (citationData.issue) citation += `(${citationData.issue})`;
      if (citationData.pages) citation += `, ${citationData.pages}`;
    } else if (sourceType === "book") {
      if (citationData.publisher) citation += ` ${citationData.publisher}`;
    } else if (sourceType === "thesis") {
      if (citationData.thesisType) citation += ` [${citationData.thesisType}]`;
      if (citationData.university) citation += `. ${citationData.university}`;
    } else if (sourceType === "webpage") {
      if (citationData.websiteTitle) citation += ` ${citationData.websiteTitle}`;
      if (citationData.accessDate) citation += `. Retrieved ${citationData.accessDate}`;
    } else if (sourceType === "report") {
      if (citationData.reportNumber) citation += ` (Report No. ${citationData.reportNumber})`;
      if (citationData.publisher) citation += `. ${citationData.publisher}`;
    } else if (sourceType === "book-chapter") {
      if (citationData.bookTitle) citation += ` In ${citationData.bookTitle}`;
      if (citationData.pages) citation += ` (pp. ${citationData.pages})`;
      if (citationData.publisher) citation += `. ${citationData.publisher}`;
    }
    
    if (citationData.doi) citation += `. https://doi.org/${citationData.doi}`;
    else if (citationData.url) citation += `. ${citationData.url}`;
    
    return citation;
  };

  const generateMLA = (authors: string[]) => {
    const authorsStr = formatAuthorsMLA(authors);
    let citation = `${authorsStr}. "${citationData.title}."`;
    
    if (sourceType === "journal") {
      if (citationData.journal) citation += ` ${citationData.journal}`;
      if (citationData.volume) citation += `, vol. ${citationData.volume}`;
      if (citationData.issue) citation += `, no. ${citationData.issue}`;
      if (citationData.year) citation += `, ${citationData.year}`;
      if (citationData.pages) citation += `, pp. ${citationData.pages}`;
    } else if (sourceType === "book") {
      if (citationData.publisher) citation += ` ${citationData.publisher}`;
      if (citationData.year) citation += `, ${citationData.year}`;
    } else if (sourceType === "webpage") {
      if (citationData.websiteTitle) citation += ` ${citationData.websiteTitle}`;
      if (citationData.publishDate) citation += `, ${citationData.publishDate}`;
    }
    
    if (citationData.url) citation += `. ${citationData.url}`;
    return citation + ".";
  };

  const generateChicago = (authors: string[]) => {
    const authorsStr = formatAuthorsChicago(authors);
    let citation = `${authorsStr}. "${citationData.title}."`;
    
    if (sourceType === "journal") {
      if (citationData.journal) citation += ` ${citationData.journal}`;
      if (citationData.volume) citation += ` ${citationData.volume}`;
      if (citationData.issue) citation += `, no. ${citationData.issue}`;
      if (citationData.year) citation += ` (${citationData.year})`;
      if (citationData.pages) citation += `: ${citationData.pages}`;
    } else if (sourceType === "book") {
      if (citationData.publisherPlace) citation += ` ${citationData.publisherPlace}`;
      if (citationData.publisher) citation += `: ${citationData.publisher}`;
      if (citationData.year) citation += `, ${citationData.year}`;
    }
    
    if (citationData.doi) citation += `. https://doi.org/${citationData.doi}`;
    return citation + ".";
  };

  const generateHarvard = (authors: string[]) => {
    const authorsStr = formatAuthorsHarvard(authors);
    let citation = `${authorsStr}, ${citationData.year}. ${citationData.title}.`;
    
    if (sourceType === "journal") {
      if (citationData.journal) citation += ` ${citationData.journal}`;
      if (citationData.volume) citation += `, ${citationData.volume}`;
      if (citationData.issue) citation += `(${citationData.issue})`;
      if (citationData.pages) citation += `, pp.${citationData.pages}`;
    } else if (sourceType === "book") {
      if (citationData.publisherPlace) citation += ` ${citationData.publisherPlace}`;
      if (citationData.publisher) citation += `: ${citationData.publisher}`;
    }
    
    if (citationData.url) citation += `. Available at: ${citationData.url}`;
    return citation;
  };

  const generateIEEE = (authors: string[]) => {
    const authorsStr = formatAuthorsIEEE(authors);
    let citation = `${authorsStr}, "${citationData.title},"`;
    
    if (sourceType === "journal") {
      if (citationData.journal) citation += ` ${citationData.journal}`;
      if (citationData.volume) citation += `, vol. ${citationData.volume}`;
      if (citationData.issue) citation += `, no. ${citationData.issue}`;
      if (citationData.pages) citation += `, pp. ${citationData.pages}`;
      if (citationData.year) citation += `, ${citationData.year}`;
    } else if (sourceType === "book") {
      if (citationData.publisher) citation += ` ${citationData.publisher}`;
      if (citationData.year) citation += `, ${citationData.year}`;
    }
    
    if (citationData.doi) citation += `, doi: ${citationData.doi}`;
    return citation + ".";
  };

  const formatAuthorsAPA = (authors: string[]) => {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]}, & ${authors[1]}`;
    return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
  };

  const formatAuthorsMLA = (authors: string[]) => {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    return `${authors[0]}, et al`;
  };

  const formatAuthorsChicago = (authors: string[]) => {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    return `${authors[0]}, et al`;
  };

  const formatAuthorsHarvard = (authors: string[]) => {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    return `${authors[0]} et al.`;
  };

  const formatAuthorsIEEE = (authors: string[]) => {
    if (authors.length === 0) return "";
    if (authors.length === 1) return authors[0];
    if (authors.length <= 3) return authors.join(", ");
    return `${authors[0]} et al.`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([generatedCitation], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation-${style.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSourceFields = () => {
    switch (sourceType) {
      case "journal":
        return (
          <>
            <InputField label="Journal Name" value={citationData.journal || ""} onChange={(v) => updateField("journal", v)} />
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Volume" value={citationData.volume || ""} onChange={(v) => updateField("volume", v)} />
              <InputField label="Issue" value={citationData.issue || ""} onChange={(v) => updateField("issue", v)} />
              <InputField label="Pages" value={citationData.pages || ""} onChange={(v) => updateField("pages", v)} placeholder="123-145" />
            </div>
          </>
        );
      
      case "book":
        return (
          <>
            <InputField label="Publisher Name" value={citationData.publisher || ""} onChange={(v) => updateField("publisher", v)} />
            <InputField label="Publisher Place" value={citationData.publisherPlace || ""} onChange={(v) => updateField("publisherPlace", v)} placeholder="New York, NY" />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Edition" value={citationData.edition || ""} onChange={(v) => updateField("edition", v)} placeholder="2nd" />
              <InputField label="Editors Name" value={citationData.editors || ""} onChange={(v) => updateField("editors", v)} />
            </div>
          </>
        );
      
      case "thesis":
        return (
          <>
            <InputField label="Thesis Type" value={citationData.thesisType || ""} onChange={(v) => updateField("thesisType", v)} placeholder="Doctoral dissertation" />
            <InputField label="University/Institution Name" value={citationData.university || ""} onChange={(v) => updateField("university", v)} />
          </>
        );
      
      case "webpage":
        return (
          <>
            <InputField label="Website Title" value={citationData.websiteTitle || ""} onChange={(v) => updateField("websiteTitle", v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Date Published" value={citationData.publishDate || ""} onChange={(v) => updateField("publishDate", v)} placeholder="YYYY-MM-DD" />
              <InputField label="Date Accessed" value={citationData.accessDate || ""} onChange={(v) => updateField("accessDate", v)} placeholder="YYYY-MM-DD" />
            </div>
          </>
        );
      
      case "report":
        return (
          <>
            <InputField label="Report Title" value={citationData.title} onChange={(v) => updateField("title", v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Publisher Name" value={citationData.publisher || ""} onChange={(v) => updateField("publisher", v)} />
              <InputField label="Publisher Place" value={citationData.publisherPlace || ""} onChange={(v) => updateField("publisherPlace", v)} />
            </div>
          </>
        );
      
      case "book-chapter":
        return (
          <>
            <InputField label="Book Chapter Title" value={citationData.chapterTitle || ""} onChange={(v) => updateField("chapterTitle", v)} />
            <InputField label="Book Title" value={citationData.bookTitle || ""} onChange={(v) => updateField("bookTitle", v)} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Publisher Name" value={citationData.publisher || ""} onChange={(v) => updateField("publisher", v)} />
              <InputField label="Editors Name" value={citationData.editors || ""} onChange={(v) => updateField("editors", v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Edition" value={citationData.edition || ""} onChange={(v) => updateField("edition", v)} />
              <InputField label="Pages" value={citationData.pages || ""} onChange={(v) => updateField("pages", v)} />
              <InputField label="Volume" value={citationData.volume || ""} onChange={(v) => updateField("volume", v)} />
            </div>
          </>
        );
      
      case "custom":
        return (
          <div>
            <label className="text-sm font-medium mb-1 block">
              Custom Citation Text <span className="text-destructive">*</span>
            </label>
            <textarea
              value={citationData.customText || ""}
              onChange={(e) => updateField("customText", e.target.value)}
              placeholder="Enter your pre-formatted citation text here..."
              rows={6}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Paste your already-formatted citation or type it manually. This will be used as-is without any formatting changes.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Citation Generator</h1>
                <p className="text-muted-foreground">Generate formatted citations in multiple styles</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Input Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Source Type Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <h2 className="text-lg font-semibold mb-4">Source Type</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {sourceTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSourceType(type.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                        sourceType === type.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type.icon}
                      <span className="text-sm font-medium">{type.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Citation Style - Hide for custom text */}
              {sourceType !== "custom" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <h2 className="text-lg font-semibold mb-4">Citation Style</h2>
                  <div className="flex gap-2 flex-wrap">
                    {(["APA", "MLA", "Chicago", "Harvard", "IEEE"] as CitationStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-4 py-2 text-sm rounded-lg transition ${
                          style === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent hover:bg-accent/80"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Input Fields */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-6 space-y-4"
              >
                <h2 className="text-lg font-semibold mb-4">{sourceType === "custom" ? "Custom Citation" : "Citation Details"}</h2>
                
                {/* Common Fields - Hide for custom text */}
                {sourceType !== "custom" && (
                  <>
                    <InputField 
                      label={sourceType === "book-chapter" ? "Book Chapter Title" : sourceType === "report" ? "Report Title" : "Title"} 
                      value={citationData.title} 
                      onChange={(v) => updateField("title", v)} 
                      required 
                    />
                    <InputField 
                      label="Contributing Authors" 
                      value={citationData.authors} 
                      onChange={(v) => updateField("authors", v)} 
                      placeholder="Smith, J., Johnson, A." 
                      hint="Comma-separated"
                      required 
                    />
                    <InputField 
                      label={sourceType === "webpage" ? "Publication Date" : "Year"} 
                      value={citationData.year} 
                      onChange={(v) => updateField("year", v)} 
                      placeholder={sourceType === "webpage" ? "YYYY-MM-DD" : "2024"}
                      required 
                    />
                  </>
                )}

                {/* Source-specific Fields */}
                {renderSourceFields()}

                {/* URL and DOI - Hide for custom text */}
                {sourceType !== "custom" && (
                  <>
                    <InputField label="URL" value={citationData.url || ""} onChange={(v) => updateField("url", v)} />
                    <InputField label="DOI" value={citationData.doi || ""} onChange={(v) => updateField("doi", v)} placeholder="10.1038/s41591-023-12345-6" />
                  </>
                )}

                {/* Generate Button */}
                <Button
                  onClick={generateCitation}
                  disabled={
                    sourceType === "custom" 
                      ? !citationData.customText 
                      : (!citationData.title || !citationData.authors || !citationData.year)
                  }
                  className="w-full mt-6"
                  size="lg"
                >
                  {sourceType === "custom" ? "Use Citation" : "Generate Citation"}
                </Button>
              </motion.div>
            </div>

            {/* Right Panel - Generated Citation */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-xl p-6 sticky top-6"
              >
                <h2 className="text-lg font-semibold mb-4">Generated Citation</h2>
                
                {generatedCitation ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      {sourceType !== "custom" && (
                        <p className="text-xs font-medium text-primary mb-2">{style} Format</p>
                      )}
                      <p className="text-sm leading-relaxed">{generatedCitation}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleCopy} variant="outline" className="flex-1">
                        {copied ? (
                          <><Check className="w-4 h-4 mr-2" /> Copied</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" /> Copy</>
                        )}
                      </Button>
                      <Button onClick={handleExport} variant="outline" className="flex-1">
                        <Download className="w-4 h-4 mr-2" /> Export
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {sourceType === "custom" 
                        ? "Enter your citation text and click \"Use Citation\"" 
                        : "Fill in the details and click \"Generate Citation\""}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  hint, 
  required 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string; 
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">
        {label} {required && <span className="text-destructive">*</span>}
        {hint && <span className="text-xs text-muted-foreground ml-2">({hint})</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
      />
    </div>
  );
}
