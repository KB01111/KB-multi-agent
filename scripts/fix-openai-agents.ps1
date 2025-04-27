# Script to fix OpenAI Agents version issue

Write-Host "Fixing OpenAI Agents version issue..." -ForegroundColor Yellow

# Check if pyproject.toml exists
if (-not (Test-Path "agent/pyproject.toml")) {
    Write-Host "Error: agent/pyproject.toml not found." -ForegroundColor Red
    exit 1
}

# Read the pyproject.toml file
$pyprojectContent = Get-Content -Path "agent/pyproject.toml" -Raw

# Update the openai-agents version in [project] dependencies
$updatedContent = $pyprojectContent -replace 'openai-agents>=0.0.13,<0.1.0', 'openai-agents>=0.0.13'

# Update the openai-agents version in [tool.poetry.dependencies]
$updatedContent = $updatedContent -replace 'openai-agents = ">=0.0.13,<0.1.0"', 'openai-agents = ">=0.0.13"'

# Write the updated content back to the file
$updatedContent | Set-Content -Path "agent/pyproject.toml" -Encoding utf8

Write-Host "Updated openai-agents version in pyproject.toml." -ForegroundColor Green

# Check if poetry.lock exists
if (Test-Path "agent/poetry.lock") {
    Write-Host "Removing poetry.lock to force dependency update..." -ForegroundColor Yellow
    Remove-Item -Path "agent/poetry.lock" -Force
    Write-Host "poetry.lock removed." -ForegroundColor Green
}

Write-Host "OpenAI Agents version issue fixed. Please rebuild the Docker containers." -ForegroundColor Green
