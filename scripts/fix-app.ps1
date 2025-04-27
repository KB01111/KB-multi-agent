# PowerShell script to fix all application issues
# This script addresses both backend and frontend issues

# Display header
Write-Host "KB-multi-agent Application Fix" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Import utility module if available
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$utilsPath = Join-Path $scriptDir "KBUtils.psm1"

if (Test-Path $utilsPath) {
    Import-Module $utilsPath -Force
    Write-Host "Successfully imported KBUtils module" -ForegroundColor Green
}

# Get base directory
$baseDir = Split-Path -Parent $scriptDir
$agentDir = Join-Path $baseDir "agent"
$frontendDir = Join-Path $baseDir "frontend"

Write-Host "Base directory: $baseDir" -ForegroundColor Cyan
Write-Host "Agent directory: $agentDir" -ForegroundColor Cyan
Write-Host "Frontend directory: $frontendDir" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-PortInUse {
    param (
        [Parameter(Mandatory=$true)]
        [int]$Port
    )

    $result = $null
    try {
        $result = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    } catch {
        # Port is not in use
        return $false
    }

    return ($result -ne $null)
}

# Function to kill processes using a specific port
function Kill-ProcessesByPort {
    param (
        [Parameter(Mandatory=$true)]
        [int]$Port
    )

    $processesUsingPort = $null
    try {
        $processesUsingPort = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
                             Select-Object LocalPort, OwningProcess, @{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}
    } catch {
        Write-Host "Could not check for processes using port $Port" -ForegroundColor Yellow
        return
    }

    if ($processesUsingPort) {
        Write-Host "Found processes using port $($Port):" -ForegroundColor Yellow
        $processesUsingPort | Format-Table -AutoSize

        foreach ($process in $processesUsingPort) {
            try {
                Stop-Process -Id $process.OwningProcess -Force
                Write-Host "Killed process $($process.ProcessName) (PID: $($process.OwningProcess))" -ForegroundColor Green
            } catch {
                Write-Host "Failed to kill process $($process.ProcessName) (PID: $($process.OwningProcess))" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No processes found using port $($Port)" -ForegroundColor Green
    }
}

# Function to kill processes by name pattern
function Kill-ProcessesByName {
    param (
        [Parameter(Mandatory=$true)]
        [string]$NamePattern
    )

    $processes = Get-Process | Where-Object { $_.ProcessName -match $NamePattern -or $_.Path -match $NamePattern } -ErrorAction SilentlyContinue

    if ($processes -and $processes.Count -gt 0) {
        Write-Host "Found $($processes.Count) processes matching pattern '$NamePattern':" -ForegroundColor Yellow
        $processes | Format-Table Id, ProcessName, Path -AutoSize

        foreach ($process in $processes) {
            try {
                Stop-Process -Id $process.Id -Force
                Write-Host "Killed process $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "Failed to kill process $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No processes found matching pattern '$NamePattern'" -ForegroundColor Green
    }
}

# Step 1: Kill any existing processes that might be blocking ports
Write-Host "Step 1: Killing any existing processes that might be blocking ports..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------" -ForegroundColor Yellow

# Kill processes using backend port (8124)
Write-Host "Checking for processes using backend port (8124)..." -ForegroundColor Cyan
Kill-ProcessesByPort -Port 8124

# Kill processes using frontend port (3000)
Write-Host "Checking for processes using frontend port (3000)..." -ForegroundColor Cyan
Kill-ProcessesByPort -Port 3000

# Kill any Python processes that might be related to the backend
Write-Host "Killing any Python processes that might be related to the backend..." -ForegroundColor Cyan
Kill-ProcessesByName -NamePattern "python"

# Kill any Node.js processes that might be related to the frontend
Write-Host "Killing any Node.js processes that might be related to the frontend..." -ForegroundColor Cyan
Kill-ProcessesByName -NamePattern "node"

# Step 2: Fix backend issues
Write-Host ""
Write-Host "Step 2: Fixing backend issues..." -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow

# Check if Poetry is installed
Write-Host "Checking if Poetry is installed..." -ForegroundColor Cyan
$poetryInstalled = $null -ne (Get-Command "poetry" -ErrorAction SilentlyContinue)

if ($poetryInstalled) {
    Write-Host "Poetry is installed" -ForegroundColor Green
} else {
    Write-Host "Poetry is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Poetry from https://python-poetry.org/docs/#installation" -ForegroundColor Yellow
    exit 1
}

# Check if the .env file exists in agent directory
Write-Host "Checking if .env file exists in agent directory..." -ForegroundColor Cyan
$envPath = Join-Path $agentDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host ".env file not found in agent directory!" -ForegroundColor Red
    Write-Host "Creating a basic .env file from example.env..." -ForegroundColor Yellow

    # Check if example.env exists
    $exampleEnvPath = Join-Path $agentDir "example.env"
    if (Test-Path $exampleEnvPath) {
        # Copy example.env to .env
        Copy-Item $exampleEnvPath $envPath
        Write-Host "Created .env file from example.env" -ForegroundColor Green
        Write-Host "Please edit the .env file to add your API keys" -ForegroundColor Yellow
    } else {
        # Create a basic .env file
        @"
# Basic .env file created by fix-app.ps1
# Please add your API keys below

# OpenAI API Key (Required)
OPENAI_API_KEY=

# Framework Configuration
# Options: langgraph, openai_agents, hybrid
FRAMEWORK=langgraph
DEFAULT_MODEL=gpt-4o

# Optional Logfire configuration
LOGGING_ENABLED=false
"@ | Out-File -FilePath $envPath -Encoding utf8

        Write-Host "Created a basic .env file" -ForegroundColor Green
        Write-Host "Please edit the .env file to add your API keys" -ForegroundColor Yellow
    }
} else {
    Write-Host ".env file exists in agent directory." -ForegroundColor Green

    # Check if OPENAI_API_KEY is set
    $envContent = Get-Content $envPath -Raw
    if ($envContent -notmatch "OPENAI_API_KEY=.+") {
        Write-Host "Warning: OPENAI_API_KEY appears to be empty in .env file" -ForegroundColor Yellow
        Write-Host "Please add your OpenAI API key to the .env file" -ForegroundColor Yellow
    }
}

# Navigate to the agent directory
Push-Location $agentDir

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
$installResult = Invoke-Expression "poetry install 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing backend dependencies:" -ForegroundColor Red
    Write-Output $installResult
} else {
    Write-Host "Backend dependencies installed successfully." -ForegroundColor Green
}

# Start the health server
Write-Host "Starting the backend health server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k poetry run python -m mcp_agent.health_server" -WindowStyle Normal

# Wait for the health server to start
Write-Host "Waiting for the health server to start..." -ForegroundColor Cyan
$healthServerStarted = $false
$retryCount = 0
$maxRetries = 10

while (-not $healthServerStarted -and $retryCount -lt $maxRetries) {
    $retryCount++
    Start-Sleep -Seconds 2

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8124/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthServerStarted = $true
            Write-Host "Health server started successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Health server not yet available, retrying... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $healthServerStarted) {
    Write-Host "Failed to start health server after $maxRetries attempts." -ForegroundColor Red
    Write-Host "Please check the console window for error messages." -ForegroundColor Yellow
}

# Return to the original directory
Pop-Location

# Step 3: Fix frontend issues
Write-Host ""
Write-Host "Step 3: Fixing frontend issues..." -ForegroundColor Yellow
Write-Host "--------------------------" -ForegroundColor Yellow

# Check if PNPM is installed
Write-Host "Checking if PNPM is installed..." -ForegroundColor Cyan
$pnpmInstalled = $null -ne (Get-Command "pnpm" -ErrorAction SilentlyContinue)

if ($pnpmInstalled) {
    Write-Host "PNPM is installed" -ForegroundColor Green
} else {
    Write-Host "PNPM is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PNPM from https://pnpm.io/installation" -ForegroundColor Yellow
    exit 1
}

# Check if the .env file exists in frontend directory
Write-Host "Checking if .env file exists in frontend directory..." -ForegroundColor Cyan
$frontendEnvPath = Join-Path $frontendDir ".env"
if (-not (Test-Path $frontendEnvPath)) {
    Write-Host ".env file not found in frontend directory!" -ForegroundColor Red
    Write-Host "Creating a basic .env file..." -ForegroundColor Yellow

    # Check if example.env exists
    $frontendExampleEnvPath = Join-Path $frontendDir "example.env"
    if (Test-Path $frontendExampleEnvPath) {
        # Copy example.env to .env
        Copy-Item $frontendExampleEnvPath $frontendEnvPath
        Write-Host "Created .env file from example.env" -ForegroundColor Green
    } else {
        # Create a basic .env file
        @"
# Basic .env file created by fix-app.ps1

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8124

# CopilotKit API Key (optional)
# NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=
"@ | Out-File -FilePath $frontendEnvPath -Encoding utf8

        Write-Host "Created a basic .env file" -ForegroundColor Green
    }
} else {
    Write-Host ".env file exists in frontend directory." -ForegroundColor Green
}

# Navigate to the frontend directory
Push-Location $frontendDir

# Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Cleared .next directory" -ForegroundColor Green
}

# Clear node_modules/.cache
Write-Host "Clearing node_modules cache..." -ForegroundColor Cyan
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "Cleared node_modules/.cache directory" -ForegroundColor Green
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
$frontendInstallResult = Invoke-Expression "pnpm install 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing frontend dependencies:" -ForegroundColor Red
    Write-Output $frontendInstallResult
} else {
    Write-Host "Frontend dependencies installed successfully." -ForegroundColor Green
}

