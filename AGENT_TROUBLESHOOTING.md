# Agent Troubleshooting Guide

## Error: "Failed to parse response: "" SyntaxError: Unexpected end of JSON input"

### Root Cause
The API is returning an **empty response**, which means the AI model isn't generating any output.

### Possible Reasons

#### 1. Missing or Invalid API Key ⚠️ **MOST LIKELY**
The `OPENAI_API_KEY` in your `.env` file might be:
- Not set
- Invalid
- Expired
- Out of credits

#### 2. Model Provider Mismatch
The agent is trying to use a model that isn't available.

#### 3. Network/API Issues
OpenAI API might be down or blocked.

---

## How to Fix

### Step 1: Check Your API Keys

1. **Open your `.env` file**:
   ```
   c:\Users\Lalith\biodocstspl2\agent\.env
   ```

2. **Verify these keys are set**:
   ```env
   OPENAI_API_KEY="sk-..." # Must start with sk-
   ```

3. **If missing**, get a key from:
   - OpenAI: https://platform.openai.com/api-keys

### Step 2: Verify API Key Works

Test your OpenAI key in terminal:

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="your-key-here"
curl https://api.openai.com/v1/models -H "Authorization: Bearer $env:OPENAI_API_KEY"
```

You should see a list of models. If you get an error, your key is invalid.

### Step 3: Check Server Logs

1. **Look at your terminal** where `pnpm dev` is running
2. **Look for these logs**:
   ```
   Agent edit request: { instruction: "...", slideId: "...", modelProvider: "openai", modelId: "..." }
   Using model: openai gpt-4o-mini
   Formatted prompt length: ...
   Stream result created
   ```

3. **If you see an error**, it will show what's wrong

### Step 4: Use Alternative Model (Cerebras)

If OpenAI isn't working, try Cerebras (it's free and fast):

1. **Get Cerebras API key**:
   - Go to: https://cloud.cerebras.ai/
   - Sign up and get API key

2. **Add to `.env`**:
   ```env
   CEREBRAS_API_KEY="your-cerebras-key"
   ```

3. **Update model picker state**:
   - In the presentation settings
   - Change model provider to "Cerebras"

### Step 5: Test with Simple Request

Try this in browser console (F12):

```javascript
fetch('/api/presentation/agent-edit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instruction: 'test',
    slideId: 'test-id',
    currentContent: [{ type: 'p', children: [{ text: 'test' }] }],
    modelProvider: 'openai',
    modelId: 'gpt-4o-mini'
  })
})
.then(r => r.text())
.then(console.log)
.catch(console.error)
```

---

## Quick Fixes

### Fix 1: Use Default OpenAI Model

The agent now defaults to `gpt-4o-mini` if no model is specified. Make sure your OpenAI key is valid.

### Fix 2: Check Environment Variables

Restart your dev server after adding API keys:

```bash
# Stop the server (Ctrl+C)
# Then restart
pnpm dev
```

Environment variables are only loaded on server start!

### Fix 3: Enable Debug Logging

The agent now logs everything. Check:

1. **Browser Console** (F12 → Console tab)
   - Should show: "Sending agent edit request"
   - Should show: "Response status: 200"
   - Should show: "Raw AI response"

2. **Server Terminal**
   - Should show: "Agent edit request"
   - Should show: "Using model: openai gpt-4o-mini"
   - Should show: "Stream result created"

---

## Expected Console Output (Working)

### Browser Console:
```
Sending agent edit request: {instruction: "edit introduction", slideId: "...", modelProvider: "openai", modelId: "gpt-4o-mini"}
Response status: 200 OK
Raw AI response: 0:"{\n  \"plan\": \"I will...\",\n  \"modifiedContent\": {...},\n  \"changes\": [...]\n}"
Extracted text content: {"plan":"...","modifiedContent":{...},"changes":[...]}
Parsed response: {plan: "...", modifiedContent: {...}, changes: [...]}
```

### Server Terminal:
```
Agent edit request: { instruction: 'edit introduction', slideId: '...', modelProvider: 'openai', modelId: 'gpt-4o-mini' }
Using model: openai gpt-4o-mini
Formatted prompt length: 1234
Stream result created
```

---

## Still Not Working?

### Check These:

1. **API Key Format**
   - OpenAI keys start with `sk-`
   - Cerebras keys start with different format
   - No quotes or spaces

2. **Server Restart**
   - Stop dev server (Ctrl+C)
   - Start again: `pnpm dev`
   - Changes to `.env` require restart

3. **Model Availability**
   - `gpt-4o-mini` is available on all OpenAI accounts
   - If you have an old account, try `gpt-3.5-turbo`

4. **Network Issues**
   - Check if you can access https://api.openai.com
   - Check firewall/proxy settings

---

## Alternative: Use Local Model (Ollama)

If you don't want to use API keys:

1. **Install Ollama**: https://ollama.ai
2. **Pull a model**: `ollama pull llama3.1:8b`
3. **Start Ollama**: `ollama serve`
4. **In presentation settings**, select "Ollama" as provider

---

## Contact Support

If none of this works, share:
1. Browser console logs (full output)
2. Server terminal logs (full output)
3. Which API keys you have configured (don't share the actual keys!)
