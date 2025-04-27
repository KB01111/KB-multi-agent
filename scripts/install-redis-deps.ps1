# PowerShell script to install Redis dependencies

# Function to display colored output
function Write-ColorOutput {
    param (
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check if Poetry is installed
$poetryInstalled = $null -ne (Get-Command poetry -ErrorAction SilentlyContinue)

if (-not $poetryInstalled) {
    Write-ColorOutput "Poetry is not installed. Please install Poetry first." "Red"
    Write-ColorOutput "Visit https://python-poetry.org/docs/#installation for installation instructions." "Yellow"
    exit 1
}

# Get the base directory
$baseDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$agentDir = Join-Path $baseDir "agent"

# Change to the agent directory
Set-Location $agentDir

# Install Redis dependencies
Write-ColorOutput "Installing Redis dependencies..." "Yellow"
try {
    poetry add redis
    Write-ColorOutput "Redis dependencies installed successfully!" "Green"
} catch {
    Write-ColorOutput "Error installing Redis dependencies: $_" "Red"
    exit 1
}

# Install OpenAI Agents SDK
Write-ColorOutput "Installing OpenAI Agents SDK..." "Yellow"
try {
    poetry add openai-agents
    Write-ColorOutput "OpenAI Agents SDK installed successfully!" "Green"
} catch {
    Write-ColorOutput "Error installing OpenAI Agents SDK: $_" "Red"
    exit 1
}

# Check if Docker is installed
$dockerInstalled = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if ($dockerInstalled) {
    # Check if Redis container is running
    $redisRunning = docker ps | Select-String "redis"
    
    if (-not $redisRunning) {
        Write-ColorOutput "Would you like to start a Redis container? (Y/N)" "Yellow"
        $response = Read-Host
        
        if ($response -eq "Y" -or $response -eq "y") {
            Write-ColorOutput "Starting Redis container..." "Yellow"
            try {
                docker run --name kb-redis -p 6379:6379 -d redis
                Write-ColorOutput "Redis container started successfully!" "Green"
            } catch {
                Write-ColorOutput "Error starting Redis container: $_" "Red"
                Write-ColorOutput "You can start Redis manually using: docker run --name kb-redis -p 6379:6379 -d redis" "Yellow"
            }
        } else {
            Write-ColorOutput "Skipping Redis container setup." "Yellow"
            Write-ColorOutput "You can start Redis manually using: docker run --name kb-redis -p 6379:6379 -d redis" "Yellow"
        }
    } else {
        Write-ColorOutput "Redis container is already running." "Green"
    }
} else {
    Write-ColorOutput "Docker is not installed. You will need to install Redis manually." "Yellow"
    Write-ColorOutput "Visit https://redis.io/download for installation instructions." "Yellow"
}

# Return to the original directory
Set-Location $baseDir

Write-ColorOutput "Redis dependencies installation complete!" "Green"
Write-ColorOutput "You can now use Redis with KB-multi-agent." "Green"
Write-ColorOutput "Make sure to set REDIS_ENABLED=true and REDIS_URL in your .env file." "Yellow"
