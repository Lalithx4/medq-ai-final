# Multi-Agent Deep Research System - Migration Plan

## 🎯 Objective
Replace the existing custom PubMed service with a LangChain-based multi-agent deep research system using Cerebras LLM API and PubMed tool.

---

## 📋 Current State Analysis

### Existing Files to Replace/Update
```
src/lib/deep-research/
├── pubmed-service.ts          ❌ REPLACE with Python LangChain implementation
├── langchain-agent.ts         ❌ REPLACE with new multi-agent architecture
├── multi-source-service.ts    ⚠️  KEEP (for web/arxiv, but update integration)
├── arxiv-service.ts           ✅ KEEP (unchanged)
├── web-search-service.ts      ✅ KEEP (unchanged)
└── file-service.ts            ✅ KEEP (unchanged)

src/app/api/deep-research/
├── generate/route.ts          ⚠️  UPDATE to call Python script
└── download/[reportId]/route.ts  ✅ KEEP (unchanged)

src/components/deep-research/
├── DeepResearchDashboard.tsx  ⚠️  UPDATE UI for new features
└── ReportViewer.tsx           ✅ KEEP (unchanged)
```

---

## 🏗️ Implementation Steps

### **Phase 1: Python Backend Setup** ⏱️ 30 mins

#### Step 1.1: Create Python Environment
```bash
# Create Python directory in project root
mkdir python-services
cd python-services

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate
```

#### Step 1.2: Install Dependencies
Create `requirements.txt`:
```txt
langchain==0.3.30
langchain-community==0.3.57
cerebras-cloud-sdk==1.50.0
python-dotenv==1.0.0
```

Install:
```bash
pip install -r requirements.txt
```

#### Step 1.3: Create Deep Research Script
Create `python-services/deep_research.py` with the provided multi-agent code.

---

### **Phase 2: Node.js Integration** ⏱️ 45 mins

#### Step 2.1: Create Python Bridge API Route
**File**: `src/app/api/deep-research/python-generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, topK = 5, nSections = 5 } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Path to Python script
    const pythonScript = path.join(process.cwd(), "python-services", "deep_research.py");
    const venvPython = path.join(process.cwd(), "python-services", "venv", "Scripts", "python.exe");
    
    // Check if Python script exists
    try {
      await fs.access(pythonScript);
    } catch {
      return NextResponse.json({ 
        error: "Python script not found. Please run setup." 
      }, { status: 500 });
    }

    // Spawn Python process
    const args = [
      pythonScript,
      topic,
      "-k", topK.toString(),
      "-n", nSections.toString(),
      "-o", path.join(process.cwd(), "reports")
    ];

    return new Promise((resolve) => {
      const python = spawn(venvPython, args);
      let output = "";
      let errorOutput = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(data.toString());
      });

      python.on("close", async (code) => {
        if (code !== 0) {
          resolve(NextResponse.json({ 
            error: "Python script failed", 
            details: errorOutput 
          }, { status: 500 }));
          return;
        }

        // Find the generated report file
        const reportsDir = path.join(process.cwd(), "reports");
        const files = await fs.readdir(reportsDir);
        const latestFile = files
          .filter(f => f.includes(topic.replace(/\s+/g, "_")))
          .sort()
          .pop();

        if (!latestFile) {
          resolve(NextResponse.json({ 
            error: "Report file not found" 
          }, { status: 500 }));
          return;
        }

        const reportPath = path.join(reportsDir, latestFile);
        const content = await fs.readFile(reportPath, "utf-8");

        resolve(NextResponse.json({
          success: true,
          reportId: latestFile.replace(".md", ""),
          content,
          output,
        }));
      });
    });
  } catch (error) {
    console.error("Error generating deep research:", error);
    return NextResponse.json(
      { error: "Failed to generate research" },
      { status: 500 }
    );
  }
}
```

