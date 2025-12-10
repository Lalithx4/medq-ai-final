import { getServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { CreditService } from "@/lib/credits/credit-service";
import { getTemplate, formatTemplateForPrompt, type TemplateName } from "@/lib/presentation/templates";
import { createCerebrasStreamWithFallback } from "@/lib/llm/llm-fallback";

interface SlidesRequest {
  title: string;
  prompt: string;
  outline: string[];
  language: string;
  tone: string;
  modelProvider?: string;
  modelId?: string;
  searchResults?: Array<{ query: string; results: unknown[] }>;
  template?: string;
}

// Import the same template from the original route
const slidesTemplate = `Create a presentation in XML format with CONCISE, FOCUSED content.

IMPORTANT: You MUST create slides based on the OUTLINE provided below. Each outline section should become a slide with relevant content. DO NOT use generic placeholders like "Main Point 1" or "Key Point 1". Use the ACTUAL topics and information from the outline and research data.

Example structure (DO NOT copy this exactly - use the actual outline topics):

<PRESENTATION>
<SECTION layout="vertical">
<H1>[Main Slide Title from Outline Topic]</H1>
<BULLETS>
<DIV><H3>[Actual topic from outline]</H3><P>Brief explanation in 1-2 sentences based on research.</P></DIV>
<DIV><H3>[Another actual topic]</H3><P>Concise statement with real information.</P></DIV>
<DIV><H3>[Real content point]</H3><P>Short, impactful description with facts.</P></DIV>
<DIV><H3>[Specific detail]</H3><P>Clear explanation with actual data.</P></DIV>
</BULLETS>
<IMG query="relevant icon for this topic" />
</SECTION>
</PRESENTATION>

CRITICAL CONTENT RULES:
1. ONLY use these tags: PRESENTATION, SECTION, H1, DIV, H3, P, IMG
2. EVERY SECTION must start with an H1 tag containing the main slide title (directly from the outline topic)
3. ONLY use these layouts: BULLETS, COLUMNS, ICONS, CYCLE, ARROWS, TIMELINE, PYRAMID, STAIRCASE
4. Each SECTION must have layout="vertical" (for text-heavy slides)
5. Each layout must contain 4-6 DIV tags (NOT just 2-3)
6. Each P tag must contain 1-2 SENTENCES (maximum 15-25 words per paragraph). Keep text brief and impactful.
7. Each H3 must be a clear, descriptive subtitle (5-8 words)
8. IMG tags should have simple queries for small icons/illustrations (these will be fetched from Unsplash)
9. Focus on CONCISE, IMPACTFUL content - be clear and focused

CONTENT GUIDELINES:
- Write concise paragraphs with only essential information
- Include specific examples or data only when critical
- Keep explanations brief and to the point
- Use professional, clear language
- Each slide should be scannable and easy to read
- Images are secondary - they should be small decorative elements

REFERENCES SLIDE (MANDATORY):
- The LAST slide MUST be a "References" or "Citations" slide
- List all sources, research papers, articles, or data sources used
- Use BULLETS layout for the references slide
- Format: Author/Source, Title, Year, URL (if available)
- Include 5-10 references from the research data provided
- Example format:
  <SECTION layout="vertical">
  <BULLETS>
  <DIV><H3>Reference 1</H3><P>Author Name et al. (2024). Article Title. Journal Name. Available at: URL</P></DIV>
  <DIV><H3>Reference 2</H3><P>Source Name (2023). Research Title. Publication. DOI or URL</P></DIV>
  </BULLETS>
  <IMG query="books icon" />
  </SECTION>

PRESENTATION DETAILS:
Title: {TITLE}
Request: {PROMPT}
Outline: {OUTLINE_FORMATTED}
Language: {LANGUAGE}
Tone: {TONE}
Total Slides: {TOTAL_SLIDES}

RESEARCH:
{SEARCH_RESULTS}

Create {TOTAL_SLIDES} slides now. Each slide must be CONCISE and FOCUSED with brief, impactful content (1-2 sentences per point, max 15-25 words). Use different layouts for visual variety. IMPORTANT: The LAST slide must be a References/Citations slide listing all sources used.`;

export async function POST(req: Request) {
  try {
    console.log("\n========== CEREBRAS PRESENTATION GENERATION API CALLED ==========");
    
    // Authentication check
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    // BYPASS AUTH: Mock user for API
    const userId = user?.id || "mock-user-id";
    
    /* ORIGINAL AUTH CHECK
    if (!user?.id) {
      console.error("❌ Unauthorized: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ User authenticated:", user.id);
    */
    console.log("✅ User authenticated (or bypassed):", userId);

    // Check credits
    /* ORIGINAL CREDIT CHECK
    const hasCredits = await CreditService.hasEnoughCredits(
      user.id,
      "presentation_generate"
    );

    if (!hasCredits) {
      console.warn("⚠️ User has insufficient credits");
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 403 }
      );
    }
    console.log("✅ User has sufficient credits");
    */
   console.log("✅ Credit check bypassed");

    const {
      title,
      prompt: userPrompt,
      outline,
      language,
      tone,
      modelProvider = "cerebras",
      modelId: requestedModelId = "llama3.1-70b",
      searchResults,
      template,
    } = (await req.json()) as SlidesRequest;

    // Map model IDs
    const modelMap: Record<string, string> = {
      "llama3.1-70b": "llama-3.3-70b",
      "llama3.1-8b": "llama3.1-8b",
    };
    const modelId = modelMap[requestedModelId] || "llama-3.3-70b";

    console.log("📋 Request Parameters:");
    console.log("  - Title:", title);
    console.log("  - User Prompt:", userPrompt);
    console.log("  - Outline Length:", outline?.length);
    console.log("  - Language:", language);
    console.log("  - Tone:", tone);
    console.log("  - Model:", modelId);
    console.log("  - Template:", template || "NOT PROVIDED");
    
    console.log("\n📋 [TEMPLATE DEBUG - CEREBRAS] ==================");
    console.log("📋 [TEMPLATE DEBUG] Template received:", template);
    console.log("📋 [TEMPLATE DEBUG] Template type:", typeof template);
    console.log("📋 [TEMPLATE DEBUG] Is template truthy?", !!template);
    console.log("📋 [TEMPLATE DEBUG - CEREBRAS] ==================\n");

    if (!title || !outline || !Array.isArray(outline) || !language) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Format search results
    let searchResultsText = "No research data available.";
    if (searchResults && searchResults.length > 0) {
      const searchData = searchResults
        .map((sr, idx) => {
          const results = Array.isArray(sr.results) ? sr.results : [];
          const formattedResults = results
            .slice(0, 3)
            .map((r: any) => `- ${r.title || r.name || "Result"}: ${r.description || r.content || ""}`)
            .join("\n");
          return `Query ${idx + 1}: "${sr.query}"\n${formattedResults}`;
        })
        .join("\n\n");
      searchResultsText = `Research data from web search:\n${searchData}`;
    }

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get template instructions if template is specified
    let templateInstructions = "";
    console.log("\n📋 [TEMPLATE PROCESSING - CEREBRAS] ==================");
    console.log("📋 [TEMPLATE PROCESSING] Template value:", template);
    console.log("📋 [TEMPLATE PROCESSING] Is 'general'?", template === "general");
    
    if (template && template !== "general") {
      try {
        console.log("📋 [TEMPLATE PROCESSING] Attempting to load template:", template);
        const templateData = getTemplate(template as TemplateName);
        console.log("📋 [TEMPLATE PROCESSING] Template loaded successfully:", templateData.name);
        console.log("📋 [TEMPLATE PROCESSING] Template category:", templateData.category);
        console.log("📋 [TEMPLATE PROCESSING] Template slide count:", templateData.structure.recommendedSlideCount);
        
        templateInstructions = formatTemplateForPrompt(templateData);
        console.log("📋 [TEMPLATE PROCESSING] Template instructions length:", templateInstructions.length, "characters");
        console.log("📋 [TEMPLATE PROCESSING] Template instructions preview:", templateInstructions.substring(0, 200) + "...");
        console.log("✅ Using template:", templateData.name);
      } catch (error) {
        console.error("❌ [TEMPLATE PROCESSING] Error loading template:", error);
        console.warn("⚠️ Template not found, using general template:", template);
      }
    } else {
      console.log("📋 [TEMPLATE PROCESSING] Using general template (no custom instructions)");
    }
    console.log("📋 [TEMPLATE PROCESSING - CEREBRAS] ==================\n");

    // Format the prompt with template variables
    const basePrompt = templateInstructions 
      ? `${slidesTemplate}\n\n${templateInstructions}\n\n`
      : slidesTemplate;
    
    console.log("\n🎯 [PROMPT ASSEMBLY - CEREBRAS] ==================");
    console.log("🎯 [PROMPT ASSEMBLY] Base prompt length:", slidesTemplate.length);
    console.log("🎯 [PROMPT ASSEMBLY] Template instructions length:", templateInstructions.length);
    console.log("🎯 [PROMPT ASSEMBLY] Combined prompt length:", basePrompt.length);
    console.log("🎯 [PROMPT ASSEMBLY] Template instructions added?", templateInstructions.length > 0);
    console.log("🎯 [PROMPT ASSEMBLY - CEREBRAS] ==================\n");
    
    const formattedPrompt = basePrompt
      .replace(/{TITLE}/g, title)
      .replace(/{PROMPT}/g, userPrompt || "No specific prompt provided")
      .replace(/{CURRENT_DATE}/g, currentDate)
      .replace(/{LANGUAGE}/g, language)
      .replace(/{TONE}/g, tone)
      .replace(/{OUTLINE_FORMATTED}/g, outline.join("\n\n"))
      .replace(/{TOTAL_SLIDES}/g, outline.length.toString())
      .replace(/{SEARCH_RESULTS}/g, searchResultsText);

    console.log("\n🎯 Expected slides to generate:", outline.length);
    console.log("🚀 Starting AI stream generation with fallback...");

    // Create stream with automatic Gemini fallback
    const { stream, provider } = await createCerebrasStreamWithFallback(
      env.CEREBRAS_API_KEY!,
      process.env.GOOGLE_AI_API_KEY!,
      {
        model: modelId,
        messages: [
          {
            role: "system",
            content: "You are an expert presentation designer.",
          },
          {
            role: "user",
            content: formattedPrompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 8000,
      }
    );

    console.log(`✅ Stream created using ${provider}, starting to stream response...`);

    // Deduct credits after successful generation start
    await CreditService.deductCredits(
      user.id, 
      "presentation_generate",
      `Generated presentation: ${title}`
    );

    // Create a ReadableStream in AI SDK format for useCompletion
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let chunkCount = 0;
          
          console.log(`📡 Starting to stream chunks in AI SDK format (provider: ${provider})...`);
          
          if (provider === "cerebras") {
            // Handle Cerebras stream format
            for await (const chunk of stream) {
              const content = (chunk as any).choices?.[0]?.delta?.content || "";
              if (content) {
                fullContent += content;
                chunkCount++;
                
                // Log every 10 chunks
                if (chunkCount % 10 === 0) {
                  console.log(`📦 [STREAM] Chunk ${chunkCount}, Total length: ${fullContent.length}`);
                }
                
                // Send chunk in AI SDK data stream format
                const dataChunk = `0:${JSON.stringify(content)}\n`;
                controller.enqueue(encoder.encode(dataChunk));
              }
            }
          } else {
            // Handle Gemini stream format
            for await (const chunk of stream) {
              const content = (chunk as any).text?.() || "";
              if (content) {
                fullContent += content;
                chunkCount++;
                
                // Log every 10 chunks
                if (chunkCount % 10 === 0) {
                  console.log(`📦 [GEMINI STREAM] Chunk ${chunkCount}, Total length: ${fullContent.length}`);
                }
                
                // Send chunk in AI SDK data stream format
                const dataChunk = `0:${JSON.stringify(content)}\n`;
                controller.enqueue(encoder.encode(dataChunk));
              }
            }
          }

          console.log("\n✅ ========== STREAM COMPLETED ==========");
          console.log("  - Total chunks:", chunkCount);
          console.log("  - Total length:", fullContent.length);
          console.log("  - First 200 chars:", fullContent.substring(0, 200));
          console.log("  - Last 200 chars:", fullContent.substring(Math.max(0, fullContent.length - 200)));
          console.log("  - Has <PRESENTATION> tag:", fullContent.includes("<PRESENTATION"));
          console.log("  - Has <SECTION> tags:", fullContent.includes("<SECTION"));
          console.log("========================================\n");
          
          // Send completion marker with proper finishReason
          controller.enqueue(encoder.encode('e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
          controller.close();
        } catch (error) {
          console.error("❌ Stream error:", error);
          console.error("Error details:", error instanceof Error ? error.message : String(error));
          // Send error in AI SDK format
          const errorMsg = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`3:${JSON.stringify(errorMsg)}\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    console.error("\n❌ ERROR in Cerebras presentation generation:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to generate presentation slides" },
      { status: 500 },
    );
  }
}
