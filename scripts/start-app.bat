@echo off
REM Batch wrapper for PowerShell start script
powershell -ExecutionPolicy Bypass -File "%~dp0\start-app.ps1"
