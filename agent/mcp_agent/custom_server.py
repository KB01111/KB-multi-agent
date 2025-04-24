"""
Custom server script for the MCP Agent.
This creates a standalone FastAPI server with health endpoint and LangGraph integration.
"""

import os
import sys
import logging
import importlib
import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Initialize Sentry if available
try:
    # Check if sentry_sdk is installed
    import importlib.util
    sentry_spec = importlib.util.find_spec("sentry_sdk")

    if sentry_spec is not None:
        import sentry_sdk

        # Check if FastAPI integration is available
        try:
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            fastapi_integration_available = True
        except ImportError:
            fastapi_integration_available = False
            logging.warning("Sentry FastAPI integration not available, using basic integration")

        # Get Sentry DSN from environment variable
        sentry_dsn = os.environ.get("SENTRY_DSN", "https://5226a48fca35002ddf73181cc626b278@o4508916501970944.ingest.de.sentry.io/4509203568525392")

        if sentry_dsn:
            # Initialize with appropriate options based on available features
            init_kwargs = {
                "dsn": sentry_dsn,
                "send_default_pii": True,
                "environment": os.environ.get("ENVIRONMENT", "development"),
                "release": "kb-multi-agent@0.1.0",
            }

            # Add performance monitoring if available in this version
            try:
                # Test if these options are supported
                init_kwargs["traces_sample_rate"] = 1.0
                init_kwargs["profile_session_sample_rate"] = 1.0
                init_kwargs["profile_lifecycle"] = "trace"
            except Exception as e:
                logging.warning(f"Some Sentry performance options not supported: {e}")

            # Initialize Sentry
            sentry_sdk.init(**init_kwargs)
            logging.info("Sentry integration initialized")
        else:
            logging.warning("Sentry DSN not found, Sentry integration disabled")
    else:
        logging.warning("Sentry SDK not installed, Sentry integration disabled")
except Exception as e:
    logging.warning(f"Error initializing Sentry: {e}")

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
    title="MCP Agent Server",
    description="Custom server with LangGraph integration and health endpoint",
    version="0.1.0"
)


