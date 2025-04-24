@echo off
REM Batch wrapper for PowerShell stop script
powershell -ExecutionPolicy Bypass -File "%~dp0\stop-app.ps1"
