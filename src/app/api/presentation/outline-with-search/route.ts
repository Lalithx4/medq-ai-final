import { modelPicker } from "@/lib/model-picker";
import { getServerSupabase } from "@/lib/supabase/server";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { search_tool } from "./search_tool";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
  modelProvider?: string;
  modelId?: string;
}

const outlineSystemPrompt = `You are an expert presentation outline generator. Your task is to create a comprehensive and engaging presentation outline based on the user's topic.

Current Date: {currentDate}

## Your Process:
1. **Analyze the topic** - Understand what the user wants to present
2. **Research if needed** - Use web search to find current, relevant information that can enhance the outline
3. **Generate outline** - Create a structured outline with the requested number of topics

## Web Search Guidelines:
- Use web search to find current statistics, recent developments, or expert insights
- Search for information that will make the presentation more credible and engaging
- Limit searches to 2-5 queries maximum (you decide how many are needed)
- Focus on finding information that directly relates to the presentation topic

## Outline Requirements:
- First generate an appropriate title for the presentation
- Generate exactly {numberOfCards} main topics
- Each topic should be a clear, engaging heading
- Include 2-3 bullet points per topic
- Use {language} language
- Make topics flow logically from one to another
- Ensure topics are comprehensive and cover key aspects

## Output Format:
Start with the title in XML tags, then generate the outline in markdown format with each topic as a heading followed by bullet points.

Example:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

Remember: Use web search strategically to enhance the outline with current, relevant information.`;

export async function POST(req: Request) {
  try {
    console.log("\n========== OUTLINE WITH SEARCH API CALLED ==========");
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ User authenticated:", user.id);

    const {
      prompt,
      numberOfCards,
      language,
      modelProvider = "openai",
      modelId,
    } = (await req.json()) as OutlineRequest;

    console.log("📋 Request Parameters:");
    console.log("  - Prompt:", prompt);
    console.log("  - Number of Cards:", numberOfCards);
    console.log("  - Language:", language);
    console.log("  - Model Provider:", modelProvider);
    console.log("  - Model ID:", modelId);

    if (!prompt || !numberOfCards || !language) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const languageMap: Record<string, string> = {
      "en-US": "English (US)",
      pt: "Portuguese",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ru: "Russian",
      hi: "Hindi",
      ar: "Arabic",
    };

    const actualLanguage = languageMap[language] ?? language;
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create model based on selection
    console.log("🤖 Creating model:", modelProvider, modelId);
    const model = modelPicker(modelProvider, modelId);
    console.log("✅ Model created successfully");

    console.log("🚀 Starting streamText with web search tool...");
    
    // Cerebras doesn't support tools, so skip tools for cerebras
    const supportsTools = modelProvider !== "cerebras";
    console.log("🔧 Model supports tools:", supportsTools);
    
    const result = streamText({
      model,
      system: outlineSystemPrompt
        .replace("{numberOfCards}", numberOfCards.toString())
        .replace("{language}", actualLanguage)
        .replace("{currentDate}", currentDate),
      messages: [
        {
          role: "user",
          content: `Create a presentation outline for: ${prompt}`,
        },
      ],
      ...(supportsTools ? {
        tools: {
          webSearch: search_tool,
        },
        maxSteps: 5,
        toolChoice: "auto" as const,
      } : {}),
    });

    console.log("✅ Stream created, returning response\n");
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("\n❌ ERROR in outline generation with search:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Failed to generate outline with search" },
      { status: 500 },
    );
  }
}
