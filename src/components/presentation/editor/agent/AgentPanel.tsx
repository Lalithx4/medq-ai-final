"use client";

import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Bot, Check, Loader2, Send, X, Eye, FileText, Undo, RotateCcw, Undo2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MiniSlidePreview } from "./MiniSlidePreview";
import { analyzeSuggestions } from "./suggestion-analyzer";
import { type SmartSuggestion } from "./types";

export function AgentPanel() {
  const {
    isAgentOpen,
    agentInstruction,
    agentPreview,
    isAgentProcessing,
    slides,
    currentSlideIndex,
    theme,
    outline,
    modelProvider,
    modelId,
    agentHistory,
    setIsAgentOpen,
    setAgentInstruction,
    setAgentPreview,
    setIsAgentProcessing,
    acceptAgentEdit,
    rejectAgentEdit,
    clearAgentHistory,
    undoAgentEdit,
  } = usePresentationState();

  const [inputValue, setInputValue] = useState("");
  const [previewMode, setPreviewMode] = useState<'diff' | 'visual'>('visual');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [zoomedPreview, setZoomedPreview] = useState<'before' | 'after' | null>(null);

  // Smart suggestions
  const handleSuggestionAction = async (suggestionId: string) => {
    setInputValue(`Execute suggestion: ${suggestionId}`);
    // For now, just set the instruction - we'll implement actions later
    toast.info(`Suggestion "${suggestionId}" clicked. Full implementation coming soon!`);
  };

  const smartSuggestions = useMemo(() => {
    if (isAgentProcessing || !slides.length) return [];
    return analyzeSuggestions(slides, currentSlideIndex, handleSuggestionAction);
  }, [slides, currentSlideIndex, isAgentProcessing]);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Handle undo
  const handleUndo = (historyId: string, instruction: string) => {
    undoAgentEdit(historyId);
    toast.success(`Undone: "${instruction}"`);
  };

  // Handle image URL update
  const handleImageUrlUpdate = async () => {
    if (!imageUrl.trim()) {
      toast.error("Please enter a valid image URL");
      return;
    }

    try {
      const currentSlide = slides[currentSlideIndex];
      if (!currentSlide) {
        toast.error("No slide selected");
        return;
      }

      let finalUrl = imageUrl.trim();

      // Try to extract direct image URL from Google Images URL
      if (finalUrl.includes('google.com/imgres')) {
        const urlParams = new URLSearchParams(finalUrl.split('?')[1]);
        const directUrl = urlParams.get('imgurl');
        if (directUrl) {
          finalUrl = decodeURIComponent(directUrl);
          debug.log("🖼️ Extracted direct URL from Google Images:", finalUrl);
        }
      }

      debug.log("🖼️ Updating image URL:", finalUrl);
      debug.log("🖼️ Current slide:", currentSlide);

      // Update the slide with new image URL
      const updatedSlide = {
        ...currentSlide,
        rootImage: {
          url: finalUrl,
          query: "Custom image from URL",
        },
      };

      const newSlides = [...slides];
      newSlides[currentSlideIndex] = updatedSlide;

      debug.log("🖼️ Updated slide:", updatedSlide);
      debug.log("🖼️ New slides array:", newSlides);

      // Update state with timestamp to force editor reload
      const state = usePresentationState.getState();
      state.setSlides(newSlides);
      
      // Force editor to reload
      usePresentationState.setState({ agentEditTimestamp: Date.now() });

      // Save to database
      if (state.currentPresentationId) {
        debug.log("💾 Saving to database...");
        const { updatePresentation } = await import("@/app/_actions/presentation/presentationActions");
        await updatePresentation({
          id: state.currentPresentationId,
          content: {
            slides: newSlides,
            config: {},
          },
        });
        debug.log("✅ Saved to database");
      }

      toast.success("Image updated successfully!");
      setShowImageUrlInput(false);
      setImageUrl("");
    } catch (error) {
      console.error("❌ Failed to update image:", error);
      toast.error("Failed to update image");
    }
  };

  const handleSendInstruction = async () => {
    if (!inputValue.trim() || isAgentProcessing) return;

    const instruction = inputValue.trim();
    setInputValue("");
    setAgentInstruction(instruction);
    setIsAgentProcessing(true);

    try {
      const currentSlide = slides[currentSlideIndex];
      if (!currentSlide) {
        toast.error("No slide selected");
        setIsAgentProcessing(false);
        return;
      }

      debug.log("Sending agent edit request:", {
        instruction,
        slideId: currentSlide.id,
        modelProvider,
        modelId,
      });

      const response = await fetch("/api/presentation/agent-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          slideId: currentSlide.id,
          currentContent: currentSlide.content,
          presentationContext: {
            slides,
            theme,
            outline,
          },
          modelProvider,
          modelId,
        }),
      });

      debug.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to process edit");
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let chunks = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const decoded = decoder.decode(value, { stream: true });
          fullResponse += decoded;
          chunks.push(decoded);
        }
      }

      debug.log("Raw AI response:", fullResponse);
      debug.log("Raw response length:", fullResponse.length);
      debug.log("Number of chunks:", chunks.length);
      debug.log("First chunk:", chunks[0]?.substring(0, 200));

      // Parse the streaming response
      // Cerebras format: 0:"text"\n0:"more"\n
      let textContent = "";
      
      // Split by newlines and process each line
      const lines = fullResponse.split("\n");
      debug.log("Number of lines:", lines.length);

      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Check if line starts with 0:"
        if (line.startsWith('0:"')) {
          try {
            // Extract everything after '0:'
            const jsonPart = line.substring(2);
            // Parse the JSON string
            const parsed = JSON.parse(jsonPart);
            textContent += parsed;
          } catch (e) {
            debug.warn("Failed to parse line:", line.substring(0, 100), e);
          }
        }
      }

      debug.log("Extracted text content:", textContent);
      debug.log("Text content length:", textContent.length);
      
      // If still empty, try alternative parsing
      if (!textContent && fullResponse) {
        debug.log("Trying alternative parsing...");
        // Maybe the response is just plain text
        textContent = fullResponse.replace(/^0:"/gm, '').replace(/"\s*$/gm, '');
        debug.log("Alternative extracted:", textContent.substring(0, 200));
      }

      // Check if we got any response
      if (!textContent || textContent.trim() === "") {
        console.error("Empty response from API");
        toast.error("No response from AI. Please check your API keys and try again.");
        setIsAgentProcessing(false);
        return;
      }

      // Try to parse the accumulated text as JSON
      let parsedResponse;
      try {
        // First, try to find a complete JSON object with balanced braces
        let jsonStart = textContent.indexOf('{');
        if (jsonStart === -1) {
          throw new Error("No JSON object found in response");
        }

        // Find the matching closing brace
        let braceCount = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < textContent.length; i++) {
          if (textContent[i] === '{') braceCount++;
          if (textContent[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }

        if (jsonEnd === -1) {
          throw new Error("Incomplete JSON object in response");
        }

        const jsonStr = textContent.substring(jsonStart, jsonEnd);
        debug.log("Extracted JSON string:", jsonStr);
        
        parsedResponse = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse response:", textContent, e);
        console.error("First 500 chars:", textContent.substring(0, 500));
        toast.error("Failed to parse AI response. The AI might not have returned valid JSON. Check console for details.");
        setIsAgentProcessing(false);
        return;
      }

      debug.log("Parsed response:", parsedResponse);

      // Validate the response has required fields
      if (!parsedResponse.modifiedContent) {
        console.error("Response missing modifiedContent:", parsedResponse);
        toast.error("AI response is missing modified content. Please try again.");
        setIsAgentProcessing(false);
        return;
      }

      // Validate modifiedContent is an array
      if (!Array.isArray(parsedResponse.modifiedContent)) {
        console.error("modifiedContent is not an array:", parsedResponse.modifiedContent);
        toast.error("AI returned invalid content structure. Please try again.");
        setIsAgentProcessing(false);
        return;
      }

      debug.log("Modified content:", parsedResponse.modifiedContent);

      // Set the preview
      setAgentPreview({
        original: currentSlide,
        modified: {
          ...currentSlide,
          content: parsedResponse.modifiedContent,
        },
        plan: parsedResponse.plan || "Modified the slide as requested",
        changes: parsedResponse.changes || ["Content updated"],
      });

      toast.success("Edit preview ready!");
    } catch (error) {
      console.error("Agent edit error:", error);
      toast.error("Failed to process edit instruction");
    } finally {
      setIsAgentProcessing(false);
    }
  };

  const handleAccept = async () => {
    if (!agentPreview?.modified?.content || agentPreview.modified.content.length === 0) {
      toast.error("Cannot apply empty content. Please try a different instruction.");
      return;
    }
    debug.log("🔵 Accepting agent edit...", agentPreview);
    debug.log("🔵 Current slides before accept:", slides.length);
    
    try {
      await acceptAgentEdit();
      debug.log("🔵 Slides after accept:", usePresentationState.getState().slides.length);
      toast.success("Changes applied and saved!");
    } catch (error) {
      console.error("Failed to accept agent edit:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  };

  const handleReject = () => {
    rejectAgentEdit();
    toast.info("Changes discarded");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendInstruction();
    }
  };

  return (
    <>
      {/* Agent Panel - slides in only when button clicked */}
      <div 
        className={`fixed top-16 h-[calc(100vh-4rem)] w-80 bg-card border-l border-border shadow-lg z-40 flex flex-col transition-transform duration-300 ease-in-out ${
          isAgentOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ right: 0 }}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>BioAgent</h3>
        </div>
        <button
          onClick={() => setIsAgentOpen(false)}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && !agentPreview && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-purple-900">💡 Smart Suggestions</span>
            <span className="text-xs text-purple-600">
              Based on current slide
            </span>
          </div>
          
          <div className="space-y-2">
            {smartSuggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={suggestion.action}
                className="w-full text-left p-3 rounded-lg bg-white hover:bg-purple-50 border border-purple-200 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 group-hover:text-purple-600 transition-colors">
                      {suggestion.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {suggestion.description}
                    </div>
                  </div>
                  <span className="text-purple-400 group-hover:text-purple-600 transition-colors">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          {smartSuggestions.length > 3 && (
            <button className="text-xs text-purple-600 hover:underline mt-2">
              +{smartSuggestions.length - 3} more suggestions
            </button>
          )}
        </div>
      )}

      {/* Recent Edits History */}
      {agentHistory.length > 0 && !agentPreview && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">💬 Recent Edits</span>
              <span className="text-xs text-gray-500">
                {agentHistory.length} {agentHistory.length === 1 ? 'edit' : 'edits'}
              </span>
            </div>
            <button
              onClick={clearAgentHistory}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {agentHistory.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-purple-200 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-900 truncate">
                    • {item.instruction}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Slide {item.slideIndex + 1} · {formatTimeAgo(item.timestamp)}
                  </div>
                </div>
                <button
                  onClick={() => handleUndo(item.id, item.instruction)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-50 rounded"
                  title="Undo this edit"
                >
                  <Undo2 className="w-3 h-3 text-purple-600" />
                </button>
              </div>
            ))}
          </div>
          
          {agentHistory.length > 5 && (
            <button className="text-xs text-purple-600 hover:underline mt-2">
              +{agentHistory.length - 5} more edits
            </button>
          )}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message */}
        {!agentInstruction && !agentPreview && !showImageUrlInput && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              <Bot className="w-4 h-4 inline mr-1" />
              Hello! How can I assist you today with your presentation?
            </p>
            <p className="text-xs text-purple-700 mt-2">
              Try: "edit introduction", "change the title", "add more bullet points"
            </p>
            
            {/* Quick Action: Change Image from URL */}
            <button
              onClick={() => setShowImageUrlInput(true)}
              className="mt-3 w-full text-left p-2 rounded-lg bg-white hover:bg-purple-100 border border-purple-200 transition-all text-sm flex items-center gap-2"
            >
              <span className="text-lg">🖼️</span>
              <span className="text-purple-900 font-medium">Change image from URL</span>
            </button>
          </div>
        )}

        {/* Image URL Input */}
        {showImageUrlInput && !agentPreview && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-purple-900">
                🖼️ Update Image from URL
              </p>
              <button
                onClick={() => {
                  setShowImageUrlInput(false);
                  setImageUrl("");
                }}
                className="text-purple-600 hover:text-purple-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-xs text-purple-700 space-y-1">
              <p>Paste an image URL from <strong>Google Images, Unsplash, or any source</strong></p>
              <p className="text-purple-600">
                💡 Tip: Copy the full Google Images URL or right-click → "Copy image address"
              </p>
            </div>
            
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleImageUrlUpdate();
                }
              }}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleImageUrlUpdate}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                Update Image
              </Button>
              <Button
                onClick={() => {
                  setShowImageUrlInput(false);
                  setImageUrl("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* User Instruction */}
        {agentInstruction && (
          <div className="flex justify-end">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl px-4 py-2 max-w-[80%]">
              <p className="text-sm">{agentInstruction}</p>
            </div>
          </div>
        )}

        {/* Processing */}
        {isAgentProcessing && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <p className="text-sm text-gray-700">Processing your request...</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {agentPreview && !isAgentProcessing && (
          <div className="space-y-3">
            {/* Plan */}
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex-1">
                <p className="text-sm text-gray-900 font-medium mb-2">Edit Plan:</p>
                <p className="text-sm text-gray-700">{agentPreview.plan}</p>
              </div>
            </div>

            {/* Preview Mode Toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPreviewMode('visual')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  previewMode === 'visual'
                    ? "bg-purple-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                Visual Preview
              </button>
              <button
                onClick={() => setPreviewMode('diff')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  previewMode === 'diff'
                    ? "bg-purple-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                Text Diff
              </button>
            </div>

            {/* Conditional Preview Based on Mode */}
            {agentPreview.original && agentPreview.modified && (
              <>
                {previewMode === 'visual' ? (
                  /* VISUAL PREVIEW */
                  <div className="border-2 border-purple-300 rounded-lg overflow-hidden shadow-md">
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 border-b-2 border-purple-300">
                      <p className="text-xs font-bold text-purple-900 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Visual Preview
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3">
                        <div onClick={() => setZoomedPreview('before')} className="cursor-pointer hover:opacity-80 transition-opacity">
                          <MiniSlidePreview 
                            slide={agentPreview.original} 
                            label="Before" 
                          />
                        </div>
                        <div onClick={() => setZoomedPreview('after')} className="cursor-pointer hover:opacity-80 transition-opacity">
                          <MiniSlidePreview 
                            slide={agentPreview.modified} 
                            label="After" 
                            highlight 
                          />
                        </div>
                      </div>
                      <p className="text-xs text-center text-gray-500 mt-2">Click to zoom</p>
                    </div>
                  </div>
                ) : (
                  /* TEXT DIFF */
              <div className="border-2 border-purple-300 rounded-lg overflow-hidden shadow-md">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 border-b-2 border-purple-300">
                  <p className="text-xs font-bold text-purple-900 flex items-center gap-2">
                    <span className="text-base">🔄</span>
                    Content Comparison
                  </p>
                </div>
                <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-gray-200 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Original
                  </div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Modified
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 max-h-32 overflow-y-auto">
                  <div className="p-2 bg-red-50/50">
                    <div className="text-[10px] text-gray-700 space-y-0.5">
                      {agentPreview.original.content.slice(0, 5).map((node: any, idx: number) => {
                        // Extract text from node recursively
                        const extractText = (n: any): string => {
                          if (typeof n === 'string') return n;
                          if (n.text) return n.text;
                          if (n.children) {
                            return n.children.map(extractText).filter(Boolean).join(' ');
                          }
                          return '';
                        };
                        const text = extractText(node).trim();
                        return text ? (
                          <div key={idx} className="line-clamp-2 leading-tight">
                            {text}
                          </div>
                        ) : null;
                      })}
                      {agentPreview.original.content.length > 5 && (
                        <div className="text-[9px] text-gray-500 italic mt-1">
                          +{agentPreview.original.content.length - 5} more blocks
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-green-50/50">
                    <div className="text-[10px] text-gray-700 space-y-0.5">
                      {agentPreview.modified.content.slice(0, 5).map((node: any, idx: number) => {
                        // Extract text from node recursively
                        const extractText = (n: any): string => {
                          if (typeof n === 'string') return n;
                          if (n.text) return n.text;
                          if (n.children) {
                            return n.children.map(extractText).filter(Boolean).join(' ');
                          }
                          return '';
                        };
                        const text = extractText(node).trim();
                        return text ? (
                          <div key={idx} className="line-clamp-2 leading-tight">
                            {text}
                          </div>
                        ) : null;
                      })}
                      {agentPreview.modified.content.length > 5 && (
                        <div className="text-[9px] text-gray-500 italic mt-1">
                          +{agentPreview.modified.content.length - 5} more blocks
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
                )}
              </>
            )}

            {/* Changes List */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">Changes Made:</p>
              <ul className="space-y-1">
                {agentPreview.changes.map((change, idx) => (
                  <li key={idx} className="text-xs text-blue-800 flex items-start gap-1">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Preview Info */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs font-semibold text-gray-700">Preview Ready</p>
              </div>
              <p className="text-xs text-gray-600">
                Review the changes above and click "Accept" to update Slide {currentSlideIndex + 1}.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleAccept}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Accept Changes
                </Button>
                <Button 
                  onClick={handleReject} 
                  variant="outline" 
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
              
              {/* Revert Option */}
              <button
                onClick={handleReject}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revert to Original
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to edit..."
            disabled={isAgentProcessing}
            className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendInstruction}
            disabled={!inputValue.trim() || isAgentProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAgentProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedPreview && agentPreview && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedPreview(null)}
        >
          <div 
            className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {zoomedPreview === 'before' ? 'Before' : 'After'} Preview
              </h3>
              <button
                onClick={() => setZoomedPreview(null)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <MiniSlidePreview 
                slide={zoomedPreview === 'before' ? agentPreview.original : agentPreview.modified}
                label={zoomedPreview === 'before' ? 'Before' : 'After'}
                highlight={zoomedPreview === 'after'}
                zoom={true}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
