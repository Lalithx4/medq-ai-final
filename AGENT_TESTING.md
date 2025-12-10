# AI Agent Testing Guide

## What Was Fixed

### Issue
When accepting agent edits, the presentation wasn't updating visually.

### Root Causes
1. **Editor Update Logic**: The editor only updated during generation (`isGenerating === true`)
2. **State Reference**: The slide content reference wasn't changing properly
3. **Preview Display**: The preview was showing raw JSON instead of helpful info

### Fixes Applied

#### 1. Editor Update (presentation-editor.tsx)
- **Before**: Only updated when `isGenerating` was true
- **After**: Updates whenever content changes (including agent edits)

#### 2. State Management (presentation-state.ts)
- **Before**: Direct assignment of modified slide
- **After**: Deep copy with new references to trigger React re-renders
- Added console logging for debugging

#### 3. Agent Panel (AgentPanel.tsx)
- Added detailed console logging for debugging
- Improved preview display (removed raw JSON)
- Better visual feedback

## How to Test

### 1. Start the Dev Server
```bash
cd c:\Users\Lalith\biodocstspl2\agent
pnpm dev
```

### 2. Open Browser Console
- Press F12 to open DevTools
- Go to Console tab
- Keep it open to see debug logs

### 3. Test the Agent

1. **Navigate to a presentation**
   - Go to http://localhost:3000
   - Sign in
   - Open any existing presentation

2. **Click the "Agent" button**
   - Look for the purple/pink gradient button in the top-right
   - Agent panel should slide in from the right

3. **Send a simple instruction**
   - Type: "edit introduction"
   - Press Enter or click Send
   - Watch the console for logs

4. **Check Console Logs**
   You should see:
   - "Raw AI response:" - The streaming response from AI
   - "Extracted text content:" - Parsed text
   - "Parsed response:" - Final JSON object

5. **Review the Preview**
   - Edit Plan should appear
   - Changes Made list should show
   - Preview Ready indicator

6. **Accept Changes**
   - Click "Accept Changes" button
   - Watch console for: "Accepting agent edit..."
   - Watch console for: "Agent edit accepted, updating slide:"
   - **The slide should update immediately!**

### 4. Verify the Update

After accepting:
- [ ] The slide content should change visually
- [ ] The agent panel should close or clear
- [ ] Toast notification "Changes applied!"
- [ ] Auto-save should trigger (watch for save indicator)

### 5. Test Different Instructions

Try these commands:
- "change the title to 'New Title'"
- "add more bullet points"
- "make it more concise"
- "add a conclusion"
- "rewrite the introduction to be more engaging"

## Debugging

### If Changes Don't Apply

1. **Check Console Logs**
   - Look for errors in red
   - Check if "Parsed response:" shows valid data
   - Verify "Agent edit accepted" appears

2. **Check Network Tab**
   - Go to Network tab in DevTools
   - Look for `/api/presentation/agent-edit` request
   - Check if it returns 200 OK
   - View the response

3. **Check State**
   In console, run:
   ```javascript
   window.__ZUSTAND_STORE__ = require('@/states/presentation-state').usePresentationState.getState()
   console.log(window.__ZUSTAND_STORE__.slides)
   ```

### Common Issues

#### AI Response Not Parsing
- **Symptom**: Error "Failed to parse AI response"
- **Fix**: Check if AI is returning valid JSON
- **Debug**: Look at "Raw AI response" in console

#### Slide Not Updating
- **Symptom**: Accept button works but slide doesn't change
- **Fix**: Check if `modifiedContent` has the right structure
- **Debug**: Look at "Parsed response:" - should have `modifiedContent` field

#### Agent Panel Not Opening
- **Symptom**: Agent button doesn't do anything
- **Fix**: Check if button is visible and clickable
- **Debug**: Check if `isAgentOpen` state is changing

## Expected Console Output

When everything works correctly:

```
Raw AI response: 0:"{\n  \"plan\": \"I will update...\",\n  \"modifiedContent\": {...},\n  \"changes\": [...]\n}"
Extracted text content: {
  "plan": "I will update...",
  "modifiedContent": {...},
  "changes": [...]
}
Parsed response: {plan: "...", modifiedContent: {...}, changes: [...]}
Accepting agent edit... {original: {...}, modified: {...}, plan: "...", changes: [...]}
Agent edit accepted, updating slide: 0 {id: "...", content: [...], ...}
Slides after accept: [{...}, {...}, ...]
```

## Next Steps

If everything works:
1. Test with different AI models (Cerebras, Ollama)
2. Test with complex edits
3. Test with multiple slides
4. Add more sophisticated edit capabilities

If issues persist:
1. Share console logs
2. Share network response
3. Describe exact steps to reproduce
