# Java Backend Folder Structure

`
core-backend/
├── pom.xml                               # Maven build descriptor (Spring Boot 3.2.3, JJWT, Redis, JPA)
└── src/
    └── main/
        ├── java/com/intelligenttime/corebackend/
        │   ├── CoreBackendApplication.java       # Main entry point (@SpringBootApplication)
        │   ├── config/                           # Configuration classes (Security, CORS, Redis)
        │   │   ├── SecurityConfig.java
        │   │   ├── RedisConfig.java
        │   │   └── WebConfig.java
        │   ├── controller/                       # REST API controllers
        │   │   ├── AuthController.java
        │   │   ├── TaskController.java
        │   │   ├── TimeSessionController.java
        │   │   ├── ScheduleController.java
        │   │   ├── AnalyticsController.java
        │   │   ├── AIController.java
        │   │   └── UserController.java
        │   ├── dto/                              # Request/Response Data Transfer Objects
        │   ├── entity/                           # JPA Database Entities
        │   │   ├── User.java
        │   │   ├── Task.java
        │   │   ├── TimeSession.java
        │   │   ├── Schedule.java
        │   │   ├── ScheduleTimeBlock.java
        │   │   ├── CoachingInsight.java
        │   │   ├── Subscription.java
        │   │   ├── ChatSession.java
        │   │   ├── ChatMessage.java
        │   │   ├── ChatProposal.java
        │   │   └── SecurityAuditLog.java
        │   ├── repository/                       # Spring Data JPA Repositories
        │   ├── security/                         # JWT filters, TokenProvider, UserDetailsService
        │   └── service/                          # Business logic services
        │       ├── UserService.java
        │       ├── TaskService.java
        │       ├── TimeSessionService.java
        │       ├── SchedulePersistenceService.java
        │       ├── AnalyticsService.java
        │       ├── AIClientService.java
        │       ├── RateLimiterService.java
        │       ├── ChatPersistenceService.java
        │       └── SecurityAuditService.java
        └── resources/
            ├── application.properties            # Core Spring configuration
            └── schema.sql                        # Database initialization DDL
`
