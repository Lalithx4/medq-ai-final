# Outline Generation Debug Guide

## Overview
This guide helps debug outline generation issues in the presentation system.

---

## Test Scripts Created

### 1. `test-outline-simple.ts`
**Purpose**: Test the parsing logic without API calls

**Run**: `npx tsx test-outline-simple.ts`

**What it tests**:
- ✅ Title extraction from `<TITLE>` tags
- ✅ Content cleaning (removing title tags)
- ✅ Section splitting by `# ` headers
- ✅ Outline item creation
- ✅ Manager flow simulation

**Expected Output**:
```
✅ Title extraction: Working
✅ Outline parsing: Working
Expected items: 5
Actual items: 5
```

### 2. `test-outline-generation.ts`
**Purpose**: Full end-to-end test including API calls

**Run**: `CEREBRAS_API_KEY="your-key" npx tsx test-outline-generation.ts`

**What it tests**:
- Test 1: Direct Cerebras API call
- Test 2: Outline parser
- Test 3: API endpoint (requires server running)

---

## Debug Logging Added

### Browser Console Logs

When you generate a presentation, watch for these logs:

#### **1. Outline Effect Trigger**
```
🔔 [OUTLINE EFFECT] outlineMessages updated, count: 2
🔄 [OUTLINE EFFECT] isOutlineLoading: false
📝 [OUTLINE EFFECT] Last message role: assistant
📏 [OUTLINE EFFECT] Last message content length: 1234
📄 [OUTLINE EFFECT] Last message content preview: <TITLE>...
```

**What to check**:
- ✅ Message count should be > 1
- ✅ Last message role should be "assistant"
- ✅ Content should start with `<TITLE>`

#### **2. Message Processing**
```
📝 [PROCESS] Processing assistant message, content length: 1234
📄 [PROCESS] Content preview (first 300 chars): <TITLE>...
✅ [PROCESS] Title extracted: Your Title Here
🔍 [PROCESS] Parsing outline sections...
📏 [PROCESS] Clean content length: 916
📊 [PROCESS] Sections found: 5
✅ [PROCESS] Parsed outline items: 5
💾 [PROCESS] Storing outline items in buffer
📋 [PROCESS] First item preview: # Introduction...
```

**What to check**:
- ✅ Title should be extracted
- ✅ Sections found should match expected slides
- ✅ Outline items stored in buffer

#### **3. RAF Update**
```
🎬 [RAF] updateOutlineWithRAF called
📋 [RAF] Setting outline items: 5
📝 [RAF] Outline items: ["# Introduction...", "# Mechanisms...", ...]
✅ [RAF] updateOutlineWithRAF completed
```

**What to check**:
- ✅ RAF should be called
- ✅ Outline items should be set
- ✅ Items should appear in state

---

## Common Issues & Solutions

### Issue 1: No Messages Received
**Symptoms**:
```
🔔 [OUTLINE EFFECT] outlineMessages updated, count: 0
```

**Possible Causes**:
1. API endpoint not responding
2. Authentication failed
3. Network error

**Check**:
- Open Network tab in DevTools
- Look for `/api/presentation/outline-cerebras` request
- Check response status (should be 200)
- Verify `CEREBRAS_API_KEY` in `.env`

### Issue 2: Title Not Found
**Symptoms**:
```
⚠️ [PROCESS] Title not found yet, waiting for more content...
📄 [PROCESS] Current content: # Introduction...
```

**Possible Causes**:
1. API response doesn't include `<TITLE>` tags
2. Content format is wrong

**Solution**:
- Check API response format in Network tab
- Verify prompt in `/api/presentation/outline-cerebras/route.ts`
- Ensure prompt asks for `<TITLE>` tags

### Issue 3: No Sections Parsed
**Symptoms**:
```
📊 [PROCESS] Sections found: 0
⚠️ [PROCESS] No outline items parsed!
```

**Possible Causes**:
1. Content doesn't have `# ` headers
2. Regex split not working
3. Content is empty after title removal

