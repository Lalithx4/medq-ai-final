# War Room CDSS - Complete Setup Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     War Room Frontend                        │
│               (Next.js - localhost:3000)                    │
│  • Patient case input                                       │
│  • Real-time agent discussion UI                            │
│  • Lab ticker, consensus builder                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Proxy)                      │
│           /api/war-room/team-discussion                     │
│           /api/war-room/broker-query                        │
│           /api/war-room/follow-up                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌────────────────┐          ┌──────────────────┐
│ Python Backend │          │ TypeScript       │
│ (Port 8000)    │   OR     │ Fallback         │
│ YOUR AGENTS!   │          │ (Gemini only)    │
└────────────────┘          └──────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Your 20 Medical Agents (.py)       │
│  c:\Users\Lalith\Desktop\agents\    │
│  • Orchestrator, Triage             │
│  • 20 Specialist Agents             │
│  • Team Discussion Engine           │
│  • Graph Coordinator                │
└─────────────────────────────────────┘
```

## Quick Start

### Option 1: With Your Python Agents (Recommended)

**1. Set up Python Backend:**
```bash
cd python_backend
pip install -r requirements.txt
```

**2. Configure environment:**
Copy `.env.example` to `.env` and add your API key:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

**3. Start Python backend:**
```bash
# Windows
start.bat

# Or manually
python war_room_api.py
```

**4. Configure Next.js:**
Add to your `.env.local`:
```env
PYTHON_BACKEND_URL=http://localhost:8000
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

**5. Start Next.js:**
```bash
npm run dev
```

**6. Visit War Room:**
`http://localhost:3000/war-room`

### Option 2: TypeScript Only (No Python)

If you don't run the Python backend, the system automatically falls back to TypeScript implementation using Gemini.

**1. Add to `.env.local`:**
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

**2. Start Next.js:**
```bash
npm run dev
```

**3. Visit War Room:**
`http://localhost:3000/war-room`

## Features

### War Room UI
- **Patient Snapshot Panel**: Enter symptoms, labs, history
- **Lab Ticker**: Bloomberg-style real-time lab values
- **Agent Avatars**: See which specialists are "thinking" or "done"
- **Debate Stream**: Real-time discussion between specialists
- **Consensus Block**: Final diagnosis and treatment plan
- **Human Override**: Ask follow-up questions or `@broker` queries
- **Quick Templates**: Pre-loaded cases (Cholecystitis, MI, Pneumonia, Sepsis)

### Python Backend Features (when enabled)
- ✅ Uses your actual 20 specialist agents
- ✅ Orchestrator routes to relevant specialists
- ✅ Multi-phase discussion (Triage → Opening → Analysis → Consensus)
- ✅ SSE streaming for real-time updates
- ✅ Supports LangChain tools and memory
- ✅ Can use Cerebras or Gemini LLMs

### TypeScript Fallback Features
- ✅ 14 Gemini-powered specialist agents
- ✅ Multi-phase discussion
- ✅ SSE streaming
- ✅ Broker queries and follow-ups
- ❌ Not as accurate (simpler prompts)
- ❌ No LangChain tools
- ❌ No custom agent logic

## API Endpoints

### POST /api/war-room/team-discussion
Start a team discussion with streaming.

**Request:**
```json
{
  "case": {
    "chiefComplaint": "58yo male with crushing chest pain",
    "history": "Smoker, HTN, family history of CAD",
    "labs": [
      {"name": "Troponin", "value": "2.4", "unit": "ng/mL", "status": "high"}
    ]
  },
  "urgency": "emergent"
}
```

**Response:** SSE stream with events:
- `phase_change` - Discussion phase updates
- `orchestration_complete` - Relevant agents identified
- `agent_thinking` - Agent is processing
- `agent_message` - Agent response
- `consensus_complete` - Final diagnosis

### POST /api/war-room/broker-query
Ask knowledge questions.

**Request:**
```json
{
  "query": "What is the HEART score for ACS?",
  "context": { /* patient case */ }
}
```

### POST /api/war-room/follow-up
Ask follow-up questions.

**Request:**
```json
{
  "question": "Should we start heparin?",
  "context": { /* patient case */ },
  "conversationHistory": [ /* previous messages */ ]
}
```

## Agent Configuration

Your Python agents at `c:\Users\Lalith\Desktop\agents\` are automatically loaded:

### Tier 1 - Core
- `orchestrator` - Routes queries
- `triage_agent` - Emergency detection
- `chat_agent` - General inquiries

### Tier 2 - Organ Systems
- `cardiology`, `neurology`, `pulmonology`
- `hepatology`, `gastroenterology`, `nephrology`

### Tier 3 - System Specialists
- `orthopedics`, `hematology`, `infectious`
- `oncology`, `endocrinology`

### Tier 4 - Diagnostic
- `lab_interpreter`, `radiology`
- `drug_interaction`, `differential_dx`

### Tier 5 - Knowledge
- `research_agent`, `health_passport`

## Environment Variables

### Required
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key

### Optional
- `PYTHON_BACKEND_URL` - Python backend (default: http://localhost:8000)
- `CEREBRAS_API_KEY` - Alternative to Gemini
- `GEMINI_MODEL` - Model override (default: gemini-2.5-flash)

## Troubleshooting

### Python backend won't start
```bash
# Check Python version (need 3.9+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check if port 8000 is in use
netstat -ano | findstr :8000
```

### Agents not loaded
Check the path in `war_room_api.py` line 13:
```python
agents_path = Path(r"c:\Users\Lalith\Desktop\agents")
```

### Falls back to TypeScript
This is normal if Python backend isn't running. Check:
1. Python backend is running on port 8000
2. `PYTHON_BACKEND_URL` in `.env.local`
3. No firewall blocking localhost:8000

### No API key errors
Add to `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

## Development

### Adding New Agents
1. Create agent in `c:\Users\Lalith\Desktop\agents\`
2. Agent is automatically loaded by `graph_coordinator.py`
3. Restart Python backend

### Modifying Discussion Flow
Edit `python_backend/war_room_api.py`:
- `generate_discussion_events()` - Discussion phases
- `build_consensus()` - Consensus logic

### Custom Templates
Edit `src/app/war-room/page.tsx`:
```typescript
const TEMPLATES = {
  yourCase: {
    symptoms: "...",
    labs: "...",
    history: "..."
  }
}
```

## Performance

- **Python Backend**: 5-15 seconds per case
- **TypeScript Fallback**: 3-10 seconds per case
- **Agents per case**: 3-5 specialists
- **Discussion phases**: 3-4 phases
- **Total messages**: 10-20 messages

## Production Deployment

1. Deploy Python backend (Railway, Render, etc.)
2. Update `PYTHON_BACKEND_URL` to production URL
3. Ensure API keys are in production environment
4. Consider caching for repeated queries

## Support

For issues with:
- **War Room UI**: Check browser console
- **Python agents**: Check Python backend logs
- **API routes**: Check Next.js server logs
