# PowerShell script to stop the Docker environment

# Set error action preference to stop on error
$ErrorActionPreference = "Stop"

# Parse command line arguments
param (
    [switch]$RemoveVolumes,
    [switch]$RemoveOrphans,
    [int]$Timeout = 10
)

# Build the command
$command = "docker compose down"

# Add remove volumes flag if specified
if ($RemoveVolumes) {
    $command += " -v"
}

# Add remove orphans flag if specified
if ($RemoveOrphans) {
    $command += " --remove-orphans"
}

# Add timeout flag
$command += " -t $Timeout"

# Execute the command
Write-Host "Stopping Docker environment with command: $command" -ForegroundColor Cyan
Invoke-Expression $command

Write-Host "Docker environment stopped." -ForegroundColor Green
