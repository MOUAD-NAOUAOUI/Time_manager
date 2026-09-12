# 🚀 Startup Guide - Intelligent Time Manager

## ✅ Prerequisites Checklist

Before starting, verify you have these installed:

- [x] Redis (Installed at `C:\Program Files\Redis`)
- [x] Java 17+ (Check with `java -version`)
- [x] Node.js 18+ (Check with `node --version`)
- [x] Maven (Check with `mvn --version`)

---

## ✅ Environment Variables - ALL SET!

Your `.env` file now contains all 7 required variables:

- ✓ `DB_USER` (Supabase postgres user)
- ✓ `DB_PASSWORD` (Supabase password)
- ✓ `JWT_SECRET` (256-bit secret)
- ✓ `GROQ_API_KEY` (AI API key)
- ✓ `AI_SERVICE_INTERNAL_TOKEN` (Backend ↔ AI auth)
- ✓ `APP_ENCRYPTION_KEY` (AES-256 encryption key)
- ✓ `REDIS_PASSWORD` (Empty for local dev)

---

## 🚀 Step 1: Verify Redis is Running

**Close and reopen your terminal** (required for PATH update), then:

```powershell
redis-cli ping
```

Expected output: `PONG`

✅ **Status**: Redis is already running on port 6379

---

## 🚀 Step 2: Start the Backend (Core Spring Boot API)

Open a **new terminal window** and run:

```powershell
cd C:\Users\netwo\Documents\Time
.\START_BACKEND.ps1
```

`START_BACKEND.ps1` loads the repository `.env` file into the backend process
before starting Maven. Do not run `mvn spring-boot:run` directly unless you
have already loaded all required environment variables into that PowerShell
session.

**Expected startup logs** (watch for these):
```
✓ "Started CoreBackendApplication in X.XXX seconds"
✓ "Tomcat started on port 8080"
✓ "AIClientService initialized: url=http://127.0.0.1:8000"
✓ No errors about missing environment variables
```

**Common Errors & Fixes**:

| Error | Fix |
|-------|-----|
| `AI_SERVICE_INTERNAL_TOKEN must be set` | ✅ Already fixed in your `.env` |
| `Redis is required for rate limiting` | Restart terminal, verify `redis-cli ping` works |
| `Could not connect to database` | Check Supabase credentials in `.env` |
| `Port 8080 already in use` | Kill existing process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess \| Stop-Process` |

---

## 🚀 Step 3: Start the AI Microservice (Python FastAPI)

Open a **second new terminal window** and run:

```powershell
cd C:\Users\netwo\Documents\Time\ai-microservice

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the AI service
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected startup logs**:
```
✓ "Uvicorn running on http://127.0.0.1:8000"
✓ "Application startup complete"
```

**Common Errors & Fixes**:

| Error | Fix |
|-------|-----|
| `GROQ_API_KEY not set` | Check `.env` has `GROQ_API_KEY` |
| `Port 8000 already in use` | Kill existing process or change port |
| `Module not found` | Run `pip install -r requirements.txt` |

---

## 🚀 Step 4: Start the Frontend (Next.js)

Open a **third new terminal window** and run:

```powershell
cd C:\Users\netwo\Documents\Time\frontend

# Install dependencies (first time only, or if package.json changed)
npm install

# Start development server
npm run dev
```

**Expected startup logs**:
```
✓ "Ready in X.XXXs"
✓ "Local: http://localhost:3000"
✓ "Network: http://192.168.X.X:3000"
```

**Common Errors & Fixes**:

| Error | Fix |
|-------|-----|
| `Port 3000 already in use` | Kill existing process or use different port: `npm run dev -- -p 3001` |
| `Module not found` | Run `npm install` |
| `Cannot find module 'next'` | Delete `node_modules`, run `npm install` again |

---

## ✅ Step 5: Verify Everything Works

### Test 1: Backend Health Check

Open browser or use curl:
```powershell
curl http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`

### Test 2: Register a New User

