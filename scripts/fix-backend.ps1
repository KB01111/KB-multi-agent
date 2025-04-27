# Simple script to fix backend issues

# Display header
Write-Host "KB-multi-agent Backend Fix" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Check for processes using port 8124
Write-Host "Checking for processes using port 8124..." -ForegroundColor Yellow
$processesUsingPort = $null

try {
    $processesUsingPort = Get-NetTCPConnection -LocalPort 8124 -ErrorAction SilentlyContinue | 
                         Select-Object LocalPort, OwningProcess, @{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}
} catch {
    Write-Host "Could not check for processes using port 8124: $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($processesUsingPort) {
    Write-Host "Found processes using port 8124:" -ForegroundColor Red
    $processesUsingPort | Format-Table -AutoSize
    
    Write-Host "Attempting to kill processes using port 8124..." -ForegroundColor Yellow
    foreach ($process in $processesUsingPort) {
        try {
            Stop-Process -Id $process.OwningProcess -Force
            Write-Host "Killed process $($process.ProcessName) (PID: $($process.OwningProcess))" -ForegroundColor Green
        } catch {
            Write-Host "Failed to kill process $($process.ProcessName) (PID: $($process.OwningProcess)): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No processes found using port 8124" -ForegroundColor Green
}

# Kill any Python processes that might be related to the backend
Write-Host "Killing any Python processes that might be related to the backend..." -ForegroundColor Yellow
Get-Process -Name "python*" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $_ | Stop-Process -Force
        Write-Host "Killed process $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill process $($_.ProcessName) (PID: $($_.Id)): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Kill any Node.js processes that might be related to the frontend
Write-Host "Killing any Node.js processes that might be related to the frontend..." -ForegroundColor Yellow
Get-Process -Name "node*" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $_ | Stop-Process -Force
        Write-Host "Killed process $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill process $($_.ProcessName) (PID: $($_.Id)): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Start the application with the -Force flag
Write-Host "Starting the application with the -Force flag..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", ".\start-app.ps1 -Action start -Component all -Interactive -Force" -WindowStyle Normal

Write-Host ""
Write-Host "Backend fix complete. The application should now start correctly." -ForegroundColor Green
Write-Host "If you still have issues, try restarting your computer." -ForegroundColor Yellow
Write-Host ""
