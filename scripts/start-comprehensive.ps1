# PowerShell script to start all components of the KB-multi-agent application
# This script starts the health server, LangGraph server, and frontend

# Display header
Write-Host "KB-multi-agent Comprehensive Starter" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Get base directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$baseDir = Split-Path -Parent $scriptDir
$agentDir = Join-Path $baseDir "agent"
$frontendDir = Join-Path $baseDir "frontend"

Write-Host "Base directory: $baseDir" -ForegroundColor Cyan
Write-Host "Agent directory: $agentDir" -ForegroundColor Cyan
Write-Host "Frontend directory: $frontendDir" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill any existing processes on ports 8124, 8125, and 3000
Write-Host "Step 1: Killing any existing processes on ports 8124, 8125, and 3000..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------" -ForegroundColor Yellow

# Kill processes on port 8124 (health server)
$processes8124 = Get-NetTCPConnection -LocalPort 8124 -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue

if ($processes8124) {
    foreach ($processId in $processes8124) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Killing process $($process.ProcessName) (PID: $processId) on port 8124" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force
            }
        } catch {
            Write-Host "Error killing process with PID $($processId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No processes found on port 8124" -ForegroundColor Green
}

# Kill processes on port 8125 (LangGraph server)
$processes8125 = Get-NetTCPConnection -LocalPort 8125 -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue

if ($processes8125) {
    foreach ($processId in $processes8125) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Killing process $($process.ProcessName) (PID: $processId) on port 8125" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force
            }
        } catch {
            Write-Host "Error killing process with PID $($processId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No processes found on port 8125" -ForegroundColor Green
}

# Kill processes on port 3000 (frontend)
$processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue

if ($processes3000) {
    foreach ($processId in $processes3000) {
        try {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Killing process $($process.ProcessName) (PID: $processId) on port 3000" -ForegroundColor Cyan
                Stop-Process -Id $processId -Force
            }
        } catch {
            Write-Host "Error killing process with PID $($processId): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No processes found on port 3000" -ForegroundColor Green
}

# Step 2: Start the health server
Write-Host ""
Write-Host "Step 2: Starting the health server..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Navigate to the agent directory
Push-Location $agentDir

# Start the health server
Write-Host "Starting the health server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k poetry run python -m mcp_agent.health_server" -WindowStyle Normal

# Return to the original directory
Pop-Location

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

# Step 3: Start the LangGraph server
Write-Host ""
Write-Host "Step 3: Starting the LangGraph server..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Navigate to the agent directory
Push-Location $agentDir

# Start the LangGraph server
Write-Host "Starting the LangGraph server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k poetry run python -m mcp_agent.langgraph_server" -WindowStyle Normal

# Return to the original directory
Pop-Location

# Wait for the LangGraph server to start
Write-Host "Waiting for the LangGraph server to start..." -ForegroundColor Cyan
$langgraphServerStarted = $false
$retryCount = 0
$maxRetries = 10

while (-not $langgraphServerStarted -and $retryCount -lt $maxRetries) {
    $retryCount++
    Start-Sleep -Seconds 2

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8125/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $langgraphServerStarted = $true
            Write-Host "LangGraph server started successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "LangGraph server not yet available, retrying... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    }
}

if (-not $langgraphServerStarted) {
    Write-Host "Failed to start LangGraph server after $maxRetries attempts." -ForegroundColor Red
    Write-Host "Please check the console window for error messages." -ForegroundColor Yellow
}

# Step 4: Start the frontend
Write-Host ""
Write-Host "Step 4: Starting the frontend..." -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow

# Navigate to the frontend directory
Push-Location $frontendDir

# Start the frontend
Write-Host "Starting the frontend..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm run dev" -WindowStyle Normal

# Return to the original directory
Pop-Location

# Step 5: Verify that everything is running
Write-Host ""
Write-Host "Step 5: Verifying that everything is running..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Wait a bit for everything to start
Write-Host "Waiting for all components to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check health server status
Write-Host "Checking health server status..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8124/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "Health server is running! (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
        $healthContent = $healthResponse.Content | ConvertFrom-Json
        Write-Host "Health server mode: $($healthContent.mode)" -ForegroundColor Cyan
    } else {
        Write-Host "Health server returned status code $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Health server is not running or not accessible." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

# Check LangGraph server status
Write-Host "Checking LangGraph server status..." -ForegroundColor Cyan
try {
    $langgraphResponse = Invoke-WebRequest -Uri "http://localhost:8125/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($langgraphResponse.StatusCode -eq 200) {
        Write-Host "LangGraph server is running! (Status: $($langgraphResponse.StatusCode))" -ForegroundColor Green
        $langgraphContent = $langgraphResponse.Content | ConvertFrom-Json
        Write-Host "LangGraph status: $($langgraphContent.services.langgraph.status)" -ForegroundColor Cyan
    } else {
        Write-Host "LangGraph server returned status code $($langgraphResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "LangGraph server is not running or not accessible." -ForegroundColor Red
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
Write-Host "Startup Complete!" -ForegroundColor Green
Write-Host "================" -ForegroundColor Green
Write-Host "The application should now be running with all components." -ForegroundColor Cyan
Write-Host "Health Server URL: http://localhost:8124" -ForegroundColor Green
Write-Host "LangGraph Server URL: http://localhost:8125" -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000 or http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Note: If any component is not running, please check the console windows for error messages." -ForegroundColor Yellow
Write-Host ""
