"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, X, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type CitationStyle = "APA" | "MLA" | "Chicago" | "Harvard" | "IEEE";

interface CitationGeneratorProps {
  onClose: () => void;
}

export function CitationGenerator({ onClose }: CitationGeneratorProps) {
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [inputType, setInputType] = useState<"manual" | "doi" | "url">("manual");
  
  // Manual input fields
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [journal, setJournal] = useState("");
  const [volume, setVolume] = useState("");
  const [pages, setPages] = useState("");
  const [doi, setDoi] = useState("");
  const [url, setUrl] = useState("");
  
  const [generatedCitation, setGeneratedCitation] = useState("");
  const [copied, setCopied] = useState(false);

  const generateCitation = () => {
    const authorList = authors.split(",").map(a => a.trim()).filter(Boolean);
    
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

  const generateAPA = (authorList: string[]) => {
    const authorsStr = formatAuthorsAPA(authorList);
    let citation = `${authorsStr} (${year}). ${title}.`;
    if (journal) citation += ` ${journal}`;
    if (volume) citation += `, ${volume}`;
    if (pages) citation += `, ${pages}`;
    if (doi) citation += `. https://doi.org/${doi}`;
    else if (url) citation += `. ${url}`;
    return citation;
  };

  const generateMLA = (authorList: string[]) => {
    const authorsStr = formatAuthorsMLA(authorList);
    let citation = `${authorsStr}. "${title}."`;
    if (journal) citation += ` ${journal}`;
    if (volume) citation += `, vol. ${volume}`;
    if (year) citation += `, ${year}`;
    if (pages) citation += `, pp. ${pages}`;
    if (url) citation += `. ${url}`;
    return citation + ".";
  };

  const generateChicago = (authorList: string[]) => {
    const authorsStr = formatAuthorsChicago(authorList);
    let citation = `${authorsStr}. "${title}."`;
    if (journal) citation += ` ${journal}`;
    if (volume) citation += ` ${volume}`;
    if (year) citation += ` (${year})`;
    if (pages) citation += `: ${pages}`;
    if (doi) citation += `. https://doi.org/${doi}`;
    return citation + ".";
  };

  const generateHarvard = (authorList: string[]) => {
    const authorsStr = formatAuthorsHarvard(authorList);
    let citation = `${authorsStr}, ${year}. ${title}.`;
    if (journal) citation += ` ${journal}`;
    if (volume) citation += `, ${volume}`;
    if (pages) citation += `, pp.${pages}`;
    if (url) citation += `. Available at: ${url}`;
    return citation;
  };

  const generateIEEE = (authorList: string[]) => {
    const authorsStr = formatAuthorsIEEE(authorList);
    let citation = `${authorsStr}, "${title},"`;
    if (journal) citation += ` ${journal}`;
    if (volume) citation += `, vol. ${volume}`;
    if (pages) citation += `, pp. ${pages}`;
    if (year) citation += `, ${year}`;
    if (doi) citation += `, doi: ${doi}`;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Citation Generator</h2>
                <p className="text-sm text-muted-foreground">
                  Generate formatted citations in multiple styles
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* Citation Style Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Citation Style</label>
            <div className="flex gap-2">
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
          </div>

          {/* Input Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article or book title"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Authors * <span className="text-xs text-muted-foreground">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Smith, J., Johnson, A., Williams, R."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Year *</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Journal/Publisher</label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="Nature Medicine"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Volume</label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="29"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pages</label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="123-145"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">DOI</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.1038/s41591-023-12345-6"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateCitation}
            disabled={!title || !authors || !year}
            className="w-full mb-6"
          >
            Generate Citation
          </Button>

          {/* Generated Citation */}
          {generatedCitation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <label className="text-sm font-medium block">Generated Citation ({style})</label>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                {generatedCitation}
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
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
