# Presentation Generation Architecture

## Overview
This document explains the complete architecture of the presentation generation system and the solution implemented for Cerebras streaming.

## Architecture Flow

### 1. **Routing Structure**
```
/presentation                    → Dashboard (create new)
/presentation/generate/[id]      → Outline generation page
/presentation/[id]               → Presentation view/edit page
```

### 2. **State Management (Zustand)**
File: `/src/states/presentation-state.ts`

Key state variables:
- `slides: PlateSlide[]` - Array of slide objects with content
- `outline: string[]` - Generated outline items
- `isGeneratingPresentation: boolean` - Generation status
- `shouldStartPresentationGeneration: boolean` - Trigger flag
- `modelProvider` - Selected AI model provider (openai, cerebras, etc.)

### 3. **Component Hierarchy**

```
PresentationPage (Main.tsx)
  └─ PresentationLayout
      └─ PresentationSlidesView
          └─ SlideContainer (for each slide)
              └─ PresentationEditor (Plate.js editor)
```

### 4. **Generation Manager**
File: `/src/components/presentation/dashboard/PresentationGenerationManager.tsx`

**Key Responsibilities:**
- Monitors `shouldStartPresentationGeneration` flag
- Calls API endpoints via `useCompletion` hook
- Streams XML content from API
- Parses XML into Plate.js slides using `SlideParser`
- Updates Zustand state with parsed slides
- Saves to database when complete

**Hooks Used:**
- `useChat` - For outline generation (chat-based interaction)
- `useCompletion` - For presentation generation (completion-based)

### 5. **Parser System**
File: `/src/components/presentation/utils/parser.ts`

**SlideParser Class:**
- Parses streaming XML chunks incrementally
- Extracts `<SECTION>` tags for slides
- Converts XML elements to Plate.js nodes
- Handles layouts (BULLETS, COLUMNS, ICONS, etc.)
- Extracts image queries from `<IMG>` tags

## The Cerebras Streaming Issue

### Root Cause
The AI SDK's `useChat` and `useCompletion` hooks expect a specific streaming format:

**Expected Format (AI SDK Data Stream v1):**
```
0:"text chunk 1"
0:"text chunk 2"
0:"text chunk 3"
d:{}
```

Where:
- `0:` prefix = text chunk (JSON-encoded)
- `d:{}` = completion marker
- `3:` prefix = error (if any)

### Why Cerebras Needed Special Handling

1. **AI SDK Compatibility Issue**: The `streamText` function from AI SDK doesn't work well with Cerebras models
2. **Direct SDK Works**: The Cerebras SDK (`@cerebras/cerebras_cloud_sdk`) works perfectly (proven by deep-research system)
3. **Format Mismatch**: Initially, we sent raw text chunks, but `useCompletion` couldn't parse them

### Solution Implemented

Created Cerebras-specific API routes that:
1. Use Cerebras SDK directly (like deep-research)
2. Format the stream in AI SDK's expected format
3. Map model names correctly (e.g., `llama3.1-70b` → `llama-3.3-70b`)

**Files Created:**
- `/src/app/api/presentation/outline-cerebras/route.ts`
- `/src/app/api/presentation/generate-cerebras/route.ts`

**Key Implementation:**
```typescript
// Cerebras SDK streaming
const stream = await cerebras.chat.completions.create({
  model: "llama-3.3-70b",
  messages: [...],
  stream: true,
});

// Convert to AI SDK format
for await (const chunk of stream) {
  const content = chunk.choices?.[0]?.delta?.content || "";
  if (content) {
    // AI SDK format: "0:" + JSON-encoded chunk
    const dataChunk = `0:${JSON.stringify(content)}\n`;
    controller.enqueue(encoder.encode(dataChunk));
  }
}

// Send completion marker
controller.enqueue(encoder.encode("d:{}\n"));
```

**Frontend Integration:**
```typescript
// PresentationGenerationManager.tsx
const getOutlineApi = () => {
  if (modelProvider === "cerebras") {
    return "/api/presentation/outline-cerebras";
  }
  return webSearchEnabled
    ? "/api/presentation/outline-with-search"
    : "/api/presentation/outline";
};

const getPresentationApi = () => {
  if (modelProvider === "cerebras") {
    return "/api/presentation/generate-cerebras";
  }
  return "/api/presentation/generate";
};
```

## Data Flow

### Outline Generation
1. User enters topic on dashboard
2. Clicks "Generate Presentation"
3. `PresentationDashboard` creates empty presentation in DB
4. Navigates to `/presentation/generate/[id]`
5. `PresentationGenerationManager` detects `shouldStartOutlineGeneration`
6. Calls outline API (Cerebras-specific if Cerebras selected)
7. Streams outline content
8. Parses markdown into outline items
9. Updates Zustand state
10. User reviews outline and clicks "Generate Presentation"

### Presentation Generation
1. User clicks "Generate Presentation" button
2. Sets `shouldStartPresentationGeneration = true`
3. Navigates to `/presentation/[id]`
4. `PresentationGenerationManager` detects flag
5. Calls presentation API with outline + settings
6. Streams XML content
7. `SlideParser` parses XML chunks incrementally
8. Creates `PlateSlide` objects
9. Updates `slides` array in Zustand
10. `PresentationSlidesView` renders slides
11. Auto-saves to database when complete

## Key Learnings

1. **AI SDK Compatibility**: Not all LLM providers work seamlessly with AI SDK's abstractions
2. **Direct SDK Approach**: Using provider SDKs directly gives more control
3. **Stream Format Matters**: Frontend hooks expect specific formats
4. **Incremental Parsing**: Streaming parsers must handle incomplete XML gracefully
5. **Model Name Mapping**: Different providers use different naming conventions

## Testing Checklist

- [ ] Outline generates successfully with Cerebras
- [ ] Outline generates successfully with OpenAI
- [ ] Presentation generates with Cerebras
- [ ] Presentation generates with OpenAI
- [ ] Slides appear in real-time during generation
- [ ] Parser handles all layout types
- [ ] Images are extracted correctly
- [ ] Database saves complete presentation
- [ ] No credit deduction errors

## Future Improvements

1. **Unified Streaming**: Create a middleware that converts any LLM SDK to AI SDK format
2. **Better Error Handling**: More specific error messages for different failure modes
3. **Retry Logic**: Automatic retry for transient failures
4. **Progress Indicators**: Show parsing progress (X/Y slides parsed)
5. **Validation**: Validate XML structure before parsing
