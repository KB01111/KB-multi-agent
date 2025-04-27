"""
API endpoints for the MCP Agent.
"""

from fastapi import APIRouter

from mcp_agent.api.agent_endpoints import router as agent_router
from mcp_agent.api.framework_endpoints import router as framework_router

# Create main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(agent_router)
api_router.include_router(framework_router)
