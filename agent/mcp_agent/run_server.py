"""
Run server script for the MCP Agent.
This script properly sets up the Python module structure for running the langgraph server.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

def main():
    """Run the langgraph server with the correct module structure."""
    parser = argparse.ArgumentParser(description="Run the MCP Agent server")
    parser.add_argument("--host", default="localhost", help="Host to run the server on")
    parser.add_argument("--port", default="8123", help="Port to run the server on")
    args = parser.parse_args()
    
    # Get the current directory (mcp_agent)
    current_dir = Path(__file__).parent
    
    # Get the parent directory (agent)
    agent_dir = current_dir.parent
    
    # Change to the agent directory
    os.chdir(agent_dir)
    
    # Run the langgraph dev command
    cmd = [
        "langgraph", "dev",
        "--config", "langgraph.json",
        "--host", args.host,
        "--port", args.port,
        "--no-browser"
    ]
    
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
