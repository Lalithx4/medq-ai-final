# War Room ADK - Quick Start Guide

## ✅ Setup Complete!

### What Was Built:

1. **Google ADK-Powered Multi-Agent System**
   - 6 Specialist Agents (Cardiology, Pulmonology, Neurology, Infectious Disease, Lab Interpreter, Nephrology)
   - Coordinator Agent with LLM-driven delegation (`transfer_to_agent`)
   - Consensus Engine (4-stage Sequential pipeline)
   - FastAPI backend with SSE streaming

2. **Cerebras Llama 3.3-70b Integration**
   - Uses LiteLLM wrapper for ADK compatibility
   - Automatic fallback to Gemini if Cerebras API key not set
   - Model configured via `get_model()` helper

## 🚀 How to Run:

### 1. Set Environment Variables

Create `.env` file in `python_backend/`:

```bash
# Required: At least ONE of these
CEREBRAS_API_KEY=your_cerebras_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here

# Optional (for Gemini via Vertex AI)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_GENAI_USE_VERTEXAI=FALSE
```

### 2. Test Setup

```powershell
cd python_backend
.\venv\Scripts\Activate.ps1
python -m war_room_adk.test_setup
```

Expected output:
```
✅ Cerebras API Key: SET
✅ Model configured: LiteLlm  # or "str" if using Gemini
✅ Coordinator created: WarRoomCoordinator
✅ Sub-agents: 6
✅ Query successful
```

### 3. Run Server

```powershell
python -m war_room_adk.main
```

Server starts on: `http://localhost:8001`

## 📡 API Endpoints:

### 1. Health Check
```
GET http://localhost:8001/
```

### 2. Team Discussion (Main Endpoint)
```
POST http://localhost:8001/war-room/team-discussion
Content-Type: application/json

{
  "case": {
    "chiefComplaint": "Chest pain radiating to left arm",
    "vitals": {
      "bp": "160/95",
      "hr": "110",
      "spo2": "97%"
    },
    "labs": [
      {
        "name": "Troponin",
        "value": "0.8",
        "unit": "ng/mL",
        "status": "high"
      }
    ]
  },
  "urgency": "urgent"
}
```

**Response:** SSE stream with events:
- `triage` - Urgency classification
- `coordinator_response` - Specialist routing (uses `transfer_to_agent`)
- `consensus` - Final recommendations

### 3. Quick Query
```
POST http://localhost:8001/war-room/broker-query

{
  "query": "Interpret these cardiac enzymes",
  "context": { ... }
}
```

### 4. Follow-up
```
POST http://localhost:8001/war-room/follow-up

{
  "question": "What about beta blockers?",
  "context": { ... },
  "conversationHistory": []
}
```

## 🎯 ADK Features in Use:

| Feature | Implementation |
|---------|----------------|
| **LLM-Driven Delegation** | Coordinator calls `transfer_to_agent(agent_name='Cardiology')` |
| **SequentialAgent** | 4-stage consensus: Analyzer → Synthesizer → Planner → Scorer |
| **Shared State** | `session.state['conflict_analysis']` passes data between agents |
| **LiteLLM Integration** | Cerebras wrapped via `LiteLlm(model="cerebras/llama-3.3-70b")` |

## 🔧 Model Configuration:

**Current Setup:**
```python
# Automatic selection based on API keys
if CEREBRAS_API_KEY:
    model = LiteLlm(
        model="cerebras/llama-3.3-70b",
        api_key=CEREBRAS_API_KEY,
        api_base="https://api.cerebras.ai/v1"
    )
else:
    model = "gemini-2.5-flash"  # Fallback
```

**To Force Gemini:**
```python
# In config.py
USE_CEREBRAS = False
```

## 📊 Expected Flow:

1. **Request arrives** → Triage Agent classifies urgency
2. **Emergency?**
   - Yes → Fast-track agent (immediate response)
   - No → Coordinator routes to specialists
3. **Coordinator** uses LLM to decide: `transfer_to_agent('Cardiology')`
4. **Specialist responds** → Result passed to Consensus Engine
5. **Consensus Pipeline:**
   - Conflict Analyzer identifies agreements/conflicts
   - Diagnosis Synthesizer creates unified diagnosis
   - Action Plan Generator creates treatment plan
   - Confidence Scorer assigns certainty level
6. **Final response** streamed via SSE

## ✅ Next Steps:

1. **Test with curl:**
```bash
curl -N -X POST http://localhost:8001/war-room/team-discussion \
  -H "Content-Type: application/json" \
  -d '{"case":{"chiefComplaint":"Chest pain"},"urgency":"routine"}'
```

2. **Integrate with Frontend:**
   - Update `ALLOWED_ORIGINS` in `config.py`
   - Frontend should use EventSource for SSE

3. **Monitor Agent Delegation:**
   - Watch terminal for `transfer_to_agent` calls
   - Check which specialists get invoked

## 🐛 Troubleshooting:

**Import Error: `google.adk.models.lite_llm`**
- This is expected (type checker limitation)
- The import works at runtime because ADK includes LiteLLM support

**Cerebras Not Used Despite API Key:**
- Check `Config.USE_CEREBRAS` in test output
- Verify CEREBRAS_API_KEY is actually set (not empty string)

**Gemini Rate Limits:**
- ADK has built-in retry logic
- Increase delays in `Config.TEMPERATURE` if needed

## 📚 Documentation:

- ADK Docs: https://google.github.io/adk-docs/
- LiteLLM Docs: https://docs.litellm.ai/
- Cerebras API: https://inference-docs.cerebras.ai/
