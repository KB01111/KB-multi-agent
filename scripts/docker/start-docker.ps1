# PowerShell script to start the Docker environment

# Parse command line arguments
param (
    [switch]$Build,
    [switch]$Detach,
    [string]$ProfileName = "",
    [switch]$Watch
)

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

# Run the environment setup script
Write-Host "Setting up environment variables..." -ForegroundColor Yellow
& "$PSScriptRoot\fix-env.ps1"

# Load environment variables from .env file if it exists
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "Set $key environment variable" -ForegroundColor Gray
        }
    }
}

# Build the command
$command = "docker compose"

# Add profile if specified
if ($ProfileName) {
    $command += " --profile $ProfileName"
}

# Add up command
$command += " up"

# Add build flag if specified
if ($Build) {
    $command += " --build"
}

# Add detach flag if specified
if ($Detach) {
    $command += " -d"
}

# Add watch flag if specified
if ($Watch) {
    $command += " --watch"
}

# Execute the command
Write-Host "Starting Docker environment with command: $command" -ForegroundColor Cyan
Invoke-Expression $command

# If detached, show running containers
if ($Detach) {
    Write-Host "Docker environment started in detached mode." -ForegroundColor Green
    Write-Host "Running containers:" -ForegroundColor Cyan
    docker compose ps
}
