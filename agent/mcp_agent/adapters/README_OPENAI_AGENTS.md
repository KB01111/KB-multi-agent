# Enhanced OpenAI Agents SDK Integration

This document provides information about the enhanced OpenAI Agents SDK integration in the KB-multi-agent application.

## Overview

The OpenAI Agents SDK integration provides a comprehensive adapter for using OpenAI's official Agents SDK with the KB-multi-agent application. This integration enables advanced features such as:

1. **Full SDK Integration**: Seamless integration with the OpenAI Agents SDK
2. **Tool Conversion**: Bidirectional conversion between LangChain tools and OpenAI Agents SDK tools
3. **Team Support**: Creation and management of agent teams with different workflow types
4. **Advanced Features**: Support for tracing, voice, parallel execution, and LiteLLM
5. **Redis Caching**: Efficient caching of LLM responses for improved performance and reduced costs

## Installation

To use the OpenAI Agents SDK integration, you need to install the OpenAI Agents package:

```bash
pip install openai-agents
```

Or if you're using Poetry:

```bash
poetry add openai-agents
```

## Configuration

The OpenAI Agents SDK integration is configured through environment variables:

```
# OpenAI API Key
OPENAI_API_KEY=<YOUR OPENAI KEY>

# Framework Configuration
FRAMEWORK=openai_agents
DEFAULT_MODEL=gpt-4o

# Redis Configuration (for caching)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379/0
```

## Usage

### Creating an Agent

You can create an OpenAI Agents SDK agent using the AgentFactory:

```python
from mcp_agent.agent_factory import AgentFactory

# Create an agent factory
factory = AgentFactory()

# Create an OpenAI Agents SDK agent
agent = factory.create_openai_agents_sdk_agent(
    name="My Agent",
    instructions="You are a helpful assistant.",
    model="gpt-4o",
    enable_tracing=True,
    enable_voice=False,
    enable_parallel=True,
    enable_litellm=True
)

# Process a message
result = await agent.process({
    "messages": [
        {
            "role": "user",
            "content": "Hello, how can you help me?"
        }
    ]
})
```

### Creating a Team

You can create a team of OpenAI Agents SDK agents:

```python
# Create multiple agents
agent1 = factory.create_openai_agents_sdk_agent(name="Agent 1", instructions="...")
agent2 = factory.create_openai_agents_sdk_agent(name="Agent 2", instructions="...")
agent3 = factory.create_openai_agents_sdk_agent(name="Agent 3", instructions="...")

# Create a team with sequential workflow
team_workflow = factory.create_openai_agents_sdk_team(
    agents=[agent1, agent2, agent3],
    workflow_type="sequential"  # or "parallel" or "custom"
)

# Run the team workflow
result = await team_workflow("Hello, team!")
```

### Using Tools

You can provide tools to your agents:

```python
from agents import function_tool

@function_tool
def get_weather(city: str) -> str:
    """Get the weather for a given city."""
    # Implementation here
    return f"The weather in {city} is sunny."

# Create an agent with tools
agent = factory.create_openai_agents_sdk_agent(
    name="Weather Agent",
    instructions="You help with weather information.",
    tools=[get_weather],
    model="gpt-4o"
)
```

### Converting LangChain Tools

You can convert LangChain tools to OpenAI Agents SDK tools:

```python
from langchain.tools import Tool as LangChainTool
from mcp_agent.adapters.openai_agents_sdk import adapt_langchain_tool_to_openai_agents

# Create a LangChain tool
langchain_tool = LangChainTool(
    name="calculator",
    description="Useful for performing calculations",
    func=lambda x: eval(x)
)

# Convert to OpenAI Agents SDK tool
openai_tool = adapt_langchain_tool_to_openai_agents(langchain_tool)

# Use the converted tool
agent = factory.create_openai_agents_sdk_agent(
    name="Calculator Agent",
    instructions="You help with calculations.",
    tools=[openai_tool],
    model="gpt-4o"
)
```

## Advanced Features

### Tracing

The OpenAI Agents SDK integration supports tracing for monitoring and debugging:

```python
# Enable tracing
agent = factory.create_openai_agents_sdk_agent(
    name="My Agent",
    instructions="You are a helpful assistant.",
    enable_tracing=True
)
```

### Voice

The integration supports voice capabilities:

```python
# Enable voice
agent = factory.create_openai_agents_sdk_agent(
    name="Voice Agent",
    instructions="You are a voice assistant.",
    enable_voice=True
)

# Process voice input
result = await agent.process_voice(audio_input)
```

### Parallel Execution

The integration supports parallel execution of agents:

```python
# Enable parallel execution
agent = factory.create_openai_agents_sdk_agent(
    name="Parallel Agent",
    instructions="You work in parallel.",
    enable_parallel=True
)
```

### LiteLLM Integration

The integration supports LiteLLM for unified access to various LLM providers:

```python
# Enable LiteLLM
agent = factory.create_openai_agents_sdk_agent(
    name="LiteLLM Agent",
    instructions="You use LiteLLM.",
    enable_litellm=True,
    model="anthropic/claude-3-opus-20240229"  # Use any model supported by LiteLLM
)
```

### Redis Caching

The integration supports Redis caching for improved performance:

```python
# Redis caching is enabled automatically if Redis is available
# and REDIS_ENABLED is set to true
```

## Benefits

Using the enhanced OpenAI Agents SDK integration provides several benefits:

1. **Advanced Capabilities**: Access to the latest OpenAI Agents SDK features
2. **Flexibility**: Support for various models, tools, and workflows
3. **Performance**: Efficient caching and parallel execution
4. **Interoperability**: Seamless conversion between LangChain and OpenAI Agents SDK tools

## Troubleshooting

If you encounter issues with the OpenAI Agents SDK integration:

1. **Missing Package**: Ensure the OpenAI Agents package is installed
2. **API Key**: Ensure the OPENAI_API_KEY environment variable is set correctly
3. **Model Availability**: Ensure you have access to the specified model
4. **Redis Connection**: If using caching, ensure Redis is running and accessible
