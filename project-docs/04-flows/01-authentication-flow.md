# Authentication Flow

## 1. Step-by-Step Description
1. User enters email and password at `/auth`.
2. Frontend sends `POST /auth/login` with JSON payload `{ email, password }` to Spring Boot.
3. Spring Security's `AuthenticationManager` validates credentials against `users` table via BCrypt comparison.
4. On success, `JwtTokenProvider` signs a JWT containing user email and expiration timestamp (default 24 hours).
5. Frontend receives token, stores it in `localStorage`, and attaches it to subsequent `Authorization: Bearer <token>` request headers.

## 2. Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Next.js SPA
    participant JavaAPI as Spring Boot Backend
    participant DB as PostgreSQL

    User->>Frontend: Enters Email & Password
    Frontend->>JavaAPI: POST /auth/login {email, password}
    JavaAPI->>DB: SELECT * FROM users WHERE email = ?
    DB-->>JavaAPI: Returns User Entity & Password Hash
    JavaAPI->>JavaAPI: BCrypt.checkpw(password, hash)
    alt Valid Credentials
        JavaAPI->>JavaAPI: Generate Signed JWT Token
        JavaAPI-->>Frontend: 200 OK {token, email, timezone}
        Frontend->>Frontend: Save Token in localStorage
        Frontend-->>User: Redirect to /dashboard
    else Invalid Credentials
        JavaAPI-->>Frontend: 401 Unauthorized {error: "Bad credentials"}
        Frontend-->>User: Show Error Banner
    end
```
