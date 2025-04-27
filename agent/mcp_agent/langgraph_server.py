"""
LangGraph server for the MCP Agent.
This script starts a LangGraph server with the agent graph.
"""

import os
import sys
import logging
import importlib
from pathlib import Path
from typing import Dict, Any, Optional, List
import asyncio
import uvicorn
from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define models for API requests and responses
class GraphRequest(BaseModel):
    inputs: Dict[str, Any]
    config: Optional[Dict[str, Any]] = None

class GraphResponse(BaseModel):
    outputs: Dict[str, Any]

# Create a new FastAPI app
app = FastAPI(
    title="MCP Agent LangGraph Server",
    description="LangGraph server for the MCP Agent",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try to import the graph
try:
    try:
        # Try to import the real graph
        from mcp_agent.agent import graph
        langgraph_available = True
        using_mock = False
        logger.info("Successfully imported real LangGraph graph")
    except ImportError as e:
        # Fall back to the mock graph
        from mcp_agent.mock_graph import graph
        langgraph_available = True
        using_mock = True
        logger.info("Using mock LangGraph graph")
except ImportError as e:
    langgraph_available = False
    using_mock = False
    logger.error(f"Could not import any LangGraph graph: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    import platform
    import sys

    return {
        "status": "ok",
        "message": "MCP Agent LangGraph server is running",
        "timestamp": get_current_datetime().isoformat(),
        "version": "0.1.0",
        "framework": "langgraph",
        "services": {
            "langgraph": {
                "available": langgraph_available,
                "status": "ok" if langgraph_available else "unavailable",
                "using_mock": using_mock if langgraph_available else False
            }
        },
        "system": {
            "python_version": sys.version,
            "platform": platform.platform(),
            "processor": platform.processor()
        }
    }

def get_current_datetime():
    """Get the current datetime."""
    import datetime
    return datetime.datetime.now()

@app.post("/v1/graphs/mcp-agent/invoke")
async def invoke_graph(request: GraphRequest):
    """Invoke the LangGraph graph."""
    if not langgraph_available:
        raise HTTPException(
            status_code=503,
            detail="LangGraph graph is not available"
        )

    try:
        # Invoke the graph
        result = await graph.ainvoke(request.inputs, request.config)
        return GraphResponse(outputs=result)
    except Exception as e:
        logger.error(f"Error invoking graph: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/")
async def root():
    """Root endpoint with server information."""
    return {
        "name": "MCP Agent LangGraph Server",
        "version": "0.1.0",
        "status": "running",
        "endpoints": [
            {"path": "/health", "method": "GET", "description": "Health check endpoint"},
            {"path": "/v1/graphs/mcp-agent/invoke", "method": "POST", "description": "Invoke the LangGraph graph"},
            {"path": "/", "method": "GET", "description": "Root endpoint with server information"}
        ]
    }

def run_server(port=8125):
    """Run the LangGraph server."""
    logger.info(f"Starting LangGraph server on http://localhost:{port}")

    try:
        uvicorn.run(
            app,
            host="localhost",
            port=port,
            log_level="info",
            access_log=True,
            timeout_keep_alive=65  # Increase keep-alive timeout
        )
    except Exception as e:
        logger.error(f"Error running LangGraph server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()
