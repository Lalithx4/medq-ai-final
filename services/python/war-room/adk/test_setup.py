"""
Quick Test Script for War Room ADK
"""
import asyncio
import os
from war_room_adk.config import Config
from war_room_adk.coordinator import create_coordinator_agent
from war_room_adk.agents import get_model
from google.adk.sessions import Session


async def test_basic_setup():
    """Test basic agent setup"""
    print("=" * 60)
    print("War Room ADK - Quick Test")
    print("=" * 60)
    
    # Check configuration
    print("\n1. Configuration Check:")
    print(f"   - Cerebras API Key: {'✅ SET' if Config.CEREBRAS_API_KEY else '❌ NOT SET'}")
    print(f"   - Google AI API Key: {'✅ SET' if Config.GOOGLE_AI_API_KEY else '❌ NOT SET'}")
    print(f"   - Using Cerebras: {Config.USE_CEREBRAS}")
    print(f"   - Primary Model: {Config.PRIMARY_MODEL}")
    
    # Test model creation
    print("\n2. Model Setup:")
    try:
        model = get_model()
        print(f"   ✅ Model configured: {type(model).__name__}")
    except Exception as e:
        print(f"   ❌ Model setup failed: {e}")
        return
    
    # Test coordinator creation
    print("\n3. Coordinator Agent:")
    try:
        coordinator = create_coordinator_agent()
        print(f"   ✅ Coordinator created: {coordinator.name}")
        print(f"   ✅ Sub-agents: {len(coordinator.sub_agents) if hasattr(coordinator, 'sub_agents') else 0}")
    except Exception as e:
        print(f"   ❌ Coordinator creation failed: {e}")
        return
    
    # Test simple query
    print("\n4. Simple Test Query:")
    session = Session(
        id="test-session-1",
        appName="WarRoomTest",
        userId="test-user"
    )
    try:
        result = await coordinator.run_async(
            "Test query: Patient with mild headache",
            session=session
        )
        print(f"   ✅ Query successful")
        print(f"   Response preview: {result.text[:200]}...")
    except Exception as e:
        print(f"   ❌ Query failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Basic setup complete! Ready to run main server.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_basic_setup())
