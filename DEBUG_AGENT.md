# Debug Agent - Empty Response Issue

## Current Status
- ✅ Server receives request
- ✅ Cerebras API is called
- ✅ Server logs show "Cerebras stream created"
- ❌ Client receives empty response
- ❌ Agent shows "No response from AI"

## What I Added

### Server Side Logging (`agent-edit/route.ts`)
Now logs:
- First 5 chunks received from Cerebras
- Total chunks sent
- Total content length
- First 200 chars of response
- Last 200 chars of response

### Client Side Logging (`AgentPanel.tsx`)
Now logs:
- Raw AI response (full text)
- Raw response length
- Number of chunks received
- First chunk content
- Number of lines
- Extracted text content
- Alternative parsing attempt

## How to Debug

### Step 1: Restart Dev Server
```bash
# Stop server (Ctrl+C)
pnpm dev
```

### Step 2: Open Browser Console
Press F12 → Console tab

### Step 3: Try Agent
1. Click "Agent" button
2. Type: "add more details"
3. Press Enter

### Step 4: Check Server Terminal

Look for these logs:
```
Agent edit request: { instruction: '...', slideId: '...' }
Using Cerebras model: llama-3.3-70b
Formatted prompt length: ...
Cerebras stream created
Chunk 1: ...
Chunk 2: ...
...
Total chunks sent: ...
Total content length: ...
First 200 chars: ...
Last 200 chars: ...
```

### Step 5: Check Browser Console

Look for these logs:
```
Sending agent edit request: {...}
Response status: 200 OK
Raw AI response: ...
Raw response length: ...
Number of chunks: ...
First chunk: ...
Number of lines: ...
Extracted text content: ...
```

## Possible Issues

### Issue 1: Server Not Sending Data
**Symptom**: Server logs show 0 chunks or empty content
**Cause**: Cerebras API key invalid or API error
**Fix**: Check CEREBRAS_API_KEY in .env

### Issue 2: Client Not Receiving Data
**Symptom**: Server logs show data, but client shows empty
**Cause**: Streaming format mismatch
**Fix**: Check "Raw AI response" in browser console

### Issue 3: Parsing Error
**Symptom**: Client receives data but can't parse it
**Cause**: JSON format incorrect
**Fix**: Check "Extracted text content" in browser console

## Expected Output

### Server Terminal (Good):
```
Cerebras stream created
Chunk 1: {
Chunk 2: \n  "plan": "I will add more details about...
Chunk 3: ",\n  "modifiedContent": [
...
Total chunks sent: 150
Total content length: 2500
First 200 chars: {
  "plan": "I will add more details about symptoms and treatment options",
  "modifiedContent": [
    {
      "type": "h1",
      "children": [
        {
          "text": "Liver Cirrhosis"
        }
      ]
    },
...
Last 200 chars: ...}
  ]
}
```

### Browser Console (Good):
```
Raw AI response: 0:"{"\n0:"\n  \"plan\": \"I will add...\"\n0:",\n  \"modifiedContent\": [\n"...
Raw response length: 5000
Number of chunks: 1
Number of lines: 150
Extracted text content: {
  "plan": "I will add more details...",
  "modifiedContent": [...],
  "changes": [...]
}
Text content length: 2500
Parsed response: {plan: "...", modifiedContent: Array(5), changes: Array(3)}
```

## Next Steps

1. **Run the agent** with new logging
2. **Share server terminal output** (the Cerebras logs)
3. **Share browser console output** (the parsing logs)
4. This will show us exactly where the issue is!

## Quick Test

To test if Cerebras is working at all, try this URL:
```
http://localhost:3000/api/presentation/agent-test
```

You should see streaming text in the browser. If this works, Cerebras is fine and the issue is in the agent-edit endpoint.
