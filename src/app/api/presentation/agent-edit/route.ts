import { getServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLLMFallbackService } from "@/lib/llm/llm-fallback";

interface AgentEditRequest {
  instruction: string;
  slideId: string;
  currentContent: unknown;
  presentationContext?: {
    slides?: unknown[];
    theme?: string;
    outline?: string[];
  };
  modelProvider?: string;
  modelId?: string;
}

const agentEditPrompt = `You are an expert medical presentation editor specializing in creating professional, accurate, and engaging educational content for healthcare professionals.

## CURRENT SLIDE CONTENT (Plate.js JSON Array)
{CURRENT_CONTENT}

## PRESENTATION CONTEXT
Theme: {THEME}
Total Slides: {TOTAL_SLIDES}
Full Presentation Outline: {OUTLINE}

## USER INSTRUCTION
{INSTRUCTION}

## CONTENT QUALITY GUIDELINES

### 1. MEDICAL ACCURACY
- Use precise medical terminology
- Include specific details (e.g., percentages, statistics, clinical criteria)
- Reference established medical knowledge
- Maintain scientific rigor

### 2. CLARITY & STRUCTURE
- Use clear, concise language
- Organize information hierarchically (main points → supporting details)
- Use bullet points for lists (3-5 items optimal)
- Keep sentences short and impactful

### 3. PROFESSIONAL TONE
- Write for healthcare professionals (doctors, nurses, medical students)
- Balance technical accuracy with readability
- Use active voice when possible
- Avoid redundancy

### 4. ENGAGEMENT
- Start with key takeaways or definitions
- Use specific examples or clinical scenarios
- Include relevant statistics or data points
- End with actionable insights

### 5. FORMATTING BEST PRACTICES
- Headings (h1, h2, h3): Clear, descriptive titles
- Paragraphs (p): 2-3 sentences maximum
- Lists (ul, ol): 3-5 items, parallel structure
- Emphasis: Use sparingly for key terms

## YOUR TASK
1. **Analyze**: Understand the user's instruction in context of the full presentation
2. **Plan**: Create a clear edit strategy (1-2 sentences)
3. **Execute**: Generate high-quality, medically accurate content
4. **Document**: List specific improvements made

## CRITICAL: OUTPUT FORMAT
You MUST output ONLY valid JSON in this EXACT format (no markdown, no code blocks, just pure JSON):

{
  "plan": "Brief explanation of what you will change and why",
  "modifiedContent": [ /* ARRAY of Plate.js nodes - maintain exact structure */ ],
  "changes": ["Specific change 1", "Specific change 2", "Specific change 3"]
}

## EXAMPLE - MEDICAL CONTENT
Current content:
[{"type":"h2","children":[{"text":"Symptoms"}]},{"type":"p","children":[{"text":"Patients may experience various symptoms."}]}]

User instruction: "add more details about liver cirrhosis symptoms"

Output:
{
  "plan": "I will expand the symptoms section with specific clinical manifestations of liver cirrhosis, organized by severity and system affected",
  "modifiedContent": [
    {"type":"h2","children":[{"text":"Clinical Manifestations of Liver Cirrhosis"}]},
    {"type":"h3","children":[{"text":"Early Stage Symptoms"}]},
    {"type":"ul","children":[
      {"type":"li","children":[{"text":"Fatigue and weakness (most common early symptom)"}]},
      {"type":"li","children":[{"text":"Loss of appetite and unintended weight loss"}]},
      {"type":"li","children":[{"text":"Nausea and abdominal discomfort"}]}
    ]},
    {"type":"h3","children":[{"text":"Advanced Stage Symptoms"}]},
    {"type":"ul","children":[
      {"type":"li","children":[{"text":"Jaundice (yellowing of skin and eyes)"}]},
      {"type":"li","children":[{"text":"Ascites (fluid accumulation in abdomen)"}]},
      {"type":"li","children":[{"text":"Portal hypertension with esophageal varices"}]},
      {"type":"li","children":[{"text":"Hepatic encephalopathy (confusion, altered mental status)"}]}
    ]}
  ],
  "changes": [
    "Upgraded heading to be more specific: 'Clinical Manifestations of Liver Cirrhosis'",
    "Added structured categorization: Early vs Advanced stage symptoms",
    "Included 7 specific symptoms with clinical context",
    "Used medical terminology appropriate for healthcare professionals"
  ]
}

## TECHNICAL RULES
- modifiedContent MUST be an ARRAY, not an object
- Preserve exact Plate.js node structure: {"type":"...", "children":[...]}
- Keep all existing node IDs if present
- Maintain slide layout and theme
- For lists, use {"type":"li","children":[{"text":"..."}]} structure
- Output ONLY the JSON object, no markdown, no code blocks

## CONTENT ENHANCEMENT STRATEGIES

When user asks to:
- **"Add more details"**: Include specific facts, statistics, clinical criteria
- **"Make it clearer"**: Simplify language, add structure, use bullet points
- **"Expand"**: Add subsections, examples, supporting evidence
- **"Improve"**: Enhance medical accuracy, add specificity, improve flow
- **"Rewrite"**: Maintain core message but improve clarity and professionalism

Now, process the user's instruction and create high-quality medical content. Output ONLY the JSON response.`;

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      instruction,
      slideId,
      currentContent,
      presentationContext,
    } = (await req.json()) as AgentEditRequest;

    if (!instruction || !slideId || !currentContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.log("Agent edit request:", {
      instruction,
      slideId,
    });

    // Initialize LLM service with fallback
    const llm = getLLMFallbackService();

    console.log("Using Cerebras model: llama-3.3-70b");

    // Format the prompt with actual data
    const formattedPrompt = agentEditPrompt
      .replace(
        "{CURRENT_CONTENT}",
        JSON.stringify(currentContent, null, 2),
      )
      .replace("{THEME}", presentationContext?.theme ?? "default")
      .replace(
        "{TOTAL_SLIDES}",
        (presentationContext?.slides?.length ?? 0).toString(),
      )
      .replace(
        "{OUTLINE}",
        presentationContext?.outline?.join(", ") ?? "N/A",
      )
      .replace("{INSTRUCTION}", instruction);

    console.log("Formatted prompt length:", formattedPrompt.length);

    // Generate response with fallback
    const response = await llm.generate(formattedPrompt, {
      systemPrompt: "You are an expert medical presentation editor with deep knowledge of healthcare, clinical medicine, and educational content design. You create accurate, professional, and engaging content for medical professionals. You always output valid JSON without markdown formatting.",
      temperature: 0.3,
      maxTokens: 4096,
    });

    console.log(`Agent edit completed using ${response.provider}`);

    // Return the response directly as JSON
    return NextResponse.json({
      success: true,
      content: response.content,
      provider: response.provider,
    });
  } catch (error) {
    console.error("Error in agent edit:", error);
    return NextResponse.json(
      {
        error: "Failed to process edit instruction",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
