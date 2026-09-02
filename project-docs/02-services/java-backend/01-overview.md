# Java Core Backend Overview

## 1. Responsibilities
The Java Core Backend (core-backend/) is the central orchestrator and domain engine for TimeSpace. Built on Spring Boot 3.2.3, it provides:
- **Stateless Authentication & Security**: JWT issuance, validation, user registration, and BCrypt credential hashing.
- **Task Lifecycle Management**: Persistence of user tasks, priority ranking, energy levels, estimated vs. actual minutes.
- **Time Session Tracking**: Atomic start, pause, and stop operations for focus sessions, enforcing consistent state between tasks and session logs.
- **Schedule Management**: Weekly block generation, persistence, and querying.
- **Analytics Aggregation**: Calculating focus minutes, completion ratios, and productivity metrics.
- **AI Gateway Integration**: Secure proxying and payload transformation between frontend requests and the Python AI microservice.
- **Rate Limiting & Security Audit**: Distributed token-bucket rate limiting via Redis and persistence of security audit logs.
