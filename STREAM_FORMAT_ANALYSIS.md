# Stream Format Analysis

## Problem Identified

We're sending the **wrong stream format** for `useChat`!

### Current Implementation (WRONG):
```typescript
// In outline-cerebras/route.ts
const dataChunk = `0:${JSON.stringify(content)}\n`;  // ❌ Data stream format
controller.enqueue(encoder.encode(dataChunk));
```

### What useChat Expects:

`useChat` expects **Server-Sent Events (SSE)** format or **AI SDK chat format**, NOT the data stream protocol.

## AI SDK Stream Formats

### 1. Data Stream Protocol (for useCompletion)
```
0:"text chunk"
0:"another chunk"
e:{"finishReason":"stop"}
```
- Used by: `useCompletion`
- Header: `X-Vercel-AI-Data-Stream: v1`

### 2. Chat Stream Format (for useChat)
```
data: {"id":"1","role":"assistant","content":"text"}
data: {"id":"1","role":"assistant","content":"more text"}
data: [DONE]
```
- Used by: `useChat`
- Header: `Content-Type: text/event-stream`

### 3. AI SDK Chat Messages Format
```typescript
// useChat expects messages array updates
{
  messages: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }  // This gets updated as stream comes in
  ]
}
```

## The Fix

We have **two options**:

### Option 1: Use AI SDK's streamText (RECOMMENDED)
```typescript
import { streamText } from 'ai';

export async function POST(req: Request) {
  // ... auth and setup ...
  
  const result = await streamText({
    model: cerebras(modelId),
    messages: [
      { role: "system", content: "..." },
      { role: "user", content: outlinePrompt }
    ],
  });
  
  return result.toDataStreamResponse();
}
```

### Option 2: Manual SSE Format
```typescript
const readableStream = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        // SSE format for useChat
        const sseData = `data: ${JSON.stringify({
          id: "msg-1",
          role: "assistant",
          content: content
        })}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      }
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }
});

return new Response(readableStream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
});
```

## Current vs Expected

### What We're Sending:
```
0:"<TITLE>"
0:"Your"
0:" Title"
e:{"finishReason":"stop"}
```

### What useChat Expects:
```
data: {"role":"assistant","content":"<TITLE>"}
data: {"role":"assistant","content":"Your"}
data: {"role":"assistant","content":" Title"}
data: [DONE]
```

## Why It's Not Working

1. **Wrong protocol**: Data stream (`0:`) vs SSE (`data:`)
2. **Wrong header**: `X-Vercel-AI-Data-Stream` vs `text/event-stream`
3. **Wrong parser**: `useChat` doesn't understand `0:` format

## Solution

Change the outline API to use proper AI SDK integration or SSE format.
