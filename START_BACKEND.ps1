# Spring Boot Backend Starter Script
# This script loads all environment variables from .env and starts the backend

# Change to backend directory
Set-Location "$PSScriptRoot/core-backend"

# Load .env file
$envFile = "$PSScriptRoot/.env"
if (!(Test-Path $envFile)) {
    Write-Host "[ERROR] .env file not found at $envFile" -ForegroundColor Red
    Write-Host "[INFO] Please create .env file before starting the backend" -ForegroundColor Yellow
    Exit 1
}

Write-Host "[INFO] Loading environment variables from .env..." -ForegroundColor Cyan

# Parse and load environment variables from .env
foreach ($line in Get-Content $envFile) {
    $line = $line.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $value = if ($parts.Count -gt 1) { $parts[1].Trim() } else { "" }
        [Environment]::SetEnvironmentVariable($key, $value, [EnvironmentVariableTarget]::Process)
        
        $displayValue = if ($value.Length -gt 30) { $value.Substring(0, 30) + "..." } else { $value }
        Write-Host "[OK] $key = $displayValue" -ForegroundColor Green
    }
}

# Verify required variables
$required = @("JWT_SECRET", "GROQ_API_KEY", "DB_USER", "DB_PASSWORD", "AI_SERVICE_INTERNAL_TOKEN", "APP_ENCRYPTION_KEY")
$missing = @()

foreach ($var in $required) {
    $varValue = Get-Item "env:$var" -ErrorAction SilentlyContinue
    if ([string]::IsNullOrEmpty($varValue.Value)) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "[ERROR] Missing environment variables:" -ForegroundColor Red
    foreach ($var in $missing) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "[INFO] Please check your .env file and restart the terminal" -ForegroundColor Yellow
    Exit 1
}

$backendPort = [int]$env:BACKEND_PORT
$portListeners = Get-NetTCPConnection -LocalPort $backendPort -State Listen -ErrorAction SilentlyContinue
if ($portListeners) {
    Write-Host ""
    Write-Host "[ERROR] Port $backendPort is already in use." -ForegroundColor Red
    foreach ($listener in $portListeners) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.ProcessName } else { "unknown process" }
        Write-Host "  PID $($listener.OwningProcess): $processName" -ForegroundColor Yellow
    }
    Write-Host "[INFO] Stop the existing backend or change BACKEND_PORT in .env before restarting." -ForegroundColor Yellow
    Exit 1
}

Write-Host ""
Write-Host "[SUCCESS] All environment variables loaded successfully" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Starting Spring Boot Backend (Port 8080)..." -ForegroundColor Cyan
Write-Host "[INFO] Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Maven with all environment variables
mvn clean spring-boot:run -DskipTests
