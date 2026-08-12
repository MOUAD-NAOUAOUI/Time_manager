# ============================================================
# Intelligent Time Manager - Development Startup Script
# ============================================================

Write-Host "Starting Docker containers (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker compose up -d
Write-Host "Docker containers started!" -ForegroundColor Green

Write-host ""
Write-Host "Starting Spring Boot backend on port 8080..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\core-backend"
mvn spring-boot:run 