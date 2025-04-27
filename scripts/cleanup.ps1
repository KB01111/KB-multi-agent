# PowerShell script to clean up unnecessary files in the project
Write-Host "Cleaning up unnecessary files..." -ForegroundColor Cyan

# Remove Python cache files
Write-Host "Removing Python cache files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Recurse -Include __pycache__ -Directory | 
    Where-Object { $_.FullName -notlike "*\.venv\*" -and $_.FullName -notlike "*\node_modules\*" } | 
    Remove-Item -Recurse -Force

# Remove compiled Python files
Write-Host "Removing compiled Python files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Recurse -Include *.pyc,*.pyo -File | 
    Where-Object { $_.FullName -notlike "*\.venv\*" -and $_.FullName -notlike "*\node_modules\*" } | 
    Remove-Item -Force

# Remove log files
Write-Host "Removing log files..." -ForegroundColor Yellow
Get-ChildItem -Path .\agent\logs -Include *.log -File -ErrorAction SilentlyContinue | 
    Remove-Item -Force

# Remove temporary files
Write-Host "Removing temporary files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Recurse -Include *.tmp,*.bak,*.swp,*.swo -File | 
    Where-Object { $_.FullName -notlike "*\.venv\*" -and $_.FullName -notlike "*\node_modules\*" } | 
    Remove-Item -Force

Write-Host "Cleanup complete!" -ForegroundColor Green
