"""
API endpoints for agent creation and management.
This module provides endpoints for creating, updating, and deleting agents and teams.
It supports both in-memory storage and Supabase database storage.
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from mcp_agent.agent_factory import AgentFactory

# Import Supabase services if available
try:
    from mcp_agent.database.agent_service import AgentService
    from mcp_agent.database.conversation_service import ConversationService
    supabase_available = True
except ImportError:
    supabase_available = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/agents", tags=["agents"])

# Models
class AgentTool(BaseModel):
    """Tool configuration for an agent."""
    id: str
    name: str
    description: str
    type: str = Field(..., description="Tool type: function, agent, knowledge, web")

class AgentConfig(BaseModel):
    """Configuration for an agent."""
    id: str
    name: str
    description: str = ""
    instructions: str
    model: str = "gpt-4o"
    framework: str = Field(..., description="Framework: langgraph, openai_agents, hybrid")
    tools: List[AgentTool] = []
    isTeamMember: bool = False

class AgentTeam(BaseModel):
    """Configuration for an agent team."""
    id: str
    name: str
    agents: List[str]

class AgentResponse(BaseModel):
    """Response for agent operations."""
    id: str
    name: str
    status: str
    message: str = ""

# In-memory storage for agents and teams (fallback if Supabase is not available)
agents_db: Dict[str, AgentConfig] = {}
teams_db: Dict[str, AgentTeam] = {}

# Initialize Supabase tables if available
if supabase_available:
    try:
        # Initialize agent and team tables
        AgentService.initialize_tables()

        # Initialize conversation and message tables
        ConversationService.initialize_tables()

        logger.info("Supabase tables initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Supabase tables: {e}")
        logger.warning("Falling back to in-memory storage")

# Get agent factory
def get_agent_factory():
    """Get the agent factory."""
    return AgentFactory()

@router.get("/", response_model=List[AgentConfig])
async def list_agents():
    """List all agents."""
    # Try to get agents from Supabase if available
    if supabase_available:
        try:
            # Get agents from Supabase
            agents = AgentService.get_all_agents()

            if agents:
                # Convert to AgentConfig objects
                return [AgentConfig(**agent) for agent in agents]
        except Exception as e:
            logger.error(f"Error getting agents from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    return list(agents_db.values())

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentConfig, factory: AgentFactory = Depends(get_agent_factory)):
    """Create a new agent."""
    # Try to create agent in Supabase if available
    if supabase_available:
        try:
            # Check if agent already exists in Supabase
            existing_agent = AgentService.get_agent(agent.id)
            if existing_agent:
                raise HTTPException(status_code=400, detail=f"Agent with ID {agent.id} already exists")

            # Create agent in Supabase
            created_agent = AgentService.create_agent(agent.dict())

            if created_agent:
                # Log agent creation
                logger.info(f"Created agent in Supabase: {agent.name} (ID: {agent.id}, Framework: {agent.framework})")

                return AgentResponse(
                    id=agent.id,
                    name=agent.name,
                    status="success",
                    message=f"Agent {agent.name} created successfully in Supabase"
                )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error creating agent in Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    # Check if agent already exists
    if agent.id in agents_db:
        raise HTTPException(status_code=400, detail=f"Agent with ID {agent.id} already exists")

    try:
        # Store agent configuration
        agents_db[agent.id] = agent

        # Log agent creation
        logger.info(f"Created agent in memory: {agent.name} (ID: {agent.id}, Framework: {agent.framework})")

        return AgentResponse(
            id=agent.id,
            name=agent.name,
            status="success",
            message=f"Agent {agent.name} created successfully in memory"
        )
    except Exception as e:
        logger.error(f"Error creating agent in memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.get("/{agent_id}", response_model=AgentConfig)
async def get_agent(agent_id: str):
    """Get agent by ID."""
    # Try to get agent from Supabase if available
    if supabase_available:
        try:
            # Get agent from Supabase
            agent = AgentService.get_agent(agent_id)

            if agent:
                # Convert to AgentConfig object
                return AgentConfig(**agent)
        except Exception as e:
            logger.error(f"Error getting agent from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")

    return agents_db[agent_id]

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent: AgentConfig):
    """Update an existing agent."""
    if agent_id != agent.id:
        raise HTTPException(status_code=400, detail="Agent ID in path must match agent ID in body")

    # Try to update agent in Supabase if available
    if supabase_available:
        try:
            # Check if agent exists in Supabase
            existing_agent = AgentService.get_agent(agent_id)
            if not existing_agent:
                # Check in-memory storage before returning 404
                if agent_id not in agents_db:
                    raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
            else:
                # Update agent in Supabase
                updated_agent = AgentService.update_agent(agent_id, agent.dict())

                if updated_agent:
                    # Log agent update
                    logger.info(f"Updated agent in Supabase: {agent.name} (ID: {agent.id})")

                    return AgentResponse(
                        id=agent.id,
                        name=agent.name,
                        status="success",
                        message=f"Agent {agent.name} updated successfully in Supabase"
                    )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error updating agent in Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if agent_id not in agents_db:
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")

    try:
        # Update agent configuration
        agents_db[agent_id] = agent

        # Log agent update
        logger.info(f"Updated agent in memory: {agent.name} (ID: {agent.id})")

        return AgentResponse(
            id=agent.id,
            name=agent.name,
            status="success",
            message=f"Agent {agent.name} updated successfully in memory"
        )
    except Exception as e:
        logger.error(f"Error updating agent in memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")

@router.delete("/{agent_id}", response_model=AgentResponse)
async def delete_agent(agent_id: str):
    """Delete an agent."""
    agent_name = None

    # Try to delete agent from Supabase if available
    if supabase_available:
        try:
            # Check if agent exists in Supabase
            existing_agent = AgentService.get_agent(agent_id)
            if existing_agent:
                agent_name = existing_agent.get("name", "Unknown")

                # Delete agent from Supabase
                success = AgentService.delete_agent(agent_id)

                if success:
                    # Log agent deletion
                    logger.info(f"Deleted agent from Supabase: {agent_name} (ID: {agent_id})")

                    # Try to update teams in Supabase
                    try:
                        # Get all teams
                        teams = AgentService.get_all_teams()

                        # Update teams that contain the agent
                        for team in teams:
                            if agent_id in team.get("agents", []):
                                team["agents"].remove(agent_id)
                                AgentService.update_team(team["id"], team)
                    except Exception as e:
                        logger.error(f"Error updating teams in Supabase after agent deletion: {e}")

                    return AgentResponse(
                        id=agent_id,
                        name=agent_name,
                        status="success",
                        message=f"Agent {agent_name} deleted successfully from Supabase"
                    )
        except Exception as e:
            logger.error(f"Error deleting agent from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if agent_id not in agents_db:
        # If we already have a name from Supabase but the agent is not in memory,
        # we can still return success
        if agent_name:
            return AgentResponse(
                id=agent_id,
                name=agent_name,
                status="success",
                message=f"Agent {agent_name} deleted successfully from Supabase only"
            )

        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")

    try:
        # Get agent before deletion
        agent = agents_db[agent_id]
        agent_name = agent.name

        # Delete agent
        del agents_db[agent_id]

        # Remove agent from all teams
        for team_id, team in teams_db.items():
            if agent_id in team.agents:
                team.agents.remove(agent_id)
                teams_db[team_id] = team

        # Log agent deletion
        logger.info(f"Deleted agent from memory: {agent_name} (ID: {agent_id})")

        return AgentResponse(
            id=agent_id,
            name=agent_name,
            status="success",
            message=f"Agent {agent_name} deleted successfully from memory"
        )
    except Exception as e:
        logger.error(f"Error deleting agent from memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

# Team endpoints
@router.get("/teams/", response_model=List[AgentTeam])
async def list_teams():
    """List all teams."""
    # Try to get teams from Supabase if available
    if supabase_available:
        try:
            # Get teams from Supabase
            teams = AgentService.get_all_teams()

            if teams:
                # Convert to AgentTeam objects
                return [AgentTeam(**team) for team in teams]
        except Exception as e:
            logger.error(f"Error getting teams from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    return list(teams_db.values())

@router.post("/teams/", response_model=AgentTeam)
async def create_team(team: AgentTeam):
    """Create a new team."""
    # Try to create team in Supabase if available
    if supabase_available:
        try:
            # Check if team already exists in Supabase
            existing_team = AgentService.get_team(team.id)
            if existing_team:
                raise HTTPException(status_code=400, detail=f"Team with ID {team.id} already exists")

            # Check if all agents exist in Supabase
            for agent_id in team.agents:
                agent = AgentService.get_agent(agent_id)
                if not agent and agent_id not in agents_db:
                    raise HTTPException(status_code=400, detail=f"Agent with ID {agent_id} not found")

            # Create team in Supabase
            created_team = AgentService.create_team(team.dict())

            if created_team:
                # Log team creation
                logger.info(f"Created team in Supabase: {team.name} (ID: {team.id}) with {len(team.agents)} agents")

                # Convert to AgentTeam object
                return AgentTeam(**created_team)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error creating team in Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    # Check if team already exists
    if team.id in teams_db:
        raise HTTPException(status_code=400, detail=f"Team with ID {team.id} already exists")

    # Validate that all agents exist
    for agent_id in team.agents:
        if agent_id not in agents_db:
            raise HTTPException(status_code=400, detail=f"Agent with ID {agent_id} not found")

    try:
        # Store team configuration
        teams_db[team.id] = team

        # Log team creation
        logger.info(f"Created team in memory: {team.name} (ID: {team.id}) with {len(team.agents)} agents")

        return team
    except Exception as e:
        logger.error(f"Error creating team in memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating team: {str(e)}")

@router.get("/teams/{team_id}", response_model=AgentTeam)
async def get_team(team_id: str):
    """Get team by ID."""
    # Try to get team from Supabase if available
    if supabase_available:
        try:
            # Get team from Supabase
            team = AgentService.get_team(team_id)

            if team:
                # Convert to AgentTeam object
                return AgentTeam(**team)
        except Exception as e:
            logger.error(f"Error getting team from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if team_id not in teams_db:
        raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

    return teams_db[team_id]

@router.put("/teams/{team_id}", response_model=AgentTeam)
async def update_team(team_id: str, team: AgentTeam):
    """Update an existing team."""
    if team_id != team.id:
        raise HTTPException(status_code=400, detail="Team ID in path must match team ID in body")

    # Try to update team in Supabase if available
    if supabase_available:
        try:
            # Check if team exists in Supabase
            existing_team = AgentService.get_team(team_id)
            if not existing_team:
                # Check in-memory storage before returning 404
                if team_id not in teams_db:
                    raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")
            else:
                # Validate that all agents exist in Supabase or memory
                for agent_id in team.agents:
                    agent = AgentService.get_agent(agent_id)
                    if not agent and agent_id not in agents_db:
                        raise HTTPException(status_code=400, detail=f"Agent with ID {agent_id} not found")

                # Update team in Supabase
                updated_team = AgentService.update_team(team_id, team.dict())

                if updated_team:
                    # Log team update
                    logger.info(f"Updated team in Supabase: {team.name} (ID: {team.id})")

                    # Convert to AgentTeam object
                    return AgentTeam(**updated_team)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error updating team in Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if team_id not in teams_db:
        raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

    # Validate that all agents exist
    for agent_id in team.agents:
        if agent_id not in agents_db:
            raise HTTPException(status_code=400, detail=f"Agent with ID {agent_id} not found")

    try:
        # Update team configuration
        teams_db[team_id] = team

        # Log team update
        logger.info(f"Updated team in memory: {team.name} (ID: {team.id})")

        return team
    except Exception as e:
        logger.error(f"Error updating team in memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating team: {str(e)}")


@router.delete("/teams/{team_id}", response_model=AgentResponse)
async def delete_team(team_id: str):
    """Delete a team."""
    team_name = None

    # Try to delete team from Supabase if available
    if supabase_available:
        try:
            # Check if team exists in Supabase
            existing_team = AgentService.get_team(team_id)
            if existing_team:
                team_name = existing_team.get("name", "Unknown")

                # Delete team from Supabase
                success = AgentService.delete_team(team_id)

                if success:
                    # Log team deletion
                    logger.info(f"Deleted team from Supabase: {team_name} (ID: {team_id})")

                    return AgentResponse(
                        id=team_id,
                        name=team_name,
                        status="success",
                        message=f"Team {team_name} deleted successfully from Supabase"
                    )
        except Exception as e:
            logger.error(f"Error deleting team from Supabase: {e}")
            logger.warning("Falling back to in-memory storage")

    # Fall back to in-memory storage
    if team_id not in teams_db:
        # If we already have a name from Supabase but the team is not in memory,
        # we can still return success
        if team_name:
            return AgentResponse(
                id=team_id,
                name=team_name,
                status="success",
                message=f"Team {team_name} deleted successfully from Supabase only"
            )

        raise HTTPException(status_code=404, detail=f"Team with ID {team_id} not found")

    try:
        # Get team before deletion
        team = teams_db[team_id]
        team_name = team.name

        # Delete team
        del teams_db[team_id]

        # Log team deletion
        logger.info(f"Deleted team from memory: {team_name} (ID: {team_id})")

        return AgentResponse(
            id=team_id,
            name=team_name,
            status="success",
            message=f"Team {team_name} deleted successfully from memory"
        )
    except Exception as e:
        logger.error(f"Error deleting team from memory: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting team: {str(e)}")
