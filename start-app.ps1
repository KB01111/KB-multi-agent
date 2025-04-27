# PowerShell shortcut to start the application
param (
    [string]$Action = "start",
    [string]$Component = "all",
    [switch]$Interactive,
    [switch]$Force,
    [switch]$Detailed,
    [switch]$Docker
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# If Docker flag is specified, use Docker scripts
if ($Docker) {
    switch ($Action) {
        "start" {
            if ($Component -eq "all") {
                & "$scriptDir\scripts\docker\start-docker.ps1" -Watch
            }
            else {
                & "$scriptDir\scripts\docker\start-docker.ps1" -ProfileName $Component -Watch
            }
        }
        "stop" {
            & "$scriptDir\scripts\docker\stop-docker.ps1"
        }
        "restart" {
            & "$scriptDir\scripts\docker\stop-docker.ps1"
            if ($Component -eq "all") {
                & "$scriptDir\scripts\docker\start-docker.ps1" -Build -Watch
            }
            else {
                & "$scriptDir\scripts\docker\start-docker.ps1" -ProfileName $Component -Build -Watch
            }
        }
        "status" {
            docker compose ps
        }
        "init" {
            & "$scriptDir\scripts\docker\init-docker.ps1"
        }
        default {
            Write-Host "Invalid action: $Action" -ForegroundColor Red
            Write-Host "Valid actions: start, stop, restart, status, init" -ForegroundColor Yellow
        }
    }
}
else {
    # Pass all parameters to the original script
    $params = @()
    if ($Action) { $params += "-Action"; $params += $Action }
    if ($Component) { $params += "-Component"; $params += $Component }
    if ($Interactive) { $params += "-Interactive" }
    if ($Force) { $params += "-Force" }
    if ($Detailed) { $params += "-Detailed" }

    & "$scriptDir\scripts\manage-app.ps1" @params
}
