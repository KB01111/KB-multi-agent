"""
API endpoints for the MCP Agent.
This module provides FastAPI endpoints for agent management and interaction.
"""

import os
import logging
import uuid
from typing import Dict, List, Any, Optional, Union, Literal
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

# Import agent factory and adapters
from mcp_agent.agent_factory import AgentFactory
try:
    from mcp_agent.adapters.openai_adapter import OpenAIAgentAdapter
    from mcp_agent.adapters.langgraph_adapter import LangGraphAgentAdapter
    from mcp_agent.adapters.openai_agents_sdk import OpenAIAgentsSDKAdapter
    adapters_available = True
    openai_agents_sdk_available = True
except ImportError:
    adapters_available = False
    openai_agents_sdk_available = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create API router
api_router = APIRouter(tags=["agents"])

# Models for API requests and responses
class AgentRequest(BaseModel):
    """Request model for creating an agent."""
    name: str
    description: str = ""
    instructions: str
    model: str = "gpt-4o"
    framework: Literal["langgraph", "openai_agents", "hybrid"] = "langgraph"
    memory_backend: Literal["memorysaver", "mem0"] = "memorysaver"
    knowledge_backend: Literal["graphiti", "none"] = "none"
    # Framework-specific options
    # LangGraph options
    enable_react_agent: bool = False
    enable_checkpointing: bool = False
    # OpenAI Agents options
    enable_tracing: bool = False
    enable_voice: bool = False
    enable_parallel: bool = False
    enable_litellm: bool = True
    # Tools
    tools: List[Dict[str, Any]] = []

class TeamRequest(BaseModel):
    """Request model for creating a team."""
    id: Optional[str] = None
    name: str
    description: str = ""
    agents: List[str] = []  # List of agent IDs
    workflow: Dict[str, Any] = Field(default_factory=lambda: {"type": "sequential"})

class TeamResponse(BaseModel):
    """Response model for team operations."""
    id: str
    name: str
    status: str

class AgentResponse(BaseModel):
    """Response model for agent operations."""
    id: str
    name: str
    status: str

class MessageRequest(BaseModel):
    """Request model for sending a message to an agent."""
    message: str

class MessageResponse(BaseModel):
    """Response model for agent messages."""
    content: str
    conversation_id: Optional[str] = None
    trace_id: Optional[str] = None
    error: bool = False

# In-memory store for created agents and teams
# In a production environment, this would be stored in a database
agents_store: Dict[str, Any] = {}
teams_store: Dict[str, Dict[str, Any]] = {}

# Endpoints for agent management
@api_router.get("/agents", response_model=List[Dict[str, Any]])
async def list_agents():
    """List all available agents."""
    return [
        {
            "id": agent_id,
            "name": agent.name if hasattr(agent, "name") else "Unknown",
            "framework": agent.framework if hasattr(agent, "framework") else "unknown",
            "model": agent.model if hasattr(agent, "model") else "unknown",
        }
        for agent_id, agent in agents_store.items()
    ]

@api_router.post("/agents", response_model=AgentResponse)
async def create_agent(request: AgentRequest):
    """Create a new agent."""
    # Generate a unique ID for the agent
    agent_id = f"agent-{uuid.uuid4()}"

    # Create agent factory
    factory = AgentFactory(config={
        "MEMORY_BACKEND": request.memory_backend,
        "KNOWLEDGE_BACKEND": request.knowledge_backend,
        "FRAMEWORK": request.framework,
        "DEFAULT_MODEL": request.model,
    })

    try:
        if request.framework == "openai_agents":
            if not openai_agents_sdk_available:
                raise HTTPException(
                    status_code=400,
                    detail="OpenAI Agents SDK adapters not available"
                )

            # Process tools for OpenAI Agents SDK
            processed_tools = []
            for tool in request.tools:
                # In a real implementation, we would convert the tools to OpenAI Agents SDK format
                # For now, we just pass them through
                processed_tools.append(tool)

            # Create OpenAI Agents SDK agent
            agent = factory.create_openai_agents_sdk_agent(
                name=request.name,
                instructions=request.instructions,
                tools=processed_tools,
                model=request.model,
                enable_tracing=request.enable_tracing,
                enable_voice=request.enable_voice,
                enable_parallel=request.enable_parallel,
                enable_litellm=request.enable_litellm
            )

            if agent is None:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create OpenAI Agents SDK agent"
                )

            # Store agent metadata
            agent.name = request.name
            agent.description = request.description
            agent.framework = request.framework
            agent.model = request.model
            agent.tools = request.tools

            # Store the agent
            agents_store[agent_id] = agent

            return AgentResponse(
                id=agent_id,
                name=request.name,
                status="created"
            )
        elif request.framework == "langgraph":
            # For now, just return a success response
            # In a real implementation, we would create a LangGraph agent
            return AgentResponse(
                id=agent_id,
                name=request.name,
                status="created"
            )
        elif request.framework == "hybrid":
            # For now, just return a success response
            # In a real implementation, we would create a hybrid agent
            return AgentResponse(
                id=agent_id,
                name=request.name,
                status="created"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown framework: {request.framework}"
            )
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating agent: {str(e)}"
        )