#### Step 2.2: Create Streaming API Route (Optional - Better UX)
**File**: `src/app/api/deep-research/stream-generate/route.ts`

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { topic, topK = 5, nSections = 5 } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const pythonScript = path.join(process.cwd(), "python-services", "deep_research.py");
      const venvPython = path.join(process.cwd(), "python-services", "venv", "Scripts", "python.exe");
      
      const python = spawn(venvPython, [
        pythonScript,
        topic,
        "-k", topK.toString(),
        "-n", nSections.toString(),
        "-o", path.join(process.cwd(), "reports")
      ]);

      python.stdout.on("data", (data) => {
        const text = data.toString();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", message: text })}\n\n`));
      });

      python.stderr.on("data", (data) => {
        const text = data.toString();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: text })}\n\n`));
      });

      python.on("close", async (code) => {
        if (code === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Process failed" })}\n\n`));
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

---

### **Phase 3: Frontend Updates** ⏱️ 60 mins

#### Step 3.1: Update DeepResearchDashboard Component
**File**: `src/components/deep-research/DeepResearchDashboard.tsx`

Add new configuration options:
```typescript
// Add to state
const [topK, setTopK] = useState(5);
const [nSections, setNSections] = useState(5);
const [useMultiAgent, setUseMultiAgent] = useState(true);

// Add to UI
<div className="space-y-4">
  <div>
    <Label>Research Mode</Label>
    <Select value={useMultiAgent ? "multi-agent" : "standard"} onValueChange={(v) => setUseMultiAgent(v === "multi-agent")}>
      <SelectItem value="multi-agent">Multi-Agent (Comprehensive)</SelectItem>
      <SelectItem value="standard">Standard (Fast)</SelectItem>
    </Select>
  </div>
  
  {useMultiAgent && (
    <>
      <div>
        <Label>Papers per Section: {topK}</Label>
        <Slider value={[topK]} onValueChange={([v]) => setTopK(v)} min={3} max={10} step={1} />
      </div>
      
      <div>
        <Label>Number of Sections: {nSections}</Label>
        <Slider value={[nSections]} onValueChange={([v]) => setNSections(v)} min={3} max={8} step={1} />
      </div>
      
      <div className="text-sm text-muted-foreground">
        Estimated: ~{nSections * topK} papers, {nSections * 700} words, {Math.ceil(nSections * 2)} minutes
      </div>
    </>
  )}
</div>
```

#### Step 3.2: Update Generate Function
```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  setProgress(0);
  
  try {
    const endpoint = useMultiAgent 
      ? "/api/deep-research/stream-generate"
      : "/api/deep-research/generate";
    
    if (useMultiAgent) {
      // Use streaming endpoint
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, topK, nSections }),
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "progress") {
              setProgressMessage(data.message);
              // Update progress based on message
              if (data.message.includes("Section")) {
                const match = data.message.match(/Section (\d+)\/(\d+)/);
                if (match) {
                  setProgress((parseInt(match[1]) / parseInt(match[2])) * 80);
                }
              }
            } else if (data.type === "complete") {
              setProgress(100);
              // Fetch the generated report
              // ... load report logic
            }
          }
        }
      }
    } else {
      // Use standard endpoint
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      
      const data = await response.json();
      setGeneratedReport(data.content);
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to generate research");
  } finally {
    setIsGenerating(false);
  }
};
```

---

### **Phase 4: Environment Configuration** ⏱️ 10 mins

#### Update `.env` file:
```env
# Existing keys
OPENAI_API_KEY=...
CEREBRAS_API_KEY=...

# Add for Python script
PUBMED_EMAIL=your_email@example.com

# Python path (optional, for custom Python location)
PYTHON_PATH=python-services/venv/Scripts/python.exe
```

---

### **Phase 5: Setup Scripts** ⏱️ 15 mins

#### Create `setup-python.ps1` (Windows):
```powershell
Write-Host "Setting up Python environment for Deep Research..." -ForegroundColor Green

# Create directory
New-Item -ItemType Directory -Force -Path "python-services"
Set-Location "python-services"

# Create virtual environment
python -m venv venv

# Activate
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install langchain==0.3.30 langchain-community==0.3.57 cerebras-cloud-sdk==1.50.0 python-dotenv==1.0.0

Write-Host "✓ Python environment setup complete!" -ForegroundColor Green
Write-Host "To activate: cd python-services && .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
```

#### Create `setup-python.sh` (Mac/Linux):
```bash
#!/bin/bash
echo "Setting up Python environment for Deep Research..."

# Create directory
mkdir -p python-services
cd python-services

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install langchain==0.3.30 langchain-community==0.3.57 cerebras-cloud-sdk==1.50.0 python-dotenv==1.0.0

echo "✓ Python environment setup complete!"
echo "To activate: cd python-services && source venv/bin/activate"
```

