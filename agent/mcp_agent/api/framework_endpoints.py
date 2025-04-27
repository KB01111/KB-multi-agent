"""
API endpoints for framework information.
This module provides endpoints for getting information about available frameworks.
"""

import logging
from typing import Dict, List
from fastapi import APIRouter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/frameworks", tags=["frameworks"])

@router.get("/", response_model=Dict[str, List[str]])
async def get_available_frameworks():
    """Get available agent frameworks."""
    available_frameworks = []

    # Check LangGraph availability
    try:
        import langgraph
        available_frameworks.append("langgraph")
    except ImportError:
        pass

    # Check OpenAI Agents SDK availability
    try:
        # Try the newer import path first (0.1.0+)
        try:
            import openai.agents
            available_frameworks.append("openai_agents")
            logger.info("OpenAI Agents SDK available (openai.agents)")
        except ImportError:
            # Try the older import path (0.0.x)
            import agents
            available_frameworks.append("openai_agents")
            logger.info("OpenAI Agents SDK available (agents)")
    except ImportError:
        logger.warning("OpenAI Agents SDK not available")
        pass

    # If both are available, add hybrid option
    if "langgraph" in available_frameworks and "openai_agents" in available_frameworks:
        available_frameworks.append("hybrid")

    return {"frameworks": available_frameworks}
