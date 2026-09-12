package com.intelligenttime.corebackend;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.io.File;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.intelligenttime.corebackend.repository")
public class CoreBackendApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(CoreBackendApplication.class, args);
    }

    private static void loadDotenv() {
        String[] possiblePaths = {
            ".",
            "..",
            "../..",
            new File(".").getAbsolutePath(),
            new File("..").getAbsolutePath()
        };

        for (String path : possiblePaths) {
            File envFile = new File(path, ".env");
            if (envFile.exists() && envFile.isFile()) {
                try {
                    Dotenv dotenv = Dotenv.configure()
                            .directory(path)
                            .filename(".env")
                            .ignoreIfMissing()
                            .load();
                    dotenv.entries().forEach(entry -> {
                        if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                            System.setProperty(entry.getKey(), entry.getValue());
                        }
                    });
                    System.out.println("[CoreBackend] Successfully loaded environment from: " + envFile.getCanonicalPath());
                    return;
                } catch (Exception e) {
                    System.err.println("[CoreBackend] Warning loading .env from " + path + ": " + e.getMessage());
                }
            }
        }
    }
}