1. Open browser: `http://localhost:3000`
2. Click "Create account" (or go to `http://localhost:3000/auth/register`)
3. Fill in:
   - **Email**: `test@example.com`
   - **Password**: `Test123!@#` (must meet new password policy)
   - **Timezone**: Any
4. Click "Create account"

**Expected behavior**:
- ✅ Redirected to `/dashboard`
- ✅ No token in localStorage (check DevTools → Application → Local Storage)
- ✅ `auth_token` cookie present (check DevTools → Application → Cookies)
- ✅ Cookie flags: `HttpOnly ✓`, `Secure ✓`, `SameSite=Strict ✓`

### Test 3: Test Rate Limiting

Try logging in with **wrong password** 5 times:

1. Go to `http://localhost:3000/auth/login`
2. Enter email: `test@example.com`
3. Enter wrong password: `wrongpass`
4. Submit 5 times

**Expected behavior**:
- First 5 attempts: "Invalid email or password"
- 6th attempt: "Too many failed attempts. Please try again in X seconds."

### Test 4: Test Token Revocation

1. Login successfully
2. Open DevTools → Console
3. Run: `fetch('http://localhost:8080/auth/logout', {method: 'POST', credentials: 'include'})`
4. Try accessing a protected endpoint (should get 401 Unauthorized)

---

## 🎯 You're All Set!

Your application now has:

### ✅ Security Features Active

1. **Rate Limiting** — Redis-backed, fail-secure
2. **JWT Revocation** — Logout actually revokes tokens
3. **httpOnly Cookies** — Tokens safe from XSS
4. **Strong Passwords** — 8+ chars, uppercase, lowercase, digit, special
5. **Account Lockout** — Both IP and account-based
6. **Security Headers** — CSP, HSTS, X-Content-Type-Options, etc.
7. **CORS Restrictions** — Only allowed origins and headers
8. **Connection Pooling** — HikariCP configured (max 20 connections)
9. **AI Service Timeouts** — 5s connect, 30s read
10. **Consistent Null Safety** — All services protected

---

## 📊 Service Status Overview

Once everything is running, you should have:

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Redis | 6379 | - | ✅ Running |
| Backend (Spring Boot) | 8080 | http://localhost:8080 | ⏳ Start in Step 2 |
| AI Service (FastAPI) | 8000 | http://localhost:8000 | ⏳ Start in Step 3 |
| Frontend (Next.js) | 3000 | http://localhost:3000 | ⏳ Start in Step 4 |

---

## 🆘 Troubleshooting

### "Cannot connect to Redis"

1. Check Redis is running: `redis-cli ping`
2. If not responding, restart Redis service:
   ```powershell
   # Stop
   Stop-Service Redis
   
   # Start
   Start-Service Redis
   ```

### "Backend won't start - missing environment variables"

1. Verify `.env` exists in project root: `C:\Users\netwo\Documents\Time\.env`
2. Check all 7 variables are present (see top of this guide)
3. Restart terminal (environment variables loaded on terminal start)

### "Frontend shows 503 errors"

Backend isn't running. Start backend first (Step 2), wait for "Started CoreBackendApplication", then start frontend.

### "Cookies not being set"

1. Check backend response headers include `Set-Cookie` (DevTools → Network → Response Headers)
2. Verify frontend is calling `credentials: 'include'` (already implemented)
3. Make sure you're on `http://localhost:3000` or `http://127.0.0.1:3000` (not IP address)

---

## 🎉 Next Steps

After verifying everything works:

1. **Read** `SECURITY_ACTION_PLAN.md` for the full security roadmap
2. **Test** all the security features (rate limiting, logout, password policy)
3. **Deploy** to production (remember: never deploy `.env` files!)

---

**Need Help?** All the code changes are complete. If you encounter errors:
1. Check the "Common Errors & Fixes" tables above
2. Verify Redis is running (`redis-cli ping`)
3. Check backend logs for detailed error messages
4. Verify all environment variables are set correctly in `.env`