def create_app():
    """Create a FastAPI app with LangGraph integration and health endpoint."""
    # Get the current directory (mcp_agent)
    current_dir = Path(__file__).parent

    # Get the parent directory (agent)
    agent_dir = current_dir.parent

    # Change to the agent directory
    os.chdir(agent_dir)

    # Log the app creation
    logger.info(f"Created FastAPI app for MCP Agent server")

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, you should restrict this
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add an enhanced health endpoint
    @app.get("/health")
    async def health_check():
        # Check if LangGraph is available
        langgraph_available = False
        try:
            from mcp_agent.agent import graph
            langgraph_available = True
        except ImportError:
            pass

        # Check if knowledge server is available
        knowledge_server_available = False
        try:
            import importlib.util
            spec = importlib.util.find_spec("mcp_agent.integrations.graphiti_integration")
            knowledge_server_available = spec is not None
        except ImportError:
            pass

        # Check if math server is available
        math_server_available = False
        try:
            import os
            math_server_path = os.path.join(os.path.dirname(__file__), "..", "math_server.py")
            math_server_available = os.path.exists(math_server_path)
        except Exception:
            pass

        # Get system info
        import platform
        import sys

        return {
            "status": "ok",
            "message": "MCP Agent backend is running",
            "timestamp": datetime.datetime.now().isoformat(),
            "version": "0.1.0",
            "services": {
                "langgraph": {
                    "available": langgraph_available,
                    "status": "ok" if langgraph_available else "unavailable"
                },
                "knowledge_server": {
                    "available": knowledge_server_available,
                    "status": "ok" if knowledge_server_available else "unavailable"
                },
                "math_server": {
                    "available": math_server_available,
                    "status": "ok" if math_server_available else "unavailable"
                }
            },
            "system": {
                "python_version": sys.version,
                "platform": platform.platform(),
                "processor": platform.processor()
            }
        }

    # Add an endpoint to list all available routes (useful for debugging)
    @app.get("/routes")
    async def list_routes():
        routes = []
        for route in app.routes:
            route_info = {
                "path": route.path,
                "name": route.name,
                "methods": list(route.methods) if hasattr(route, 'methods') else []
            }
            routes.append(route_info)
        return {"routes": routes}

    # Add a frontend connection check endpoint
    @app.get("/connection/frontend")
    async def check_frontend_connection():
        # Try to import httpx, fall back to using requests if not available
        try:
            import httpx
            async_http_available = True
        except ImportError:
            import requests
            async_http_available = False

        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

        if async_http_available:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    response = await client.get(frontend_url)
                    return {
                        "status": "connected" if response.status_code < 400 else "error",
                        "frontend_url": frontend_url,
                        "status_code": response.status_code,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
            except Exception as e:
                return {
                    "status": "disconnected",
                    "frontend_url": frontend_url,
                    "error": str(e),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        else:
            # Fallback to synchronous requests
            try:
                response = requests.get(frontend_url, timeout=2.0)
                return {
                    "status": "connected" if response.status_code < 400 else "error",
                    "frontend_url": frontend_url,
                    "status_code": response.status_code,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "note": "Using synchronous requests (httpx not available)"
                }
            except Exception as e:
                return {
                    "status": "disconnected",
                    "frontend_url": frontend_url,
                    "error": str(e),
                    "timestamp": datetime.datetime.now().isoformat(),
                    "note": "Using synchronous requests (httpx not available)"
                }

    # Add a root endpoint
    @app.get("/")
    async def root():
        # Get health information
        health_info = await health_check()

        # Try to check frontend connection
        try:
            frontend_connection = await check_frontend_connection()
        except Exception as e:
            frontend_connection = {"status": "error", "error": str(e)}

        return {
            "name": "MCP Agent Server",
            "version": "0.1.0",
            "status": "running",
            "timestamp": datetime.datetime.now().isoformat(),
            "health": health_info,
            "frontend_connection": frontend_connection,
            "endpoints": [
                {"path": "/health", "method": "GET", "description": "Health check endpoint"},
                {"path": "/routes", "method": "GET", "description": "List all available routes"},
                {"path": "/connection/frontend", "method": "GET", "description": "Check frontend connection"},
                {"path": "/", "method": "GET", "description": "Root endpoint with server information"}
            ]
        }

    # Add LangGraph integration endpoints
    try:
        from mcp_agent.agent import graph

        @app.post("/v1/graphs/mcp-agent/invoke")
        async def invoke_graph(request: GraphRequest):
            try:
                # Run the graph with the provided inputs
                result = await graph.ainvoke(request.inputs, request.config)
                return GraphResponse(outputs=result)
            except Exception as e:
                logger.error(f"Error invoking graph: {e}")
                raise HTTPException(status_code=500, detail=str(e))
    except ImportError as e:
        logger.warning(f"Could not import graph from mcp_agent.agent: {e}")
        logger.warning("LangGraph integration endpoints will not be available")

    # Add a Sentry test endpoint
    @app.get("/sentry-debug")
    async def trigger_error():
        """Endpoint to test Sentry integration by triggering an error."""
        # Check if Sentry is available
        sentry_available = False
        try:
            import sentry_sdk
            sentry_available = True
        except ImportError:
            pass

        try:
            # Intentionally trigger a division by zero error
            division_by_zero = 1 / 0
            return {"result": division_by_zero}
        except Exception as e:
            logger.error(f"Sentry test error: {e}")

            # Add Sentry status to the error response
            if sentry_available:
                logger.info("Error captured by Sentry")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": str(e),
                        "sentry_status": "Error captured and sent to Sentry"
                    }
                )
            else:
                logger.warning("Sentry not available, error not captured")
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": str(e),
                        "sentry_status": "Sentry not available, error not captured"
                    }
                )

    # Add global exception handler to provide better error messages
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Global exception handler caught: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": str(exc),
                "type": str(type(exc).__name__),
                "path": request.url.path
            }
        )

    # Log all available routes
    logger.info(f"Available routes:")
    for route in app.routes:
        logger.info(f"  {route.path} [{','.join(route.methods) if hasattr(route, 'methods') else 'N/A'}]")

    return app
