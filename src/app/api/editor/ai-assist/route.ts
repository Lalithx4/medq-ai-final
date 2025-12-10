import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, context } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Determine operation type for credit cost
    const lowerQuery = query.toLowerCase();
    const isEditRequest = 
      lowerQuery.includes("change") ||
      lowerQuery.includes("edit") ||
      lowerQuery.includes("modify") ||
      lowerQuery.includes("improve");
    
    const isCitationRequest = 
      lowerQuery.includes("citation") ||
      lowerQuery.includes("reference");

    // Determine credit operation
    let operation = "editor_generate";
    if (isEditRequest) operation = "editor_improve";
    if (isCitationRequest) operation = "editor_citations";

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, operation);
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for this operation." },
        { status: 402 }
      );
    }

    // Call your AI service for assistance
    const { response, suggestedContent } = await getAiAssistance(query, context);

    // Deduct credits after successful generation
    await CreditService.deductCredits(user.id, operation, `AI assist: ${query.substring(0, 50)}`);

    return NextResponse.json({
      success: true,
      response,
      suggestedContent,
    });
  } catch (error) {
    console.error("Error getting AI assistance:", error);
    return NextResponse.json(
      { error: "Failed to get AI assistance" },
      { status: 500 }
    );
  }
}

async function getAiAssistance(
  query: string,
  context: string
): Promise<{ response: string; suggestedContent?: string }> {
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  
  if (!cerebrasKey) {
    return {
      response: "Cerebras API key not configured. Please add CEREBRAS_API_KEY to your .env file.",
    };
  }

  try {
    const cerebras = new Cerebras({ apiKey: cerebrasKey });

    // Determine request type
    const lowerQuery = query.toLowerCase();
    
    // Check for review requests first (before edit requests)
    const isReviewRequest = 
      lowerQuery.includes("review") ||
      lowerQuery.includes("assess") ||
      lowerQuery.includes("evaluate") ||
      lowerQuery.includes("analyze");
    
    const isEditRequest = 
      !isReviewRequest && (
        lowerQuery.includes("change") ||
        lowerQuery.includes("edit") ||
        lowerQuery.includes("modify") ||
        lowerQuery.includes("update") ||
        lowerQuery.includes("replace") ||
        lowerQuery.includes("rewrite") ||
        lowerQuery.includes("improve")
      );
    
    const isAddRequest = 
      lowerQuery.includes("add") ||
      lowerQuery.includes("continue") ||
      lowerQuery.includes("write") ||
      lowerQuery.includes("generate") ||
      lowerQuery.includes("create") ||
      lowerQuery.includes("insert");

    const isCitationRequest = 
      lowerQuery.includes("citation") ||
      lowerQuery.includes("reference") ||
      lowerQuery.includes("cite");

    const isIntroRequest = 
      lowerQuery.includes("intro") ||
      lowerQuery.includes("introduction");
    
    // Create appropriate prompt
    let systemPrompt = "You are an expert medical AI assistant specialized in academic and clinical writing. You help with research papers, case studies, and medical documents. Always use proper markdown formatting with headers (##), bold (**), italic (*), and lists.";
    let userPrompt = "";
    
    if (isReviewRequest && context) {
      systemPrompt = "You are an expert manuscript reviewer. Analyze the provided manuscript and give comprehensive feedback. Return your response as JSON with: summary, strengths (array), weaknesses (array), suggestions (array), and score (object with grammar, structure, scientific, citations, overall - each 1-10).";
      userPrompt = `Please review this manuscript:\n\n${context}\n\nProvide your review as JSON format.`;
    } else if (isEditRequest && context) {
      systemPrompt = "You are an expert medical AI assistant. When the user asks to change/edit content, return the COMPLETE MODIFIED document with the changes applied. Preserve all existing sections that aren't being modified. Use proper markdown formatting.";
      userPrompt = `Current document:\n\n${context}\n\n---\n\nUser request: ${query}\n\nReturn the COMPLETE modified document with the requested changes applied. Keep all sections that aren't being modified exactly as they are:`;
    } else if (isCitationRequest && context) {
      systemPrompt = "You are a medical AI assistant. Add proper academic citations in the format: Author et al. (Year). Use realistic medical journal references with PMIDs where appropriate.";
      const contextPreview = context.substring(Math.max(0, context.length - 1000));
      userPrompt = `Document excerpt:\n${contextPreview}\n\nRequest: ${query}\n\nAdd 3-5 relevant medical citations to support the content. Format them properly with author names, years, and journal information. Include them in a References section at the end:`;
    } else if (isIntroRequest && context) {
      systemPrompt = "You are a medical AI assistant. When asked to edit an introduction, provide a well-structured, engaging introduction for a medical document.";
      userPrompt = `Current document:\n${context}\n\nRequest: ${query}\n\nProvide an improved introduction section. Include background, significance, and objectives. Use markdown formatting with ## Introduction header:`;
    } else if (isAddRequest && context) {
      const contextPreview = context.substring(Math.max(0, context.length - 800));
      systemPrompt = "You are a medical AI assistant. Generate high-quality medical content that continues or adds to the existing document. Use proper markdown formatting.";
      userPrompt = `Current document excerpt:\n${contextPreview}\n\nRequest: ${query}\n\nGenerate the requested content in markdown format:`;
    } else if (isAddRequest && !context) {
      systemPrompt = "You are a medical AI assistant. Generate high-quality medical content based on the request. Use proper markdown formatting with headers, lists, and emphasis.";
      userPrompt = `Request: ${query}\n\nGenerate the requested medical content in markdown format:`;
    } else {
      userPrompt = query;
    }

    // Call Cerebras API with streaming
    const stream = await cerebras.chat.completions.create({
      model: "llama-3.3-70b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: true,
      max_completion_tokens: 3000,
      temperature: 0.7,
      top_p: 0.8,
    });

    // Collect streamed response
    let aiResponse = "";
    for await (const chunk of stream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      aiResponse += content;
    }

    // Determine if we should suggest content changes (not for reviews)
    const shouldSuggestContent = (isEditRequest || isAddRequest || isCitationRequest || isIntroRequest) && !isReviewRequest;

    if (shouldSuggestContent) {
      return {
        response: "I've prepared the changes for you. Please review them and accept or reject the modifications.",
        suggestedContent: aiResponse.trim(),
      };
    }

    return {
      response: aiResponse.trim(),
    };
  } catch (error: any) {
    console.error("Error calling Cerebras API:", error);
    
    if (error?.status === 429) {
      return {
        response: "The AI service is currently busy. Please wait a moment and try again.",
      };
    }
    
    return {
      response: "I encountered an error. Please try again.",
    };
  }
}
