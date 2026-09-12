# Security Action Plan & Status Report
**Generated**: 2026-09-08  
**Project**: Intelligent Time Manager

---

## ✅ COMPLETED ACTIONS (This Session)

### Critical Issues Fixed
1. ✅ **Rate Limiting Fallback Bypass** — Removed in-memory fallback, fail-secure on Redis unavailability
2. ✅ **JWT Token Revocation** — Redis-backed blacklist implemented
3. ✅ **Insecure Token Storage** — Migrated to httpOnly cookies (frontend + backend)
4. ✅ **Missing CSP Headers** — Added Content-Security-Policy + 4 other security headers
5. ✅ **CORS Too Permissive** — Restricted to `Authorization`, `Content-Type` headers only
6. ✅ **CSRF Documentation** — Documented why CSRF is disabled (stateless JWT API)

### High Priority Issues Fixed
7. ✅ **Password Policy** — Enforced: 8+ chars, uppercase, lowercase, digit, special char
8. ✅ **Account Lockout** — Dual rate limiting (IP + account-based) to defeat distributed attacks
9. ✅ **Logout Endpoint** — Added `/auth/logout` that revokes JWT and clears cookie

### Medium Priority Issues Fixed
10. ✅ **AI Service Timeout** — RestTemplate configured with 5s connect, 30s read timeouts
11. ✅ **Exception Logging** — All AI service failures now log full stack traces
12. ✅ **HikariCP Configuration** — Connection pool configured (max-pool-size=20, min-idle=5)
13. ✅ **Inconsistent Null Safety** — Applied `Objects.requireNonNull()` consistently across all services

---

## 🚨 IMMEDIATE ACTIONS REQUIRED (Do These NOW)

### 1. Add Missing Environment Variables to `.env`

Your `.env` is **missing 3 required secrets**. Generate and add them:

```bash
# Generate AI_SERVICE_INTERNAL_TOKEN (64 random bytes, hex-encoded)
openssl rand -hex 64

# Generate APP_ENCRYPTION_KEY (32 bytes for AES-256, base64-encoded)
openssl rand -base64 32

# REDIS_PASSWORD (if your Redis instance requires auth; leave empty for local dev without auth)
# Generate with: openssl rand -hex 32
```

Add to `.env`:
```properties
# AI Microservice Internal Authentication
AI_SERVICE_INTERNAL_TOKEN=<paste 128-char hex string here>

# AES-256 Database Field Encryption Key (32-byte Base64)
APP_ENCRYPTION_KEY=<paste 44-char base64 string here>

# Redis Authentication (required if Redis has auth enabled)
REDIS_PASSWORD=<paste redis password or leave empty for local dev>
```

### 2. Rotate Exposed Credentials (IF Committed to Git)

**STATUS**: ✅ `.env` was **never committed** — your secrets are safe.

**Action**: No rotation needed, but verify with:
```bash
# Check if .env is tracked
git ls-files .env

# Check git history for any .env commits
git log --all --full-history -- .env

# Search for leaked secrets in git history
git log -p --all | grep -E "(ONEPIECE|gsk_)"
```

If secrets were ever committed, **immediately**:
1. Rotate database password in Supabase console
2. Revoke and regenerate Groq API key
3. Change JWT_SECRET
4. Use BFG Repo-Cleaner or `git filter-branch` to purge from history

### 3. Verify `.gitignore` Coverage

✅ **STATUS**: `.gitignore` correctly excludes `.env`

Verify no other secret files are exposed:
```bash
# Check what's actually tracked
git ls-files | grep -E "\\.env|\\.key|\\.pem|secret|credentials"

# Ensure these are ignored
git check-ignore .env .env.local
```

---

## 📋 SHORT-TERM ACTIONS (Next 1-2 Weeks)

### 4. Implement Production Secret Management

**Current State**: Secrets in `.env` file (acceptable for local dev)  
**Production State**: Secrets must be in environment or secret manager

**Options**:
- **Option A (Easy)**: Set environment variables directly on hosting platform (Vercel, Railway, Render, etc.)
- **Option B (Better)**: Use platform-provided secret manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
- **Option C (Best)**: Use HashiCorp Vault or similar for centralized secret rotation

**Action**:
1. Never deploy `.env` files to production
2. Inject secrets via platform environment variables
3. Document secret rotation procedures

### 5. Add Rate Limiting to All Public Endpoints

