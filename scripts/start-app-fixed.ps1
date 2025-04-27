# Script to start the application with all fixes applied

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

# Parse command line arguments
param (
    [switch]$Docker,
    [switch]$Rebuild,
    [switch]$SkipFixes
)

# Apply fixes if not skipped
if (-not $SkipFixes) {
    # Fix environment variables
    Write-Host "Setting up environment variables..." -ForegroundColor Yellow
    & "$PSScriptRoot\docker\fix-env.ps1"
    
    # Fix OpenAI Agents version
    Write-Host "Fixing OpenAI Agents version..." -ForegroundColor Yellow
    & "$PSScriptRoot\fix-openai-agents.ps1"
}

# Start the application
if ($Docker) {
    # Start with Docker
    Write-Host "Starting the application with Docker..." -ForegroundColor Yellow
    
    if ($Rebuild) {
        & "$PSScriptRoot\docker\start-docker.ps1" -Build
    } else {
        & "$PSScriptRoot\docker\start-docker.ps1"
    }
} else {
    # Start without Docker
    Write-Host "Starting the application without Docker..." -ForegroundColor Yellow
    
    # Check if the start-app.ps1 script exists
    if (Test-Path "$PSScriptRoot\start-app.ps1") {
        & "$PSScriptRoot\start-app.ps1"
    } else {
        Write-Host "Error: start-app.ps1 script not found." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Application started successfully!" -ForegroundColor Green
