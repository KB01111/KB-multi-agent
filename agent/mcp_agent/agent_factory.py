# Dynamic Agent Factory with modular backends
import os
import logging
from typing import Optional, Dict, Any, Union, Literal, List
from mcp_agent.integrations.mem0_integration import Mem0MemoryManager
from mcp_agent.integrations.memorysaver_manager import MemorySaverManager
from mcp_agent.integrations.litellm_integration import LiteLLMWrapper
from mcp_agent.integrations.a2a_integration import A2ACommunicator
from mcp_agent.integrations.graphiti_integration import GraphitiKnowledgeSource
from mcp_agent.integrations.logfire_integration import LogfireLogger

# Import Redis integration
try:
    from mcp_agent.integrations.redis_integration import RedisManager, REDIS_AVAILABLE
except ImportError:
    REDIS_AVAILABLE = False

from mcp_agent.integrations.base_memory import BaseMemoryManager

# Import OpenAI Agents SDK adapter
try:
    from mcp_agent.adapters.openai_agents_sdk import OpenAIAgentsSDKAdapter
    openai_agents_sdk_available = True
except ImportError:
    openai_agents_sdk_available = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentFactory:
    """
    Factory for creating agents with modular, configurable backends.
    Reads config/env to select memory, LLM, A2A, and knowledge backends.
    """
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._load_config_from_env()
        self.memory_backend = self.config.get("MEMORY_BACKEND", "memorysaver").lower()
        self.llm_backend = self.config.get("LLM_BACKEND", "litellm").lower()
        self.a2a_backend = self.config.get("A2A_BACKEND", "inmemory").lower()
        self.knowledge_backend = self.config.get("KNOWLEDGE_BACKEND", "graphiti").lower()
        self.logging_enabled = self.config.get("LOGGING_ENABLED", "true").lower() == "true"
        self.logfire_project = self.config.get("LOGFIRE_PROJECT", "kb-multi-agent")
        self.redis_enabled = self.config.get("REDIS_ENABLED", "true").lower() == "true"
        self.redis_url = self.config.get("REDIS_URL", "redis://localhost:6379/0")

        # Initialize logger
        self.logger = self._initialize_logger()

        # Initialize Redis manager if enabled
        self.redis_manager = self._initialize_redis() if self.redis_enabled and REDIS_AVAILABLE else None

    def _load_config_from_env(self) -> Dict[str, Any]:
        """Load backend config from environment variables."""
        return {
            "MEMORY_BACKEND": os.getenv("MEMORY_BACKEND", "memorysaver"),
            "LLM_BACKEND": os.getenv("LLM_BACKEND", "litellm"),
            "A2A_BACKEND": os.getenv("A2A_BACKEND", "inmemory"),
            "KNOWLEDGE_BACKEND": os.getenv("KNOWLEDGE_BACKEND", "graphiti"),
            "DATABASE_BACKEND": os.getenv("DATABASE_BACKEND", "postgres"),
            "LOGGING_ENABLED": os.getenv("LOGGING_ENABLED", "true"),
            "LOGFIRE_PROJECT": os.getenv("LOGFIRE_PROJECT", "kb-multi-agent"),
            "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
            "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY", ""),
            "REDIS_ENABLED": os.getenv("REDIS_ENABLED", "true"),
            "REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        }

    def _initialize_logger(self) -> LogfireLogger:
        """Initialize the Logfire logger."""
        try:
            return LogfireLogger(
                project_name=self.logfire_project,
                enabled=self.logging_enabled
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Logfire logger: {e}")
            # Return a disabled logger as fallback
            return LogfireLogger(enabled=False)

    def get_memory_manager(self) -> BaseMemoryManager:
        if self.memory_backend == "mem0":
            return Mem0MemoryManager()
        elif self.memory_backend == "memorysaver":
            return MemorySaverManager()
        else:
            raise ValueError(f"Unknown memory backend: {self.memory_backend}")

    def get_llm_client(self) -> LiteLLMWrapper:
        # Only LiteLLM implemented for now
        if self.llm_backend == "litellm":
            # Pass Redis manager for caching if available
            return LiteLLMWrapper(redis_manager=self.redis_manager)
        else:
            raise ValueError(f"Unknown LLM backend: {self.llm_backend}")

    def get_a2a_communicator(self) -> A2ACommunicator:
        # Only in-memory implemented for now
        if self.a2a_backend == "inmemory":
            return A2ACommunicator()
        else:
            raise ValueError(f"Unknown A2A backend: {self.a2a_backend}")

    def get_knowledge_source(self):
        """Get the configured knowledge source based on KNOWLEDGE_BACKEND setting"""
        if self.knowledge_backend == "graphiti":
            return GraphitiKnowledgeSource()
        else:
            return None

    def _initialize_redis(self) -> Optional[RedisManager]:
        """Initialize Redis manager."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis package not installed. Redis features will be unavailable.")
            return None

        try:
            redis_manager = RedisManager(redis_url=self.redis_url)
            if redis_manager.enabled:
                logger.info(f"Redis integration initialized with URL: {self.redis_url}")
                return redis_manager
            else:
                logger.warning("Redis integration disabled due to connection issues.")
                return None
        except Exception as e:
            logger.warning(f"Failed to initialize Redis: {e}")
            return None

    def get_redis_manager(self) -> Optional[RedisManager]:
        """Get the Redis manager."""
        return self.redis_manager

    def get_logger(self) -> LogfireLogger:
        """Get the configured logger"""
        return self.logger

    def create_agent(self, agent_class, **kwargs):
        """
        Instantiate an agent with the selected backends injected.
        agent_class: the class of the agent to instantiate.
        kwargs: any additional arguments for the agent.
        """
        memory = self.get_memory_manager()
        llm = self.get_llm_client()
        a2a = self.get_a2a_communicator()
        knowledge = self.get_knowledge_source()
        logger = self.get_logger()
        redis = self.get_redis_manager()

        # Log agent creation
        agent_id = kwargs.get("agent_id", "unknown")
        logger.log_event("agent_created", {
            "agent_id": agent_id,
            "agent_class": agent_class.__name__,
            "memory_backend": self.memory_backend,
            "llm_backend": self.llm_backend,
            "a2a_backend": self.a2a_backend,
            "knowledge_backend": self.knowledge_backend,
            "redis_enabled": redis is not None
        })

        return agent_class(
            memory=memory,
            llm=llm,
            a2a=a2a,
            knowledge=knowledge,
            logger=logger,
            redis=redis,
            **kwargs
        )

    def create_openai_agents_sdk_agent(
        self,
        name: str,
        instructions: str,
        tools: List[Any] = None,
        model: str = "gpt-4o",
        enable_tracing: bool = False,
        enable_voice: bool = False,
        enable_parallel: bool = False,
        enable_litellm: bool = True
    ) -> Any:
        """
        Create an agent using the OpenAI Agents SDK.

        Args:
            name: The name of the agent
            instructions: The instructions for the agent
            tools: The tools available to the agent
            model: The model to use
            enable_tracing: Whether to enable tracing
            enable_voice: Whether to enable voice capabilities
            enable_parallel: Whether to enable parallel execution
            enable_litellm: Whether to enable LiteLLM integration

        Returns:
            An OpenAI Agents SDK adapter
        """
        if not openai_agents_sdk_available:
            logger.error("OpenAI Agents SDK adapter not available. Cannot create agent.")
            return None

        # Get the logger
        logger = self.get_logger()

        # Log agent creation
        logger.log_event("openai_agents_sdk_agent_created", {
            "name": name,
            "model": model,
            "enable_tracing": enable_tracing,
            "enable_voice": enable_voice,
            "enable_parallel": enable_parallel,
            "enable_litellm": enable_litellm,
            "tools_count": len(tools) if tools else 0
        })

        # Get Redis manager
        redis = self.get_redis_manager()

        # Create the OpenAI Agents SDK adapter
        return OpenAIAgentsSDKAdapter(
            name=name,
            instructions=instructions,
            tools=tools,
            model=model,
            enable_tracing=enable_tracing,
            enable_voice=enable_voice,
            enable_parallel=enable_parallel,
            enable_litellm=enable_litellm,
            redis_manager=redis
        )

    def create_openai_agents_sdk_team(
        self,
        agents: List[Any],
        workflow_type: str = "sequential"
    ) -> Any:
        """
        Create a team of OpenAI Agents SDK agents.

        Args:
            agents: The agents to include in the team
            workflow_type: The type of workflow to use (sequential, parallel, or custom)

        Returns:
            A function that can be used to run the team
        """
        if not openai_agents_sdk_available:
            logger.error("OpenAI Agents SDK adapter not available. Cannot create team.")
            return None

        # Get the logger
        logger = self.get_logger()

        # Log team creation
        logger.log_event("openai_agents_sdk_team_created", {
            "agents_count": len(agents),
            "workflow_type": workflow_type
        })

        # Import the team creation function
        try:
            from mcp_agent.adapters.openai_agents_sdk import create_openai_agents_team
            return create_openai_agents_team(agents, workflow_type)
        except ImportError:
            logger.error("OpenAI Agents SDK team creation function not available.")
            return None

# Example usage:
# factory = AgentFactory()
# my_agent = factory.create_agent(MyAgentClass, agent_id="agent-123")