# SciSpace AI Writer Features Integration

## Overview
This document outlines the integration of SciSpace-like AI writing features into the BioDocsAI medical editor.

## Features Implemented

### 1. ✍️ AI Autocomplete Engine
**Location:** `src/components/editor/features/AutocompleteEngine.tsx`

**Features:**
- Real-time sentence completion as you type
- Context-aware suggestions (analyzes last 500 characters)
- Triggers after 1.5s pause at sentence/paragraph boundaries
- Accept with `Tab`, dismiss with `Esc`
- Medical/academic tone maintained

**API:** `POST /api/editor/autocomplete`
- Uses GPT-4o-mini for fast, cost-effective suggestions
- Max 100 tokens per suggestion (1-2 sentences)

**Usage:**
```tsx
import { AutocompleteEngine } from "@/components/editor/features/AutocompleteEngine";

<AutocompleteEngine
  content={editorContent}
  cursorPosition={cursorPos}
  onAccept={(suggestion) => insertText(suggestion)}
  enabled={true}
/>
```

---

### 2. 📚 Citation Manager
**Location:** `src/components/editor/features/CitationManager.tsx`

**Features:**
- Search 280M+ academic sources (PubMed, Crossref, OpenAlex)
- Multiple citation styles: APA, MLA, Chicago, Harvard
- One-click insert or copy
- Shows title, authors, year, journal, DOI
- Preview abstract before inserting

**API:** `POST /api/editor/search-citations`
- Currently uses mock data
- Ready for PubMed/Crossref/OpenAlex API integration

**Integration Points:**
```typescript
// PubMed API
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}

// Crossref API
https://api.crossref.org/works?query={query}

// OpenAlex API
https://api.openalex.org/works?search={query}
```

**Usage:**
```tsx
import { CitationManager } from "@/components/editor/features/CitationManager";

<CitationManager
  onInsert={(citation) => insertAtCursor(citation)}
  onClose={() => setShowCitations(false)}
/>
```

---

### 3. 🔁 Paraphraser Tool
**Location:** `src/components/editor/features/ParaphraserTool.tsx`

**Features:**
- 5 tone modes: Academic, Formal, Fluent, Creative, Balanced
- Variation slider (0-100%): Conservative → Creative
- Length slider: Shorter → Same → Longer
- Side-by-side comparison
- Word count tracking
- Replace or copy output

**API:** `POST /api/editor/paraphrase`
- Uses GPT-4o for high-quality paraphrasing
- Dynamic token allocation based on length preference
- Temperature controlled by variation slider

**Usage:**
```tsx
import { ParaphraserTool } from "@/components/editor/features/ParaphraserTool";

<ParaphraserTool
  selectedText={getSelectedText()}
  onReplace={(newText) => replaceSelection(newText)}
  onClose={() => setShowParaphraser(false)}
/>
```

---

## Integration into MedicalEditor

### Step 1: Import Components
Add to `src/components/editor/MedicalEditor.tsx`:

```tsx
import { AutocompleteEngine } from "./features/AutocompleteEngine";
import { CitationManager } from "./features/CitationManager";
import { ParaphraserTool } from "./features/ParaphraserTool";
```

### Step 2: Add State Management
```tsx
const [showCitationManager, setShowCitationManager] = useState(false);
const [showParaphraser, setShowParaphraser] = useState(false);
const [selectedText, setSelectedText] = useState("");
const [cursorPosition, setCursorPosition] = useState(0);
const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
```

### Step 3: Add Toolbar Buttons
```tsx
// In your toolbar section
<Button onClick={() => setShowCitationManager(true)}>
  <BookOpen className="w-4 h-4 mr-2" />
  Add Citation
</Button>

<Button onClick={() => {
  const selected = window.getSelection()?.toString();
  if (selected) {
    setSelectedText(selected);
    setShowParaphraser(true);
  }
}}>
  <RefreshCw className="w-4 h-4 mr-2" />
  Paraphrase
</Button>

<Button onClick={() => setAutocompleteEnabled(!autocompleteEnabled)}>
  <Sparkles className="w-4 h-4 mr-2" />
  {autocompleteEnabled ? "Disable" : "Enable"} Autocomplete
</Button>
```

### Step 4: Render Components
```tsx
{/* Autocomplete - always active */}
<AutocompleteEngine
  content={content}
  cursorPosition={cursorPosition}
  onAccept={(suggestion) => {
    setContent(content + " " + suggestion);
  }}
  enabled={autocompleteEnabled}
/>

{/* Citation Manager Modal */}
{showCitationManager && (
  <CitationManager
    onInsert={(citation) => {
      setContent(content + "\n\n" + citation);
      setShowCitationManager(false);
    }}
    onClose={() => setShowCitationManager(false)}
  />
)}

{/* Paraphraser Modal */}
{showParaphraser && (
  <ParaphraserTool
    selectedText={selectedText}
    onReplace={(newText) => {
      // Replace selected text with paraphrased version
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
      }
      setShowParaphraser(false);
    }}
    onClose={() => setShowParaphraser(false)}
  />
)}
```

