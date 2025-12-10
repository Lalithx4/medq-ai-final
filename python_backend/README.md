# War Room Python Backend

This backend uses your actual Python agents from `c:\Users\Lalith\Desktop\agents` to power the War Room CDSS.

## Setup

1. **Install Python dependencies:**
```bash
cd python_backend
pip install -r requirements.txt
```

2. **Configure environment variables:**
Create a `.env` file in the `python_backend` directory:
```env
# Your Gemini API key (or Cerebras key)
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
# or
CEREBRAS_API_KEY=your_key_here
```

3. **Start the Python backend:**
```bash
python war_room_api.py
```

The backend will run on `http://localhost:8000`

## How It Works

1. **Python Backend** (`war_room_api.py`):
   - FastAPI server that exposes your 20 agents via REST API
   - Uses your existing agents from `Desktop/agents/`
   - Streams SSE events for real-time updates
   - Endpoints:
     - `POST /api/team-discussion` - Multi-agent discussion
     - `POST /api/broker-query` - Knowledge queries
     - `POST /api/follow-up` - Follow-up questions

2. **Next.js Proxy Routes** (`src/app/api/war-room/`):
   - Try Python backend first (uses your real agents)
   - Falls back to TypeScript/Gemini if Python unavailable
   - Handles authentication and session management

3. **Frontend** (`src/app/war-room/page.tsx`):
   - War Room UI
   - Connects to Next.js API routes
   - Displays agent discussions in real-time

## Environment Variables

Add to your `.env.local`:
```env
# Python backend URL (default: http://localhost:8000)
PYTHON_BACKEND_URL=http://localhost:8000

# Gemini API key (for fallback)
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

## Running Both Services

**Terminal 1 - Python Backend:**
```bash
cd python_backend
python war_room_api.py
```

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
```

Then visit `http://localhost:3000/war-room`

## Agent Mapping

Your Python agents → War Room UI:
- `orchestrator` → Board Moderator
- `cardiology` → Dr. Cardio
- `neurology` → Dr. Neuro
- `pulmonology` → Dr. Pulmo
- `infectious` → Dr. ID
- `nephrology` → Dr. Nephro
- `gastroenterology` → Dr. Gastro
- `hepatology` → Dr. Gastro (liver specialist)
- `lab_interpreter` → Lab Specialist
- `radiology` → Dr. Radiology
- `research_agent` → Knowledge Broker

## Troubleshooting

**Python backend won't start:**
- Check if port 8000 is available
- Verify all dependencies are installed
- Check agent imports in `war_room_api.py`

**Agents not responding:**
- Verify your agents directory path in `war_room_api.py`
- Check environment variables (GEMINI_API_KEY or CEREBRAS_API_KEY)
- Review Python backend logs

**Falls back to TypeScript:**
- Normal if Python backend isn't running
- Check `PYTHON_BACKEND_URL` in `.env.local`
- Verify Python backend is accessible
