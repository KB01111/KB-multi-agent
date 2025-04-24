@echo off
REM Batch wrapper for PowerShell health check script
powershell -ExecutionPolicy Bypass -File "%~dp0\check-app-health.ps1"
