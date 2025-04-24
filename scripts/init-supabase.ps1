# PowerShell script for initializing Supabase
# This script checks and initializes the Supabase database

# Function to display colored text
function Write-ColorOutput {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Text,
        
        [Parameter(Mandatory=$true)]
        [string]$Color
    )
    
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Text
    $host.UI.RawUI.ForegroundColor = $originalColor
}

# Set script directory as base path
$scriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$scriptsDir = Join-Path $scriptDir "scripts"

# Display header
Write-ColorOutput "Initializing Supabase" "Green"
Write-ColorOutput "====================" "Green"
Write-Output ""

# Check if Node.js is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "Error: Node.js is not installed or not in PATH" "Red"
    Write-Output "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check if npm is installed
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "Error: npm is not installed or not in PATH" "Red"
    Write-Output "Please install npm (it should come with Node.js)"
    exit 1
}

# Install required npm packages
Write-ColorOutput "Installing required npm packages..." "Yellow"
Set-Location $scriptsDir
npm install dotenv @supabase/supabase-js

# Run the check script
Write-ColorOutput "Checking Supabase tables..." "Yellow"
node check-supabase-tables.js

# Ask if user wants to initialize the default user
Write-Output ""
$initUser = Read-Host "Do you want to initialize the default user? (y/n)"
if ($initUser -eq "y") {
    Write-ColorOutput "Initializing default user..." "Yellow"
    node init-supabase-user.js
}

Write-Output ""
Write-ColorOutput "Supabase initialization completed." "Green"
Write-ColorOutput "Please run the SQL script in scripts/update-supabase-tables.sql in the Supabase SQL Editor to ensure all tables are properly configured." "Yellow"
