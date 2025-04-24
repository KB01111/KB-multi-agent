@echo off
REM Batch wrapper for PowerShell linting script
powershell -ExecutionPolicy Bypass -File "%~dp0\lint-frontend.ps1"
