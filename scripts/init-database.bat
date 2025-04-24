@echo off
REM Batch wrapper for PowerShell database initialization script
powershell -ExecutionPolicy Bypass -File "%~dp0\init-database.ps1"
