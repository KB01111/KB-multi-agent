# Check if Docker is running
if (-not (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Desktop is not running. Please start Docker Desktop and try again." -ForegroundColor Red
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
    
    # Add PostgreSQL configuration if using postgres
    if ($databaseBackend -eq "postgres") {
        @"
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=kb_multi_agent
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/kb_multi_agent
"@ | Add-Content -Path ".env" -Encoding utf8
    }
    # Add Supabase configuration if using supabase
    elseif ($databaseBackend -eq "supabase") {
        $supabaseUrl = Read-Host "Enter your Supabase URL"
        $supabaseServiceKey = Read-Host "Enter your Supabase service key"
        
        @"
# Supabase Configuration
SUPABASE_URL=$supabaseUrl
SUPABASE_SERVICE_KEY=$supabaseServiceKey
"@ | Add-Content -Path ".env" -Encoding utf8
    }
    
    # Add Logfire configuration
    $logfireToken = Read-Host "Enter your Logfire token (leave empty to disable)"
    @"
# Logfire Configuration
LOGFIRE_PROJECT=kb-multi-agent
LOGFIRE_TOKEN=$logfireToken
LOGGING_ENABLED=$(if ($logfireToken) { "true" } else { "false" })

# Redis Configuration
REDIS_ENABLED=true
REDIS_URL=redis://redis:6379/0

# Node Environment (for Next.js)
NODE_ENV=development
"@ | Add-Content -Path ".env" -Encoding utf8
    
    Write-Host ".env file created successfully." -ForegroundColor Green
}
else {
    Write-Host ".env file already exists." -ForegroundColor Yellow
    
    # Check for required environment variables
    $envContent = Get-Content -Path ".env" -Raw
    $missingVars = @()
    
    if (-not ($envContent -match "OPENAI_API_KEY=.+")) {
        $missingVars += "OPENAI_API_KEY"
    }
    if (-not ($envContent -match "COPILOT_CLOUD_API_KEY=.+")) {
        $missingVars += "COPILOT_CLOUD_API_KEY"
    }
    if (-not ($envContent -match "NODE_ENV=.+")) {
        $missingVars += "NODE_ENV"
        # Add NODE_ENV if missing
        "# Node Environment (for Next.js)`nNODE_ENV=development" | Add-Content -Path ".env" -Encoding utf8
        Write-Host "Added NODE_ENV=development to .env file." -ForegroundColor Green
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "The following required environment variables are missing or empty:" -ForegroundColor Yellow
        $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        Write-Host "Please update your .env file with these variables." -ForegroundColor Yellow
    }
}

# Create frontend/.env file if it doesn't exist
if (-not (Test-Path "frontend/.env")) {
    Write-Host "Creating frontend/.env file..." -ForegroundColor Yellow
    
    # Get values from main .env file
    $envContent = Get-Content -Path ".env" -Raw
    $copilotCloudApiKey = if ($envContent -match "COPILOT_CLOUD_API_KEY=(.+)") { $matches[1] } else { "your-copilot-cloud-api-key" }
    
    @"
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=$copilotCloudApiKey
NEXT_PUBLIC_BACKEND_URL=http://localhost:8124

# Node Environment
NODE_ENV=development
"@ | Out-File -FilePath "frontend/.env" -Encoding utf8
    
    Write-Host "frontend/.env file created successfully." -ForegroundColor Green
}
else {
    Write-Host "frontend/.env file already exists." -ForegroundColor Yellow
    
    # Check for required environment variables
    $envContent = Get-Content -Path "frontend/.env" -Raw
    $missingVars = @()
    
    if (-not ($envContent -match "NEXT_PUBLIC_BACKEND_URL=.+")) {
        $missingVars += "NEXT_PUBLIC_BACKEND_URL"
    }
    if (-not ($envContent -match "NODE_ENV=.+")) {
        $missingVars += "NODE_ENV"
        # Add NODE_ENV if missing
        "# Node Environment`nNODE_ENV=development" | Add-Content -Path "frontend/.env" -Encoding utf8
        Write-Host "Added NODE_ENV=development to frontend/.env file." -ForegroundColor Green
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "The following required environment variables are missing or empty in frontend/.env:" -ForegroundColor Yellow
        $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        Write-Host "Please update your frontend/.env file with these variables." -ForegroundColor Yellow
    }
}

# Create docker-compose.override.yml if it doesn't exist
if (-not (Test-Path "docker-compose.override.yml")) {
    Write-Host "Creating docker-compose.override.yml file..." -ForegroundColor Yellow
    
    @"
# Development overrides for docker-compose.yml

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

Write-Host "Environment setup completed successfully." -ForegroundColor Green