@api_router.get("/agents/{agent_id}", response_model=Dict[str, Any])
async def get_agent(agent_id: str):
    """Get an agent by ID."""
    if agent_id not in agents_store:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_id}"
        )

    agent = agents_store[agent_id]

    return {
        "id": agent_id,
        "name": agent.name if hasattr(agent, "name") else "Unknown",
        "description": agent.description if hasattr(agent, "description") else "",
        "framework": agent.framework if hasattr(agent, "framework") else "unknown",
        "model": agent.model if hasattr(agent, "model") else "unknown",
    }

@api_router.delete("/agents/{agent_id}", response_model=Dict[str, Any])
async def delete_agent(agent_id: str):
    """Delete an agent by ID."""
    if agent_id not in agents_store:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_id}"
        )

    # Remove the agent from the store
    del agents_store[agent_id]

    return {
        "id": agent_id,
        "status": "deleted"
    }

@api_router.post("/agents/{agent_id}/message", response_model=MessageResponse)
async def send_message(agent_id: str, request: MessageRequest):
    """Send a message to an agent."""
    if agent_id not in agents_store:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_id}"
        )

    agent = agents_store[agent_id]

    try:
        # Process the message with the agent
        if hasattr(agent, "process"):
            # For OpenAI Agents
            result = await agent.process({
                "messages": [
                    {
                        "role": "user",
                        "content": request.message
                    }
                ]
            })

            # Extract the response
            messages = result.get("messages", [])
            last_message = messages[-1] if messages else {"content": "No response"}

            return MessageResponse(
                content=last_message.get("content", ""),
                conversation_id=result.get("conversation_id"),
                trace_id=result.get("trace_id")
            )
        else:
            # For other agent types
            return MessageResponse(
                content=f"Agent {agent_id} does not support message processing",
                error=True
            )
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return MessageResponse(
            content=f"Error: {str(e)}",
            error=True
        )

# Team management endpoints
@api_router.get("/agents/teams", response_model=List[Dict[str, Any]])
async def list_teams():
    """List all available teams."""
    return [
        {
            "id": team_id,
            "name": team_data["name"],
            "description": team_data.get("description", ""),
            "agents": team_data.get("agents", []),
            "workflow": team_data.get("workflow", {"type": "sequential"}),
        }
        for team_id, team_data in teams_store.items()
    ]

@api_router.post("/agents/teams", response_model=TeamResponse)
async def create_team(request: TeamRequest):
    """Create a new team."""
    # Generate a unique ID for the team if not provided
    team_id = request.id or f"team-{uuid.uuid4()}"

    # Validate that all agents exist
    for agent_id in request.agents:
        if agent_id not in agents_store:
            raise HTTPException(
                status_code=400,
                detail=f"Agent not found: {agent_id}"
            )

    # Create team data
    team_data = {
        "name": request.name,
        "description": request.description,
        "agents": request.agents,
        "workflow": request.workflow,
    }

    # Store the team
    teams_store[team_id] = team_data

    return TeamResponse(
        id=team_id,
        name=request.name,
        status="created"
    )

@api_router.get("/agents/teams/{team_id}", response_model=Dict[str, Any])
async def get_team(team_id: str):
    """Get a team by ID."""
    if team_id not in teams_store:
        raise HTTPException(
            status_code=404,
            detail=f"Team not found: {team_id}"
        )

    team_data = teams_store[team_id]

    return {
        "id": team_id,
        "name": team_data["name"],
        "description": team_data.get("description", ""),
        "agents": team_data.get("agents", []),
        "workflow": team_data.get("workflow", {"type": "sequential"}),
    }

