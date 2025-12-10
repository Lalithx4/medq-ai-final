"""
Quick test to verify Python backend can start and agents load correctly
"""
import sys
from pathlib import Path

print("🔍 Testing War Room Python Backend Setup\n")

# Test 1: Check Python version
print(f"✓ Python version: {sys.version}")

# Test 2: Check agents directory exists
agents_path = Path(r"c:\Users\Lalith\Desktop\agents")
if agents_path.exists():
    print(f"✓ Agents directory found: {agents_path}")
    py_files = list(agents_path.glob("*.py"))
    print(f"  Found {len(py_files)} Python files")
    for pf in py_files[:5]:
        print(f"    - {pf.name}")
    if len(py_files) > 5:
        print(f"    ... and {len(py_files) - 5} more")
else:
    print(f"✗ ERROR: Agents directory not found at {agents_path}")
    sys.exit(1)

# Test 3: Try importing agents
sys.path.insert(0, str(agents_path))
sys.path.insert(0, str(agents_path.parent))

try:
    from graph_coordinator import AgentCoordinator
    print("✓ Successfully imported AgentCoordinator")
    
    coordinator = AgentCoordinator()
    print(f"✓ AgentCoordinator initialized")
    print(f"  Available agents: {list(coordinator.agents.keys())[:10]}")
except ImportError as e:
    print(f"✗ ERROR importing AgentCoordinator: {e}")
    print("  Make sure graph_coordinator.py exists in the agents directory")
    sys.exit(1)

try:
    from team_discussion import TeamDiscussionEngine
    print("✓ Successfully imported TeamDiscussionEngine")
    
    discussion = TeamDiscussionEngine()
    print("✓ TeamDiscussionEngine initialized")
except ImportError as e:
    print(f"✗ ERROR importing TeamDiscussionEngine: {e}")
    print("  Make sure team_discussion.py exists in the agents directory")
    sys.exit(1)

# Test 4: Check FastAPI dependencies
try:
    import fastapi
    print(f"✓ FastAPI installed: v{fastapi.__version__}")
except ImportError:
    print("✗ ERROR: FastAPI not installed")
    print("  Run: pip install -r requirements.txt")
    sys.exit(1)

try:
    import uvicorn
    print(f"✓ Uvicorn installed")
except ImportError:
    print("✗ ERROR: Uvicorn not installed")
    print("  Run: pip install -r requirements.txt")
    sys.exit(1)

# Test 5: Check environment variables
from pathlib import Path
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    print(f"✓ .env file found")
    with open(env_file) as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        print(f"  {len(lines)} environment variables configured")
else:
    print("⚠ WARNING: .env file not found")
    print("  Copy .env.example to .env and add your GOOGLE_GENERATIVE_AI_API_KEY")

print("\n" + "="*60)
print("✅ ALL TESTS PASSED!")
print("="*60)
print("\nYou can now start the backend with:")
print("  cd python_backend")
print("  start.bat")
print("\nOr manually with:")
print("  python -m uvicorn war_room_api:app --reload --port 8000")
