# Quick Start: New Features

## 🚀 Access the New Features

### 1. AI Paraphraser
**URL:** `http://localhost:3000/paraphraser`

**What it does:**
- Rewrites text in different styles (Formal, Simple, Creative, Concise)
- Perfect for improving writing quality and tone

**Steps:**
1. Paste text or upload `.txt` file
2. Select paraphrase style
3. Click "Paraphrase Text"
4. Review and save to editor

**Credits:** 2-5 credits (editor_generate)

---

### 2. Manuscript Review
**URL:** `http://localhost:3000/manuscript-review`

**What it does:**
- Provides comprehensive feedback on academic manuscripts
- Focuses on grammar, structure, scientific rigor, or citations

**Steps:**
1. Paste manuscript or upload `.txt`/`.pdf` file
2. Select review focus (Comprehensive, Grammar, Structure, Scientific, Citations)
3. Click "Generate Review"
4. Review feedback and save to editor

**Credits:** 3-5 credits (editor_improve)

---

### 3. Literature Review
**URL:** `http://localhost:3000/literature-review`

**What it does:**
- Generates comprehensive literature reviews on any research topic
- Supports different review types (Systematic, Narrative, Scoping, Meta-Analysis, Rapid)

**Steps:**
1. Enter research topic
2. (Optional) Add keywords
3. Select review scope
4. Click "Generate Review"
5. Review literature summary and save to editor

**Credits:** 20 credits (deep_research)

---

## 🔧 Configuration

### Enable/Disable Credit System
Edit `.env` file:
```bash
# For development (unlimited access)
ENABLE_CREDIT_SYSTEM="false"

# For production (credit checks enabled)
ENABLE_CREDIT_SYSTEM="true"
```

### Restart Server
```bash
npm run dev
```

---

## 📊 Feature Comparison

| Feature | Input | Output | Credits | Best For |
|---------|-------|--------|---------|----------|
| **Paraphraser** | Text/File | Paraphrased text | 2-5 | Improving writing style |
| **Manuscript Review** | Text/File | Detailed feedback | 3-5 | Academic feedback |
| **Literature Review** | Topic + Keywords | Comprehensive review | 20 | Research background |

---

## 💾 Saving to Editor

All three features allow you to:
1. **Copy** - Copy output to clipboard
2. **Open in Editor** - Automatically opens AI Document Editor with content
3. **Save as File** - Save the document with a custom title

---

## ⚠️ Common Issues

### Issue: "Insufficient Credits"
- **Cause:** User doesn't have enough credits
- **Solution:** 
  - Set `ENABLE_CREDIT_SYSTEM="false"` for development
  - Or purchase credits in the app

### Issue: "Failed to generate content"
- **Cause:** OpenAI API error or network issue
- **Solution:**
  - Check `OPENAI_API_KEY` in `.env`
  - Verify API quota and billing
  - Check internet connection

### Issue: File upload not working
- **Cause:** Unsupported file format
- **Solution:**
  - Use `.txt` files for all features
  - `.pdf` also supported for Manuscript Review

### Issue: Content not saving to editor
- **Cause:** Browser localStorage disabled
- **Solution:**
  - Enable localStorage in browser settings
  - Ensure `/editor` page exists

---

## 🧪 Testing

### Test Paraphraser
```
Input: "The quick brown fox jumps over the lazy dog"
Style: Formal
Expected: Professional rewrite of the sentence
```

### Test Manuscript Review
```
Input: Any academic text
Focus: Comprehensive
Expected: Detailed feedback with strengths and improvements
```

### Test Literature Review
```
Input: "Machine Learning in Healthcare"
Scope: Systematic Review
Expected: Comprehensive literature overview with themes and gaps
```

---

## 📱 Mobile Support

All features are fully responsive:
- ✅ Mobile-friendly layouts
- ✅ Touch-friendly buttons
- ✅ Optimized text areas
- ✅ Responsive grid layouts

---

## 🎨 UI/UX Features

- **Loading States:** Animated spinners during generation
- **Progress Tracking:** Real-time status updates
- **Error Handling:** Clear error messages
- **Success Feedback:** Confirmation on actions
- **Animations:** Smooth Framer Motion transitions
- **Accessibility:** Semantic HTML and ARIA labels

---

## 🔐 Security

- ✅ User authentication required
- ✅ Credit system prevents abuse
- ✅ API key secured in `.env`
- ✅ Input validation on all endpoints
- ✅ Error messages don't expose sensitive data

---

## 📈 Next Steps

1. **Test all three features** in development mode
2. **Verify credit system** works correctly
3. **Add navigation links** to dashboard
4. **Customize credit costs** if needed
5. **Deploy to production** with `ENABLE_CREDIT_SYSTEM="true"`

---

## 📞 Support

For issues or questions:
1. Check `NEW_FEATURES.md` for detailed documentation
2. Review API endpoint responses
3. Check browser console for errors
4. Verify `.env` configuration

---

**Last Updated:** October 28, 2025
**Status:** ✅ Ready for Testing
