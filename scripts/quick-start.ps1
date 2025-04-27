# PowerShell script to quickly start the application
# This script focuses on just getting the backend and frontend running

# Display header
Write-Host "KB-multi-agent Quick Starter" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green
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

# Step 1: Kill any existing processes on ports 8124 and 3000
Write-Host "Step 1: Killing any existing processes on ports 8124 and 3000..." -ForegroundColor Yellow
Write-Host "---------------------------------------------------------------" -ForegroundColor Yellow

# Kill processes on port 8124
try {
    $processes8124 = Get-NetTCPConnection -LocalPort 8124 -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue

    if ($processes8124) {
        foreach ($pid in $processes8124) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Killing process $($process.ProcessName) (PID: $pid) on port 8124" -ForegroundColor Cyan
                    Stop-Process -Id $pid -Force
                }
            } catch {
                Write-Host "Error killing process with PID $pid: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No processes found on port 8124" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking port 8124: $($_.Exception.Message)" -ForegroundColor Red
}

# Kill processes on port 3000
try {
    $processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue

    if ($processes3000) {
        foreach ($pid in $processes3000) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Killing process $($process.ProcessName) (PID: $pid) on port 3000" -ForegroundColor Cyan
                    Stop-Process -Id $pid -Force
                }
            } catch {
                Write-Host "Error killing process with PID $pid: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No processes found on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking port 3000: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Start the backend health server
Write-Host ""
Write-Host "Step 2: Starting the backend health server..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Navigate to the agent directory
Push-Location $agentDir

# Start the health server
Write-Host "Starting the backend health server..." -ForegroundColor Cyan
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

# Step 3: Start the frontend
Write-Host ""
Write-Host "Step 3: Starting the frontend..." -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow

# Navigate to the frontend directory
Push-Location $frontendDir

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
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
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
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final summary
Write-Host ""
Write-Host "Startup Complete!" -ForegroundColor Green
Write-Host "================" -ForegroundColor Green
Write-Host "The application should now be running in minimal mode." -ForegroundColor Cyan
Write-Host "Backend URL: http://localhost:8124" -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000 or http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Note: The backend is running in fallback mode with limited functionality." -ForegroundColor Yellow
Write-Host "This is sufficient for basic usage but some advanced features may not be available." -ForegroundColor Yellow
Write-Host ""
