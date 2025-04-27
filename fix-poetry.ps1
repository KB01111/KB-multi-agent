# Fix Poetry permissions script

# Navigate to the agent directory
$baseDir = Get-Location
$agentDir = Join-Path $baseDir "agent"
Set-Location $agentDir
Write-Host "Changed directory to: $agentDir" -ForegroundColor Cyan

# Create a new cache directory in the project folder
$newCacheDir = Join-Path $baseDir "poetry-cache"

Write-Host "Creating new Poetry cache directory: $newCacheDir" -ForegroundColor Cyan
if (-not (Test-Path $newCacheDir)) {
    New-Item -Path $newCacheDir -ItemType Directory -Force | Out-Null
}

# Configure Poetry to use the new cache directory
Write-Host "Configuring Poetry to use the new cache directory..." -ForegroundColor Cyan
poetry config cache-dir $newCacheDir

# Verify the configuration
$configuredCacheDir = poetry config cache-dir
Write-Host "Poetry cache directory is now: $configuredCacheDir" -ForegroundColor Green

# Install dependencies with --no-cache flag
Write-Host "Installing dependencies with --no-cache flag..." -ForegroundColor Yellow
poetry install --no-cache

# Check if installation was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Poetry installation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Poetry installation failed. Trying alternative approach..." -ForegroundColor Red

    # Try with --no-interaction flag
    Write-Host "Trying with --no-interaction flag..." -ForegroundColor Yellow
    poetry install --no-cache --no-interaction

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Poetry installation completed successfully with --no-interaction flag!" -ForegroundColor Green
    } else {
        Write-Host "Poetry installation still failed. Trying with virtualenvs.create=false..." -ForegroundColor Red

        # Try with virtualenvs.create=false
        Write-Host "Configuring Poetry to not create virtualenvs..." -ForegroundColor Yellow
        poetry config virtualenvs.create false

        Write-Host "Installing dependencies with minimal settings..." -ForegroundColor Yellow
        poetry install --no-cache --no-interaction

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Poetry installation completed successfully with minimal settings!" -ForegroundColor Green

            # Reset virtualenvs.create to true
            poetry config virtualenvs.create true
        } else {
            Write-Host "All installation attempts failed." -ForegroundColor Red
            Write-Host "Please try running this script as administrator." -ForegroundColor Red
        }
    }
}

# Return to the original directory
Set-Location $baseDir
Write-Host "Returned to original directory: $baseDir" -ForegroundColor Cyan
