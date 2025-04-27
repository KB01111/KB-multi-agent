# PowerShell script to initialize the Docker environment

# Set error action preference to stop on error
$ErrorActionPreference = "Stop"

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "Docker is running." -ForegroundColor Green
}
catch {
    Write-Host "Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    # Prompt for environment variables
    $openaiApiKey = Read-Host "Enter your OpenAI API key"
    $copilotCloudApiKey = Read-Host "Enter your Copilot Cloud API key"
    $databaseBackend = Read-Host "Enter database backend (postgres or supabase) [postgres]"
    if (-not $databaseBackend) { $databaseBackend = "postgres" }
    
    # Create .env file
    @"
# OpenAI API Key
OPENAI_API_KEY=$openaiApiKey

# Copilot Cloud API Key
COPILOT_CLOUD_API_KEY=$copilotCloudApiKey

# Framework Configuration
FRAMEWORK=hybrid
DEFAULT_MODEL=gpt-4o

# Database Configuration
DATABASE_BACKEND=$databaseBackend
"@ | Out-File -FilePath ".env" -Encoding utf8
    
    # Add database-specific environment variables
    if ($databaseBackend -eq "postgres") {
        @"
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=kb_multi_agent
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/kb_multi_agent
"@ | Out-File -FilePath ".env" -Encoding utf8 -Append
    }
    elseif ($databaseBackend -eq "supabase") {
        $supabaseUrl = Read-Host "Enter your Supabase URL"
        $supabaseServiceKey = Read-Host "Enter your Supabase service key"
        
        @"
# Supabase Configuration
SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_KEY=$supabaseServiceKey
"@ | Out-File -FilePath ".env" -Encoding utf8 -Append
    }
    
    Write-Host ".env file created successfully." -ForegroundColor Green
}
else {
    Write-Host ".env file already exists." -ForegroundColor Yellow
}

# Create docker-compose.override.yml for local development if it doesn't exist
if (-not (Test-Path "docker-compose.override.yml")) {
    Write-Host "Creating docker-compose.override.yml file..." -ForegroundColor Yellow
    
    @"
version: '3.8'

services:
  # Override frontend service for development
  frontend:
    build:
      target: development
    command: pnpm run dev
    environment:
      - NODE_ENV=development

  # Override backend service for development
  backend:
    build:
      target: development
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1
"@ | Out-File -FilePath "docker-compose.override.yml" -Encoding utf8
    
    Write-Host "docker-compose.override.yml file created successfully." -ForegroundColor Green
}
else {
    Write-Host "docker-compose.override.yml file already exists." -ForegroundColor Yellow
}

# Build Docker images
Write-Host "Building Docker images..." -ForegroundColor Cyan
docker compose build

Write-Host "Docker environment initialized successfully." -ForegroundColor Green
Write-Host "You can now start the Docker environment with: ./scripts/docker/start-docker.ps1" -ForegroundColor Cyan
