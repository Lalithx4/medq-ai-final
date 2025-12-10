# Text-Heavy Slides Implementation

## Overview
Modified the presentation system to generate slides with **extensive text content** and **smaller images**, prioritizing information density over visuals.

---

## Changes Made

### 1. ✅ AI Prompt Templates - More Text Content

#### File: `src/app/api/presentation/generate-cerebras/route.ts`

**Changes:**
- Updated prompt to request **4-6 points per slide** (instead of 2-3)
- Each paragraph must have **2-4 full sentences** (20-40 words minimum)
- Each slide should have **200-300 words** of text content
- Images are now **small decorative elements** (icons/illustrations)
- Layout preference: `layout="vertical"` for text-heavy slides

**Example structure now generated:**
```xml
<BULLETS>
  <DIV><H3>Main Point 1</H3><P>Detailed explanation with 2-3 sentences providing comprehensive information, context, and supporting details.</P></DIV>
  <DIV><H3>Main Point 2</H3><P>Another detailed explanation with multiple sentences covering key aspects, benefits, and relevant information.</P></DIV>
  <DIV><H3>Main Point 3</H3><P>Third detailed point with thorough explanation including examples, statistics, or specific details.</P></DIV>
  <DIV><H3>Main Point 4</H3><P>Fourth comprehensive point with extensive details and supporting information.</P></DIV>
  <DIV><H3>Main Point 5</H3><P>Fifth detailed point providing additional context and thorough coverage of the topic.</P></DIV>
</BULLETS>
<IMG query="small icon or illustration" />
```

#### File: `src/app/api/presentation/generate/route.ts`

**Changes:**
- Same updates as Cerebras route
- Updated all layout examples to show 4-6 items with detailed paragraphs
- Emphasized comprehensive, informative content

---

### 2. ✅ Smaller Image Sizes

#### File: `src/hooks/presentation/useRootImageActions.ts`

**Changes:**
```typescript
// BEFORE:
export const BASE_WIDTH_PERCENTAGE = "45%";
export const BASE_HEIGHT = 384;

// AFTER:
export const BASE_WIDTH_PERCENTAGE = "25%"; // Reduced from 45%
export const BASE_HEIGHT = 200; // Reduced from 384
```

**Impact:**
- Side images (left/right layout) now take **25% width** instead of 45%
- Top images (vertical layout) now **200px height** instead of 384px
- **More space for text content** (75% width available)

---

### 3. ✅ Improved Text Readability

#### File: `src/components/presentation/editor/custom-elements/presentation-paragraph-element.tsx`

**Changes:**
```typescript
// Added leading-relaxed for better line spacing
className="presentation-paragraph m-0 px-0 py-1.5 text-base leading-relaxed"
```

**Impact:**
- Increased line height for better readability
- More comfortable reading experience with longer paragraphs

---

### 4. ✅ Optimized Layout Columns

#### File: `src/components/presentation/editor/custom-elements/bullet.tsx`

**Changes:**
```typescript
// BEFORE: Up to 3 columns
if (count <= 1) return "grid-cols-1";
if (count <= 2) return "grid-cols-2";
return "grid-cols-3";

// AFTER: Max 2 columns for text-heavy content
if (count <= 2) return "grid-cols-1"; // Single column
if (count <= 4) return "grid-cols-2"; // Two columns
return "grid-cols-2"; // Max 2 columns
```

**Impact:**
- **Single column** for 1-2 items (better for long paragraphs)
- **Two columns** for 3+ items (still readable)
- **Never 3 columns** (too narrow for detailed text)
- Increased gap from `gap-6` to `gap-8` for better spacing

---

## Visual Comparison

### Before:
```
┌─────────────────────────────────────────────┐
│  ┌──────────┐                               │
│  │          │  • Point 1                    │
│  │  Image   │  • Point 2                    │
│  │  (45%)   │  • Point 3                    │
│  │          │                               │
│  └──────────┘                               │
└─────────────────────────────────────────────┘
```

### After:
```
┌─────────────────────────────────────────────┐
│ ┌────┐                                      │
│ │Img │  • Main Point 1 Title                │
│ │25% │    Detailed explanation with 2-3     │
│ └────┘    sentences providing comprehensive │
│           information and context.          │
│                                             │
│         • Main Point 2 Title                │
│           Another detailed explanation with │
│           multiple sentences covering key   │
│           aspects and benefits.             │
│                                             │
│         • Main Point 3 Title                │
│           Third detailed point with thorough│
│           explanation including examples.   │
│                                             │
│         • Main Point 4 Title                │
│           Fourth comprehensive point with   │
│           extensive details.                │
│                                             │
│         • Main Point 5 Title                │
│           Fifth detailed point providing    │
│           additional context.               │
└─────────────────────────────────────────────┘
```

