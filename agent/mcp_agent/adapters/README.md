# OpenAI Agents SDK Integration

This directory contains adapters for integrating different agent frameworks with our Multi-Agent Canvas application.

## OpenAI Agents SDK Adapter

The `openai_agents_sdk.py` file provides a complete adapter for the OpenAI Agents SDK, allowing you to create and manage agents using OpenAI's official SDK.

### Features

- **Full SDK Integration**: Seamlessly integrates with the OpenAI Agents SDK
- **Tool Conversion**: Converts between LangChain tools and OpenAI Agents SDK tools
- **Team Support**: Create and manage teams of agents with different workflow types
- **Advanced Features**: Support for tracing, voice, parallel execution, and LiteLLM

### Usage

```python
from mcp_agent.agent_factory import AgentFactory
from mcp_agent.adapters.openai_agents_sdk import OpenAIAgentsSDKAdapter

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

# Create a team of agents
team_workflow = factory.create_openai_agents_sdk_team(
    agents=[agent1, agent2, agent3],
    workflow_type="sequential"  # or "parallel" or "custom"
)

# Run the team workflow
result = await team_workflow("Hello, team!")
```

### Requirements

To use the OpenAI Agents SDK adapter, you need to install the following dependencies:

```bash
pip install openai-agents litellm
```

### Configuration

The adapter supports the following configuration options:

- **name**: The name of the agent
- **instructions**: The instructions for the agent
- **tools**: The tools available to the agent
- **model**: The model to use (default: "gpt-4o")
- **enable_tracing**: Whether to enable tracing (default: False)
- **enable_voice**: Whether to enable voice capabilities (default: False)
- **enable_parallel**: Whether to enable parallel execution (default: False)
- **enable_litellm**: Whether to enable LiteLLM integration (default: True)

### Team Workflows

The adapter supports three types of team workflows:

1. **Sequential**: Agents work one after another in order
2. **Parallel**: Agents work simultaneously on tasks
3. **Custom**: Define your own workflow logic

## Frontend Integration

The OpenAI Agents SDK is fully integrated with the frontend, allowing you to:

- Create and manage agents with OpenAI Agents SDK features
- Create and manage teams of agents
- Export agents and teams to OpenAI Agents SDK code (Python and JavaScript)

## API Endpoints

The following API endpoints are available for OpenAI Agents SDK integration:

- `POST /api/agents`: Create a new agent
- `GET /api/agents/{agent_id}`: Get an agent by ID
- `DELETE /api/agents/{agent_id}`: Delete an agent by ID
- `POST /api/agents/{agent_id}/message`: Send a message to an agent
- `GET /api/agents/teams`: List all teams
- `POST /api/agents/teams`: Create a new team
- `GET /api/agents/teams/{team_id}`: Get a team by ID
- `PUT /api/agents/teams/{team_id}`: Update a team by ID
- `DELETE /api/agents/teams/{team_id}`: Delete a team by ID
- `POST /api/agents/teams/{team_id}/message`: Send a message to a team