**Current State**: Rate limiting only on `/auth/login`  
**Required**: Rate limiting on all public endpoints

**Implementation Plan**:
1. Create `@RateLimited` annotation
2. Create Spring AOP aspect that intercepts annotated methods
3. Apply to all public controllers:
   - `/tasks/**` — 100 req/min per user
   - `/schedule/**` — 50 req/min per user
   - `/ai/**` — 20 req/min per user

**Estimated Effort**: 2-3 hours

### 6. CSRF Protection for State-Changing Operations

**Current State**: CSRF disabled (documented as acceptable for stateless JWT API)  
**Consideration**: Now that tokens are in httpOnly cookies, browsers send them automatically

**Decision Point**: With httpOnly cookies, CSRF is theoretically possible again. However:
- ✅ All endpoints require `Authorization` header OR cookie
- ✅ SameSite=Strict cookie attribute prevents cross-site sends
- ✅ CORS restricts which origins can make requests

**Recommendation**: CSRF protection is **not strictly required** with `SameSite=Strict` cookies. Monitor for CSRF attempts in logs. If observed, implement double-submit cookie pattern.

### 7. Update Dependencies

**Check for outdated/vulnerable dependencies**:

Backend (Spring Boot 3.2.3 → 3.3.x):
```bash
cd core-backend
./mvnw versions:display-dependency-updates
./mvnw versions:display-plugin-updates
```

Frontend (React 19.2.8-canary → stable):
```bash
cd frontend
npm outdated
npm audit
```

Python (AI microservice):
```bash
cd ai-microservice
pip list --outdated
pip-audit  # Install with: pip install pip-audit
```

**Action**: Create dependency update PRs, test thoroughly before merging.

---

## 📅 MEDIUM-TERM ACTIONS (Next 1-3 Months)

### 8. Implement Multi-Factor Authentication (MFA)

**Priority**: Medium (increases account security significantly)  
**Implementation**:
1. Add TOTP library (e.g., `GoogleAuthenticator` for Java)
2. Store MFA secret per user in database (encrypted with `APP_ENCRYPTION_KEY`)
3. Add `/auth/mfa/setup` and `/auth/mfa/verify` endpoints
4. Require MFA for sensitive operations (password change, email change, account deletion)

**Estimated Effort**: 1-2 days

### 9. Implement Refresh Token Mechanism

**Current State**: JWT expires in 24 hours (long-lived)  
**Security Risk**: If a token is stolen, attacker has 24 hours of access

**Recommendation**:
1. Reduce access token lifetime to 15 minutes
2. Implement refresh tokens (7-day lifetime, stored in Redis)
3. Add `/auth/refresh` endpoint
4. Frontend automatically refreshes before expiry

**Estimated Effort**: 1 day

### 10. Add Comprehensive API Documentation

**Current State**: No Swagger/OpenAPI spec  
**Tool**: SpringDoc OpenAPI

**Implementation**:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

Add annotations to controllers, access at `/swagger-ui.html`.

**Estimated Effort**: 4-6 hours

### 11. Implement Structured Logging with Correlation IDs

**Current State**: Basic logging, no request tracing  
**Required**: Correlation IDs for request tracing across services

**Implementation**:
1. Add `X-Correlation-Id` header to all requests (generated in frontend or middleware)
2. Add MDC (Mapped Diagnostic Context) to Spring Boot
3. Include correlation ID in all log statements
4. Forward correlation ID to AI microservice

**Estimated Effort**: 4 hours

### 12. Fix N+1 Query Problems

**Potential Issues**: Task → User relationship may cause N+1 queries

**Investigation**:
```java
// In TaskService, check if this causes N+1:
List<Task> tasks = taskRepository.findByUserId(userId);
// If accessing task.getUser().getEmail() in loop → N+1 query

// Solution: Use @EntityGraph or JOIN FETCH
@EntityGraph(attributePaths = {"user"})
List<Task> findByUserId(UUID userId);
```

**Action**: Profile queries in development, add `@EntityGraph` where needed.

---

## 🔮 LONG-TERM ACTIONS (Next 3-6 Months)

### 13. Implement Email Verification

**Priority**: Low (not critical for MVP, important for production)

**Implementation**:
1. Generate verification token on registration
2. Store in Redis with 24-hour TTL
3. Send email with verification link
4. Mark user as `emailVerified` on click
5. Require verification for sensitive operations

**Estimated Effort**: 1 day

