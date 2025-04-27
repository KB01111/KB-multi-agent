# PowerShell script to install missing backend dependencies
Write-Host "Installing missing backend dependencies..." -ForegroundColor Cyan

# Change to the agent directory
Set-Location -Path "agent"

# Install mem0
Write-Host "Installing mem0..." -ForegroundColor Yellow
poetry add mem0ai

# Install litellm
Write-Host "Installing litellm..." -ForegroundColor Yellow
poetry add litellm

# Install logfire
Write-Host "Installing logfire..." -ForegroundColor Yellow
poetry add logfire

# Install Supabase
Write-Host "Installing Supabase..." -ForegroundColor Yellow
poetry add supabase

# Update dependencies to resolve conflicts
Write-Host "Updating dependencies..." -ForegroundColor Yellow
poetry update

Write-Host "Missing backend dependencies installed!" -ForegroundColor Green
