# Docker Setup for KB-multi-agent

This document explains how to use Docker with the KB-multi-agent project.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Getting Started

### 1. Initialize the Docker Environment

Run the initialization script to set up the Docker environment:

```powershell
./scripts/docker/init-docker.ps1
```

This script will:
- Check if Docker is running
- Create a `.env` file if it doesn't exist
- Create a `docker-compose.override.yml` file for local development
- Build the Docker images

### 2. Start the Docker Environment

Start the Docker environment using the start script:

```powershell
# Start in attached mode (see logs in console)
./scripts/docker/start-docker.ps1

# Start in detached mode (run in background)
./scripts/docker/start-docker.ps1 -Detach

# Start with hot reloading (watch for changes)
./scripts/docker/start-docker.ps1 -Watch

# Rebuild images before starting
./scripts/docker/start-docker.ps1 -Build

# Start with a specific profile (e.g., postgres)
./scripts/docker/start-docker.ps1 -Profile postgres
```

### 3. Stop the Docker Environment

Stop the Docker environment using the stop script:

```powershell
# Stop the Docker environment
./scripts/docker/stop-docker.ps1

# Stop and remove volumes
./scripts/docker/stop-docker.ps1 -RemoveVolumes

# Stop and remove orphaned containers
./scripts/docker/stop-docker.ps1 -RemoveOrphans

# Set custom timeout (in seconds)
./scripts/docker/stop-docker.ps1 -Timeout 30
```

## Docker Compose Configuration

The Docker Compose configuration includes the following services:

- **frontend**: Next.js frontend application
- **backend**: Python/LangGraph backend application
- **redis**: Redis for caching and session management
- **postgres**: PostgreSQL database (optional, can be disabled if using Supabase)

## Development Workflow

### Hot Reloading

The Docker Compose configuration includes hot reloading for both the frontend and backend:

- **Frontend**: Changes to Next.js files will be automatically reflected in the browser
- **Backend**: Changes to Python files will be automatically reloaded

### Environment Variables

Environment variables are loaded from the `.env` file. You can modify this file to change the configuration.

### Database

The Docker Compose configuration includes a PostgreSQL database by default. If you prefer to use Supabase, you can set the `DATABASE_BACKEND` environment variable to `supabase` in the `.env` file.

## Troubleshooting

### Container Logs

View logs for a specific container:

```powershell
docker compose logs frontend
docker compose logs backend
docker compose logs redis
docker compose logs postgres
```

### Rebuilding Images

If you need to rebuild the Docker images:

```powershell
docker compose build
```

### Cleaning Up

Remove all containers, networks, and volumes:

```powershell
docker compose down -v
```

## Production Deployment

For production deployment, you should use the production targets in the Dockerfiles:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Note: You'll need to create a `docker-compose.prod.yml` file with production-specific settings.
