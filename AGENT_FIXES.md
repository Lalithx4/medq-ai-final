# Agent Blank Slide Fix

## What Was Wrong

When you clicked "Accept Changes", the slide became blank because:

1. **AI was returning wrong format** - `modifiedContent` was an object `{}` instead of array `[]`
2. **No validation** - Empty or invalid content was being applied
3. **Unclear prompt** - AI didn't understand it needed to return an array

---

## What I Fixed

### 1. **Improved AI Prompt** (`agent-edit/route.ts`)
- ✅ Explicitly states `modifiedContent` MUST be an ARRAY
- ✅ Added clear example showing array format
- ✅ Emphasized "no markdown, just JSON"
- ✅ Shows exact input/output example

### 2. **Added Validation** (`AgentPanel.tsx`)
- ✅ Checks if `modifiedContent` exists
- ✅ Validates it's an array
- ✅ Prevents accepting empty content
- ✅ Shows helpful error messages

### 3. **Better Error Messages**
- ✅ "AI response is missing modified content"
- ✅ "AI returned invalid content structure"
- ✅ "Cannot apply empty content"

---

## How to Test

### Step 1: Refresh Browser
Press `Ctrl + Shift + R` to get the new code

### Step 2: Open Browser Console
Press `F12` → Console tab

### Step 3: Try the Agent

1. Click "Agent" button
2. Type: **"change the title to 'Test Title'"**
3. Press Enter
4. **Watch the console logs**

### Expected Console Output:

```
Sending agent edit request: {...}
Response status: 200 OK
Raw AI response: 0:"{\n"0:"  \"plan\": \"...\",\n"...
Extracted text content: {"plan":"...","modifiedContent":[...],"changes":[...]}
Parsed response: {plan: "...", modifiedContent: Array(5), changes: Array(2)}
Modified content: [{type: "h1", children: [...]}, ...]
```

### Step 4: Check Preview

You should see:
- ✅ Edit Plan
- ✅ Changes Made list
- ✅ Preview Ready indicator

### Step 5: Accept Changes

Click "Accept Changes"

**Result**: The slide should update with the new content, NOT go blank!

---

## If Slide Still Goes Blank

### Check Console for These Errors:

#### Error 1: "Response missing modifiedContent"
**Cause**: AI didn't return `modifiedContent` field  
**Fix**: The AI needs a valid Cerebras API key

#### Error 2: "modifiedContent is not an array"
**Cause**: AI returned `{}` instead of `[]`  
**Fix**: Already fixed in the prompt, but AI might still mess up

#### Error 3: "Cannot apply empty content"
**Cause**: `modifiedContent` is an empty array `[]`  
**Fix**: Try a more specific instruction

---

## Debugging Steps

### 1. Check the Raw Response
In console, look for: `"Raw AI response:"`

Should see something like:
```
0:"{\n"
0:"  \"plan\": \"I will change...\",\n"
0:"  \"modifiedContent\": [\n"
0:"    {\"type\":\"h1\",\"children\":[{\"text\":\"New Title\"}]}\n"
0:"  ],\n"
0:"  \"changes\": [\"Changed title\"]\n"
0:"}"
```

### 2. Check Parsed Response
Look for: `"Parsed response:"`

Should show:
```javascript
{
  plan: "I will change...",
  modifiedContent: [
    {type: "h1", children: [{text: "New Title"}]},
    // ... more nodes
  ],
  changes: ["Changed title"]
}
```

### 3. Check Modified Content
Look for: `"Modified content:"`

Should be an **array** with Plate.js nodes:
```javascript
[
  {type: "h1", children: [{text: "..."}]},
  {type: "p", children: [{text: "..."}]},
  // etc.
]
```

---

## Common Issues

### Issue: AI Returns Markdown Code Block

**Bad Response**:
```
```json
{
  "plan": "...",
  "modifiedContent": [...]
}
```
```

**Solution**: The prompt now explicitly says "no markdown, no code blocks"

---

### Issue: AI Returns Object Instead of Array

**Bad Response**:
```json
{
  "modifiedContent": {
    "type": "div",
    "children": [...]
  }
}
```

**Good Response**:
```json
{
  "modifiedContent": [
    {"type": "h1", "children": [...]},
    {"type": "p", "children": [...]}
  ]
}
```

**Solution**: Already fixed in prompt with clear example

---

### Issue: Empty Array

**Bad Response**:
```json
{
  "modifiedContent": []
}
```

**Solution**: Now blocked by validation - won't apply empty content

---

## Test Instructions

Try these commands in order:

1. **"change the title to 'New Title'"** - Simple text change
2. **"add a bullet point about symptoms"** - Adding content
3. **"make the introduction shorter"** - Removing content
4. **"rewrite this slide to be more engaging"** - Complete rewrite

After each:
- ✅ Check console logs
- ✅ Verify preview shows changes
- ✅ Accept and verify slide updates
- ✅ Slide should NOT go blank!

---

## If It Still Doesn't Work

Share these from console:
1. "Raw AI response:" - Full text
2. "Parsed response:" - The object
3. "Modified content:" - The array
4. Any error messages in red

This will help debug what the AI is actually returning!
