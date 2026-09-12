package com.intelligenttime.corebackend.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads environment variables from .env file in the project root directory.
 * This runs early in the Spring Boot lifecycle before @Value injection occurs.
 * Allows local development without setting OS-level environment variables.
 */
@Component
public class EnvLoader implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        // Check if .env file exists in the current working directory or project root
        String envPath = findEnvFile();
        if (envPath != null) {
            try {
                Dotenv dotenv = Dotenv.configure()
                        .directory(envPath)
                        .filename(".env")
                        .ignoreIfMissing()
                        .load();

                // Convert dotenv entries to a Map and add to Spring environment
                Map<String, Object> propertyMap = new HashMap<>();
                dotenv.entries().forEach(entry -> propertyMap.put(entry.getKey(), entry.getValue()));

                if (!propertyMap.isEmpty()) {
                    MapPropertySource dotenvPropertySource = new MapPropertySource("dotenv", propertyMap);
                    environment.getPropertySources().addFirst(dotenvPropertySource);
                    System.out.println("[EnvLoader] Loaded " + propertyMap.size() + " environment variables from .env file");
                }
            } catch (Exception e) {
                System.err.println("[EnvLoader] Warning: Could not load .env file - " + e.getMessage());
            }
        }
    }

    /**
     * Attempts to find the .env file by checking common locations:
     * 1. Current working directory
     * 2. Project root (parent of src/)
     */
    private String findEnvFile() {
        // Check current working directory first
        File cwdEnv = new File(".env");
        if (cwdEnv.exists()) {
            return ".";
        }

        // Check parent directory (root directory when running inside core-backend)
        File parentEnv = new File("..", ".env");
        if (parentEnv.exists()) {
            return "..";
        }

        // Fallback: return null (will still try default location)
        return null;
    }
}
