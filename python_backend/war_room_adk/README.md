# War Room ADK - Google Agent Development Kit Implementation

Multi-agent medical decision support system using Google's Agent Development Kit (ADK).

## Architecture

### Components

1. **Specialist Agents** (`agents.py`)
   - Cardiology
   - Pulmonology
   - Neurology
   - Infectious Disease
   - Lab Interpreter
   - Nephrology
   
   Each agent is an ADK `LlmAgent` with medical specialty expertise.

2. **Coordinator Agent** (`coordinator.py`)
   - Main router using **LLM-driven delegation**
   - Uses `transfer_to_agent()` for dynamic specialist routing
   - Includes emergency triage agent

3. **Consensus Engine** (`consensus.py`)
   - ADK `SequentialAgent` pipeline:
     - Conflict Analyzer
     - Diagnosis Synthesizer
     - Action Plan Generator
     - Confidence Scorer
   - Emergency fast-track agent for life-threatening cases

4. **API Server** (`main.py`)
   - FastAPI with Server-Sent Events (SSE)
   - Endpoints:
     - `/war-room/team-discussion` - Full multi-specialist discussion
     - `/war-room/broker-query` - Direct specialist query
     - `/war-room/follow-up` - Follow-up questions

## ADK Patterns Used

- **LLM-Driven Delegation**: Coordinator uses `transfer_to_agent()` to route cases
- **Sequential Workflow**: Consensus pipeline processes in stages
- **Shared Session State**: Agents pass data via `session.state`
- **Sub-Agent Hierarchy**: Coordinator has specialists as `sub_agents`

## Setup

```bash
# Install dependencies (already done)
pip install google-adk

# Configure environment
export GOOGLE_AI_API_KEY="your-key"
export CEREBRAS_API_KEY="your-key"  # Optional

# Run server
python -m war_room_adk.main
```

## Usage

```python
from war_room_adk.coordinator import create_coordinator_agent
from google.adk.sessions import Session

coordinator = create_coordinator_agent()
session = Session()

result = await coordinator.run_async(
    "Patient with chest pain and dyspnea...",
    session=session
)
```

## Endpoints

### POST `/war-room/team-discussion`
Full multi-agent discussion with consensus building.

**Request:**
```json
{
  "case": {
    "chiefComplaint": "Chest pain",
    "vitals": {"bp": "160/95", "hr": "110"},
    "labs": [{"name": "Troponin", "value": "0.8", "unit": "ng/mL", "status": "high"}]
  },
  "urgency": "urgent"
}
```

**Response:** SSE stream with events:
- `triage` - Urgency assessment
- `coordinator_response` - Specialist routing
- `consensus` - Final recommendations

### POST `/war-room/broker-query`
Quick specialist consultation.

### POST `/war-room/follow-up`
Follow-up questions in ongoing discussion.

## Model Configuration

- **Primary**: Gemini 2.5-flash via Vertex AI (configurable to Cerebras)
- **Temperature**: 0.3 (specialists), 0.1 (triage/scoring)
- **Max Tokens**: 8192

## Key Differences from LangChain Version

| Feature | LangChain | ADK |
|---------|-----------|-----|
| Routing | Manual prompts | `transfer_to_agent()` |
| Workflows | Custom loops | `SequentialAgent` |
| State | Manual passing | `session.state` |
| Consensus | Single LLM call | Multi-agent pipeline |

## Benefits

✅ **LLM-driven routing** - Coordinator decides which specialists to call  
✅ **Structured workflows** - Sequential consensus building  
✅ **Better state management** - Automatic context sharing  
✅ **Modular design** - Easy to add new specialists  
✅ **Production-ready** - Built-in observability with ADK

## Next Steps

- [ ] Add Cerebras model support (replace Vertex AI endpoints)
- [ ] Implement parallel specialist consultation (`ParallelAgent`)
- [ ] Add medical knowledge retrieval tools
- [ ] Integrate with frontend SSE client
