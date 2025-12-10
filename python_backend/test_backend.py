"""
Test War Room Python Backend
Quick test to verify your agents are working
"""

import asyncio
import sys
from pathlib import Path

# Add agents directory
agents_path = Path(r"c:\Users\Lalith\Desktop\agents")
sys.path.insert(0, str(agents_path))
sys.path.insert(0, str(agents_path.parent))

async def test_backend():
    print("=" * 60)
    print("War Room Backend Test")
    print("=" * 60)
    print()
    
    # Test 1: Import agents
    print("✓ Test 1: Loading agents...")
    try:
        from graph_coordinator import AgentCoordinator
        coordinator = AgentCoordinator()
        print(f"  ✓ Loaded {len(coordinator.agents)} agents")
        print(f"  Agents: {', '.join(coordinator.agents.keys())}")
    except Exception as e:
        print(f"  ✗ Failed to load agents: {e}")
        return
    
    print()
    
    # Test 2: Test orchestrator
    print("✓ Test 2: Testing orchestrator...")
    try:
        orchestrator = coordinator.agents.get("orchestrator")
        if orchestrator:
            response = await orchestrator.process(
                query="58-year-old male with crushing chest pain radiating to left arm",
                patient_data={"vitals": {"bp": "150/95", "hr": "105"}}
            )
            print(f"  ✓ Orchestrator responded")
            print(f"  Confidence: {response.confidence}")
            print(f"  Response preview: {response.content[:100]}...")
        else:
            print("  ✗ Orchestrator not found")
    except Exception as e:
        print(f"  ✗ Orchestrator test failed: {e}")
    
    print()
    
    # Test 3: Test a specialist
    print("✓ Test 3: Testing cardiology agent...")
    try:
        cardio = coordinator.agents.get("cardiology")
        if cardio:
            response = await cardio.process(
                query="Patient with troponin 2.4 ng/mL",
                patient_data={"labs": {"troponin": "2.4"}}
            )
            print(f"  ✓ Cardiology responded")
            print(f"  Confidence: {response.confidence}")
            print(f"  Recommendations: {response.recommendations}")
        else:
            print("  ✗ Cardiology agent not found")
    except Exception as e:
        print(f"  ✗ Cardiology test failed: {e}")
    
    print()
    print("=" * 60)
    print("Test complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_backend())
