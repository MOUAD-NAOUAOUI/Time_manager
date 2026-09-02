# Local Setup Guide

## 1. Prerequisites
- **Java**: OpenJDK 17 or 21
- **Node.js**: Node.js 18+ (Node 20+ recommended) & npm
- **Python**: Python 3.10+ & pip
- **Docker**: Docker Desktop (for Postgres & Redis)
- **Groq API Key**: (Free key from https://console.groq.com)

## 2. Clone & Environment Configuration
```bash
git clone <repo-url> TimeSpace
cd TimeSpace
cp .env.example .env
# Edit .env with your GROQ_API_KEY and database credentials
```

## 3. Quickstart via PowerShell Script
On Windows, you can start everything with:
```powershell
.\start-dev.ps1
```
