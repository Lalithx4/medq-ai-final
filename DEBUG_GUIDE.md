# Presentation Generation Debug Guide

## What Was Implemented

Comprehensive debug logging at every critical step of the presentation generation and rendering pipeline.

## Debug Logs Added

### 1. **PresentationGenerationManager** (`src/components/presentation/dashboard/PresentationGenerationManager.tsx`)

#### RAF (RequestAnimationFrame) Updates
- `🎬 [RAF] updateSlidesWithRAF called` - When RAF callback fires
- `💭 [RAF] Extracted thinking` - When AI thinking is extracted
- `🔄 [RAF] Parsing XML chunk` - Before parsing
- `🔍 [RAF] Calling streamingParserRef.current.parseChunk` - Parser invocation
- `📊 [RAF] Parsed slides count: N` - After parsing
- `📌 [RAF] Latest slide:` - Details of most recent slide
- `📝 [RAF] First slide content sample` - Content preview
- `⚠️ [RAF] No slides parsed yet` - Warning if parser returns empty
- `🖼️ [RAF] Merging root images` - Image merge process
- `💾 [RAF] Calling setSlides with N slides` - Before state update
- `🔍 [RAF] State after setSlides:` - Verification after state update
- `✅ [RAF] updateSlidesWithRAF completed` - RAF completion

#### Presentation Completion Effect
- `🔔 [EFFECT] presentationCompletion effect triggered` - When useEffect fires
- `📨 [EFFECT] Presentation completion updated` - Content received
- `🎬 [EFFECT] Scheduling RAF for slides parsing` - RAF scheduled
- `⏭️ [EFFECT] RAF already pending, skipping` - RAF already queued
- `⚠️ [EFFECT] No presentationCompletion to process` - No content yet

#### Generation Finish (onFinish)
- `🏁 ========== GENERATION FINISHED ==========` - Start of finish handler
- `🔚 [FINISH] Calling streamingParserRef.current.finalize()` - Parser finalization
- `🔚 [FINISH] Finalized slides: N` - Final slide count
- `📝 [FINISH] Sample of first slide` - Content preview
- `❌ [FINISH] No slides were finalized!` - Error if empty
- `💾 [FINISH] Calling setSlides with N slides` - State update
- `✅ [FINISH] setSlides completed. State now has: N slides` - Verification
- `❌ [FINISH] STATE MISMATCH!` - Error if counts don't match
- `💾 [FINISH] Starting DB save process...` - DB save begins
- `🔍 [FINISH] State before save:` - Pre-save state snapshot
- `💾 [FINISH] Calling updatePresentation` - DB update call
- `✅ [FINISH] updatePresentation result:` - Save result
- `✅ [FINISH] Presentation saved to database successfully` - Success
- `❌ [FINISH] Save returned unsuccessful` - Save failed
- `🚦 [FINISH] Setting flags to stop generation` - Flags update
- `🏁 [FINISH] Final state:` - Final state snapshot
- `========== GENERATION COMPLETE ==========` - End marker

### 2. **PresentationSlidesView** (`src/components/presentation/presentation-page/PresentationSlidesView.tsx`)

- `🎨 [SLIDES_VIEW] Rendering PresentationSlidesView` - Component render with item count
- `🎨 [SLIDES_VIEW] Rendering slide N:` - Each slide render with details
- Shows "Generating slides..." or "No slides yet" when items.length === 0

### 3. **usePresentationSlides Hook** (`src/hooks/presentation/usePresentationSlides.tsx`)

- `🎯 [usePresentationSlides] Hook called, slides from state: N` - Hook invocation
- `🔄 [usePresentationSlides] useMemo recalculating items` - Items recalculation
- `⚠️ [usePresentationSlides] Generated new ID for slide N` - ID generation
- `✅ [usePresentationSlides] Items calculated: N` - Final items count

### 4. **Main.tsx** (`src/components/presentation/presentation-page/Main.tsx`)

#### DB Fetch
- `🔍 [MAIN] Fetching presentation from DB, id: X` - Fetch initiated
- `✅ [MAIN] Fetched presentation from DB:` - Fetch success with slide count
- `❌ [MAIN] Failed to fetch presentation` - Fetch error

#### Data Hydration
- `🔄 [MAIN] Presentation data effect triggered` - Effect fired
- `⏭️ [MAIN] Skipping data hydration (generating or fetch disabled)` - Skipped
- `💾 [MAIN] Hydrating state from DB data` - Hydration started
- `📥 [MAIN] Setting slides from DB: N` - Slides being set
- `✅ [MAIN] State after setSlides from DB: N` - Verification

## How to Use These Logs

### During Generation

Watch the browser console for this sequence:

1. **Stream starts:**
   ```
   🔔 [EFFECT] presentationCompletion effect triggered
   📨 [EFFECT] Presentation completion updated, length: 373
   🎬 [EFFECT] Scheduling RAF for slides parsing
   ```

2. **Parsing happens:**
   ```
   🎬 [RAF] updateSlidesWithRAF called
   🔄 [RAF] Parsing XML chunk, length: 373
   📊 [RAF] Parsed slides count: 1
   💾 [RAF] Calling setSlides with 1 slides
   🔍 [RAF] State after setSlides: { slidesInState: 1, ... }
   ```

3. **Rendering happens:**
   ```
   🎯 [usePresentationSlides] Hook called, slides from state: 1
   🔄 [usePresentationSlides] useMemo recalculating items, input slides: 1
   ✅ [usePresentationSlides] Items calculated: 1
   🎨 [SLIDES_VIEW] Rendering PresentationSlidesView { itemsCount: 1, ... }
   🎨 [SLIDES_VIEW] Rendering slide 0: { id: '...', hasContent: true, ... }
   ```

