# Main Entry Point

## 1. Class: CoreBackendApplication
Path: core-backend/src/main/java/com/intelligenttime/corebackend/CoreBackendApplication.java

`java
package com.intelligenttime.corebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CoreBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoreBackendApplication.class, args);
    }
}
`

## 2. Bootstrapping Flow
1. Initializes Spring ApplicationContext.
2. Auto-configures HikariCP DataSource connecting to PostgreSQL via pplication.properties.
3. Auto-configures Redis Connection Factory for rate limiting.
4. Registers Spring Security Filter Chain (SecurityConfig.java) with stateless session management.
5. Scans and instantiates Repositories, Services, and REST Controllers.