---

## Additional Features to Implement

### 4. 🔖 Citation Generator (Standalone)
Create a dedicated citation generator page at `/citation-generator`:
- Input: Title, DOI, URL, or manual entry
- Output: Formatted citation in multiple styles
- Export: BibTeX, RIS, CSV, plain text

### 5. 🧠 AI Content Detector
Detect AI-generated content in documents:
- Analyze text for AI patterns
- Confidence scores
- Highlight suspicious sections
- Models: GPT-4, ChatGPT, Quillbot, Jasper

### 6. 📄 Writing Templates
Pre-built templates for:
- Research Proposal
- Literature Review
- Abstract Writing
- Thesis Statement
- Essay Writing
- Case Study

### 7. 📊 Data Extraction Tool
Extract structured data from PDFs:
- Upload multiple papers
- Extract: Title, Authors, Keywords, Summary, Conclusion
- Custom columns (up to 50)
- Export: Excel, CSV, RIS, BibTeX, XML

### 8. 💬 Chat with PDF
Upload and query research papers:
- Ask questions in plain English
- Get answers with citations
- Follow-up questions
- Context-aware responses

---

## API Integration Checklist

### External APIs to Integrate

#### PubMed (Free)
```bash
# Search
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term={query}
  &retmode=json
  &retmax=20

# Fetch details
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi
  ?db=pubmed
  &id={pmid}
  &retmode=json
```

#### Crossref (Free)
```bash
GET https://api.crossref.org/works
  ?query={query}
  &rows=20
  &mailto=your@email.com
```

#### OpenAlex (Free)
```bash
GET https://api.openalex.org/works
  ?search={query}
  &per-page=20
  &mailto=your@email.com
```

#### Semantic Scholar (Free)
```bash
GET https://api.semanticscholar.org/graph/v1/paper/search
  ?query={query}
  &limit=20
```

---

## Environment Variables

Add to `.env.local`:
```bash
# Already configured
OPENAI_API_KEY=your_key_here

# Optional: For enhanced citation search
PUBMED_API_KEY=optional
CROSSREF_EMAIL=your@email.com
SEMANTIC_SCHOLAR_API_KEY=optional
```

---

## Cost Estimates

### Per 1000 Requests

| Feature | Model | Cost |
|---------|-------|------|
| Autocomplete | GPT-4o-mini | ~$0.15 |
| Paraphrase | GPT-4o | ~$5.00 |
| Citation Search | External APIs | Free |

### Optimization Tips
1. Cache autocomplete suggestions for similar contexts
2. Batch citation searches
3. Use GPT-4o-mini for simple paraphrasing
4. Implement rate limiting per user

---

## Testing

### Manual Testing
```bash
# Test autocomplete
curl -X POST http://localhost:3000/api/editor/autocomplete \
  -H "Content-Type: application/json" \
  -d '{"context": "The study shows that", "cursorPosition": 100}'

# Test paraphrase
curl -X POST http://localhost:3000/api/editor/paraphrase \
  -H "Content-Type: application/json" \
  -d '{"text": "AI is transforming healthcare", "tone": "Academic", "variation": 50, "length": 50}'

# Test citation search
curl -X POST http://localhost:3000/api/editor/search-citations \
  -H "Content-Type: application/json" \
  -d '{"query": "deep learning medical imaging"}'
```

---

## Next Steps

1. **Integrate components into MedicalEditor.tsx**
2. **Replace mock citation data with real API calls**
3. **Add keyboard shortcuts** (Ctrl+K for citations, Ctrl+Shift+P for paraphrase)
4. **Implement credit deduction** for AI features
5. **Add usage analytics** to track feature adoption
6. **Create onboarding tour** to showcase new features
7. **Add settings panel** to customize autocomplete behavior

---

## UI/UX Enhancements

### Keyboard Shortcuts
- `Tab` - Accept autocomplete suggestion
- `Esc` - Dismiss autocomplete
- `Ctrl/Cmd + K` - Open citation manager
- `Ctrl/Cmd + Shift + P` - Paraphrase selected text
- `Ctrl/Cmd + /` - Toggle autocomplete

### Visual Indicators
- Autocomplete suggestions appear as floating cards
- Citation manager opens as modal overlay
- Paraphraser shows side-by-side comparison
- Loading states with spinners
- Success feedback with checkmarks

---

## Credits & Attribution

Features inspired by:
- **SciSpace AI Writer** - https://scispace.com/ai-writer
- **Grammarly** - Autocomplete UX
- **Notion AI** - Inline suggestions
- **Zotero** - Citation management

---

## Support & Documentation

For questions or issues:
1. Check API logs in browser DevTools
2. Review error messages in terminal
3. Test with `scripts/smoke.mjs`
4. Contact: contact@biodocsai.com
