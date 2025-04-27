# Script to fix Poetry lockfile issues

# Display header
Write-Host "KB-multi-agent Poetry Lockfile Fix" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Kill any existing processes
Write-Host "Killing any existing processes..." -ForegroundColor Yellow
Get-Process -Name "python*" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $_ | Stop-Process -Force
        Write-Host "Killed process $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill process $($_.ProcessName) (PID: $($_.Id)): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Navigate to the agent directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent $scriptDir
$agentDir = Join-Path $baseDir "agent"

Write-Host "Navigating to agent directory: $agentDir" -ForegroundColor Yellow
Push-Location $agentDir

# Check if poetry.lock exists
$poetryLockPath = Join-Path $agentDir "poetry.lock"
if (Test-Path $poetryLockPath) {
    Write-Host "Backing up existing poetry.lock file..." -ForegroundColor Yellow
    Copy-Item $poetryLockPath "$poetryLockPath.bak"
    Write-Host "Removing existing poetry.lock file..." -ForegroundColor Yellow
    Remove-Item $poetryLockPath
}

# Update Poetry and reinstall dependencies
Write-Host "Updating Poetry..." -ForegroundColor Yellow
Invoke-Expression "poetry self update"

Write-Host "Updating Poetry dependencies..." -ForegroundColor Yellow
Invoke-Expression "poetry update"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
Invoke-Expression "poetry install"

# Check if installation was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
    
    # Try to start the backend
    Write-Host "Starting the backend..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k poetry run custom-server" -WindowStyle Normal
    
    Write-Host "Backend should be starting in a new window." -ForegroundColor Green
    Write-Host "Please check the new window for any error messages." -ForegroundColor Yellow
} else {
    Write-Host "Failed to install dependencies." -ForegroundColor Red
    Write-Host "Please try running 'poetry install --no-cache' manually in the agent directory." -ForegroundColor Yellow
}

# Return to the original directory
Pop-Location

Write-Host ""
Write-Host "Poetry lockfile fix complete." -ForegroundColor Green
Write-Host "If the backend still doesn't start, try the following:" -ForegroundColor Yellow
Write-Host "1. Run 'poetry install --no-cache' in the agent directory" -ForegroundColor Yellow
Write-Host "2. Run 'poetry run custom-server' in the agent directory" -ForegroundColor Yellow
Write-Host "3. Check if any dependencies are missing and install them manually" -ForegroundColor Yellow
Write-Host ""
