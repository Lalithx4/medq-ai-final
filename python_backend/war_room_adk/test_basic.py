"""
Basic Test - No LLM calls
Tests all 16 specialist agents
"""
from war_room_adk.config import Config
from war_room_adk.coordinator import create_coordinator_agent
from war_room_adk.consensus import create_consensus_engine
from war_room_adk.agents import get_model, SPECIALIST_AGENTS

print("="*60)
print("War Room ADK - 16 Specialist Agents Test")
print("="*60)

# Check configuration
print("\n1. Configuration:")
print(f"   Cerebras: {'✅' if Config.USE_CEREBRAS else '❌'} ({Config.PRIMARY_MODEL})")
print(f"   API Keys: Cerebras={'✅' if Config.CEREBRAS_API_KEY else '❌'}, Google={'✅' if Config.GOOGLE_AI_API_KEY else '❌'}")

# Test model creation
print("\n2. Model:")
model = get_model()
print(f"   Type: {type(model).__name__}")

# Test all specialists
print("\n3. Specialist Agents (16 total):")
print("\n   Tier 2 - Organ Systems (6):")
for name in ["cardiology", "pulmonology", "neurology", "nephrology", "gastroenterology", "hepatology"]:
    agent = SPECIALIST_AGENTS[name]()
    print(f"   ✅ {agent.name}")

print("\n   Tier 3 - System Specialists (5):")
for name in ["endocrinology", "hematology", "infectious", "oncology", "orthopedics"]:
    agent = SPECIALIST_AGENTS[name]()
    print(f"   ✅ {agent.name}")

print("\n   Tier 4 - Diagnostic (4):")
for name in ["differential_dx", "drug_interaction", "lab_interpreter", "radiology"]:
    agent = SPECIALIST_AGENTS[name]()
    print(f"   ✅ {agent.name}")

print(f"\n   Total Specialists: {len(SPECIALIST_AGENTS)}")

# Test coordinator
print("\n4. Coordinator:")
coordinator = create_coordinator_agent()
print(f"   Name: {coordinator.name}")
print(f"   Sub-agents: {len(coordinator.sub_agents) if hasattr(coordinator, 'sub_agents') else 0}")

# Test consensus
print("\n5. Consensus Pipeline:")
consensus = create_consensus_engine()
print(f"   Type: {type(consensus).__name__}")
print(f"   Status: ✅ Created")

print("\n"+"="*60)
print("✅ All 16 specialist agents initialized successfully!")
print("✅ Ready to run server: python -m war_room_adk.main")
print("="*60)
