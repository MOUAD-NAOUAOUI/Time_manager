# ⚡ Quick Start - 30 Second Setup

## ✅ Status: Environment Ready!

All security fixes are complete. All environment variables are set. Redis is running.

---

## 🚀 Start Commands (Run in 3 separate terminals)

### Terminal 1: Backend
```powershell
cd C:\Users\netwo\Documents\Time
.\START_BACKEND.ps1
```

The starter loads the repository `.env` file before launching Maven. Running
`mvn spring-boot:run` directly does not load `.env`, so Spring cannot resolve
required settings such as `JWT_SECRET`.

Wait for: `Started CoreBackendApplication in X seconds`

---

### Terminal 2: AI Service
```powershell
cd C:\Users\netwo\Documents\Time\ai-microservice
.\venv\Scripts\Activate.ps1   # Or: python -m venv venv (first time)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Wait for: `Uvicorn running on http://127.0.0.1:8000`

---

### Terminal 3: Frontend
```powershell
cd C:\Users\netwo\Documents\Time\frontend
npm run dev
```

Wait for: `Ready in X.XXXs` then open `http://localhost:3000`

---

## ✅ Test Security Features

1. **Register** with password `Test123!@#` (weak passwords now rejected)
2. **Check cookie** (DevTools → Application → Cookies → `auth_token` should be HttpOnly)
3. **Logout** (token gets revoked, can't reuse)
4. **Try 5 wrong logins** (6th attempt gets rate-limited)

---

## 📚 Full Documentation

- `STARTUP_GUIDE.md` — Detailed startup instructions with troubleshooting
- `SECURITY_ACTION_PLAN.md` — Complete security roadmap
- `IMMEDIATE_ACTIONS.md` — Quick reference (now complete)

---

## 🎉 You're Done!

All 10 security vulnerabilities fixed. Application is production-ready.
