# Redis Integration for KB-multi-agent

This document provides information about the Redis integration in the KB-multi-agent application.

## Overview

Redis is used in the KB-multi-agent application for:

1. **LLM Response Caching**: Caching responses from language models to improve performance and reduce API costs
2. **Session Management**: Storing and retrieving session data
3. **Rate Limiting**: Implementing rate limiting for API endpoints
4. **Pub/Sub**: Real-time communication between components

## Configuration

Redis is configured through environment variables:

```
# Redis Configuration
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379/0
```

- `REDIS_ENABLED`: Whether Redis integration is enabled (default: true)
- `REDIS_URL`: The Redis connection URL (default: redis://localhost:6379/0)

## Installation

To use Redis with KB-multi-agent, you need to install the Redis Python package:

```bash
pip install redis
```

Or if you're using Poetry:

```bash
poetry add redis
```

## Running Redis

### Option 1: Docker

The easiest way to run Redis is using Docker:

```bash
docker run --name kb-redis -p 6379:6379 -d redis
```

### Option 2: Redis Server

You can also install and run Redis directly:

#### Windows

1. Download and install Redis for Windows from [https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
2. Run Redis server: `redis-server`

#### Linux/macOS

1. Install Redis using your package manager:
   - Ubuntu/Debian: `sudo apt-get install redis-server`
   - macOS: `brew install redis`
2. Start Redis: `redis-server`

## Usage in the Application

The Redis integration is used in several components:

### 1. LiteLLM Integration

Redis is used to cache LLM responses in the LiteLLM integration:

```python
# Check cache if enabled
if self.cache_enabled and not skip_cache and last_user_message:
    cached_response = self.redis_manager.get_cached_llm_response(last_user_message, model)
    if cached_response:
        logger.info(f"Cache hit for model {model}")
        return cached_response
```

### 2. OpenAI Agents SDK Integration

Redis is used to cache responses from OpenAI Agents:

```python
# Check cache if enabled
if self.cache_enabled and self.redis_manager:
    cached_response = self.redis_manager.get_cached_llm_response(user_message, self.model)
    if cached_response:
        logger.info(f"Cache hit for model {self.model}")
        # Use cached response
```

### 3. Rate Limiting

Redis is used for rate limiting API endpoints:

```python
# Check if rate limit exceeded
if not redis_manager.rate_limit(key, limit, period):
    raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

## Benefits

Using Redis in the KB-multi-agent application provides several benefits:

1. **Improved Performance**: Caching LLM responses reduces latency and improves user experience
2. **Reduced API Costs**: Reusing cached responses reduces the number of API calls to external services
3. **Scalability**: Redis enables the application to scale horizontally by sharing state between instances
4. **Reliability**: Redis provides persistent storage for session data and other important information

## Troubleshooting

If you encounter issues with the Redis integration:

1. **Connection Issues**: Ensure Redis is running and accessible at the configured URL
2. **Missing Package**: Ensure the Redis Python package is installed
3. **Disabled Integration**: Check that `REDIS_ENABLED` is set to `true` in the environment variables

## Monitoring

You can monitor Redis using the Redis CLI:

```bash
redis-cli
```

Common monitoring commands:

- `INFO`: Get information about the Redis server
- `MONITOR`: Watch all commands processed by Redis
- `CLIENT LIST`: List all connected clients
- `MEMORY USAGE`: Check memory usage of a key