---

## 📊 Feature Comparison

| Feature | Old System | New Multi-Agent System |
|---------|-----------|------------------------|
| **Architecture** | Single agent | Multi-agent (1 main + N sub-agents) |
| **Papers Retrieved** | 10-15 total | 25-50 (5 per section × 5-10 sections) |
| **Word Count** | 2000-3000 | 4000-5500 |
| **Sections** | Generic | Focused (Epidemiology, Pathophysiology, etc.) |
| **Citations** | Basic | Detailed with PMIDs and URLs |
| **Quality** | Good | Publication-quality |
| **Speed** | 1-2 minutes | 3-5 minutes |
| **Cost** | Low | Medium (more API calls) |

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Python script runs standalone: `python deep_research.py "test topic"`
- [ ] Virtual environment activates correctly
- [ ] Dependencies install without errors
- [ ] Reports generate in `reports/` directory
- [ ] Markdown format is correct
- [ ] Citations include PMIDs and URLs

### API Testing
- [ ] `/api/deep-research/python-generate` returns success
- [ ] `/api/deep-research/stream-generate` streams progress
- [ ] Error handling works (invalid topic, missing API key)
- [ ] Timeout handling (5 minute limit)
- [ ] File system permissions work

### Frontend Testing
- [ ] UI shows new configuration options
- [ ] Progress updates display correctly
- [ ] Streaming messages appear in real-time
- [ ] Generated report displays properly
- [ ] Download functionality works
- [ ] Error messages show correctly

---

## 🚀 Deployment Considerations

### Vercel/Netlify
- Python execution may not be supported
- Consider using serverless functions with Python runtime
- Or deploy Python service separately (e.g., Railway, Render)

### Docker
```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y python3 python3-pip
COPY python-services/requirements.txt /app/python-services/
RUN pip3 install -r /app/python-services/requirements.txt
COPY python-services/ /app/python-services/
```

### Environment Variables
Ensure all platforms have:
- `CEREBRAS_API_KEY`
- `PUBMED_EMAIL`
- `PYTHON_PATH` (if custom location)

---

## 📈 Performance Optimization

### Caching
```typescript
// Cache generated reports in database
await prisma.deepResearchReport.create({
  data: {
    topic,
    content,
    metadata: { topK, nSections },
    userId: session.user.id,
  },
});

// Check cache before generating
const cached = await prisma.deepResearchReport.findFirst({
  where: { topic, userId: session.user.id },
  orderBy: { createdAt: "desc" },
});
```

### Parallel Processing
Modify Python script to process sections in parallel:
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(process_section, h) for h in headings]
    results = [f.result() for f in futures]
```

---

## 🔄 Migration Strategy

### Option 1: Gradual Migration (Recommended)
1. Keep old system as "Standard Mode"
2. Add new system as "Multi-Agent Mode"
3. Let users choose
4. Deprecate old system after testing

### Option 2: Complete Replacement
1. Replace all endpoints
2. Update all UI references
3. Remove old files
4. Test thoroughly

---

## 📚 Documentation Updates Needed

- [ ] Update README.md with Python setup instructions
- [ ] Add DEEP_RESEARCH.md with detailed usage
- [ ] Update API documentation
- [ ] Create troubleshooting guide
- [ ] Add example outputs

---

## ⏱️ Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Python Setup | 30 mins | High |
| Phase 2: Node.js Integration | 45 mins | High |
| Phase 3: Frontend Updates | 60 mins | Medium |
| Phase 4: Configuration | 10 mins | High |
| Phase 5: Setup Scripts | 15 mins | Medium |
| Testing | 60 mins | High |
| Documentation | 30 mins | Low |
| **Total** | **4 hours** | |

---

## 🎯 Success Criteria

✅ Python script generates reports successfully  
✅ API routes call Python script correctly  
✅ Frontend displays progress in real-time  
✅ Generated reports are publication-quality  
✅ Citations include PMIDs and URLs  
✅ Error handling works properly  
✅ Performance is acceptable (3-5 minutes)  
✅ Documentation is complete  

---

**Ready to implement? Let's start with Phase 1!** 🚀
