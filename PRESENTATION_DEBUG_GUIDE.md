# Presentation Generation Debug Guide

## Debug Logging Added

I've added comprehensive console logging throughout the presentation generation pipeline to help identify the issue.

### 1. API Route (`/api/presentation/generate`)
**Location**: `src/app/api/presentation/generate/route.ts`

**Logs to watch for**:
- `========== PRESENTATION GENERATION API CALLED ==========` - API entry point
- `✅ User authenticated: [userId]` - Authentication success
- `📋 Request Parameters:` - Shows all incoming parameters
- `🎯 Expected slides to generate: [number]` - How many slides should be created
- `🚀 Starting AI stream generation...` - Stream started
- `✅ Stream created, returning response` - Response sent

### 2. Frontend Manager
**Location**: `src/components/presentation/dashboard/PresentationGenerationManager.tsx`

**Logs to watch for**:
- `🎨 ========== STARTING PRESENTATION GENERATION ==========` - Generation initiated
- `📋 Outline items: [number]` - Number of outline items (should match expected slides)
- `📨 Presentation completion updated, length: [number]` - Streaming content received
- `🔄 Parsing XML chunk, length: [number]` - Parser processing chunk
- `📊 Parsed slides count: [number]` - How many slides were parsed
- `🏁 GENERATION FINISHED` - Stream completed
- `💾 Saving to database - slides count: [number]` - Final save

### 3. XML Parser
**Location**: `src/components/presentation/utils/parser.ts`

**Logs to watch for**:
- `🔍 Extracting complete sections from buffer` - Looking for complete SECTION tags
- `✅ Found complete section, total completed: [number]` - Section extracted
- `⚙️ Processing [number] completed sections` - Converting to slides
- `🎨 Created slide:` - Individual slide details

## How to Test

### Step 1: Start the Development Server
```bash
cd /Users/rahulkumar/Downloads/last-main
pnpm dev
```

### Step 2: Open Browser Console
1. Open the application in your browser (usually http://localhost:3000)
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Go to the Console tab

### Step 3: Create a Presentation
1. Navigate to the presentation creation page
2. Enter a topic (e.g., "Artificial Intelligence in Healthcare")
3. Set number of slides (e.g., 5)
4. Click "Generate Outline"
5. Once outline is generated, click "Generate Presentation"

### Step 4: Monitor the Logs

Watch the console output for the flow:

**Expected Flow**:
```
🎨 ========== STARTING PRESENTATION GENERATION ==========
📋 Outline items: 5
📝 Outline content: [array of outline items]
🚀 Calling generatePresentation API...

========== PRESENTATION GENERATION API CALLED ==========
✅ User authenticated: [userId]
📋 Request Parameters:
  - Title: [title]
  - Outline Length: 5
🎯 Expected slides to generate: 5
🚀 Starting AI stream generation...
✅ Stream created, returning response

📨 Presentation completion updated, length: 150
🔄 Parsing XML chunk, length: 150
📄 Content preview (first 300 chars): <PRESENTATION>...
🔍 Extracting complete sections from buffer, length: 150
📊 Parsed slides count: 0

📨 Presentation completion updated, length: 500
🔄 Parsing XML chunk, length: 500
✅ Found complete section, total completed: 1
⚙️ Processing 1 completed sections
🎨 Created slide: { id: '...', contentElements: 3, hasRootImage: true }
📊 Parsed slides count: 1

... (continues for each slide)

🏁 GENERATION FINISHED
📏 Final completion length: 5000
🔚 Finalized slides: 5
💾 Saving to database - slides count: 5
✅ Presentation saved to database with 5 slides
```

## Common Issues to Look For

### Issue 1: No Slides Generated (Count = 0)
**Symptoms**: `📊 Parsed slides count: 0` throughout
**Possible Causes**:
- AI not generating proper XML format
- Missing `<SECTION>` tags
- Malformed XML structure

**Check**: Look at the `📄 Content preview` to see what XML is being generated

### Issue 2: Fewer Slides Than Expected
**Symptoms**: `🔚 Finalized slides: 2` when expecting 5
**Possible Causes**:
- AI stopping early
- Incomplete sections not being parsed
- Parser not finding closing `</SECTION>` tags

**Check**: Compare `🎯 Expected slides to generate` with `🔚 Finalized slides`

### Issue 3: Slides Missing Content
**Symptoms**: `contentElements: 0` in slide creation logs
**Possible Causes**:
- Empty `<SECTION>` tags
- Content not matching expected XML structure
- Parser not recognizing layout components

**Check**: Look at `🎨 Created slide` logs for `contentElements` count

### Issue 4: Missing Images
**Symptoms**: `hasRootImage: false` for all slides
**Possible Causes**:
- No `<IMG>` tags in XML
- Incomplete `query` attributes
- Images not at root level of SECTION

**Check**: Look for `rootImageQuery` in slide creation logs

## Next Steps Based on Findings

### If AI is not generating proper XML:
- Check the prompt template in `route.ts`
- Verify the model is receiving correct instructions
- Test with different AI models

### If Parser is not extracting sections:
- Check for XML syntax errors in the generated content
- Verify `<SECTION>` tags are properly closed
- Look for unexpected characters or encoding issues

### If Slides are created but empty:
- Verify the layout components (BULLETS, COLUMNS, etc.) are being used
- Check if content is nested correctly within DIV tags
- Ensure headings and paragraphs are properly formatted

## Manual Testing Commands

### Check Current Slides in State
Add this to browser console while generation is running:
```javascript
// Get current presentation state
const state = window.__PRESENTATION_STATE__;
console.log('Current slides:', state?.slides?.length);
console.log('Slides detail:', state?.slides);
```

### Force Parser Finalization
If generation seems stuck:
```javascript
// This would need to be exposed in the component
// Just for debugging purposes
```

## Expected Output Example

A successful 5-slide presentation should show:
1. **Outline Generation**: 5 outline items created
2. **Stream Start**: API receives request with 5 outline items
3. **Incremental Parsing**: Slides appear one by one (1, 2, 3, 4, 5)
4. **Finalization**: All 5 slides finalized
5. **Save**: 5 slides saved to database

Each slide should have:
- Unique ID
- 2-5 content elements (headings, paragraphs, layouts)
- Root image with query (in most cases)
- Layout type (left/right/vertical)
