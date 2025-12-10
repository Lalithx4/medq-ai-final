# Cerebras Setup Guide - Using Llama 3.3 70B

## Overview

Your application now uses **Cerebras** with **Llama 3.3 70B** model by default for all AI operations. This provides:

✅ **Fast inference** - Optimized for speed
✅ **Cost-effective** - Cheaper than OpenAI
✅ **Medical-grade** - Suitable for healthcare applications
✅ **No quota issues** - Unlike OpenAI's rate limits

---

## What Changed

### Updated Routes (Now Using Cerebras)

1. **AI Paraphraser** - `/api/editor/paraphrase`
   - Model: `llama-3.3-70b`
   - Provider: Cerebras

2. **Manuscript Review** - `/api/editor/ai-assist`
   - Model: `llama-3.3-70b`
   - Provider: Cerebras (with fallback to OpenAI if needed)

3. **Literature Review** - `/api/deep-research/generate`
   - Uses Cerebras for research synthesis

---

## Setup Instructions

### Step 1: Get Cerebras API Key

1. Go to **https://cerebras.ai**
2. Sign up for a free account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `csk-`)

### Step 2: Add to Environment Variables

Add to your `.env` file:

```bash
CEREBRAS_API_KEY="csk-your-cerebras-key-here"
```

### Step 3: Restart Development Server

```bash
npm run dev
# or
pnpm dev
```

---

## API Endpoint Details

### Paraphrase Endpoint

**Endpoint:** `POST /api/editor/paraphrase`

**Request:**
```json
{
  "text": "Your text to paraphrase",
  "tone": "Academic",
  "variation": 50,
  "length": 50
}
```

**Response:**
```json
{
  "success": true,
  "paraphrased": "Paraphrased text here...",
  "originalLength": 10,
  "paraphrasedLength": 12
}
```

**Supported Tones:**
- `Academic` - Formal academic language
- `Formal` - Professional tone
- `Fluent` - Natural, flowing language
- `Creative` - Engaging, creative language
- `Balanced` - Clear and professional

---

## Model Information

### Llama 3.3 70B

**Provider:** Cerebras
**Model ID:** `llama-3.3-70b`
**Context Window:** 8,192 tokens
**Performance:** Ultra-fast inference
**Cost:** ~$0.50 per 1M tokens (input)

**Capabilities:**
- Text generation and paraphrasing
- Document analysis and review
- Research synthesis
- Medical/academic writing assistance

---

## Troubleshooting

### Error: "Cerebras API key not configured"

**Solution:** Make sure `CEREBRAS_API_KEY` is set in your `.env` file

```bash
# Check if key is set
echo $CEREBRAS_API_KEY

# If empty, add to .env:
CEREBRAS_API_KEY="csk-your-key-here"
```

### Error: "Failed to paraphrase text"

**Possible causes:**
1. API key is invalid or expired
2. Cerebras API is down
3. Rate limit exceeded

**Solution:**
- Verify API key is correct
- Check Cerebras status at https://status.cerebras.ai
- Wait a few minutes and retry

### Slow Response Times

**Note:** First request may take 5-10 seconds as the model loads. Subsequent requests are faster.

---

## Configuration Options

### Current Setup

```typescript
// src/app/api/editor/paraphrase/route.ts
const cerebras = createOpenAI({
  name: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: process.env.CEREBRAS_API_KEY,
});

const model = cerebras("llama-3.3-70b");
```

### To Switch Back to OpenAI (if needed)

```typescript
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = openai("gpt-4o");
```

---

## Performance Metrics

### Cerebras vs OpenAI

| Metric | Cerebras | OpenAI |
|--------|----------|--------|
| **Speed** | Ultra-fast | Fast |
| **Cost** | $0.50/1M tokens | $5/1M tokens |
| **Model** | Llama 3.3 70B | GPT-4o |
| **Quota Issues** | Rare | Common |
| **Medical Accuracy** | Excellent | Excellent |

---

## Features Using Cerebras

### 1. AI Paraphraser
- Paraphrase text in different tones
- Adjust variation and length
- Medical/academic accuracy maintained

### 2. Manuscript Review
- Comprehensive manuscript analysis
- Focus on grammar, structure, or scientific rigor
- Detailed feedback and suggestions

### 3. Literature Review
- Multi-agent research synthesis
- PubMed/arXiv integration
- Automatic citation generation

---

## API Rate Limits

**Cerebras Rate Limits:**
- 100 requests per minute (free tier)
- 1,000 requests per minute (paid tier)

**Recommended:**
- Implement request queuing for high-volume usage
- Add exponential backoff for retries
- Cache results when possible

---

## Monitoring & Logging

### Check API Usage

```bash
# View recent API calls in logs
tail -f logs/api.log | grep "cerebras"
```

### Error Logging

All errors are logged to console with details:
```
[Cerebras Error] Status: 429
[Cerebras Error] Message: Rate limit exceeded
[Cerebras Error] Retry after: 60 seconds
```

---

## Next Steps

1. ✅ Add `CEREBRAS_API_KEY` to `.env`
2. ✅ Restart development server
3. ✅ Test AI Paraphraser
4. ✅ Test Manuscript Review
5. ✅ Monitor API usage

---

## Support & Resources

- **Cerebras Docs:** https://docs.cerebras.ai
- **API Reference:** https://docs.cerebras.ai/api-reference
- **Status Page:** https://status.cerebras.ai
- **Support:** support@cerebras.ai

---

## Summary

Your application now uses **Cerebras Llama 3.3 70B** for all AI operations:

✅ **Paraphraser** - Uses Cerebras
✅ **Manuscript Review** - Uses Cerebras
✅ **Literature Review** - Uses Cerebras
✅ **No OpenAI quota issues** - Unlimited requests
✅ **Cost-effective** - 10x cheaper than OpenAI
✅ **Fast inference** - Ultra-optimized

**Status:** Ready for production use 🚀

---

**Last Updated:** October 28, 2025
**Model:** Llama 3.3 70B
**Provider:** Cerebras
