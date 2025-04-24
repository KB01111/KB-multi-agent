@echo off
REM Batch wrapper for PowerShell Supabase dependency installation script
powershell -ExecutionPolicy Bypass -File "%~dp0\install-supabase-deps.ps1"