**Solution**:
- Check clean content in logs
- Verify content has markdown headers (`# Topic`)
- Test with `test-outline-simple.ts`

### Issue 4: RAF Not Called
**Symptoms**:
- No `🎬 [RAF]` logs appear

**Possible Causes**:
1. `outlineBufferRef.current` is null
2. RAF already pending
3. Effect not triggering

**Solution**:
- Check if items are stored in buffer
- Verify `outlineRafIdRef.current` is null
- Check effect dependencies

---

## Expected Flow

### Successful Outline Generation:

```
1. User clicks "Generate"
   └─> shouldStartOutlineGeneration = true

2. Effect triggers appendOutlineMessage
   └─> API call to /api/presentation/outline-cerebras

3. API streams response
   └─> Messages array updates

4. Effect detects new messages
   🔔 [OUTLINE EFFECT] outlineMessages updated, count: 2
   └─> Calls processMessages()

5. processMessages extracts data
   📝 [PROCESS] Processing assistant message
   ✅ [PROCESS] Title extracted
   ✅ [PROCESS] Parsed outline items: 5
   └─> Stores in outlineBufferRef

6. RAF scheduled
   └─> requestAnimationFrame(updateOutlineWithRAF)

7. RAF executes
   🎬 [RAF] updateOutlineWithRAF called
   📋 [RAF] Setting outline items: 5
   └─> Calls setOutline()

8. State updated
   └─> Outline appears in UI
```

---

## API Response Format

### Expected from Cerebras:

```
<TITLE>Your Presentation Title</TITLE>

# First Topic
- Point 1
- Point 2
- Point 3

# Second Topic
- Point 1
- Point 2
- Point 3

# Third Topic
- Point 1
- Point 2
- Point 3
```

### AI SDK Stream Format:

```
0:"<TITLE>"
0:"Your"
0:" Title"
0:"</TITLE>\n\n"
0:"# First"
0:" Topic\n"
0:"- Point 1\n"
...
e:{"finishReason":"stop","usage":{...}}
```

---

## Testing Checklist

### Before Testing:
- [ ] Server running (`npm run dev`)
- [ ] `.env` has `CEREBRAS_API_KEY`
- [ ] User is authenticated
- [ ] Browser console is open

### During Test:
- [ ] Click "Generate Presentation"
- [ ] Watch console logs
- [ ] Check Network tab
- [ ] Verify outline appears

### After Test:
- [ ] Save console logs if error occurs
- [ ] Check which step failed
- [ ] Run `test-outline-simple.ts` to verify parsing
- [ ] Check API response in Network tab

---

## Quick Debug Commands

```bash
# Test parsing logic
npx tsx test-outline-simple.ts

# Test with API key
CEREBRAS_API_KEY="your-key" npx tsx test-outline-generation.ts

# Check Prisma connection
npx tsx test-prisma-connection.ts

# View recent logs
tail -f .next/trace

# Check environment
cat .env | grep CEREBRAS
```

---

## File Locations

### Components:
- `src/components/presentation/dashboard/PresentationGenerationManager.tsx`
  - Main generation logic
  - Message processing
  - RAF updates

### API Routes:
- `src/app/api/presentation/outline-cerebras/route.ts`
  - Cerebras API integration
  - Stream formatting
  - Response generation

### State:
- `src/states/presentation-state.ts`
  - Outline state
  - Generation flags
  - Current presentation

---

## Next Steps

If outline generation still fails after checking all above:

1. **Capture full console log**
   - Right-click console → Save as...
   - Share for analysis

2. **Check Network tab**
   - Find outline API request
   - Copy response
   - Verify format

3. **Test parser independently**
   - Run `test-outline-simple.ts`
   - Verify parsing works
   - Compare with actual API response

4. **Check state updates**
   - Add breakpoint in `setOutline()`
   - Verify items are passed correctly
   - Check if state actually updates

---

**Last Updated**: October 23, 2025  
**Status**: Debug logging added, ready for testing
