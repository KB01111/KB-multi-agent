"""
Check if OpenAI Agents SDK is installed.
"""

import sys

print(f"Python version: {sys.version}")
print("Checking for OpenAI Agents SDK...")

try:
    import agents
    print(f"OpenAI Agents SDK is installed (version: {getattr(agents, '__version__', 'unknown')})")
except ImportError as e:
    print(f"OpenAI Agents SDK is not installed: {e}")

print("\nChecking for LangGraph...")
try:
    import langgraph
    print(f"LangGraph is installed (version: {getattr(langgraph, '__version__', 'unknown')})")
except ImportError as e:
    print(f"LangGraph is not installed: {e}")
