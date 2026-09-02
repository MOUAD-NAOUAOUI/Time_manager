# Error Handling & Security Logging

## 1. Frontend Error Boundary & Safe Fetching
- `src/lib/api.ts` wraps all network calls in try/catch blocks:
  - Catches connection refusals (e.g. backend down) and synthesizes a `503 Service Unavailable` response object rather than throwing uncaught browser exceptions.

## 2. Backend Global Exception Handling
- Spring Boot controllers use `@RestControllerAdvice` and custom exceptions (`ResourceNotFoundException`, `UnauthorizedException`).
- Responses are formatted as RFC 7807 problem details or clean JSON error structures.

## 3. Security Audit Logging
- Every authentication attempt, password reset, and administrative action logs to `security_audit_logs` table via `SecurityAuditService.java`.