4. **Generation finishes:**
   ```
   🏁 ========== GENERATION FINISHED ==========
   🔚 [FINISH] Finalized slides: 5
   💾 [FINISH] Calling setSlides with 5 slides
   ✅ [FINISH] setSlides completed. State now has: 5 slides
   💾 [FINISH] Starting DB save process...
   ✅ [FINISH] Presentation saved to database successfully
   🚦 [FINISH] Setting flags to stop generation and allow fetch
   ========== GENERATION COMPLETE ==========
   ```

### Diagnosing Issues

#### Issue: No slides appear

**Check 1: Are slides being parsed?**
- Look for: `📊 [RAF] Parsed slides count: N`
- If N = 0 always → Parser issue (XML format problem)
- If N > 0 → Parser working, check next step

**Check 2: Are slides reaching state?**
- Look for: `💾 [RAF] Calling setSlides with N slides`
- Then: `🔍 [RAF] State after setSlides: { slidesInState: N }`
- If slidesInState = 0 but N > 0 → State update failing
- If slidesInState = N → State working, check next step

**Check 3: Are slides being rendered?**
- Look for: `🎯 [usePresentationSlides] Hook called, slides from state: N`
- If N = 0 → State was overwritten (check DB fetch logs)
- If N > 0 but no `🎨 [SLIDES_VIEW] Rendering slide` → Rendering issue

**Check 4: Was state overwritten by DB fetch?**
- After generation finishes, look for:
  ```
  🔍 [MAIN] Fetching presentation from DB
  ✅ [MAIN] Fetched presentation from DB: { slidesCount: 0 }
  📥 [MAIN] Setting slides from DB: 0
  ```
- If slidesCount = 0 → DB didn't have slides (save failed)
- Look back for: `✅ [FINISH] Presentation saved to database successfully`
- If missing → Save failed before fetch ran

#### Issue: Slides appear then disappear

This indicates DB overwrite:
1. Look for slides count growing during generation
2. Then after `GENERATION COMPLETE`, look for:
   ```
   🔍 [MAIN] Fetching presentation from DB
   📥 [MAIN] Setting slides from DB: 0
   ```
3. This means fetch ran before save completed
4. Check if `✅ [FINISH] Presentation saved` appears BEFORE the fetch

## Testing Commands

### Browser Console Tests

**1. Check current state:**
```js
const s = usePresentationState.getState();
console.log({
  slides: s.slides.length,
  isGeneratingPresentation: s.isGeneratingPresentation,
  currentSlideIndex: s.currentSlideIndex,
});
```

**2. Check DOM:**
```js
console.log({
  wrappers: document.querySelectorAll('.slide-wrapper').length,
  editors: document.querySelectorAll('[contenteditable="true"]').length,
});
```

**3. Force re-render (debug only):**
```js
const s = usePresentationState.getState();
s.setSlides([...s.slides]);
```

## Expected Flow (Happy Path)

```
1. User clicks "Generate Presentation"
2. [EFFECT] presentationCompletion effect triggered (multiple times as stream arrives)
3. [RAF] updateSlidesWithRAF called (multiple times)
4. [RAF] Parsed slides count grows: 1, 2, 3, 4, 5
5. [RAF] State after setSlides grows: 1, 2, 3, 4, 5
6. [usePresentationSlides] Hook called with growing slide counts
7. [SLIDES_VIEW] Rendering slides: 0, 1, 2, 3, 4
8. [FINISH] Generation finished, finalizes to 5 slides
9. [FINISH] setSlides with 5 slides
10. [FINISH] Saves to DB successfully
11. [FINISH] Sets isGeneratingPresentation = false
12. [MAIN] Fetch enabled, fetches from DB
13. [MAIN] Fetched presentation from DB: { slidesCount: 5 }
14. [MAIN] Setting slides from DB: 5 (no change, already 5)
15. Slides remain visible ✅
```

## Common Problems & Solutions

### Problem: Parser returns 0 slides
- **Cause:** XML format issue or incomplete XML
- **Check:** Look at `📄 [RAF] Content preview` - is it valid XML?
- **Solution:** Check Cerebras API response format

### Problem: setSlides called but state stays 0
- **Cause:** Zustand state update failing
- **Check:** Any errors in console?
- **Solution:** Check Zustand store definition

### Problem: State has slides but items.length = 0
- **Cause:** useMemo not recalculating or filtering out slides
- **Check:** `🔄 [usePresentationSlides] useMemo` logs
- **Solution:** Check useMemo dependencies

### Problem: items.length > 0 but no DOM nodes
- **Cause:** Rendering blocked or early return
- **Check:** `🎨 [SLIDES_VIEW] Rendering slide` logs
- **Solution:** Check PresentationSlidesView render conditions

### Problem: Slides appear then vanish
- **Cause:** DB fetch overwrites with empty content
- **Check:** Timing of `[FINISH] Presentation saved` vs `[MAIN] Fetching`
- **Solution:** Already fixed - save happens before isGeneratingPresentation = false

## Cleanup

To remove all debug logs later, search for:
- `console.log` with prefixes: `[RAF]`, `[EFFECT]`, `[FINISH]`, `[SLIDES_VIEW]`, `[usePresentationSlides]`, `[MAIN]`
- Or search for emoji prefixes: 🎬, 🔔, 🏁, 🎨, 🎯, 🔍, 💾, etc.
