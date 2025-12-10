# Integration Update - Using Existing AI Medical Editor APIs

## Overview
Updated all three new features to use the existing **AI Medical Editor** APIs instead of creating separate endpoints. This ensures consistency, better error handling, and leverages proven functionality.

---

## Changes Made

### 1. **AI Paraphraser** ✅
**Before:** Custom `/api/paraphraser/generate` endpoint
**After:** Uses `/api/editor/paraphrase` endpoint

**Benefits:**
- Uses proven `gpt-4o` model with medical accuracy
- Supports tone variations (Academic, Formal, Fluent, Creative)
- Adjustable variation and length parameters
- Better error handling and logging

**Implementation:**
```typescript
// Now uses existing editor paraphrase endpoint
const response = await fetch("/api/editor/paraphrase", {
  body: JSON.stringify({
    text: inputText,
    tone: "Formal", // Maps to selected style
    variation: 50,  // Medium variation
    length: 50,     // Similar length
  }),
});
```

**Credit Operation:** `ai_paraphrase`

---

### 2. **Manuscript Review** ✅
**Before:** Custom `/api/manuscript-review/generate` endpoint
**After:** Uses `/api/editor/ai-assist` endpoint

**Benefits:**
- Leverages existing AI assistant with context awareness
- Supports multiple focus areas (Grammar, Structure, Scientific, Citations)
- Automatic operation detection (edit/improve)
- Integrated with credit system

**Implementation:**
```typescript
// Now uses existing editor AI assist endpoint
const response = await fetch("/api/editor/ai-assist", {
  body: JSON.stringify({
    query: "Please provide a comprehensive review...",
    context: manuscriptText,
  }),
});
```

**Credit Operation:** `editor_improve`

---

### 3. **Literature Review** ✅
**Before:** Custom `/api/literature-review/generate` endpoint
**After:** Uses `/api/deep-research/generate` endpoint

**Benefits:**
- Uses multi-agent research system with PubMed/arXiv integration
- Comprehensive literature synthesis with citations
- Markdown formatted output
- Automatic database storage

**Implementation:**
```typescript
// Now uses existing deep research endpoint
const response = await fetch("/api/deep-research/generate", {
  body: JSON.stringify({
    query: topic + keywords,
    topK: 5,      // Papers per section
    nSections: 5, // Number of sections
  }),
});
```

**Credit Operation:** `deep_research`

---

## Files Deleted

✅ `/src/app/api/paraphraser/generate/route.ts` - Removed (using editor endpoint)
✅ `/src/app/api/manuscript-review/generate/route.ts` - Removed (using ai-assist endpoint)
✅ `/src/app/api/literature-review/generate/route.ts` - Removed (using deep-research endpoint)

---

## Files Updated

✅ `/src/components/paraphraser/ParaphraserForm.tsx`
- Changed API endpoint to `/api/editor/paraphrase`
- Updated request parameters to match editor API
- Added tone mapping for style selection

✅ `/src/components/manuscript-review/ManuscriptReviewForm.tsx`
- Changed API endpoint to `/api/editor/ai-assist`
- Updated request parameters with query and context
- Added focus-specific prompts

✅ `/src/components/literature-review/LiteratureReviewForm.tsx`
- Changed API endpoint to `/api/deep-research/generate`
- Updated request parameters with query, topK, nSections
- Uses markdown output directly

---

## API Endpoints Used

### 1. Editor Paraphrase
**Endpoint:** `POST /api/editor/paraphrase`
**Parameters:**
- `text` (string) - Text to paraphrase
- `tone` (string) - Academic, Formal, Fluent, Creative, Balanced
- `variation` (number) - 0-100 (variation level)
- `length` (number) - 0-100 (output length)

**Response:**
```json
{
  "success": true,
  "paraphrased": "...",
  "originalLength": 50,
  "paraphrasedLength": 48
}
```

### 2. Editor AI Assist
**Endpoint:** `POST /api/editor/ai-assist`
**Parameters:**
- `query` (string) - The request/question
- `context` (string) - The text to analyze

**Response:**
```json
{
  "success": true,
  "response": "...",
  "suggestedContent": "..."
}
```

### 3. Deep Research Generate
**Endpoint:** `POST /api/deep-research/generate`
**Parameters:**
- `query` (string) - Research topic
- `topK` (number) - Papers per section (default: 3)
- `nSections` (number) - Number of sections (default: 5)

**Response:**
```json
{
  "markdown": "...",
  "cleanedTopic": "...",
  "wordCount": 5000,
  "paperCount": 15
}
```

---

## Credit System Integration

| Feature | Operation | Credits | Endpoint |
|---------|-----------|---------|----------|
| AI Paraphraser | `ai_paraphrase` | 2-5 | `/api/editor/paraphrase` |
| Manuscript Review | `editor_improve` | 3-5 | `/api/editor/ai-assist` |
| Literature Review | `deep_research` | 20 | `/api/deep-research/generate` |

---

## Benefits of This Approach

✅ **Consistency** - Uses proven, tested endpoints
✅ **Reliability** - Leverages existing error handling
✅ **Maintenance** - Less code to maintain
✅ **Features** - Access to all editor features (tone, variation, etc.)
✅ **Integration** - Automatic database storage for deep research
✅ **Performance** - Optimized endpoints with caching
✅ **Scalability** - Uses multi-agent system for literature review

---

## Testing Checklist

- [ ] AI Paraphraser works with all tone options
- [ ] Manuscript Review works with all focus areas
- [ ] Literature Review generates comprehensive reports
- [ ] All features save to editor correctly
- [ ] Credit deductions work properly
- [ ] Error messages are clear and helpful
- [ ] File uploads work for all features
- [ ] Copy to clipboard functionality works
- [ ] Editor integration works smoothly

---

## Next Steps

1. ✅ Test all three features with the new endpoints
2. ✅ Verify credit deductions are correct
3. ✅ Check error handling and logging
4. ✅ Monitor API performance
5. ✅ Gather user feedback

---

**Status:** ✅ Complete and Ready for Testing
**Date:** October 28, 2025
**Integration Type:** Using Existing AI Medical Editor APIs
