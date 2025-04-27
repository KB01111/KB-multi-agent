"""
Mock implementation of the OpenAI Agents SDK.
This module provides mock classes and functions to simulate the OpenAI Agents SDK.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelSettings:
    """Mock ModelSettings class."""
    
    def __init__(self, model: str = "gpt-4o", use_litellm: bool = False, **kwargs):
        """Initialize the model settings."""
        self.model = model
        self.use_litellm = use_litellm
        self.kwargs = kwargs

class AgentResult:
    """Mock AgentResult class."""
    
    def __init__(self, final_output: str, new_messages: List[Dict[str, Any]], conversation_id: Optional[str] = None, trace_id: Optional[str] = None):
        """Initialize the agent result."""
        self.final_output = final_output
        self.new_messages = new_messages
        self.conversation_id = conversation_id
        self.trace_id = trace_id

class Agent:
    """Mock Agent class."""
    
    def __init__(self, name: str, instructions: str, tools: List[Any] = None, model: Union[str, ModelSettings] = "gpt-4o", trace: bool = False, **kwargs):
        """Initialize the agent."""
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        
        # Handle model parameter
        if isinstance(model, str):
            self.model_settings = ModelSettings(model=model)
        else:
            self.model_settings = model
            
        self.trace = trace
        self.kwargs = kwargs
        
        logger.info(f"Created mock Agent '{name}' with model {self.model_settings.model}")

class Runner:
    """Mock Runner class."""
    
    @staticmethod
    async def run(agent: Agent, input_message: str, **kwargs) -> AgentResult:
        """Run the agent with the given input message."""
        logger.info(f"Running mock Agent '{agent.name}' with input: {input_message[:50]}...")
        
        # Simulate processing time
        await asyncio.sleep(1)
        
        # Create a mock response
        response = f"This is a mock response from {agent.name}. The OpenAI Agents SDK is not available."
        
        # Create new messages
        new_messages = [
            {
                "role": "user",
                "content": input_message
            },
            {
                "role": "assistant",
                "content": response
            }
        ]
        
        # Create a mock result
        result = AgentResult(
            final_output=response,
            new_messages=new_messages,
            conversation_id="mock-conversation-id",
            trace_id="mock-trace-id"
        )
        
        logger.info(f"Mock Agent '{agent.name}' processing complete")
        return result
    
    @staticmethod
    def run_sync(agent: Agent, input_message: str, **kwargs) -> AgentResult:
        """Run the agent synchronously with the given input message."""
        logger.info(f"Running mock Agent '{agent.name}' synchronously with input: {input_message[:50]}...")
        
        # Create a mock response
        response = f"This is a mock response from {agent.name}. The OpenAI Agents SDK is not available."
        
        # Create new messages
        new_messages = [
            {
                "role": "user",
                "content": input_message
            },
            {
                "role": "assistant",
                "content": response
            }
        ]
        
        # Create a mock result
        result = AgentResult(
            final_output=response,
            new_messages=new_messages,
            conversation_id="mock-conversation-id",
            trace_id="mock-trace-id"
        )
        
        logger.info(f"Mock Agent '{agent.name}' processing complete")
        return result

class ParallelRunner:
    """Mock ParallelRunner class."""
    
    @staticmethod
    async def run(agent: Agent, input_message: str, **kwargs) -> AgentResult:
        """Run the agent in parallel with the given input message."""
        logger.info(f"Running mock ParallelRunner with Agent '{agent.name}' and input: {input_message[:50]}...")
        
        # Simulate processing time
        await asyncio.sleep(1)
        
        # Create a mock response
        response = f"This is a mock parallel response from {agent.name}. The OpenAI Agents SDK is not available."
        
        # Create new messages
        new_messages = [
            {
                "role": "user",
                "content": input_message
            },
            {
                "role": "assistant",
                "content": response
            }
        ]
        
        # Create a mock result
        result = AgentResult(
            final_output=response,
            new_messages=new_messages,
            conversation_id="mock-parallel-conversation-id",
            trace_id="mock-parallel-trace-id"
        )
        
        logger.info(f"Mock ParallelRunner with Agent '{agent.name}' processing complete")
        return result
