"use client";

import { generateImageAction } from "@/app/_actions/image/generate";
import { getImageFromUnsplash } from "@/app/_actions/image/unsplash";
import { getImageFromOpenI } from "@/app/_actions/image/openi";
import { getImageFromWikimedia } from "@/app/_actions/image/wikimedia";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";
import { extractThinking } from "@/lib/thinking-extractor";
import { usePresentationState } from "@/states/presentation-state";
import { useChat, useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { SlideParser } from "../utils/parser";
import { useQueryClient } from "@tanstack/react-query";
import { debug } from "@/lib/debug";

// Disable verbose logging in production
const DEBUG = process.env.NODE_ENV === "development" && false; // Set to true to enable debug logs
const log = DEBUG ? debug.log : () => {};
const warn = DEBUG ? debug.warn : () => {};
const error = console.error; // Keep errors always enabled

function stripXmlCodeBlock(input: string): string {
  let result = input.trim();
  if (result.startsWith("```xml")) {
    result = result.slice(6).trimStart();
  } else if (result.startsWith("```")) {
    result = result.slice(3).trimStart();
  }
  if (result.endsWith("```")) {
    result = result.slice(0, -3).trimEnd();
  }
  return result;
}

export function PresentationGenerationManager() {
  debug.log("🚀 [MANAGER] PresentationGenerationManager component mounted");
  
  const queryClient = useQueryClient();
  
  const {
    outline,
    presentationInput,
    language,
    presentationStyle,
    modelProvider,
    modelId,
    numSlides,
    webSearchEnabled,
    researchSources,
    shouldStartOutlineGeneration,
    shouldStartPresentationGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    setIsGeneratingPresentation,
    setIsGeneratingOutline,
    setShouldStartOutlineGeneration,
    setShouldStartPresentationGeneration,
    setSlides,
    setOutline,
    setCurrentPresentation,
    setPresentationInput,
    setSearchResults,
    setPresentationThinking,
    setOutlineThinking,
    currentPresentationId,
    imageModel,
    imageSource,
    stockImageProvider,
    template,
    rootImageGeneration,
    startRootImageGeneration,
    completeRootImageGeneration,
    failRootImageGeneration,
    slides,
    resetGeneration,
    resetForNewGeneration,
  } = usePresentationState();
  
  debug.log("🔧 [MANAGER] State values:", {
    outline: outline.length,
    modelProvider,
    shouldStartPresentationGeneration,
    isGeneratingPresentation,
  });

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());
  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);
  const outlineBufferRef = useRef<string[] | null>(null);
  const searchResultsBufferRef = useRef<Array<{
    query: string;
    results: unknown[];
  }> | null>(null);
  // Track the last processed messages length to avoid unnecessary updates
  const lastProcessedMessagesLength = useRef<number>(0);
  // Track if title has already been extracted to avoid unnecessary processing
  const titleExtractedRef = useRef<boolean>(false);

  // Function to update slides using requestAnimationFrame
  const updateSlidesWithRAF = (): void => {
    debug.log("🎬 [RAF] updateSlidesWithRAF called");
    
    // Extract thinking for presentation and parse only the remaining content
    const presentationThinkingExtract = extractThinking(presentationCompletion);
    if (presentationThinkingExtract.hasThinking) {
      debug.log("💭 [RAF] Extracted thinking, length:", presentationThinkingExtract.thinking.length);
      setPresentationThinking(presentationThinkingExtract.thinking);
    }
    const presentationContentToParse = presentationThinkingExtract.hasThinking
      ? presentationThinkingExtract.content
      : presentationCompletion;

    const processedPresentationCompletion = stripXmlCodeBlock(
      presentationContentToParse,
    );
    
    debug.log("🔄 [RAF] Parsing XML chunk, length:", processedPresentationCompletion.length);
    debug.log("📄 [RAF] Content preview (first 300 chars):", processedPresentationCompletion.substring(0, 300));
    
    // Don't reset here - let parser accumulate sections as they stream in
    debug.log("🔍 [RAF] Calling streamingParserRef.current.parseChunk");
    streamingParserRef.current.parseChunk(processedPresentationCompletion);
    
    // Don't finalize during streaming - only parse complete sections
    const allSlides = streamingParserRef.current.getAllSlides();
    
    debug.log("📊 [RAF] Parsed slides count:", allSlides.length);
    if (allSlides.length > 0) {
      debug.log("📌 [RAF] Latest slide:", {
        id: allSlides[allSlides.length - 1]?.id,
        contentLength: allSlides[allSlides.length - 1]?.content?.length,
        hasRootImage: !!allSlides[allSlides.length - 1]?.rootImage,
        rootImageQuery: allSlides[allSlides.length - 1]?.rootImage?.query?.substring(0, 50)
      });
      debug.log("📝 [RAF] First slide content sample:", JSON.stringify(allSlides[0]?.content?.[0], null, 2)?.substring(0, 200));
    } else {
      debug.warn("⚠️ [RAF] No slides parsed yet from content");
    }
    
    // Merge any completed root image URLs from state into streamed slides
    debug.log("🖼️ [RAF] Merging root images, rootImageGeneration keys:", Object.keys(rootImageGeneration).length);
    const mergedSlides = allSlides.map((slide) => {
      const gen = rootImageGeneration[slide.id];
      if (gen?.status === "success" && slide.rootImage?.query) {
        debug.log("✅ [RAF] Merged image for slide:", slide.id);
        return {
          ...slide,
          rootImage: {
            ...slide.rootImage,
            url: gen.url,
          },
        };
      }
      return slide;
    });
    // For any slide that has a rootImage query but no url, ensure generation is tracked/started
    for (const slide of allSlides) {
      const slideId = slide.id;
      const rootImage = slide.rootImage;
      if (rootImage?.query && !rootImage.url) {
        const already = rootImageGeneration[slideId];
        if (!already || already.status === "error") {
          startRootImageGeneration(slideId, rootImage.query);
          void (async () => {
            try {
              let result;

              if (imageSource === "stock") {
                // Use stock images (Unsplash, Wikimedia, or OpenI)
                if (stockImageProvider === "wikimedia") {
                  const wikimediaResult = await getImageFromWikimedia(rootImage.query);
                  if (wikimediaResult.success && wikimediaResult.url) {
                    result = { image: { url: wikimediaResult.url } };
                  } else {
                    // Fallback to Unsplash if Wikimedia fails
                    debug.log("⚠️ Wikimedia failed, falling back to Unsplash");
                    const unsplashResult = await getImageFromUnsplash(
                      rootImage.query,
                      rootImage.layoutType,
                    );
                    if (unsplashResult.success && unsplashResult.imageUrl) {
                      result = { image: { url: unsplashResult.imageUrl } };
                    }
                  }
                } else if (stockImageProvider === "openi") {
                  const openiResult = await getImageFromOpenI(rootImage.query);
                  if (openiResult.success && openiResult.url) {
                    result = { image: { url: openiResult.url } };
                  } else {
                    // Fallback to Unsplash if OpenI fails
                    debug.log("⚠️ OpenI failed, falling back to Unsplash");
                    const unsplashResult = await getImageFromUnsplash(
                      rootImage.query,
                      rootImage.layoutType,
                    );
                    if (unsplashResult.success && unsplashResult.imageUrl) {
                      result = { image: { url: unsplashResult.imageUrl } };
                    }
                  }
                } else {
                  const unsplashResult = await getImageFromUnsplash(
                    rootImage.query,
                    rootImage.layoutType,
                  );
                  if (unsplashResult.success && unsplashResult.imageUrl) {
                    result = { image: { url: unsplashResult.imageUrl } };
                  }
                }
              } else {
                // Use AI generation
                result = await generateImageAction(rootImage.query, imageModel);
              }

              if (result?.image?.url) {
                completeRootImageGeneration(slideId, result.image.url);
                // If we don't have a thumbnail yet, set it now and persist once
                const stateNow = usePresentationState.getState();
                if (!stateNow.thumbnailUrl && stateNow.currentPresentationId) {
                  stateNow.setThumbnailUrl(result.image.url);
                  try {
                    await updatePresentation({
                      id: stateNow.currentPresentationId,
                      thumbnailUrl: result.image.url,
                    });
                  } catch {
                    // Ignore persistence errors for thumbnail to avoid interrupting generation flow
                  }
                }
                // Persist into slides state
                usePresentationState.getState().setSlides(
                  usePresentationState.getState().slides.map((s) =>
                    s.id === slideId
                      ? {
                          ...s,
                          rootImage: {
                            query: rootImage.query,
                            url: result.image.url,
                          },
                        }
                      : s,
                  ),
                );
              } else {
                failRootImageGeneration(slideId, "No image url returned");
              }
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Image generation failed";
              failRootImageGeneration(slideId, message);
            }
          })();
        }
      }
    }
    // Update slides during streaming so user can see progress
    // Auto-save is prevented by isGeneratingPresentation flag
    debug.log("💾 [RAF] Calling setSlides with", mergedSlides.length, "slides");
    setSlides(mergedSlides);
    
    // Verify state was updated
    const stateAfterSet = usePresentationState.getState();
    debug.log("🔍 [RAF] State after setSlides:", {
      slidesInState: stateAfterSet.slides.length,
      isGeneratingPresentation: stateAfterSet.isGeneratingPresentation,
      currentSlideIndex: stateAfterSet.currentSlideIndex,
    });
    
    slidesRafIdRef.current = null;
    debug.log("✅ [RAF] updateSlidesWithRAF completed");
  };

  // Function to extract title from content
  const extractTitle = (
    content: string,
  ): { title: string | null; cleanContent: string } => {
    const titleMatch = content.match(/<TITLE>(.*?)<\/TITLE>/i);
    if (titleMatch?.[1]) {
      const title = titleMatch[1].trim();
      const cleanContent = content.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
      return { title, cleanContent };
    }
    return { title: null, cleanContent: content };
  };

  // Function to process messages and extract data (optimized - only process last message)
  const processMessages = (messages: typeof outlineMessages): void => {
    if (messages.length <= 1) return;

    // Get the last message - this is where all the current data is
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Extract search results from the last message only (much more efficient)
    if (webSearchEnabled && lastMessage.parts) {
      const searchResults: Array<{ query: string; results: unknown[] }> = [];

      for (const part of lastMessage.parts) {
        if (part.type === "tool-invocation" && part.toolInvocation) {
          const invocation = part.toolInvocation;
          if (
            invocation.toolName === "webSearch" &&
            invocation.state === "result" &&
            "result" in invocation &&
            invocation.result
          ) {
            const query =
              typeof invocation.args?.query === "string"
                ? invocation.args.query
                : "Unknown query";

            // Parse the search result
            let parsedResult;
            try {
              parsedResult =
                typeof invocation.result === "string"
                  ? JSON.parse(invocation.result)
                  : invocation.result;
            } catch {
              parsedResult = invocation.result;
            }

            searchResults.push({
              query,
              results: parsedResult?.results || [],
            });
          }
        }
      }

      // Store search results in buffer (only if we found any)
      if (searchResults.length > 0) {
        searchResultsBufferRef.current = searchResults;
      }
    }

    // Extract outline from the last assistant message
    if (lastMessage.role === "assistant" && lastMessage.content) {
      debug.log("\n📝 [PROCESS] Processing assistant message, content length:", lastMessage.content.length);
      debug.log("📄 [PROCESS] Content preview (first 300 chars):", lastMessage.content.substring(0, 300));
      
      // Extract <think> content from assistant message and keep only the remainder for parsing
      const thinkingExtract = extractThinking(lastMessage.content);
      if (thinkingExtract.hasThinking) {
        setOutlineThinking(thinkingExtract.thinking);
      }

      let cleanContent = thinkingExtract.hasThinking
        ? thinkingExtract.content
        : lastMessage.content;

      // Only extract title if we haven't done it yet
      if (!titleExtractedRef.current) {
        const { title, cleanContent: extractedCleanContent } =
          extractTitle(cleanContent);

        cleanContent = extractedCleanContent;

        // Set the title if found and mark as extracted
        if (title) {
          debug.log("✅ [PROCESS] Title extracted:", title);
          setCurrentPresentation(currentPresentationId, title);
          titleExtractedRef.current = true;
        } else {
          // Title not found yet, don't process outline
          debug.log("⚠️ [PROCESS] Title not found yet, waiting for more content...");
          debug.log("📄 [PROCESS] Current content:", cleanContent.substring(0, 200));
          return;
        }
      } else {
        // Title already extracted, just remove it from content if it exists
        cleanContent = cleanContent.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
      }

      // Parse the outline into sections
      debug.log("🔍 [PROCESS] Parsing outline sections...");
      debug.log("📏 [PROCESS] Clean content length:", cleanContent.length);
      const sections = cleanContent.split(/^# /gm).filter(Boolean);
      debug.log("📊 [PROCESS] Sections found:", sections.length);
      
      const outlineItems: string[] =
        sections.length > 0
          ? sections.map((section) => `# ${section}`.trim())
          : [];

      debug.log("✅ [PROCESS] Parsed outline items:", outlineItems.length);
      if (outlineItems.length > 0) {
        debug.log("💾 [PROCESS] Storing outline items in buffer");
        debug.log("📋 [PROCESS] First item preview:", outlineItems[0]?.substring(0, 100));
        outlineBufferRef.current = outlineItems;
      } else {
        debug.warn("⚠️ [PROCESS] No outline items parsed!");
      }
    }
  };

  // Function to update outline and search results using requestAnimationFrame
  const updateOutlineWithRAF = (): void => {
    debug.log("\n🎬 [RAF] updateOutlineWithRAF called");
    // Batch all updates in a single RAF callback for better performance

    // Update search results if available
    if (searchResultsBufferRef.current !== null) {
      debug.log("🔍 [RAF] Setting search results:", searchResultsBufferRef.current.length);
      setSearchResults(searchResultsBufferRef.current);
      searchResultsBufferRef.current = null;
    }

    // Update outline if available
    if (outlineBufferRef.current !== null) {
      debug.log("📋 [RAF] Setting outline items:", outlineBufferRef.current.length);
      debug.log("📝 [RAF] Outline items:", outlineBufferRef.current.map(item => item.split('\n')[0]));
      setOutline(outlineBufferRef.current);
      outlineBufferRef.current = null;
    } else {
      debug.log("⚠️ [RAF] No outline items in buffer");
    }

    // Clear the current frame ID
    outlineRafIdRef.current = null;
    debug.log("✅ [RAF] updateOutlineWithRAF completed");
  };

  // Outline generation - use appropriate API based on model and sources
  const getOutlineApi = () => {
    if (modelProvider === "cerebras") {
      return "/api/presentation/outline-cerebras";
    }
    
    // Check if any research sources are enabled (beyond just web)
    const hasMultipleSources = researchSources.pubmed || researchSources.arxiv;
    const hasAnySources = researchSources.web || researchSources.pubmed || researchSources.arxiv;
    
    if (hasMultipleSources || (hasAnySources && !webSearchEnabled)) {
      // Use multi-source API if PubMed/arXiv enabled, or if sources enabled but old webSearch flag is off
      return "/api/presentation/outline-multi-source";
    }
    
    // Fallback to original logic for backward compatibility
    return webSearchEnabled
      ? "/api/presentation/outline-with-search"
      : "/api/presentation/outline";
  };

  const { messages: outlineMessages, append: appendOutlineMessage, error: outlineError, isLoading: isOutlineLoading } = useChat({
    api: getOutlineApi(),
    body: {
      prompt: presentationInput,
      numberOfCards: numSlides,
      numSlides, // Add this for multi-source API
      language,
      modelProvider,
      modelId,
      sources: researchSources, // Add research sources
    },
    onFinish: () => {
      debug.log("🏁 Outline generation finished");
      setIsGeneratingOutline(false);
      setShouldStartOutlineGeneration(false);
      setShouldStartPresentationGeneration(false);

      const {
        currentPresentationId,
        outline,
        searchResults,
        currentPresentationTitle,
        theme,
        imageSource,
      } = usePresentationState.getState();

      if (currentPresentationId) {
        void updatePresentation({
          id: currentPresentationId,
          outline,
          searchResults,
          prompt: presentationInput,
          title: currentPresentationTitle ?? "",
          theme,
          imageSource,
        });
      }

      // Cancel any pending outline animation frame
      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    },
    onError: (error) => {
      console.error("❌ Presentation generation error:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      toast.error("Failed to generate presentation: " + error.message);
      resetGeneration();

      // Cancel any pending outline animation frame
      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    },
  });

  // Lightweight useEffect that only schedules RAF updates
  useEffect(() => {
    debug.log("\n🔔 [OUTLINE EFFECT] outlineMessages updated, count:", outlineMessages.length);
    debug.log("🔄 [OUTLINE EFFECT] isOutlineLoading:", isOutlineLoading);
    if (outlineError) {
      console.error("❌ [OUTLINE EFFECT] Outline error detected:", outlineError);
    }
    if (outlineMessages.length > 0) {
      const lastMsg = outlineMessages[outlineMessages.length - 1];
      debug.log("📝 [OUTLINE EFFECT] Last message role:", lastMsg?.role);
      debug.log("📏 [OUTLINE EFFECT] Last message content length:", lastMsg?.content?.length);
      debug.log("📄 [OUTLINE EFFECT] Last message content preview:", lastMsg?.content?.substring(0, 200));
    }
    // Only update if we have new messages
    if (outlineMessages.length > 1) {
      lastProcessedMessagesLength.current = outlineMessages.length;

      // Process messages and store in buffers (non-blocking)
      processMessages(outlineMessages);

      // Only schedule a new frame if one isn't already pending
      if (outlineRafIdRef.current === null) {
        outlineRafIdRef.current = requestAnimationFrame(updateOutlineWithRAF);
      }
    }
  }, [outlineMessages, webSearchEnabled]);

  // Watch for outline generation start
  useEffect(() => {
    const startOutlineGeneration = async (): Promise<void> => {
      if (shouldStartOutlineGeneration) {
        try {
          debug.log("🚀 Starting outline generation...");
          debug.log("Model Provider:", modelProvider);
          debug.log("Model ID:", modelId);
          debug.log("Num Slides:", numSlides);
          debug.log("Language:", language);
          debug.log("Web Search Enabled:", webSearchEnabled);
          debug.log("Presentation Input:", presentationInput);
          
          // Reset all state except ID and input when starting new generation
          resetForNewGeneration();

          // Reset processing refs for new generation
          titleExtractedRef.current = false;

          setIsGeneratingOutline(true);

          // Get the current input after reset (it's preserved)
          const { presentationInput: currentInput } = usePresentationState.getState();

          // Start the RAF cycle for outline updates
          if (outlineRafIdRef.current === null) {
            outlineRafIdRef.current =
              requestAnimationFrame(updateOutlineWithRAF);
          }

          debug.log("📡 Sending request to API...");
          await appendOutlineMessage(
            {
              role: "user",
              content: currentInput,
            },
            {
              body: {
                prompt: currentInput,
                numberOfCards: numSlides,
                language,
                modelProvider,
                modelId,
              },
            },
          );
          debug.log("✅ API request sent successfully");
        } catch (error) {
          console.error("❌ Error in outline generation:", error);
          // Error is handled by onError callback
        } finally {
          setIsGeneratingOutline(false);
          setShouldStartOutlineGeneration(false);
        }
      }
    };

    void startOutlineGeneration();
  }, [shouldStartOutlineGeneration]);

  // Use Cerebras direct API for presentation generation when Cerebras is selected
  const getPresentationApi = () => {
    if (modelProvider === "cerebras") {
      return "/api/presentation/generate-cerebras";
    }
    return "/api/presentation/generate";
  };

  const { completion: presentationCompletion, complete: generatePresentation, error: presentationError, isLoading: isPresentationLoading } =
    useCompletion({
      api: getPresentationApi(),
      streamProtocol: 'data',
      onResponse: (response) => {
        debug.log("🌐 Presentation API response received:", response.status, response.statusText);
        debug.log("🌐 Response headers:", Object.fromEntries(response.headers.entries()));
      },
      onFinish: async (_prompt, completion) => {
        debug.log("\n\n🏁 ========== GENERATION FINISHED ==========");
        debug.log("📏 Final completion length:", completion.length);
        debug.log("📄 Final completion FULL TEXT:");
        debug.log(completion);
        debug.log("📄 Final completion (first 500 chars):", completion.substring(0, 500));
        debug.log("📄 Final completion (last 500 chars):", completion.substring(Math.max(0, completion.length - 500)));
        
        // Check if completion has XML
        const hasXML = completion.includes("<SECTION") || completion.includes("<PRESENTATION");
        debug.log("🔍 [FINISH] Has XML tags:", hasXML);

        // 1) Parse the completion and finalize
        debug.log("🔚 [FINISH] Parsing completion with parser");
        
        // Reset parser to ensure clean state
        streamingParserRef.current.reset();
        debug.log("🔚 [FINISH] Parser reset");
        
        // Strip code blocks and parse
        const stripped = stripXmlCodeBlock(completion);
        debug.log("🔚 [FINISH] Stripped content length:", stripped.length);
        debug.log("🔚 [FINISH] Stripped preview:", stripped.substring(0, 300));
        
        // Parse the complete XML
        streamingParserRef.current.parseChunk(stripped);
        debug.log("🔚 [FINISH] After parseChunk, slides:", streamingParserRef.current.getAllSlides().length);
        
        // Finalize to process any remaining content
        streamingParserRef.current.finalize();
        
        // Get all parsed slides (parseChunk already created them)
        const finalSlides = streamingParserRef.current.getAllSlides();
        debug.log("🔚 [FINISH] Final slides from getAllSlides:", finalSlides.length);
        
        if (finalSlides.length > 0) {
          const firstSlide = finalSlides[0];
          if (firstSlide) {
            debug.log("📝 [FINISH] First slide full object:", JSON.stringify(firstSlide, null, 2));
            debug.log("📝 [FINISH] First slide content array length:", firstSlide.content?.length);
            debug.log("📝 [FINISH] First slide content:", firstSlide.content);
            
            // Check if content is empty (only has empty text)
            const firstContent = firstSlide.content?.[0];
            if (firstContent && firstContent.children?.[0]?.text === "") {
              console.error("⚠️ [FINISH] Slide content is EMPTY! This is likely an OLD presentation from DB.");
              console.error("⚠️ [FINISH] Please create a NEW presentation to use the updated prompt template.");
            }
          }
        } else {
          console.error("❌ [FINISH] No slides were finalized! Parser returned empty array.");
        }
        
        try {
          debug.log("💾 [FINISH] Calling setSlides with", finalSlides.length, "slides");
          setSlides(finalSlides);
          
          // Immediately verify
          const stateAfterSet = usePresentationState.getState();
          debug.log("✅ [FINISH] setSlides completed. State now has:", stateAfterSet.slides.length, "slides");
          
          if (stateAfterSet.slides.length !== finalSlides.length) {
            console.error("❌ [FINISH] STATE MISMATCH! Expected", finalSlides.length, "but state has", stateAfterSet.slides.length);
          }
        } catch (err) {
          console.error("❌ [FINISH] setSlides failed:", err);
        }

        // 2) Save to DB BEFORE re-enabling fetch (to avoid empty overwrite)
        debug.log("\n💾 [FINISH] Starting DB save process...");
        try {
          const stateBeforeSave = usePresentationState.getState();
          debug.log("🔍 [FINISH] State before save:", {
            presentationId: stateBeforeSave.currentPresentationId,
            slidesInState: stateBeforeSave.slides.length,
            finalSlidesToSave: finalSlides.length,
          });
          
          if (!stateBeforeSave.currentPresentationId) {
            debug.warn("⚠️ [FINISH] Cannot save: missing presentation id");
          } else if (finalSlides.length === 0) {
            debug.warn("⚠️ [FINISH] Cannot save: no slides to persist");
          } else {
            debug.log(
              "💾 [FINISH] Calling updatePresentation with",
              finalSlides.length,
              "slides for id:",
              stateBeforeSave.currentPresentationId,
            );
            const saveResult = await updatePresentation({
              id: stateBeforeSave.currentPresentationId,
              content: { slides: finalSlides, config: {} },
            });
            debug.log("✅ [FINISH] updatePresentation result:", saveResult);
            
            if (saveResult?.success) {
              debug.log("✅ [FINISH] Presentation saved to database successfully");
              
              // Invalidate the query cache to force a fresh fetch with the new data
              debug.log("🔄 [FINISH] Invalidating presentation query cache");
              await queryClient.invalidateQueries({ 
                queryKey: ["presentation", stateBeforeSave.currentPresentationId] 
              });
              debug.log("✅ [FINISH] Query cache invalidated");
            } else {
              console.error("❌ [FINISH] Save returned unsuccessful:", saveResult);
            }
          }
        } catch (error) {
          console.error("❌ [FINISH] Failed to save presentation:", error);
          toast.error("Failed to save presentation to database");
        }

        // 3) Now it is safe to re-enable fetch from Main.tsx
        debug.log("🚦 [FINISH] Setting flags to stop generation and allow fetch");
        setIsGeneratingPresentation(false);
        setShouldStartPresentationGeneration(false);
        
        const finalState = usePresentationState.getState();
        debug.log("🏁 [FINISH] Final state:", {
          slides: finalState.slides.length,
          isGeneratingPresentation: finalState.isGeneratingPresentation,
          shouldStartPresentationGeneration: finalState.shouldStartPresentationGeneration,
        });
        debug.log("\n========== GENERATION COMPLETE ==========\n");
      },
      onError: (error) => {
        toast.error("Failed to generate presentation: " + error.message);
        resetGeneration();
        streamingParserRef.current.reset();

        // Cancel any pending animation frame
        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    debug.log("\n🔔 [EFFECT] presentationCompletion effect triggered");
    debug.log("  - presentationCompletion:", presentationCompletion ? `${presentationCompletion.length} chars` : "null/empty");
    debug.log("  - presentationCompletion value:", presentationCompletion);
    debug.log("  - isPresentationLoading:", isPresentationLoading);
    debug.log("  - presentationError:", presentationError);
    debug.log("  - current slides in state:", usePresentationState.getState().slides.length);
    
    if (presentationCompletion) {
      debug.log("📨 [EFFECT] Presentation completion updated, length:", presentationCompletion.length);
      debug.log("📄 [EFFECT] Content preview (first 300 chars):", presentationCompletion.substring(0, 300));
      debug.log("📄 [EFFECT] Content preview (last 300 chars):", presentationCompletion.substring(Math.max(0, presentationCompletion.length - 300)));
      
      try {
        // Only schedule a new frame if one isn't already pending
        if (slidesRafIdRef.current === null) {
          debug.log("🎬 [EFFECT] Scheduling RAF for slides parsing");
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        } else {
          debug.log("⏭️ [EFFECT] RAF already pending, skipping");
        }
      } catch (error) {
        console.error("❌ [EFFECT] Error processing presentation XML:", error);
        toast.error("Error processing presentation content");
      }
    } else {
      debug.log("⚠️ [EFFECT] No presentationCompletion to process");
    }
  }, [presentationCompletion]);

  useEffect(() => {
    debug.log("🔄 [EFFECT] shouldStartPresentationGeneration changed:", shouldStartPresentationGeneration);
    
    if (shouldStartPresentationGeneration) {
      debug.log("🚀 [GENERATION TRIGGER] Starting presentation generation!");
      
      const {
        outline,
        presentationInput,
        language,
        presentationStyle,
        currentPresentationTitle,
        searchResults: stateSearchResults,
        modelProvider,
        modelId,
        setThumbnailUrl,
      } = usePresentationState.getState();

      debug.log("\n🎨 ========== STARTING PRESENTATION GENERATION ==========");
      debug.log("📋 Outline items:", outline.length);
      debug.log("📝 Outline content:", outline);
      debug.log("🏷️ Title:", currentPresentationTitle);
      debug.log("🤖 Model Provider:", modelProvider);
      debug.log("🆔 Model ID:", modelId);
      debug.log("🌍 Language:", language);
      debug.log("🎭 Style:", presentationStyle);
      debug.log("🔍 Search Results:", stateSearchResults?.length || 0);

      // Reset the parser before starting a new generation
      streamingParserRef.current.reset();
      debug.log("🔄 Parser reset complete");
      
      // CRITICAL: Set generation flag BEFORE any other operations to prevent auto-save
      setIsGeneratingPresentation(true);
      debug.log("🚦 Set isGeneratingPresentation to TRUE - auto-save should be blocked");
      
      debug.log("🚀 Calling generatePresentation API...");
      debug.log("📡 API endpoint:", getPresentationApi());
      debug.log("🚀 Starting presentation generation with params:", {
        title: currentPresentationTitle ?? presentationInput ?? "",
        prompt: presentationInput ?? "",
        outline,
        language,
        tone: presentationStyle,
        modelProvider,
        modelId,
        template: template || "general",
      });
      
      debug.log("\n📋 ========== [FRONTEND] TEMPLATE DEBUG ==========");
      debug.log("📋 [TEMPLATE DEBUG] Template from state:", template);
      debug.log("📋 [TEMPLATE DEBUG] Template type:", typeof template);
      debug.log("📋 [TEMPLATE DEBUG] Template being sent to API:", template || "general");
      debug.log("📋 [TEMPLATE DEBUG] Model Provider:", modelProvider);
      debug.log("📋 [TEMPLATE DEBUG] Model ID:", modelId);
      debug.log("📋 [TEMPLATE DEBUG] API Endpoint:", getPresentationApi());
      debug.log("=================================================\n");
      
      const result = generatePresentation("", {
        body: {
          title: currentPresentationTitle ?? presentationInput ?? "",
          prompt: presentationInput ?? "",
          outline,
          searchResults: stateSearchResults,
          language,
          tone: presentationStyle,
          modelProvider,
          modelId,
          template: template || "general",
        },
      });
      
      debug.log("📞 generatePresentation() returned:", result);
      
      // IMPORTANT: Reset the flag immediately to prevent infinite loop
      setShouldStartPresentationGeneration(false);
      debug.log("🚦 Reset shouldStartPresentationGeneration to false");
      
      result.then(() => {
        debug.log("✅ generatePresentation promise resolved");
      }).catch((error) => {
        console.error("❌ generatePresentation promise rejected:", error);
      });
    }
  }, [shouldStartPresentationGeneration]);

  // Auto-start root image generation when slides are added
  useEffect(() => {
    // TEMPORARILY DISABLED: Image generation causing infinite loop due to missing TOGETHER_API_KEY
    // TODO: Re-enable after adding TOGETHER_API_KEY to .env
    debug.log("⏸️ [IMAGE] Auto image generation disabled (missing API key)");
    return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unreachable
    for (const slide of slides) {
      if (!slide) continue;
      const slideId = slide.id;
      const rootImage = slide.rootImage;
      if (slideId && rootImage?.query && !rootImage.url) {
        const already = rootImageGeneration[slideId];
        // Only start if not already processing
        if (!already || already?.status === "error") {
          startRootImageGeneration(slideId, rootImage.query);
        }
      }
    }
  }, [slides, isGeneratingPresentation, isGeneratingOutline, rootImageGeneration, startRootImageGeneration]);

  // Listen for manual root image generation changes (when user manually triggers image generation)
  useEffect(() => {
    // TEMPORARILY DISABLED: Image generation causing infinite loop due to missing TOGETHER_API_KEY
    // TODO: Re-enable after adding TOGETHER_API_KEY to .env
    debug.log("⏸️ [IMAGE] Manual image generation disabled (missing API key)");
    return;
    
    // eslint-disable-next-line @typescript-eslint/no-unreachable
    // Only process if we're not currently generating presentation or outline
    if (isGeneratingPresentation || isGeneratingOutline) {
      return;
    }

    // Check for any pending root image generations that need to be processed
    // eslint-disable-next-line @typescript-eslint/no-unreachable
    for (const [slideId, gen] of Object.entries(rootImageGeneration)) {
      if (gen.status === "pending") {
        // Find the slide to get the rootImage query
        const slide = slides.find((s) => s.id === slideId);
        if (slide?.rootImage?.query) {
          // Store rootImage in const to preserve type narrowing in async function
          const rootImage = slide.rootImage;
          // Type assertion: we've verified rootImage exists above
          if (!rootImage) continue;
          
          void (async () => {
            try {
              let result;

              if (imageSource === "stock") {
                // Use stock images (Unsplash, Wikimedia, or OpenI)
                if (stockImageProvider === "wikimedia") {
                  // @ts-ignore - TS loses type narrowing in async context
                  const wikimediaResult = await getImageFromWikimedia(rootImage.query);
                  if (wikimediaResult.success && wikimediaResult.url) {
                    result = { image: { url: wikimediaResult.url } };
                  } else {
                    // Fallback to Unsplash if Wikimedia fails
                    debug.log("⚠️ Wikimedia failed, falling back to Unsplash");
                    // @ts-ignore - TS loses type narrowing in async context
                    const unsplashResult = await getImageFromUnsplash(
                      rootImage.query,
                      rootImage.layoutType,
                    );
                    if (unsplashResult.success && unsplashResult.imageUrl) {
                      result = { image: { url: unsplashResult.imageUrl } };
                    }
                  }
                } else if (stockImageProvider === "openi") {
                  // @ts-ignore - TS loses type narrowing in async context
                  const openiResult = await getImageFromOpenI(rootImage.query);
                  if (openiResult.success && openiResult.url) {
                    result = { image: { url: openiResult.url } };
                  } else {
                    // Fallback to Unsplash if OpenI fails
                    debug.log("⚠️ OpenI failed, falling back to Unsplash");
                    // @ts-ignore - TS loses type narrowing in async context
                    const unsplashResult = await getImageFromUnsplash(
                      rootImage.query,
                      rootImage.layoutType,
                    );
                    if (unsplashResult.success && unsplashResult.imageUrl) {
                      result = { image: { url: unsplashResult.imageUrl } };
                    }
                  }
                } else {
                  // @ts-ignore - TS loses type narrowing in async context
                  const unsplashResult = await getImageFromUnsplash(
                    rootImage.query,
                    rootImage.layoutType,
                  );
                  if (unsplashResult.success && unsplashResult.imageUrl) {
                    result = { image: { url: unsplashResult.imageUrl } };
                  }
                }
              } else {
                // Use AI generation (rootImage verified above)
                // @ts-ignore - TS loses type narrowing in async context
                result = await generateImageAction(
                  rootImage.query,
                  imageModel,
                );
              }

              if (result?.image?.url) {
                completeRootImageGeneration(slideId, result.image.url);
                // Update the slide with the new image URL
                setSlides(
                  slides.map((s) =>
                    s.id === slideId && s.rootImage
                      ? {
                          ...s,
                          rootImage: {
                            ...s.rootImage,
                            url: result.image.url,
                          },
                        }
                      : s,
                  ),
                );
              } else {
                failRootImageGeneration(slideId, "No image url returned");
              }
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Image generation failed";
              failRootImageGeneration(slideId, message);
            }
          })();
        }
      }
    }
  }, [
    rootImageGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    slides,
    imageSource,
    imageModel,
    completeRootImageGeneration,
    failRootImageGeneration,
    setSlides,
  ]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (slidesRafIdRef.current !== null) {
        cancelAnimationFrame(slidesRafIdRef.current);
        slidesRafIdRef.current = null;
      }

      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    };
  }, []);

  return null;
}