# Start the frontend
Write-Host "Starting the frontend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm run dev" -WindowStyle Normal

# Return to the original directory
Pop-Location

# Step 4: Verify that everything is running
Write-Host ""
Write-Host "Step 4: Verifying that everything is running..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Wait a bit for everything to start
Write-Host "Waiting for all components to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check backend status
Write-Host "Checking backend status..." -ForegroundColor Cyan
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8124/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "Backend is running! (Status: $($backendResponse.StatusCode))" -ForegroundColor Green
        $backendContent = $backendResponse.Content | ConvertFrom-Json
        Write-Host "Backend mode: $($backendContent.mode)" -ForegroundColor Cyan
    } else {
        Write-Host "Backend returned status code $($backendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Backend is not running or not accessible." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

# Check frontend status
Write-Host "Checking frontend status..." -ForegroundColor Cyan
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "Frontend is running! (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "Frontend returned status code $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    # Try alternate port 3001
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($frontendResponse.StatusCode -eq 200) {
            Write-Host "Frontend is running on port 3001! (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
            Write-Host "Note: Frontend is using port 3001 instead of the default port 3000" -ForegroundColor Yellow
        } else {
            Write-Host "Frontend returned status code $($frontendResponse.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Frontend is not running or not accessible." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Final summary
Write-Host ""
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "============" -ForegroundColor Green
Write-Host "The application should now be running. If you still encounter issues:" -ForegroundColor Cyan
Write-Host "1. Check the console windows for specific error messages" -ForegroundColor Cyan
Write-Host "2. Make sure your .env files contain valid API keys" -ForegroundColor Cyan
Write-Host "3. Try restarting your computer to clear any stuck processes" -ForegroundColor Cyan
Write-Host "4. Run './start-app.ps1 -Action start -Component all -Force' to start everything with detailed logging" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://localhost:8124" -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000 or http://localhost:3001" -ForegroundColor Green
Write-Host ""
