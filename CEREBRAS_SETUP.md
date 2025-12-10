# Cerebras AI Agent Setup Guide

## ✅ **Migration Complete!**

The AI Agent now uses **Cerebras** instead of OpenAI for faster and more cost-effective inference.

---

## **What Changed**

### **Before (OpenAI)**
- Used OpenAI's GPT models
- Required OpenAI API key
- Slower response times
- Pay-per-token pricing

### **After (Cerebras)**
- Uses Cerebras llama-3.3-70b model
- Requires Cerebras API key
- **10x faster inference** ⚡
- **Free tier available** 💰
- Better for real-time streaming

---

## **Setup Instructions**

### **Step 1: Get Cerebras API Key**

1. **Go to**: https://cloud.cerebras.ai/
2. **Sign up** for a free account
3. **Navigate to** API Keys section
4. **Create a new API key**
5. **Copy the key** (starts with `csk-...`)

---

### **Step 2: Add to Environment Variables**

1. **Open your `.env` file**:
   ```
   c:\Users\Lalith\biodocstspl2\agent\.env
   ```

2. **Add the Cerebras API key**:
   ```env
   CEREBRAS_API_KEY="csk-your-actual-key-here"
   ```

3. **Save the file**

---

### **Step 3: Restart Dev Server**

**IMPORTANT**: Environment variables only load on server start!

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart
pnpm dev
```

---

### **Step 4: Test the Agent**

#### **Test Endpoint**
Open this URL in your browser:
```
http://localhost:3000/api/presentation/agent-test
```

**Expected result**: You should see streaming text like:
```
0:"Hello"
0:" from"
0:" Cerebras"
0:" AI"
0:" Agent!"
```

#### **Test in Presentation**
1. Open any presentation
2. Click the **"Agent"** button (purple/pink gradient)
3. Type: **"edit introduction"**
4. Press Enter
5. Watch it work! ⚡

---

## **Model Details**

### **Cerebras llama-3.3-70b**
- **Size**: 70 billion parameters
- **Speed**: ~1000 tokens/second (10x faster than OpenAI)
- **Quality**: Comparable to GPT-4
- **Cost**: Free tier available, then pay-per-token
- **Context**: 8K tokens

### **Configuration**
```typescript
{
  model: "llama-3.3-70b",
  stream: true,
  max_completion_tokens: 2048,
  temperature: 0.2,
  top_p: 1
}
```

---

## **Troubleshooting**

### **Error: "Unauthorized" or "Invalid API Key"**

**Solution**:
1. Check your `.env` file has `CEREBRAS_API_KEY="..."`
2. Make sure the key starts with `csk-`
3. Restart the dev server
4. Test with: http://localhost:3000/api/presentation/agent-test

---

### **Error: "Failed to process edit instruction"**

**Check server logs** (terminal where `pnpm dev` is running):

**Good output**:
```
Agent edit request: { instruction: '...', slideId: '...' }
Using Cerebras model: llama-3.3-70b
Formatted prompt length: 1234
Cerebras stream created
```

**Bad output** (means API key issue):
```
Error in agent edit: Error: Invalid API key
```

---

### **Empty Response**

If you get an empty response:

1. **Check API key is valid**
2. **Check internet connection**
3. **Try the test endpoint**: http://localhost:3000/api/presentation/agent-test
4. **Check Cerebras status**: https://status.cerebras.ai/

---

## **Benefits of Cerebras**

✅ **10x Faster** - Responses in milliseconds  
✅ **Free Tier** - No credit card required to start  
✅ **Better Streaming** - Smooth real-time updates  
✅ **High Quality** - 70B parameter model  
✅ **No Rate Limits** - (on free tier)  

---

## **Console Output (Expected)**

### **Browser Console**:
```
Sending agent edit request: {instruction: "edit introduction", slideId: "...", modelProvider: "openai", modelId: "gpt-4o-mini"}
Response status: 200 OK
Raw AI response: 0:"{\n"0:"  \"plan\": \"I will update the introduction...\",\n"0:"  \"modifiedContent\": {...},\n"0:"  \"changes\": [...]\n"0:"}"
Extracted text content: {"plan":"...","modifiedContent":{...},"changes":[...]}
Parsed response: {plan: "...", modifiedContent: {...}, changes: [...]}
```

### **Server Terminal**:
```
Agent edit request: { instruction: 'edit introduction', slideId: '...' }
Using Cerebras model: llama-3.3-70b
Formatted prompt length: 2345
Cerebras stream created
```

---

## **API Comparison**

| Feature | OpenAI | Cerebras |
|---------|--------|----------|
| **Speed** | ~50 tokens/s | ~1000 tokens/s |
| **Free Tier** | No | Yes |
| **Model** | GPT-4o-mini | llama-3.3-70b |
| **Streaming** | Good | Excellent |
| **Setup** | API Key | API Key |

---

## **Next Steps**

1. ✅ Get Cerebras API key
2. ✅ Add to `.env` file
3. ✅ Restart server
4. ✅ Test with: http://localhost:3000/api/presentation/agent-test
5. ✅ Use the Agent in presentations!

---

## **Support**

- **Cerebras Docs**: https://inference-docs.cerebras.ai/
- **Cerebras Discord**: https://discord.gg/cerebras
- **API Status**: https://status.cerebras.ai/

Enjoy your blazing-fast AI Agent! ⚡🚀
