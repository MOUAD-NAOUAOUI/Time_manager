# Configuration and Profiles

## 1. Configuration Classes
- SecurityConfig.java: Configures CORS policy (allowing GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD), disables CSRF for stateless REST, sets SessionCreationPolicy.STATELESS, and injects JwtAuthenticationFilter.
- RedisConfig.java: Sets up RedisTemplate<String, Object> with String serializers for keys and values.

## 2. Key Properties (pplication.properties)
`properties
# Server
server.port=

# Database
spring.datasource.url=jdbc:postgresql://:/
spring.datasource.username=
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Redis
spring.data.redis.host=
spring.data.redis.port=

# JWT
jwt.secret=
jwt.expiration=

# AI Microservice URL
ai.service.url=http://localhost:8000
ai.service.token=
`
