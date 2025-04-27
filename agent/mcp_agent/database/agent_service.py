"""
Agent service for the MCP Agent.
This module provides functions to interact with the Supabase database for agent storage.
"""

import os
import json
import logging
import uuid
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase connection parameters
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
AGENTS_TABLE = os.getenv("SUPABASE_AGENTS_TABLE", "agents")
TEAMS_TABLE = os.getenv("SUPABASE_TEAMS_TABLE", "teams")

class AgentService:
    """Service for interacting with agent data in the Supabase database."""
    
    @staticmethod
    def _get_headers():
        """Get the headers for Supabase API requests."""
        return {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    @staticmethod
    def initialize_tables():
        """Initialize the database with required tables if they don't exist."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Using in-memory storage.")
                return False
            
            # Create agents table if it doesn't exist
            sql = f"""
            CREATE TABLE IF NOT EXISTS {AGENTS_TABLE} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                instructions TEXT NOT NULL,
                model TEXT NOT NULL,
                framework TEXT NOT NULL,
                tools JSONB DEFAULT '[]',
                is_team_member BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # Create teams table if it doesn't exist
            sql += f"""
            CREATE TABLE IF NOT EXISTS {TEAMS_TABLE} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                agents JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # Execute SQL
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/execute_sql",
                headers=AgentService._get_headers(),
                json={"query": sql}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error initializing tables: {response.text}")
                return False
            
            logger.info("Successfully initialized agent and team tables")
            return True
        except Exception as e:
            logger.error(f"Error initializing tables: {e}")
            return False
    
    @staticmethod
    def get_all_agents() -> List[Dict[str, Any]]:
        """Get all agents."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get agents.")
                return []
            
            # Get all agents
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{AGENTS_TABLE}",
                headers=AgentService._get_headers()
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting agents: {response.text}")
                return []
            
            # Parse response
            agents = response.json()
            
            # Convert tools from JSON string to Python object if needed
            for agent in agents:
                if isinstance(agent.get("tools"), str):
                    try:
                        agent["tools"] = json.loads(agent["tools"])
                    except json.JSONDecodeError:
                        agent["tools"] = []
                
                # Convert is_team_member to boolean if needed
                if "is_team_member" in agent:
                    agent["isTeamMember"] = agent.pop("is_team_member")
            
            return agents
        except Exception as e:
            logger.error(f"Error getting agents: {e}")
            return []
    
    @staticmethod
    def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
        """Get an agent by ID."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get agent.")
                return None
            
            # Get agent
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{AGENTS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{agent_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting agent: {response.text}")
                return None
            
            # Parse response
            agents = response.json()
            
            if not agents:
                return None
            
            agent = agents[0]
            
            # Convert tools from JSON string to Python object if needed
            if isinstance(agent.get("tools"), str):
                try:
                    agent["tools"] = json.loads(agent["tools"])
                except json.JSONDecodeError:
                    agent["tools"] = []
            
            # Convert is_team_member to boolean if needed
            if "is_team_member" in agent:
                agent["isTeamMember"] = agent.pop("is_team_member")
            
            return agent
        except Exception as e:
            logger.error(f"Error getting agent: {e}")
            return None
    
    @staticmethod
    def create_agent(agent: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new agent."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot create agent.")
                return None
            
            # Prepare agent data
            agent_data = {
                "id": agent.get("id") or str(uuid.uuid4()),
                "name": agent["name"],
                "description": agent.get("description", ""),
                "instructions": agent["instructions"],
                "model": agent["model"],
                "framework": agent["framework"],
                "tools": json.dumps(agent.get("tools", [])),
                "is_team_member": agent.get("isTeamMember", False)
            }
            
            # Create agent
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{AGENTS_TABLE}",
                headers=AgentService._get_headers(),
                json=agent_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error creating agent: {response.text}")
                return None
            
            # Parse response
            created_agent = response.json()[0]
            
            # Convert tools from JSON string to Python object if needed
            if isinstance(created_agent.get("tools"), str):
                try:
                    created_agent["tools"] = json.loads(created_agent["tools"])
                except json.JSONDecodeError:
                    created_agent["tools"] = []
            
            # Convert is_team_member to boolean if needed
            if "is_team_member" in created_agent:
                created_agent["isTeamMember"] = created_agent.pop("is_team_member")
            
            return created_agent
        except Exception as e:
            logger.error(f"Error creating agent: {e}")
            return None
    
    @staticmethod
    def update_agent(agent_id: str, agent: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing agent."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot update agent.")
                return None
            
            # Prepare agent data
            agent_data = {
                "name": agent["name"],
                "description": agent.get("description", ""),
                "instructions": agent["instructions"],
                "model": agent["model"],
                "framework": agent["framework"],
                "tools": json.dumps(agent.get("tools", [])),
                "is_team_member": agent.get("isTeamMember", False),
                "updated_at": "now()"
            }
            
            # Update agent
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/{AGENTS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{agent_id}"},
                json=agent_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error updating agent: {response.text}")
                return None
            
            # Parse response
            updated_agent = response.json()[0]
            
            # Convert tools from JSON string to Python object if needed
            if isinstance(updated_agent.get("tools"), str):
                try:
                    updated_agent["tools"] = json.loads(updated_agent["tools"])
                except json.JSONDecodeError:
                    updated_agent["tools"] = []
            
            # Convert is_team_member to boolean if needed
            if "is_team_member" in updated_agent:
                updated_agent["isTeamMember"] = updated_agent.pop("is_team_member")
            
            return updated_agent
        except Exception as e:
            logger.error(f"Error updating agent: {e}")
            return None
    
    @staticmethod
    def delete_agent(agent_id: str) -> bool:
        """Delete an agent."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot delete agent.")
                return False
            
            # Delete agent
            response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/{AGENTS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{agent_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error deleting agent: {response.text}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error deleting agent: {e}")
            return False
    
    @staticmethod
    def get_all_teams() -> List[Dict[str, Any]]:
        """Get all teams."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get teams.")
                return []
            
            # Get all teams
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{TEAMS_TABLE}",
                headers=AgentService._get_headers()
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting teams: {response.text}")
                return []
            
            # Parse response
            teams = response.json()
            
            # Convert agents from JSON string to Python object if needed
            for team in teams:
                if isinstance(team.get("agents"), str):
                    try:
                        team["agents"] = json.loads(team["agents"])
                    except json.JSONDecodeError:
                        team["agents"] = []
            
            return teams
        except Exception as e:
            logger.error(f"Error getting teams: {e}")
            return []
    
    @staticmethod
    def get_team(team_id: str) -> Optional[Dict[str, Any]]:
        """Get a team by ID."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot get team.")
                return None
            
            # Get team
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/{TEAMS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{team_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error getting team: {response.text}")
                return None
            
            # Parse response
            teams = response.json()
            
            if not teams:
                return None
            
            team = teams[0]
            
            # Convert agents from JSON string to Python object if needed
            if isinstance(team.get("agents"), str):
                try:
                    team["agents"] = json.loads(team["agents"])
                except json.JSONDecodeError:
                    team["agents"] = []
            
            return team
        except Exception as e:
            logger.error(f"Error getting team: {e}")
            return None
    
    @staticmethod
    def create_team(team: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new team."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot create team.")
                return None
            
            # Prepare team data
            team_data = {
                "id": team.get("id") or str(uuid.uuid4()),
                "name": team["name"],
                "agents": json.dumps(team.get("agents", []))
            }
            
            # Create team
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/{TEAMS_TABLE}",
                headers=AgentService._get_headers(),
                json=team_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error creating team: {response.text}")
                return None
            
            # Parse response
            created_team = response.json()[0]
            
            # Convert agents from JSON string to Python object if needed
            if isinstance(created_team.get("agents"), str):
                try:
                    created_team["agents"] = json.loads(created_team["agents"])
                except json.JSONDecodeError:
                    created_team["agents"] = []
            
            return created_team
        except Exception as e:
            logger.error(f"Error creating team: {e}")
            return None
    
    @staticmethod
    def update_team(team_id: str, team: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing team."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot update team.")
                return None
            
            # Prepare team data
            team_data = {
                "name": team["name"],
                "agents": json.dumps(team.get("agents", [])),
                "updated_at": "now()"
            }
            
            # Update team
            response = requests.patch(
                f"{SUPABASE_URL}/rest/v1/{TEAMS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{team_id}"},
                json=team_data
            )
            
            if response.status_code >= 400:
                logger.error(f"Error updating team: {response.text}")
                return None
            
            # Parse response
            updated_team = response.json()[0]
            
            # Convert agents from JSON string to Python object if needed
            if isinstance(updated_team.get("agents"), str):
                try:
                    updated_team["agents"] = json.loads(updated_team["agents"])
                except json.JSONDecodeError:
                    updated_team["agents"] = []
            
            return updated_team
        except Exception as e:
            logger.error(f"Error updating team: {e}")
            return None
    
    @staticmethod
    def delete_team(team_id: str) -> bool:
        """Delete a team."""
        try:
            import requests
            
            # Check if Supabase is configured
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.warning("Supabase not configured. Cannot delete team.")
                return False
            
            # Delete team
            response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/{TEAMS_TABLE}",
                headers=AgentService._get_headers(),
                params={"id": f"eq.{team_id}"}
            )
            
            if response.status_code >= 400:
                logger.error(f"Error deleting team: {response.text}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error deleting team: {e}")
            return False
