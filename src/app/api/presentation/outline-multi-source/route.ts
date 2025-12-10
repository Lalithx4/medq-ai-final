import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { streamText } from "ai";
import { MultiSourceService } from "@/lib/deep-research/multi-source-service";
import { modelPicker } from "@/lib/model-picker";

interface OutlineRequest {
  prompt: string;
  numSlides: number;
  language: string;
  modelProvider?: string;
  modelId?: string;
  sources: {
    web: boolean;
    pubmed: boolean;
    arxiv: boolean;
  };
}

const outlinePrompt = `You are an expert presentation outline generator. Create a structured outline for a presentation in {LANGUAGE} language.

Use the research data provided to create informed, credible topics based on current findings.

First, generate an appropriate title for the presentation, then create exactly {NUM_SLIDES} main topics.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic based on research
- Another important aspect from the data
- Brief conclusion or impact

# Second Main Topic
- Main insight from research findings
- Supporting detail or example from papers
- Practical application or takeaway

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects based on research data
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs)
6. Keep each bullet point brief - just one sentence per point
7. Include exactly 2-3 bullet points per topic`;

export async function POST(req: NextRequest) {
  try {
    console.log("\n========== MULTI-SOURCE OUTLINE API CALLED ==========");
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      prompt,
      numSlides,
      language,
      modelProvider = "openai",
      modelId,
      sources,
    } = (await req.json()) as OutlineRequest;

    console.log("📋 Request Parameters:");
    console.log("  - Prompt:", prompt);
    console.log("  - Num Slides:", numSlides);
    console.log("  - Language:", language);
    console.log("  - Model Provider:", modelProvider);
    console.log("  - Model ID:", modelId);
    console.log("  - Sources:", sources);

    if (!prompt || !numSlides) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if at least one source is enabled
    if (!sources.web && !sources.pubmed && !sources.arxiv) {
      console.warn("⚠️ No sources enabled, falling back to web only");
      sources.web = true;
    }

    // Perform multi-source research
    console.log("🔍 Starting multi-source research...");
    const multiSourceService = new MultiSourceService();
    const researchData = await multiSourceService.searchAll(
      prompt,
      {
        web: sources.web,
        pubmed: sources.pubmed,
        arxiv: sources.arxiv,
      },
      10 // maxPerSource
    );

    const enabledSources: string[] = [];
    if (sources.web) enabledSources.push('Web');
    if (sources.pubmed) enabledSources.push('PubMed');
    if (sources.arxiv) enabledSources.push('arXiv');
    
    console.log(`✅ Research completed: ${researchData.results.length} total results`);
    console.log(`   PubMed: ${researchData.sourceStats.pubmed}, arXiv: ${researchData.sourceStats.arxiv}, Web: ${researchData.sourceStats.web}`);

    // Format research data for the prompt
    let researchContext = "No research data available.";
    if (researchData.results.length > 0) {
      const formattedResults = researchData.results
        .slice(0, 15) // Limit to top 15 results
        .map((result, index) => {
          return `${index + 1}. [${result.source}] ${result.title}\n   ${result.snippet || result.abstract || "No description available"}\n   Relevance: ${result.relevanceScore.toFixed(2)}`;
        })
        .join("\n\n");

      researchContext = `Research from ${enabledSources.join(", ")}:\n\n${formattedResults}`;
    }

    // Format the prompt
    const formattedPrompt = outlinePrompt
      .replace(/{NUM_SLIDES}/g, numSlides.toString())
      .replace(/{LANGUAGE}/g, language)
      + `\n\n## Topic:\n${prompt}\n\n## Research Data:\n${researchContext}\n\nNow generate ${numSlides} topic titles:`;

    console.log("✅ Prompt formatted successfully");
    console.log("🚀 Starting AI generation...");
    console.log("🔧 Model provider:", modelProvider);
    console.log("🔧 Model ID:", modelId);

    // Get the model
    const model = modelPicker(modelProvider, modelId);
    console.log("✅ Model created successfully");

    // Stream the response
    console.log("📡 Calling streamText...");
    const result = streamText({
      model,
      prompt: formattedPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log("✅ Stream created successfully");
    
    // Log the response to debug
    const response = result.toDataStreamResponse();
    console.log("📤 Response headers:", Object.fromEntries(response.headers.entries()));
    
    return response;
  } catch (error) {
    console.error("❌ Error in outline-multi-source API:", error);
    console.error("Error type:", typeof error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
