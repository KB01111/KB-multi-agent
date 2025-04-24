@echo off
REM Batch wrapper for PowerShell Supabase initialization script
powershell -ExecutionPolicy Bypass -File "%~dp0\init-supabase.ps1"