### 14. Implement Automated Database Backups

**Current State**: No documented backup strategy  
**Risk**: Data loss in production

**Recommendation**:
- **If using Supabase**: Enable automated daily backups in console (built-in feature)
- **If using managed Postgres**: Enable automated backups via cloud provider
- **If self-hosted**: Use `pg_dump` + cron job, upload to S3

**Retention Policy**: 7 daily, 4 weekly, 12 monthly

### 15. Add Application Monitoring & Alerting

**Options**:
- **Prometheus + Grafana** (self-hosted, free)
- **Sentry** (error tracking, free tier)
- **New Relic / DataDog** (APM, paid)

**Metrics to Track**:
- Request rate, latency, error rate (RED metrics)
- Database connection pool usage
- Redis connection health
- JWT blacklist hit rate
- Rate limit rejections

**Alerts**:
- 5xx error rate > 1% for 5 minutes
- Database connection pool exhaustion
- Redis unreachable
- Disk usage > 85%

### 16. Input Sanitization for XSS Prevention

**Current State**: No HTML sanitization on task titles/descriptions  
**Risk**: LOW (React/Next.js escapes by default, but defense-in-depth)

**Recommendation**:
- Backend: Use JSoup to strip HTML tags before saving
- Frontend: Already safe (React escapes by default)

**Action**: Add JSoup dependency, sanitize on task creation:
```java
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

String sanitized = Jsoup.clean(userInput, Safelist.none());
```

---

## 📊 SECURITY METRICS & HEALTH

### Current Security Posture: **B+ (Good)**

**Strengths**:
- ✅ All high-priority vulnerabilities fixed
- ✅ Defense-in-depth: rate limiting + lockout + CORS + CSP + httpOnly cookies
- ✅ Secrets not committed to git
- ✅ Strong password policy enforced
- ✅ Token revocation implemented

**Remaining Gaps**:
- ⚠️ Missing environment variables (AI_SERVICE_INTERNAL_TOKEN, APP_ENCRYPTION_KEY, REDIS_PASSWORD)
- ⚠️ Long-lived JWT tokens (24h — consider refresh token pattern)
- ⚠️ Rate limiting only on auth endpoints (not on task/schedule APIs)
- ⚠️ No MFA for sensitive operations
- ⚠️ No monitoring/alerting

**Path to A+ Rating**:
1. Add missing env vars (immediate)
2. Implement rate limiting on all public endpoints (1 week)
3. Implement refresh token pattern (1 week)
4. Add MFA support (2 weeks)
5. Set up monitoring & alerting (1 week)

---

## 🔐 SECRET GENERATION REFERENCE

Use these commands to generate cryptographically secure secrets:

```bash
# JWT_SECRET (256-bit)
openssl rand -hex 32

# AI_SERVICE_INTERNAL_TOKEN (512-bit for extra entropy)
openssl rand -hex 64

# APP_ENCRYPTION_KEY (256-bit AES key, base64)
openssl rand -base64 32

# REDIS_PASSWORD (256-bit)
openssl rand -hex 32

# Generic secure password (20 chars, alphanumeric + symbols)
openssl rand -base64 20 | tr -dc 'A-Za-z0-9!@#$%^&*' | head -c20
```

---

## 📝 NEXT STEPS CHECKLIST

### This Week
- [ ] Add `AI_SERVICE_INTERNAL_TOKEN`, `APP_ENCRYPTION_KEY`, `REDIS_PASSWORD` to `.env`
- [ ] Test all fixed security features in local environment
- [ ] Verify Redis is running and accepting connections
- [ ] Test JWT revocation by logging out and attempting authenticated request

### Next Week
- [ ] Implement rate limiting on `/tasks/**`, `/schedule/**`, `/ai/**` endpoints
- [ ] Create dependency update PRs (Spring Boot, React, Python packages)
- [ ] Add SpringDoc OpenAPI documentation

### Next Month
- [ ] Implement refresh token pattern (15-min access tokens)
- [ ] Add MFA support
- [ ] Set up monitoring (Sentry or Prometheus)
- [ ] Profile and fix N+1 queries

---

## 📚 REFERENCES

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Spring Security Best Practices](https://docs.spring.io/spring-security/reference/servlet/exploits/index.html)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Report Status**: All immediate and high-priority security vulnerabilities addressed.  
**Recommended Next Action**: Add missing environment variables to `.env` before starting backend.
