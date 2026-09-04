# ============================================================
# Intelligent Time Manager - Development Startup Script
# ============================================================

# 1. Load .env file into current process environment
if (Test-Path "$PSScriptRoot\.env") {
    Write-Host "Loading environment from .env..." -ForegroundColor Cyan
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

Write-Host "Starting Docker containers (Redis + AI Microservice)..." -ForegroundColor Yellow
docker compose up -d redis ai-microservice
Write-Host "Docker containers (Redis + AI) ready!" -ForegroundColor Green

Write-Host ""
Write-Host "Starting Spring Boot backend on port 8080..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\core-backend"
mvn spring-boot:run 