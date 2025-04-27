"""
Mock implementation of the LangGraph graph.
This module provides a mock graph that can be used when the real graph is not available.
"""

import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockGraph:
    """Mock implementation of a LangGraph graph."""
    
    def __init__(self, name: str = "mock-graph"):
        """Initialize the mock graph."""
        self.name = name
        logger.info(f"Created mock graph '{name}'")
    
    async def ainvoke(self, inputs: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Invoke the graph asynchronously."""
        logger.info(f"Invoking mock graph '{self.name}' with inputs: {inputs}")
        
        # Extract user message if available
        user_message = ""
        if "messages" in inputs:
            for message in reversed(inputs["messages"]):
                if message.get("role") == "user":
                    user_message = message.get("content", "")
                    break
        
        # Create a mock response
        response = f"This is a mock response from the LangGraph server. Your message: {user_message}"
        
        # Simulate processing time
        await asyncio.sleep(1)
        
        # Return a mock result
        return {
            "messages": inputs.get("messages", []) + [
                {
                    "role": "assistant",
                    "content": response
                }
            ],
            "conversation_id": "mock-conversation-id",
            "trace_id": "mock-trace-id"
        }
    
    async def astream_invoke(self, inputs: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream the graph invocation asynchronously."""
        logger.info(f"Stream invoking mock graph '{self.name}' with inputs: {inputs}")
        
        # Extract user message if available
        user_message = ""
        if "messages" in inputs:
            for message in reversed(inputs["messages"]):
                if message.get("role") == "user":
                    user_message = message.get("content", "")
                    break
        
        # Create a mock response
        response = f"This is a mock response from the LangGraph server. Your message: {user_message}"
        
        # Simulate processing time
        await asyncio.sleep(1)
        
        # Yield a mock result
        yield {
            "messages": inputs.get("messages", []) + [
                {
                    "role": "assistant",
                    "content": response
                }
            ],
            "conversation_id": "mock-conversation-id",
            "trace_id": "mock-trace-id"
        }

# Create a mock graph instance
graph = MockGraph(name="mcp-agent")
