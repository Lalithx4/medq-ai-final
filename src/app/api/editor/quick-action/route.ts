import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, context } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Determine credit operation based on action
    let operation = "editor_generate";
    if (action === "improve_section") operation = "editor_improve";
    if (action === "add_citations") operation = "editor_citations";

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, operation);
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for this operation." },
        { status: 402 }
      );
    }

    // Execute the quick action
    const { response, suggestedContent } = await executeQuickAction(action, context);

    // Deduct credits after successful generation
    await CreditService.deductCredits(user.id, operation, `Quick action: ${action}`);

    return NextResponse.json({
      success: true,
      response,
      suggestedContent,
    });
  } catch (error) {
    console.error("Error executing quick action:", error);
    return NextResponse.json(
      { error: "Failed to execute quick action" },
      { status: 500 }
    );
  }
}

async function executeQuickAction(
  action: string,
  context: string
): Promise<{ response: string; suggestedContent?: string }> {
  // Try OpenAI first, fallback to Cerebras
  const openaiKey = process.env.OPENAI_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  
  if (!openaiKey && !cerebrasKey) {
    return {
      response: "AI service is not configured. Please add OPENAI_API_KEY or CEREBRAS_API_KEY to your .env file.",
    };
  }

  const useOpenAI = !!openaiKey;
  const apiKey = useOpenAI ? openaiKey : cerebrasKey;
  const apiUrl = useOpenAI ? OPENAI_API_URL : CEREBRAS_API_URL;
  const model = useOpenAI ? "gpt-4o-mini" : "llama-3.3-70b";

  // Comprehensive action prompts
  const actionConfigs: Record<string, { system: string; user: string }> = {
    generate_paper: {
      system: "You are an expert medical research writer. Generate a complete, well-structured research paper outline with detailed sections.",
      user: `Generate a comprehensive medical research paper structure on a relevant medical topic. Include:

## Abstract
(200-250 words summarizing background, methods, results, conclusions)

## Introduction
(Background, significance, research gap, objectives)

## Methods
(Study design, participants, procedures, analysis)

## Results
(Key findings with data)

## Discussion
(Interpretation, implications, limitations)

## Conclusion
(Summary and future directions)

## References
(5-7 key citations)

Use proper markdown formatting with headers (##), bold (**), and lists.`
    },
    generate_case_study: {
      system: "You are an expert clinical educator. Generate detailed, realistic medical case studies for educational purposes.",
      user: `Generate a comprehensive clinical case study with:

## Patient Presentation
(Age, gender, chief complaint)

## History of Present Illness
(Detailed symptom timeline)

## Past Medical History
(Relevant conditions, medications, allergies)

## Physical Examination
(Vital signs, system-specific findings)

## Diagnostic Workup
(Labs, imaging, other tests)

## Diagnosis
(Primary and differential diagnoses)

## Treatment Plan
(Medications, procedures, follow-up)

## Discussion
(Clinical reasoning, key teaching points)

Use proper markdown formatting.`
    },
    continue_writing: {
      system: "You are a medical writing assistant. Continue the document naturally, maintaining the same style, tone, and medical accuracy.",
      user: context ? `Continue writing this medical document naturally. Maintain the same style and depth:\n\n${context.substring(Math.max(0, context.length - 1000))}\n\nContinue with the next logical section or paragraph:` : "Please provide some context to continue writing."
    },
    improve_section: {
      system: "You are a medical editor. Improve the writing quality, clarity, and academic tone while preserving medical accuracy.",
      user: context ? `Improve this medical text. Enhance clarity, flow, and academic tone while maintaining accuracy:\n\n${context.substring(Math.max(0, context.length - 1500))}\n\nProvide the improved version:` : "Please provide text to improve."
    },
    add_citations: {
      system: "You are a medical librarian and research expert. Add realistic, properly formatted academic citations.",
      user: context ? `Add 5-7 relevant medical citations to support this content. Use realistic journal names, authors, and years. Format as:\n\nAuthor et al. (Year). Title. Journal Name. DOI/PMID\n\nDocument excerpt:\n${context.substring(Math.max(0, context.length - 1000))}\n\nAdd a ## References section with properly formatted citations:` : "Generate a References section with 5 medical citations."
    },
    add_section: {
      system: "You are a medical writing expert. Add well-structured, informative sections to medical documents.",
      user: context ? `Based on this document, add a relevant new section (e.g., Clinical Implications, Future Directions, or Recommendations). Choose the most appropriate section based on the content:\n\n${context.substring(0, 800)}\n\nAdd a new section with proper markdown formatting (## Header):` : "Add a Clinical Implications section with key points."
    },
  };

  const config = actionConfigs[action] || {
    system: "You are a helpful medical AI assistant.",
    user: "Help with medical document."
  };

  try {
    // Retry logic with exponential backoff
    let res;
    let retries = 3;
    let delay = 1000; // Start with 1 second
    let currentApiUrl = apiUrl;
    let currentApiKey = apiKey;
    let currentModel = model;
    let triedFallback = false;

    for (let i = 0; i < retries; i++) {
      res = await fetch(currentApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentApiKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            {
              role: "system",
              content: config.system
            },
            {
              role: "user",
              content: config.user
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      // If success, break
      if (res.ok) break;

      // If rate limited and we have a fallback option
      if (res.status === 429 && !triedFallback && cerebrasKey && useOpenAI) {
        console.log("OpenAI rate limited, trying Cerebras...");
        currentApiUrl = CEREBRAS_API_URL;
        currentApiKey = cerebrasKey;
        currentModel = "llama-3.3-70b";
        triedFallback = true;
        continue;
      }

      // If rate limited and not last retry, wait and retry
      if (res.status === 429 && i < retries - 1) {
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      // If not rate limit or last retry, break
      break;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("AI API error:", res.status, errText);
      
      if (res.status === 429) {
        return {
          response: "The AI service is currently busy. Please wait a moment and try again.",
        };
      }
      
      return {
        response: `I'm having trouble connecting to the AI service (Error ${res.status}). Please try again.`,
      };
    }

    const data = (await res.json()) as any;
    const aiResponse = data?.choices?.[0]?.message?.content || "Action completed.";

    // Provide action-specific response messages
    const responseMessages: Record<string, string> = {
      generate_paper: "I've generated a complete research paper structure for you. Review it in the diff viewer.",
      generate_case_study: "I've created a detailed clinical case study. Review it in the diff viewer.",
      continue_writing: "I've continued the document. Review the additions in the diff viewer.",
      improve_section: "I've improved the text. Review the changes in the diff viewer.",
      add_citations: "I've added relevant citations. Review them in the diff viewer.",
      add_section: "I've added a new section. Review it in the diff viewer.",
    };

    return {
      response: responseMessages[action] || "I've generated the content. Review it in the diff viewer.",
      suggestedContent: aiResponse,
    };
  } catch (error) {
    console.error("Error calling AI service:", error);
    return {
      response: "I encountered an error. Please try again.",
    };
  }
}