---

## Content Guidelines for AI

The AI now follows these rules:

### Text Content:
✅ **4-6 points** per slide (not 2-3)
✅ **2-4 sentences** per paragraph (20-40 words)
✅ **200-300 words** total per slide
✅ **Detailed explanations** with examples, statistics, context
✅ **Professional, informative** language
✅ **Clear, descriptive subtitles** (5-8 words)

### Images:
✅ **Small decorative elements** only
✅ **Simple icon/illustration queries**
✅ **Secondary to text** content
✅ **25% width** (side) or **200px height** (top)

### Layout:
✅ **Prefer `layout="vertical"`** for text-heavy slides
✅ **Single or two-column** layouts (never 3 columns)
✅ **Increased spacing** between items (gap-8)
✅ **Better line height** for readability

---

## Testing

### To Test the Changes:

1. **Generate a new presentation:**
   ```bash
   # Start the server
   pnpm dev
   ```

2. **Create presentation:**
   - Go to dashboard
   - Enter a topic (e.g., "AI in Healthcare")
   - Select Cerebras model
   - Generate

3. **Expected Results:**
   - ✅ Each slide has 4-6 points
   - ✅ Each point has 2-3 sentences
   - ✅ Images are small (25% width or 200px height)
   - ✅ Lots of text content (200-300 words per slide)
   - ✅ Single or two-column layouts
   - ✅ Good spacing and readability

---

## Customization

### To Adjust Text Amount:

**File:** `src/app/api/presentation/generate-cerebras/route.ts`

```typescript
// Change number of points per slide
4. Each layout must contain 4-6 DIV tags (NOT just 2-3)
// Change to: 6-8 DIV tags for even more content

// Change paragraph length
5. Each P tag must contain 2-4 FULL SENTENCES (minimum 20-40 words per paragraph)
// Change to: 3-5 FULL SENTENCES (minimum 40-60 words)
```

### To Adjust Image Size:

**File:** `src/hooks/presentation/useRootImageActions.ts`

```typescript
// Make images even smaller
export const BASE_WIDTH_PERCENTAGE = "20%"; // Even smaller
export const BASE_HEIGHT = 150; // Even smaller

// Or make them larger
export const BASE_WIDTH_PERCENTAGE = "30%"; // Slightly larger
export const BASE_HEIGHT = 250; // Slightly larger
```

### To Adjust Column Layout:

**File:** `src/components/presentation/editor/custom-elements/bullet.tsx`

```typescript
// Force single column always
if (count <= 10) return "grid-cols-1"; // All single column

// Or allow 3 columns for many items
if (count <= 2) return "grid-cols-1";
if (count <= 4) return "grid-cols-2";
return "grid-cols-3"; // Allow 3 columns
```

---

## Benefits

### For Users:
✅ **More information** per slide
✅ **Comprehensive content** with context and examples
✅ **Professional appearance** with detailed explanations
✅ **Better for reports** and academic presentations
✅ **Less scrolling** - more content visible at once

### For Content Quality:
✅ **Detailed explanations** instead of bullet points
✅ **Context and examples** included
✅ **Statistics and data** when relevant
✅ **Thorough coverage** of topics
✅ **Professional tone** maintained

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/presentation/generate-cerebras/route.ts` | Updated prompt for detailed text |
| `src/app/api/presentation/generate/route.ts` | Updated prompt for detailed text |
| `src/hooks/presentation/useRootImageActions.ts` | Reduced image sizes (25% / 200px) |
| `src/components/presentation/editor/custom-elements/presentation-paragraph-element.tsx` | Added line height for readability |
| `src/components/presentation/editor/custom-elements/bullet.tsx` | Optimized for 1-2 columns, increased spacing |

---

## Rollback Instructions

If you want to revert to the original visual-heavy style:

1. **Restore image sizes:**
   ```typescript
   // src/hooks/presentation/useRootImageActions.ts
   export const BASE_WIDTH_PERCENTAGE = "45%";
   export const BASE_HEIGHT = 384;
   ```

2. **Restore prompt templates:**
   - Change "4-6 DIV tags" back to "2-3 DIV tags"
   - Change "2-4 FULL SENTENCES" back to "brief descriptions"
   - Remove "200-300 words" requirement

3. **Restore column layout:**
   ```typescript
   // src/components/presentation/editor/custom-elements/bullet.tsx
   if (count <= 1) return "grid-cols-1";
   if (count <= 2) return "grid-cols-2";
   return "grid-cols-3";
   ```

---

**Status:** ✅ **COMPLETE - Ready for Testing**

**Last Updated:** 2025-10-21
