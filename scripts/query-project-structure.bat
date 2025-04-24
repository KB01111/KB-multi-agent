@echo off
REM Script to query project structure
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "%~dp0\query-project-structure.ps1"