@api_router.put("/agents/teams/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, request: TeamRequest):
    """Update a team by ID."""
    if team_id not in teams_store:
        raise HTTPException(
            status_code=404,
            detail=f"Team not found: {team_id}"
        )

    # Validate that all agents exist
    for agent_id in request.agents:
        if agent_id not in agents_store:
            raise HTTPException(
                status_code=400,
                detail=f"Agent not found: {agent_id}"
            )

    # Update team data
    team_data = {
        "name": request.name,
        "description": request.description,
        "agents": request.agents,
        "workflow": request.workflow,
    }

    # Store the updated team
    teams_store[team_id] = team_data

    return TeamResponse(
        id=team_id,
        name=request.name,
        status="updated"
    )

@api_router.delete("/agents/teams/{team_id}", response_model=Dict[str, Any])
async def delete_team(team_id: str):
    """Delete a team by ID."""
    if team_id not in teams_store:
        raise HTTPException(
            status_code=404,
            detail=f"Team not found: {team_id}"
        )

    # Remove the team from the store
    del teams_store[team_id]

    return {
        "id": team_id,
        "status": "deleted"
    }

@api_router.post("/agents/teams/{team_id}/message", response_model=MessageResponse)
async def send_message_to_team(team_id: str, request: MessageRequest):
    """Send a message to a team."""
    if team_id not in teams_store:
        raise HTTPException(
            status_code=404,
            detail=f"Team not found: {team_id}"
        )

    team_data = teams_store[team_id]
    agent_ids = team_data.get("agents", [])
    workflow_type = team_data.get("workflow", {}).get("type", "sequential")

    if not agent_ids:
        return MessageResponse(
            content="Team has no agents",
            error=True
        )

    try:
        # Create agent factory
        factory = AgentFactory()

        # Get all agents in the team
        team_agents = []
        for agent_id in agent_ids:
            if agent_id in agents_store:
                team_agents.append(agents_store[agent_id])

        # Check if all agents are OpenAI Agents SDK agents
        all_openai_agents = all(
            hasattr(agent, "framework") and agent.framework == "openai_agents"
            for agent in team_agents
        )

        if all_openai_agents and openai_agents_sdk_available:
            # Create a team workflow using OpenAI Agents SDK
            team_workflow = factory.create_openai_agents_sdk_team(
                agents=team_agents,
                workflow_type=workflow_type
            )

            if team_workflow:
                # Run the team workflow
                result = await team_workflow(request.message)

                return MessageResponse(
                    content=result,
                    conversation_id=f"team-{team_id}",
                    error=False
                )
            else:
                return MessageResponse(
                    content="Failed to create team workflow",
                    error=True
                )
        else:
            # Fallback to sequential processing
            result = request.message
            for agent in team_agents:
                if hasattr(agent, "process"):
                    agent_result = await agent.process({
                        "messages": [
                            {
                                "role": "user",
                                "content": result
                            }
                        ]
                    })

                    # Extract the response
                    messages = agent_result.get("messages", [])
                    last_message = messages[-1] if messages else {"content": "No response"}
                    result = last_message.get("content", "")

            return MessageResponse(
                content=result,
                conversation_id=f"team-{team_id}",
                error=False
            )
    except Exception as e:
        logger.error(f"Error processing team message: {e}")
        return MessageResponse(
            content=f"Error: {str(e)}",
            error=True
        )

# Endpoint to get available frameworks
@api_router.get("/frameworks", response_model=Dict[str, List[str]])
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
        import agents
        available_frameworks.append("openai_agents")
    except ImportError:
        pass

    # If both are available, add hybrid option
    if "langgraph" in available_frameworks and "openai_agents" in available_frameworks:
        available_frameworks.append("hybrid")

    return {"frameworks": available_frameworks}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]

    async def send_personal_message(self, message: Any, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: Any, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                await connection.send_json(message)

manager = ConnectionManager()

# WebSocket endpoint for streaming agent responses
@api_router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_json()

            # Process the message
            agent_id = data.get("agent_id")
            message = data.get("message")

            if not agent_id or not message:
                await manager.send_personal_message(
                    {"error": "Missing agent_id or message"},
                    websocket
                )
                continue

            if agent_id not in agents_store:
                await manager.send_personal_message(
                    {"error": f"Agent not found: {agent_id}"},
                    websocket
                )
                continue

            agent = agents_store[agent_id]

            try:
                # Process the message with the agent
                if hasattr(agent, "process"):
                    # For OpenAI Agents
                    result = await agent.process({
                        "messages": [
                            {
                                "role": "user",
                                "content": message
                            }
                        ]
                    })

                    # Extract the response
                    messages = result.get("messages", [])
                    last_message = messages[-1] if messages else {"content": "No response"}

                    await manager.send_personal_message(
                        {
                            "content": last_message.get("content", ""),
                            "conversation_id": result.get("conversation_id"),
                            "trace_id": result.get("trace_id"),
                            "error": False
                        },
                        websocket
                    )
                else:
                    # For other agent types
                    await manager.send_personal_message(
                        {
                            "content": f"Agent {agent_id} does not support message processing",
                            "error": True
                        },
                        websocket
                    )
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await manager.send_personal_message(
                    {
                        "content": f"Error: {str(e)}",
                        "error": True
                    },
                    websocket
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
